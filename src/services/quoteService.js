const db = require('../db');
const logger = require('../utils/logger');
const VendorMatchingService = require('./vendorMatchingService');
const TaxService = require('./taxService');

const vendorMatcher = new VendorMatchingService();
const taxService = new TaxService();

const EXPIRY_DAYS = parseInt(process.env.QUOTE_EXPIRY_DAYS || '14', 10);

class QuoteService {
  /**
   * Create a new quote request with line items.
   *
   * @param {Object} params
   * @param {string} params.customerId
   * @param {string} params.shippingProvince - 2-letter province code
   * @param {string} [params.shippingPostalCode]
   * @param {Date} [params.desiredDeliveryDate]
   * @param {string} [params.notes]
   * @param {Object[]} params.items - Array of { asin, quantity, targetUnitPrice? }
   * @returns {Promise<Object>} Created quote request with items
   */
  async createQuoteRequest({
    customerId,
    shippingProvince,
    shippingPostalCode,
    desiredDeliveryDate,
    notes,
    items,
  }) {
    return db.transaction(async (trx) => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS);

      const [quoteRequest] = await trx('quote_requests')
        .insert({
          customer_id: customerId,
          status: 'draft',
          shipping_province: shippingProvince,
          shipping_postal_code: shippingPostalCode,
          desired_delivery_date: desiredDeliveryDate,
          notes,
          expires_at: expiresAt,
        })
        .returning('*');

      const quoteItems = await trx('quote_items')
        .insert(
          items.map((item) => ({
            quote_request_id: quoteRequest.id,
            asin: item.asin,
            product_title: item.productTitle,
            quantity: item.quantity,
            target_unit_price: item.targetUnitPrice,
          }))
        )
        .returning('*');

      logger.info('Quote request created', { id: quoteRequest.id, items: quoteItems.length });

      return { ...quoteRequest, items: quoteItems };
    });
  }

  /**
   * Submit a draft quote request — triggers vendor matching and RFQ fan-out.
   *
   * @param {string} quoteRequestId
   * @returns {Promise<Object>} Updated quote with matched vendors
   */
  async submitQuoteRequest(quoteRequestId) {
    const quoteRequest = await db('quote_requests').where('id', quoteRequestId).first();
    if (!quoteRequest) throw new Error('Quote request not found');
    if (quoteRequest.status !== 'draft') {
      throw new Error(`Cannot submit quote in status: ${quoteRequest.status}`);
    }

    const items = await db('quote_items').where('quote_request_id', quoteRequestId);
    const asins = items.map((i) => i.asin);

    // Find matching vendors
    const matchedVendors = await vendorMatcher.findMatchingVendors({
      asins,
      province: quoteRequest.shipping_province,
    });

    // Create pending vendor_quote entries for each vendor × ASIN
    const validUntil = new Date(quoteRequest.expires_at);
    const vendorQuoteInserts = [];

    for (const vendor of matchedVendors) {
      for (const item of items) {
        vendorQuoteInserts.push({
          quote_request_id: quoteRequestId,
          vendor_id: vendor.id,
          asin: item.asin,
          unit_price: 0, // placeholder until vendor responds
          status: 'pending',
          valid_until: validUntil,
        });
      }
    }

    if (vendorQuoteInserts.length > 0) {
      await db('vendor_quotes').insert(vendorQuoteInserts);
    }

    // Update status to open
    await db('quote_requests')
      .where('id', quoteRequestId)
      .update({ status: 'open', updated_at: new Date() });

    logger.info('Quote request submitted', {
      id: quoteRequestId,
      vendorsNotified: matchedVendors.length,
    });

    // In production, send notifications to vendors here (email, webhook, etc.)

    return {
      ...quoteRequest,
      status: 'open',
      items,
      matched_vendors: matchedVendors.map((v) => ({
        id: v.id,
        business_name: v.business_name,
        rating: v.rating,
        match_score: v.match_score,
      })),
    };
  }

  /**
   * Submit a vendor's quote response for an ASIN in a quote request.
   *
   * @param {Object} params
   * @param {string} params.quoteRequestId
   * @param {string} params.vendorId
   * @param {string} params.asin
   * @param {number} params.unitPrice - Quoted price in CAD
   * @param {number} [params.minQuantity]
   * @param {number} [params.leadTimeDays]
   * @param {string} [params.vendorNotes]
   * @returns {Promise<Object>} Updated vendor quote
   */
  async submitVendorQuote({
    quoteRequestId,
    vendorId,
    asin,
    unitPrice,
    minQuantity,
    leadTimeDays,
    vendorNotes,
  }) {
    const existing = await db('vendor_quotes')
      .where({ quote_request_id: quoteRequestId, vendor_id: vendorId, asin })
      .first();

    if (!existing) throw new Error('Vendor quote entry not found — vendor may not be matched');

    const [updated] = await db('vendor_quotes')
      .where('id', existing.id)
      .update({
        unit_price: unitPrice,
        min_quantity: minQuantity || 1,
        lead_time_days: leadTimeDays,
        vendor_notes: vendorNotes,
        status: 'submitted',
        updated_at: new Date(),
      })
      .returning('*');

    // Check if all vendors have responded — if so, mark quote as "quoted"
    const pendingCount = await db('vendor_quotes')
      .where({ quote_request_id: quoteRequestId, status: 'pending' })
      .count('id as count')
      .first();

    if (parseInt(pendingCount.count, 10) === 0) {
      await db('quote_requests')
        .where('id', quoteRequestId)
        .update({ status: 'quoted', updated_at: new Date() });
    }

    logger.info('Vendor quote submitted', {
      quoteRequestId,
      vendorId,
      asin,
      unitPrice,
    });

    return updated;
  }

  /**
   * Get a comparison of all vendor quotes for a quote request,
   * including tax calculations.
   *
   * @param {string} quoteRequestId
   * @returns {Promise<Object>} Comparison with totals and tax
   */
  async getQuoteComparison(quoteRequestId) {
    const quoteRequest = await db('quote_requests').where('id', quoteRequestId).first();
    if (!quoteRequest) throw new Error('Quote request not found');

    const items = await db('quote_items').where('quote_request_id', quoteRequestId);
    const vendorQuotes = await db('vendor_quotes')
      .where({ quote_request_id: quoteRequestId })
      .whereIn('status', ['submitted'])
      .orderBy('unit_price', 'asc');

    const vendors = await db('vendors')
      .whereIn('id', [...new Set(vendorQuotes.map((q) => q.vendor_id))]);
    const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v]));

    // Group quotes by vendor
    const byVendor = {};
    for (const vq of vendorQuotes) {
      if (!byVendor[vq.vendor_id]) {
        byVendor[vq.vendor_id] = {
          vendor: vendorMap[vq.vendor_id],
          quotes: [],
          subtotal: 0,
        };
      }

      const item = items.find((i) => i.asin === vq.asin);
      const lineTotal = vq.unit_price * (item ? item.quantity : 1);

      byVendor[vq.vendor_id].quotes.push({
        ...vq,
        quantity: item ? item.quantity : 1,
        line_total: Math.round(lineTotal * 100) / 100,
      });
      byVendor[vq.vendor_id].subtotal += lineTotal;
    }

    // Calculate tax for each vendor option
    const comparisons = [];
    for (const [vendorId, data] of Object.entries(byVendor)) {
      const subtotal = Math.round(data.subtotal * 100) / 100;
      const tax = taxService.calculateTax(subtotal, quoteRequest.shipping_province);

      comparisons.push({
        vendor: {
          id: data.vendor.id,
          business_name: data.vendor.business_name,
          rating: data.vendor.rating,
          fulfillment_type: data.vendor.fulfillment_type,
        },
        quotes: data.quotes,
        subtotal,
        tax,
        total: Math.round((subtotal + tax.total) * 100) / 100,
      });
    }

    comparisons.sort((a, b) => a.total - b.total);

    return {
      quote_request: quoteRequest,
      items,
      comparisons,
      best_value: comparisons[0] || null,
    };
  }

  /**
   * Accept a vendor's quote and create a purchase order.
   *
   * @param {string} quoteRequestId
   * @param {string} vendorId - The chosen vendor
   * @returns {Promise<Object>} Created purchase order
   */
  async acceptQuote(quoteRequestId, vendorId) {
    const comparison = await this.getQuoteComparison(quoteRequestId);
    const chosen = comparison.comparisons.find((c) => c.vendor.id === vendorId);

    if (!chosen) throw new Error('Vendor quote not found in comparison');

    return db.transaction(async (trx) => {
      // Mark quote request as accepted
      await trx('quote_requests')
        .where('id', quoteRequestId)
        .update({ status: 'accepted', updated_at: new Date() });

      // Mark chosen vendor quotes as accepted, others as rejected
      await trx('vendor_quotes')
        .where({ quote_request_id: quoteRequestId, vendor_id: vendorId })
        .update({ status: 'accepted', updated_at: new Date() });

      await trx('vendor_quotes')
        .where('quote_request_id', quoteRequestId)
        .whereNot('vendor_id', vendorId)
        .update({ status: 'rejected', updated_at: new Date() });

      // Create purchase order
      const [po] = await trx('purchase_orders')
        .insert({
          quote_request_id: quoteRequestId,
          vendor_quote_id: chosen.quotes[0].id,
          customer_id: comparison.quote_request.customer_id,
          vendor_id: vendorId,
          subtotal: chosen.subtotal,
          tax_amount: chosen.tax.total,
          total: chosen.total,
          tax_breakdown_json: JSON.stringify(chosen.tax),
          status: 'created',
        })
        .returning('*');

      logger.info('Purchase order created', { poId: po.id, total: po.total });

      return po;
    });
  }
}

module.exports = QuoteService;
