const db = require('../db');
const logger = require('../utils/logger');

class VendorMatchingService {
  /**
   * Find vendors that can fulfill a quote request.
   * Matches based on: province coverage, quote acceptance, and ASIN discount tiers.
   *
   * @param {Object} params
   * @param {string[]} params.asins - ASINs the customer wants quoted
   * @param {string} params.province - 2-letter province code for shipping
   * @param {number[]} [params.quantities] - Quantities per ASIN (for tier matching)
   * @returns {Promise<Object[]>} Matched vendors sorted by relevance
   */
  async findMatchingVendors({ asins, province, quantities = [] }) {
    // Find vendors who ship to the customer's province and accept quotes
    let query = db('vendors')
      .where('accepts_quotes', true)
      .whereRaw('? = ANY(ships_to_provinces)', [province]);

    const vendors = await query.orderBy('rating', 'desc');

    if (vendors.length === 0) {
      logger.info('No matching vendors found', { province, asins });
      return [];
    }

    // Enrich with discount tier info for the requested ASINs
    const vendorIds = vendors.map((v) => v.id);
    const tiers = await db('vendor_discount_tiers')
      .whereIn('vendor_id', vendorIds)
      .whereIn('asin', asins)
      .orderBy(['vendor_id', 'asin', 'min_quantity']);

    // Group tiers by vendor
    const tiersByVendor = {};
    for (const tier of tiers) {
      if (!tiersByVendor[tier.vendor_id]) tiersByVendor[tier.vendor_id] = [];
      tiersByVendor[tier.vendor_id].push(tier);
    }

    // Score and rank vendors
    const scored = vendors.map((vendor) => {
      const vendorTiers = tiersByVendor[vendor.id] || [];
      let score = vendor.rating * 10; // base score from rating

      // Bonus for having pre-configured discount tiers for requested ASINs
      const coveredAsins = new Set(vendorTiers.map((t) => t.asin));
      score += coveredAsins.size * 5;

      // Bonus for FBA (faster, more reliable fulfillment)
      if (vendor.fulfillment_type === 'FBA') score += 3;

      return {
        ...vendor,
        discount_tiers: vendorTiers,
        match_score: Math.round(score * 100) / 100,
      };
    });

    scored.sort((a, b) => b.match_score - a.match_score);

    logger.info('Vendor matching complete', {
      province,
      asins,
      matched: scored.length,
    });

    return scored;
  }

  /**
   * Calculate the best auto-quote price for an ASIN + quantity using
   * a vendor's pre-configured discount tiers.
   *
   * @param {string} vendorId
   * @param {string} asin
   * @param {number} quantity
   * @param {number} listPrice - Current list price in CAD
   * @returns {Promise<Object|null>} Auto-quote with unit price, or null
   */
  async getAutoQuote(vendorId, asin, quantity, listPrice) {
    const tiers = await db('vendor_discount_tiers')
      .where({ vendor_id: vendorId, asin })
      .where('min_quantity', '<=', quantity)
      .orderBy('min_quantity', 'desc')
      .first();

    if (!tiers) return null;

    const discountedPrice =
      Math.round(listPrice * (1 - tiers.discount_percent / 100) * 100) / 100;

    return {
      vendor_id: vendorId,
      asin,
      quantity,
      list_price: listPrice,
      discount_percent: tiers.discount_percent,
      unit_price: discountedPrice,
      total: Math.round(discountedPrice * quantity * 100) / 100,
    };
  }
}

module.exports = VendorMatchingService;
