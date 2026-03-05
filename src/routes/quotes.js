const express = require('express');
const { body, param, validationResult } = require('express-validator');
const QuoteService = require('../services/quoteService');

const router = express.Router();
const quoteService = new QuoteService();

const PROVINCES = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
];

/** Validation error handler */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

/**
 * POST /api/quotes
 * Create a new quote request.
 */
router.post(
  '/',
  [
    body('customerId').isUUID(),
    body('shippingProvince').isIn(PROVINCES),
    body('shippingPostalCode').optional().matches(/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i),
    body('desiredDeliveryDate').optional().isISO8601(),
    body('items').isArray({ min: 1 }),
    body('items.*.asin').isString().isLength({ min: 10, max: 10 }),
    body('items.*.quantity').isInt({ min: 1 }),
    body('items.*.targetUnitPrice').optional().isFloat({ min: 0 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const quote = await quoteService.createQuoteRequest(req.body);
      res.status(201).json(quote);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/quotes/:id/submit
 * Submit a draft quote request — fans out RFQs to matched vendors.
 */
router.post(
  '/:id/submit',
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const result = await quoteService.submitQuoteRequest(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/quotes/:id/compare
 * Get a side-by-side comparison of vendor quotes with tax.
 */
router.get(
  '/:id/compare',
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const comparison = await quoteService.getQuoteComparison(req.params.id);
      res.json(comparison);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/quotes/:id/accept
 * Accept a vendor's quote and create a purchase order.
 */
router.post(
  '/:id/accept',
  [param('id').isUUID(), body('vendorId').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const po = await quoteService.acceptQuote(req.params.id, req.body.vendorId);
      res.status(201).json(po);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
