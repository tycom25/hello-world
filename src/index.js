require('dotenv').config();
const express = require('express');
const logger = require('./utils/logger');
const ExpiryService = require('./services/expiryService');

const catalogRoutes = require('./routes/catalog');
const quoteRoutes = require('./routes/quotes');
const vendorRoutes = require('./routes/vendors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/catalog', catalogRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/vendors', vendorRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'amazon-business-quote-engine' });
});

// Error handler
app.use((err, req, res, _next) => {
  logger.error(err.message, { stack: err.stack });
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Quote engine running on port ${PORT}`);

  // Start background expiry service
  const expiryService = new ExpiryService();
  expiryService.start();
});

module.exports = app;
