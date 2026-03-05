const express = require('express');
const { query, validationResult } = require('express-validator');
const CatalogService = require('../services/catalogService');

const router = express.Router();
const catalogService = new CatalogService();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

/**
 * GET /api/catalog/products?asins=B09V3KXJPB,B08N5WRWNW
 * Look up product details for one or more ASINs.
 */
router.get(
  '/products',
  [query('asins').isString().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const asins = req.query.asins.split(',').map((a) => a.trim());
      if (asins.length > 10) {
        return res.status(400).json({ error: 'Maximum 10 ASINs per request' });
      }
      const products = await catalogService.getProducts(asins);
      res.json(products);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/catalog/search?q=wireless+mouse&category=Electronics
 * Search for products on amazon.ca.
 */
router.get(
  '/search',
  [query('q').isString().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const results = await catalogService.searchProducts(req.query.q, req.query.category);
      res.json(results);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
