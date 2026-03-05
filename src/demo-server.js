/**
 * Demo server — runs entirely in-memory (no database required).
 * Start with: node src/demo-server.js
 * Then open http://localhost:3000
 */

const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── In-memory data store ─────────────────────────────────

const uuid = () => crypto.randomUUID();

const vendors = [
  {
    id: uuid(),
    seller_id: 'A1B2C3D4E5',
    business_name: 'National Electronics Wholesale',
    email: 'quotes@newholesale.ca',
    rating: 4.70,
    fulfillment_type: 'FBA',
    ships_to_provinces: ['ON','QC','BC','AB','MB','SK','NS','NB','NL','PE'],
    accepts_quotes: true,
  },
  {
    id: uuid(),
    seller_id: 'F6G7H8I9J0',
    business_name: 'Prairie Office Direct',
    email: 'sales@prairieoffice.ca',
    rating: 4.30,
    fulfillment_type: 'FBM',
    ships_to_provinces: ['ON','QC','AB','MB','SK'],
    accepts_quotes: true,
  },
  {
    id: uuid(),
    seller_id: 'K1L2M3N4O5',
    business_name: 'BC Tech Distributors',
    email: 'bulk@bctech.ca',
    rating: 4.55,
    fulfillment_type: 'FBA',
    ships_to_provinces: ['BC','AB','ON','QC'],
    accepts_quotes: true,
  },
];

const discountTiers = [
  { id: uuid(), vendor_id: vendors[0].id, asin: 'B09V3KXJPB', min_quantity: 50, discount_percent: 8.0 },
  { id: uuid(), vendor_id: vendors[0].id, asin: 'B09V3KXJPB', min_quantity: 200, discount_percent: 15.0 },
  { id: uuid(), vendor_id: vendors[0].id, asin: 'B08N5WRWNW', min_quantity: 25, discount_percent: 10.0 },
  { id: uuid(), vendor_id: vendors[1].id, asin: 'B09V3KXJPB', min_quantity: 100, discount_percent: 10.0 },
  { id: uuid(), vendor_id: vendors[1].id, asin: 'B0BT9CXXXX', min_quantity: 50, discount_percent: 12.0 },
  { id: uuid(), vendor_id: vendors[2].id, asin: 'B08N5WRWNW', min_quantity: 20, discount_percent: 12.0 },
  { id: uuid(), vendor_id: vendors[2].id, asin: 'B0DLMYYYYY', min_quantity: 30, discount_percent: 14.0 },
];

const quoteRequests = [];
const quoteItems = [];
const vendorQuotes = [];
const purchaseOrders = [];

// ── Tax rates by province ────────────────────────────────

const TAX_RATES = {
  ON: { type: 'HST', hst: 13.0 },
  NB: { type: 'HST', hst: 15.0 },
  NL: { type: 'HST', hst: 15.0 },
  NS: { type: 'HST', hst: 15.0 },
  PE: { type: 'HST', hst: 15.0 },
  BC: { type: 'GST_PST', gst: 5.0, pst: 7.0 },
  SK: { type: 'GST_PST', gst: 5.0, pst: 6.0 },
  MB: { type: 'GST_PST', gst: 5.0, pst: 7.0 },
  QC: { type: 'GST_QST', gst: 5.0, qst: 9.975 },
  AB: { type: 'GST', gst: 5.0 },
  NT: { type: 'GST', gst: 5.0 },
  NU: { type: 'GST', gst: 5.0 },
  YT: { type: 'GST', gst: 5.0 },
};

function calculateTax(subtotal, province) {
  const rates = TAX_RATES[province] || TAX_RATES['ON'];
  const round = (n) => Math.round(n * 100) / 100;
  const result = { province, subtotal, components: [], total: 0 };

  switch (rates.type) {
    case 'HST': {
      const hst = round(subtotal * (rates.hst / 100));
      result.components.push({ name: 'HST', rate: rates.hst, amount: hst });
      result.total = hst;
      break;
    }
    case 'GST_PST': {
      const gst = round(subtotal * (rates.gst / 100));
      const pst = round(subtotal * (rates.pst / 100));
      result.components.push({ name: 'GST', rate: rates.gst, amount: gst });
      result.components.push({ name: 'PST', rate: rates.pst, amount: pst });
      result.total = round(gst + pst);
      break;
    }
    case 'GST_QST': {
      const gst = round(subtotal * (rates.gst / 100));
      const qst = round(subtotal * (rates.qst / 100));
      result.components.push({ name: 'GST', rate: rates.gst, amount: gst });
      result.components.push({ name: 'QST', rate: rates.qst, amount: qst });
      result.total = round(gst + qst);
      break;
    }
    case 'GST': {
      const gst = round(subtotal * (rates.gst / 100));
      result.components.push({ name: 'GST', rate: rates.gst, amount: gst });
      result.total = gst;
      break;
    }
  }
  return result;
}

// ── Sample product catalog ───────────────────────────────

