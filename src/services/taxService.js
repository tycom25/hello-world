/**
 * Canadian sales tax calculator.
 *
 * Tax types:
 *   GST  — 5% federal goods & services tax (all provinces)
 *   HST  — Harmonized sales tax (replaces GST+PST in participating provinces)
 *   PST  — Provincial sales tax (BC, SK, MB)
 *   QST  — Quebec sales tax
 *
 * As of 2024:
 *   AB, NT, NU, YT — GST only (5%)
 *   BC             — GST (5%) + PST (7%)
 *   MB             — GST (5%) + PST (7%)
 *   SK             — GST (5%) + PST (6%)
 *   QC             — GST (5%) + QST (9.975%)
 *   ON             — HST (13%)
 *   NB             — HST (15%)
 *   NL             — HST (15%)
 *   NS             — HST (15%)
 *   PE             — HST (15%)
 */

const TAX_RATES = {
  // HST provinces (single combined rate)
  ON: { type: 'HST', hst: 13.0 },
  NB: { type: 'HST', hst: 15.0 },
  NL: { type: 'HST', hst: 15.0 },
  NS: { type: 'HST', hst: 15.0 },
  PE: { type: 'HST', hst: 15.0 },

  // GST + PST provinces
  BC: { type: 'GST_PST', gst: 5.0, pst: 7.0 },
  SK: { type: 'GST_PST', gst: 5.0, pst: 6.0 },
  MB: { type: 'GST_PST', gst: 5.0, pst: 7.0 },

  // GST + QST (Quebec)
  QC: { type: 'GST_QST', gst: 5.0, qst: 9.975 },

  // GST-only territories / provinces
  AB: { type: 'GST', gst: 5.0 },
  NT: { type: 'GST', gst: 5.0 },
  NU: { type: 'GST', gst: 5.0 },
  YT: { type: 'GST', gst: 5.0 },
};

class TaxService {
  /**
   * Calculate Canadian sales tax for a given subtotal and province.
   *
   * @param {number} subtotal - Pre-tax amount in CAD
   * @param {string} province - 2-letter province/territory code
   * @returns {Object} Tax breakdown with individual components and total
   */
  calculateTax(subtotal, province) {
    const rates = TAX_RATES[province.toUpperCase()];
    if (!rates) {
      throw new Error(`Unknown province code: ${province}`);
    }

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

  /**
   * Get the applicable tax rates for a province.
   * @param {string} province
   * @returns {Object} Rate info
   */
  getRates(province) {
    const rates = TAX_RATES[province.toUpperCase()];
    if (!rates) throw new Error(`Unknown province code: ${province}`);
    return rates;
  }
}

module.exports = TaxService;
