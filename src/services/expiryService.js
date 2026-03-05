const cron = require('node-cron');
const db = require('../db');
const logger = require('../utils/logger');

/**
 * Handles automatic expiry of quote requests and sends reminders.
 */
class ExpiryService {
  /**
   * Start the scheduled expiry checker.
   * Runs daily at 2:00 AM ET.
   */
  start() {
    // Expire overdue quotes every day at 2 AM
    cron.schedule('0 2 * * *', () => this.expireOverdueQuotes());

    // Send reminders at 9 AM for quotes expiring soon
    const reminderDays = parseInt(process.env.QUOTE_REMINDER_DAYS_BEFORE || '3', 10);
    cron.schedule('0 9 * * *', () => this.sendExpiryReminders(reminderDays));

    logger.info('Expiry service started');
  }

  /**
   * Mark all quote requests past their expiry date as expired.
   */
  async expireOverdueQuotes() {
    const now = new Date();
    const expired = await db('quote_requests')
      .whereIn('status', ['open', 'quoted'])
      .where('expires_at', '<', now)
      .update({ status: 'expired', updated_at: now })
      .returning('id');

    // Also expire associated vendor quotes
    if (expired.length > 0) {
      await db('vendor_quotes')
        .whereIn('quote_request_id', expired.map((r) => r.id))
        .whereIn('status', ['pending', 'submitted'])
        .update({ status: 'expired', updated_at: now });
    }

    logger.info('Expired overdue quotes', { count: expired.length });
    return expired;
  }

  /**
   * Find quotes expiring within `days` and send reminder notifications.
   * @param {number} days
   */
  async sendExpiryReminders(days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const expiringSoon = await db('quote_requests')
      .whereIn('status', ['open', 'quoted'])
      .where('expires_at', '<=', cutoff)
      .where('expires_at', '>', new Date());

    for (const quote of expiringSoon) {
      // In production, send email/notification to customer
      logger.info('Expiry reminder', {
        quoteId: quote.id,
        customerId: quote.customer_id,
        expiresAt: quote.expires_at,
      });
    }

    return expiringSoon;
  }
}

module.exports = ExpiryService;