const PRODUCTS = {
  'B09V3KXJPB': { title: 'Logitech MX Mechanical Keyboard', price: 199.99 },
  'B08N5WRWNW': { title: 'Dell UltraSharp 27" 4K Monitor', price: 579.99 },
  'B0BT9CXXXX': { title: 'HP LaserJet Pro MFP Printer', price: 449.00 },
  'B0DLMYYYYY': { title: 'Jabra Evolve2 75 Headset', price: 329.99 },
  'B0C1KZZZZZ': { title: 'Ergotron Sit-Stand Desk Mount', price: 259.00 },
  'B09HMKWWWW': { title: 'APC UPS Battery Backup 1500VA', price: 219.99 },
};

// ── API Routes ───────────────────────────────────────────

// List vendors
app.get('/api/vendors', (req, res) => {
  res.json(vendors);
});

// Create a quote request
app.post('/api/quotes', (req, res) => {
  const { shippingProvince, shippingPostalCode, desiredDeliveryDate, notes, items } = req.body;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  const qr = {
    id: uuid(),
    customer_id: uuid(),
    status: 'draft',
    shipping_province: shippingProvince,
    shipping_postal_code: shippingPostalCode || null,
    desired_delivery_date: desiredDeliveryDate || null,
    notes: notes || null,
    expires_at: expiresAt.toISOString(),
    created_at: new Date().toISOString(),
  };
  quoteRequests.push(qr);

  const createdItems = items.map(item => {
    const qi = {
      id: uuid(),
      quote_request_id: qr.id,
      asin: item.asin,
      product_title: item.title || (PRODUCTS[item.asin] || {}).title || `Product ${item.asin}`,
      quantity: item.quantity,
      target_unit_price: item.targetUnitPrice || null,
    };
    quoteItems.push(qi);
    return qi;
  });

  res.status(201).json({ ...qr, items: createdItems });
});

// Submit quote request → match vendors and auto-generate responses
app.post('/api/quotes/:id/submit', (req, res) => {
  const qr = quoteRequests.find(q => q.id === req.params.id);
  if (!qr) return res.status(404).json({ error: 'Not found' });

  qr.status = 'open';
  const items = quoteItems.filter(i => i.quote_request_id === qr.id);
  const asins = items.map(i => i.asin);

  // Match vendors that ship to this province
  const matched = vendors.filter(v =>
    v.accepts_quotes && v.ships_to_provinces.includes(qr.shipping_province)
  );

  // Auto-generate vendor quotes (simulating vendor responses)
  for (const vendor of matched) {
    for (const item of items) {
      const product = PRODUCTS[item.asin] || { price: 99.99 };
      const listPrice = product.price;

      // Find best discount tier for this vendor + asin + quantity
      const applicableTier = discountTiers
        .filter(t => t.vendor_id === vendor.id && t.asin === item.asin && t.min_quantity <= item.quantity)
        .sort((a, b) => b.min_quantity - a.min_quantity)[0];

      // Calculate discounted price — or a random small discount if no tier
      let unitPrice;
      if (applicableTier) {
        unitPrice = Math.round(listPrice * (1 - applicableTier.discount_percent / 100) * 100) / 100;
      } else {
        // Random 3-8% discount for vendors without tiers
        const randomDiscount = 3 + Math.random() * 5;
        unitPrice = Math.round(listPrice * (1 - randomDiscount / 100) * 100) / 100;
      }

      const vq = {
        id: uuid(),
        quote_request_id: qr.id,
        vendor_id: vendor.id,
        asin: item.asin,
        unit_price: unitPrice,
        min_quantity: 1,
        lead_time_days: Math.floor(3 + Math.random() * 10),
        vendor_notes: null,
        status: 'submitted',
        valid_until: qr.expires_at,
        created_at: new Date().toISOString(),
      };
      vendorQuotes.push(vq);
    }
  }

  qr.status = 'quoted';

  res.json({
    ...qr,
    items,
    matched_vendors: matched.map(v => ({
      id: v.id,
      business_name: v.business_name,
      rating: v.rating,
      match_score: v.rating * 10,
    })),
  });
});

// Compare vendor quotes
app.get('/api/quotes/:id/compare', (req, res) => {
  const qr = quoteRequests.find(q => q.id === req.params.id);
  if (!qr) return res.status(404).json({ error: 'Not found' });

  const items = quoteItems.filter(i => i.quote_request_id === qr.id);
  const vqs = vendorQuotes.filter(q => q.quote_request_id === qr.id && q.status === 'submitted');

  const byVendor = {};
  for (const vq of vqs) {
    if (!byVendor[vq.vendor_id]) {
      const vendor = vendors.find(v => v.id === vq.vendor_id);
      byVendor[vq.vendor_id] = { vendor, quotes: [], subtotal: 0 };
    }
    const item = items.find(i => i.asin === vq.asin);
    const qty = item ? item.quantity : 1;
    const lineTotal = Math.round(vq.unit_price * qty * 100) / 100;

    byVendor[vq.vendor_id].quotes.push({
      ...vq,
      quantity: qty,
      line_total: lineTotal,
    });
    byVendor[vq.vendor_id].subtotal += lineTotal;
  }

  const comparisons = Object.entries(byVendor).map(([vendorId, data]) => {
    const subtotal = Math.round(data.subtotal * 100) / 100;
    const tax = calculateTax(subtotal, qr.shipping_province);
    return {
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
    };
  });

  comparisons.sort((a, b) => a.total - b.total);

  res.json({
    quote_request: qr,
    items,
    comparisons,
    best_value: comparisons[0] || null,
  });
});

