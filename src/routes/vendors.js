const express = require('express');
const { body, param, validationResult } = require('express-validator');
const QuoteService = require('../services/quoteService');
const db = require('../db');

const router = express.Router();
const quoteService = new QuoteService();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

/**
 * GET /api/vendors/:vendorId/quotes
 * List pending RFQs for a vendor (vendor portal).
 */
router.get(
  '/:vendorId/quotes',
  [param('vendorId').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const pendingQuotes = await db('vendor_quotes')
        .where({ vendor_id: req.params.vendorId, status: 'pending' })
        .join('quote_requests', 'quote_requests.id', 'vendor_quotes.quote_request_id')
        .join('quote_items', function () {
          this.on('quote_items.quote_request_id', '=', 'vendor_quotes.quote_request_id')
            .andOn('quote_items.asin', '=', 'vendor_quotes.asin');
        })
        .select(
          'vendor_quotes.*',
          'quote_requests.shipping_province',
          'quote_requests.desired_delivery_date',
          'quote_items.quantity',
          'quote_items.product_title',
          'quote_items.target_unit_price'
        );

      res.json(pendingQuotes);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/vendors/:vendorId/quotes/:quoteRequestId/respond
 * Submit a vendor's price response for a quote request.
 */
router.post(
  '/:vendorId/quotes/:quoteRequestId/respond',
  [
    param('vendorId').isUUID(),
    param('quoteRequestId').isUUID(),
    body('asin').isString().isLength({ min: 10, max: 10 }),
    body('unitPrice').isFloat({ min: 0.01 }),
    body('minQuantity').optional().isInt({ min: 1 }),
    body('leadTimeDays').optional().isInt({ min: 0 }),
    body('vendorNotes').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await quoteService.submitVendorQuote({
        quoteRequestId: req.params.quoteRequestId,
        vendorId: req.params.vendorId,
        asin: req.body.asin,
        unitPrice: req.body.unitPrice,
        minQuantity: req.body.minQuantity,
        leadTimeDays: req.body.leadTimeDays,
        vendorNotes: req.body.vendorNotes,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/vendors/:vendorId/discount-tiers
 * Add or update a vendor's volume discount tier.
 */
router.post(
  '/:vendorId/discount-tiers',
  [
    param('vendorId').isUUID(),
    body('asin').isString().isLength({ min: 10, max: 10 }),
    body('minQuantity').isInt({ min: 1 }),
    body('discountPercent').isFloat({ min: 0.01, max: 100 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const [tier] = await db('vendor_discount_tiers')
        .insert({
          vendor_id: req.params.vendorId,
          asin: req.body.asin,
          min_quantity: req.body.minQuantity,
          discount_percent: req.body.discountPercent,
        })
        .onConflict(['vendor_id', 'asin', 'min_quantity'])
        .merge()
        .returning('*');

      res.status(201).json(tier);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
