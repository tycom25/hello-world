/* ──────────────────────────────────────────────────────────
   Amazon Business Canada — Vendor Portal (frontend)
   ────────────────────────────────────────────────────────── */

const API = '';

let selectedVendor = null;

// ── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadVendorList);

async function loadVendorList() {
  try {
    const res = await fetch(`${API}/api/vendors`);
    const vendors = await res.json();
    const sel = document.getElementById('vendor-select');
    vendors.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `${v.business_name} (${v.seller_id}) — ${v.rating}/5`;
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load vendors', err);
  }
}

async function loadVendorQuotes() {
  const vendorId = document.getElementById('vendor-select').value;
  if (!vendorId) {
    document.getElementById('vendor-rfqs').classList.add('hidden');
    document.getElementById('vendor-empty').classList.remove('hidden');
    return;
  }

  selectedVendor = vendorId;
  document.getElementById('vendor-rfqs').classList.remove('hidden');
  document.getElementById('vendor-empty').classList.add('hidden');

  await Promise.all([
    loadPendingRfqs(vendorId),
    loadSubmittedQuotes(vendorId),
    loadDiscountTiers(vendorId),
  ]);
}

// ── Pending RFQs ─────────────────────────────────────────
async function loadPendingRfqs(vendorId) {
  try {
    const res = await fetch(`${API}/api/vendors/${vendorId}/quotes`);
    const rfqs = await res.json();
    const tbody = document.getElementById('rfq-body');
    document.getElementById('pending-count').textContent = `${rfqs.length} pending`;

    if (rfqs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-muted" style="text-align:center;padding:24px">No pending quote requests.</td></tr>';
      return;
    }

    tbody.innerHTML = rfqs.map(r => `
      <tr>
        <td><code>${r.quote_request_id.slice(0, 8)}</code></td>
        <td><code>${r.asin}</code></td>
        <td>${r.product_title || 'N/A'}</td>
        <td>${r.quantity}</td>
        <td>${r.target_unit_price ? '$' + parseFloat(r.target_unit_price).toFixed(2) : '—'}</td>
        <td>${r.shipping_province}</td>
        <td>${r.desired_delivery_date || '—'}</td>
        <td><input type="number" id="price-${r.id}" step="0.01" min="0.01" placeholder="$" style="width:90px"></td>
        <td><input type="number" id="lead-${r.id}" min="0" placeholder="days" style="width:70px"></td>
        <td>
          <button class="btn btn-primary btn-sm"
                  onclick="respondToRfq('${r.quote_request_id}','${r.asin}','${r.id}')">
            Submit
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load RFQs', err);
  }
}

async function respondToRfq(quoteRequestId, asin, rfqRowId) {
  const price = parseFloat(document.getElementById(`price-${rfqRowId}`).value);
  const lead = parseInt(document.getElementById(`lead-${rfqRowId}`).value, 10) || null;

  if (!price || price <= 0) { toast('Enter a valid price.', 'error'); return; }

  try {
    await fetch(`${API}/api/vendors/${selectedVendor}/quotes/${quoteRequestId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asin,
        unitPrice: price,
        leadTimeDays: lead,
      }),
    });
    toast(`Quote submitted for ${asin} at $${price.toFixed(2)}`, 'success');
    await loadVendorQuotes();
  } catch (err) {
    toast('Failed to submit quote.', 'error');
    console.error(err);
  }
}

// ── Submitted quotes ─────────────────────────────────────
async function loadSubmittedQuotes(vendorId) {
  try {
    const res = await fetch(`${API}/api/vendors/${vendorId}/submitted`);
    const quotes = await res.json();
    const tbody = document.getElementById('submitted-body');

    if (quotes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:24px">No submitted quotes yet.</td></tr>';
      return;
    }

    tbody.innerHTML = quotes.map(q => `
      <tr>
        <td><code>${q.quote_request_id.slice(0, 8)}</code></td>
        <td><code>${q.asin}</code></td>
        <td>$${parseFloat(q.unit_price).toFixed(2)}</td>
        <td>${q.lead_time_days ? q.lead_time_days + ' days' : '—'}</td>
        <td><span class="badge badge-${q.status}">${q.status}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load submitted quotes', err);
  }
}

// ── Discount tiers ───────────────────────────────────────
async function loadDiscountTiers(vendorId) {
  try {
    const res = await fetch(`${API}/api/vendors/${vendorId}/discount-tiers`);
    const tiers = await res.json();
    const tbody = document.getElementById('tiers-body');

    if (tiers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-muted" style="text-align:center;padding:24px">No discount tiers configured.</td></tr>';
      return;
    }

    tbody.innerHTML = tiers.map(t => `
      <tr>
        <td><code>${t.asin}</code></td>
        <td>${t.min_quantity}+</td>
        <td>${parseFloat(t.discount_percent).toFixed(1)}%</td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteTier('${t.id}')">Remove</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load tiers', err);
  }
}

async function addTier() {
  const asin = document.getElementById('tier-asin').value.trim().toUpperCase();
  const minQty = parseInt(document.getElementById('tier-min-qty').value, 10);
  const discount = parseFloat(document.getElementById('tier-discount').value);

  if (!asin || asin.length !== 10) { toast('Enter a valid ASIN.', 'error'); return; }
  if (!minQty || minQty < 1) { toast('Enter a valid minimum quantity.', 'error'); return; }
  if (!discount || discount <= 0) { toast('Enter a valid discount %.', 'error'); return; }

  try {
    await fetch(`${API}/api/vendors/${selectedVendor}/discount-tiers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asin, minQuantity: minQty, discountPercent: discount }),
    });
    toast(`Tier added: ${asin} at ${minQty}+ units = ${discount}% off`, 'success');
    document.getElementById('tier-asin').value = '';
    document.getElementById('tier-min-qty').value = '';
    document.getElementById('tier-discount').value = '';
    await loadDiscountTiers(selectedVendor);
  } catch (err) {
    toast('Failed to add tier.', 'error');
    console.error(err);
  }
}

async function deleteTier(tierId) {
  try {
    await fetch(`${API}/api/vendors/${selectedVendor}/discount-tiers/${tierId}`, { method: 'DELETE' });
    toast('Tier removed.', 'success');
    await loadDiscountTiers(selectedVendor);
  } catch (err) {
    toast('Failed to delete tier.', 'error');
  }
}

// ── Toast ────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const container = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