// Accept a vendor quote
app.post('/api/quotes/:id/accept', (req, res) => {
  const qr = quoteRequests.find(q => q.id === req.params.id);
  if (!qr) return res.status(404).json({ error: 'Not found' });

  const { vendorId } = req.body;
  qr.status = 'accepted';

  // Mark vendor quotes
  vendorQuotes.filter(q => q.quote_request_id === qr.id).forEach(q => {
    q.status = q.vendor_id === vendorId ? 'accepted' : 'rejected';
  });

  const acceptedQuotes = vendorQuotes.filter(q =>
    q.quote_request_id === qr.id && q.vendor_id === vendorId
  );
  const items = quoteItems.filter(i => i.quote_request_id === qr.id);
  let subtotal = 0;
  for (const aq of acceptedQuotes) {
    const item = items.find(i => i.asin === aq.asin);
    subtotal += aq.unit_price * (item ? item.quantity : 1);
  }
  subtotal = Math.round(subtotal * 100) / 100;
  const tax = calculateTax(subtotal, qr.shipping_province);

  const po = {
    id: uuid(),
    quote_request_id: qr.id,
    vendor_id: vendorId,
    customer_id: qr.customer_id,
    subtotal,
    tax_amount: tax.total,
    total: Math.round((subtotal + tax.total) * 100) / 100,
    status: 'created',
    created_at: new Date().toISOString(),
  };
  purchaseOrders.push(po);

  res.status(201).json(po);
});

// ── Vendor portal endpoints ──────────────────────────────

// Get pending RFQs for a vendor
app.get('/api/vendors/:vendorId/quotes', (req, res) => {
  const vqs = vendorQuotes.filter(q =>
    q.vendor_id === req.params.vendorId && q.status === 'pending'
  );
  const enriched = vqs.map(vq => {
    const qr = quoteRequests.find(q => q.id === vq.quote_request_id);
    const item = quoteItems.find(i => i.quote_request_id === vq.quote_request_id && i.asin === vq.asin);
    return {
      ...vq,
      shipping_province: qr ? qr.shipping_province : '',
      desired_delivery_date: qr ? qr.desired_delivery_date : null,
      quantity: item ? item.quantity : 0,
      product_title: item ? item.product_title : '',
      target_unit_price: item ? item.target_unit_price : null,
    };
  });
  res.json(enriched);
});

// Get submitted quotes for a vendor
app.get('/api/vendors/:vendorId/submitted', (req, res) => {
  const vqs = vendorQuotes.filter(q =>
    q.vendor_id === req.params.vendorId && q.status !== 'pending'
  );
  res.json(vqs);
});

// Vendor responds to an RFQ
app.post('/api/vendors/:vendorId/quotes/:quoteRequestId/respond', (req, res) => {
  const vq = vendorQuotes.find(q =>
    q.quote_request_id === req.params.quoteRequestId &&
    q.vendor_id === req.params.vendorId &&
    q.asin === req.body.asin
  );
  if (!vq) return res.status(404).json({ error: 'Not found' });

  vq.unit_price = req.body.unitPrice;
  vq.lead_time_days = req.body.leadTimeDays || null;
  vq.vendor_notes = req.body.vendorNotes || null;
  vq.status = 'submitted';

  res.json(vq);
});

// Get discount tiers for a vendor
app.get('/api/vendors/:vendorId/discount-tiers', (req, res) => {
  res.json(discountTiers.filter(t => t.vendor_id === req.params.vendorId));
});

// Add discount tier
app.post('/api/vendors/:vendorId/discount-tiers', (req, res) => {
  const { asin, minQuantity, discountPercent } = req.body;

  // Check for existing
  const existing = discountTiers.findIndex(t =>
    t.vendor_id === req.params.vendorId && t.asin === asin && t.min_quantity === minQuantity
  );
  if (existing >= 0) {
    discountTiers[existing].discount_percent = discountPercent;
    return res.status(201).json(discountTiers[existing]);
  }

  const tier = {
    id: uuid(),
    vendor_id: req.params.vendorId,
    asin,
    min_quantity: minQuantity,
    discount_percent: discountPercent,
  };
  discountTiers.push(tier);
  res.status(201).json(tier);
});

// Delete discount tier
app.delete('/api/vendors/:vendorId/discount-tiers/:tierId', (req, res) => {
  const idx = discountTiers.findIndex(t => t.id === req.params.tierId);
  if (idx >= 0) discountTiers.splice(idx, 1);
  res.json({ ok: true });
});

// ── Fallback to index.html ──────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Start ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Quote Engine Demo running at http://localhost:${PORT}\n`);
  console.log(`  Customer UI:   http://localhost:${PORT}/`);
  console.log(`  Vendor Portal: http://localhost:${PORT}/vendor.html\n`);
});
