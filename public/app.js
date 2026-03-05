/* ──────────────────────────────────────────────────────────
   Amazon Business Canada — Customer Quote Builder (frontend)
   Runs against mock /api endpoints served by Express.
   ────────────────────────────────────────────────────────── */

const API = '';  // same origin

// ── State ────────────────────────────────────────────────
let cart = [];
let currentStep = 1;
let activeQuoteId = null;

// ── Sample catalog (mirrors seed data) ───────────────────
const SAMPLE_PRODUCTS = [
  { asin: 'B09V3KXJPB', title: 'Logitech MX Mechanical Keyboard', price: 199.99 },
  { asin: 'B08N5WRWNW', title: 'Dell UltraSharp 27" 4K Monitor', price: 579.99 },
  { asin: 'B0BT9CXXXX', title: 'HP LaserJet Pro MFP Printer', price: 449.00 },
  { asin: 'B0DLMYYYYY', title: 'Jabra Evolve2 75 Headset', price: 329.99 },
  { asin: 'B0C1KZZZZZ', title: 'Ergotron Sit-Stand Desk Mount', price: 259.00 },
  { asin: 'B09HMKWWWW', title: 'APC UPS Battery Backup 1500VA', price: 219.99 },
];

// ── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderPopularProducts();
  setMinDeliveryDate();
});

function setMinDeliveryDate() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  document.getElementById('delivery-date').min = d.toISOString().split('T')[0];
}

// ── Popular products table ───────────────────────────────
function renderPopularProducts() {
  const tbody = document.getElementById('popular-products');
  tbody.innerHTML = SAMPLE_PRODUCTS.map(p => `
    <tr>
      <td><code>${p.asin}</code></td>
      <td>${p.title}</td>
      <td>$${p.price.toFixed(2)}</td>
      <td><button class="btn btn-outline btn-sm" onclick="quickAdd('${p.asin}','${p.title}',${p.price})">+ Add</button></td>
    </tr>
  `).join('');
}

// ── Cart management ──────────────────────────────────────
function addItem() {
  const asin = document.getElementById('asin-input').value.trim().toUpperCase();
  const qty = parseInt(document.getElementById('qty-input').value, 10);
  const target = parseFloat(document.getElementById('target-price-input').value) || null;

  if (!asin || asin.length !== 10) { toast('Enter a valid 10-character ASIN.', 'error'); return; }
  if (!qty || qty < 1) { toast('Enter a valid quantity.', 'error'); return; }
  if (cart.find(i => i.asin === asin)) { toast('ASIN already in cart.', 'error'); return; }

  const known = SAMPLE_PRODUCTS.find(p => p.asin === asin);
  cart.push({
    asin,
    title: known ? known.title : `Product ${asin}`,
    quantity: qty,
    targetUnitPrice: target,
  });

  document.getElementById('asin-input').value = '';
  document.getElementById('target-price-input').value = '';
  renderCart();
  toast(`Added ${asin}`, 'success');
}

function quickAdd(asin, title, price) {
  if (cart.find(i => i.asin === asin)) { toast('Already in cart.', 'info'); return; }
  cart.push({ asin, title, quantity: 100, targetUnitPrice: null });
  renderCart();
  toast(`Added ${title}`, 'success');
}

function removeItem(asin) {
  cart = cart.filter(i => i.asin !== asin);
  renderCart();
}

function clearCart() {
  cart = [];
  renderCart();
}

function renderCart() {
  const tbody = document.getElementById('cart-body');
  const count = document.getElementById('item-count');
  count.textContent = cart.length;
  document.getElementById('next-to-2').disabled = cart.length === 0;

  if (cart.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:24px;">No items added yet.</td></tr>';
    return;
  }

  tbody.innerHTML = cart.map(item => `
    <tr>
      <td><code>${item.asin}</code></td>
      <td>${item.title}</td>
      <td>
        <input type="number" value="${item.quantity}" min="1" style="width:80px"
               onchange="updateQty('${item.asin}', this.value)">
      </td>
      <td>${item.targetUnitPrice ? '$' + item.targetUnitPrice.toFixed(2) : '—'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="removeItem('${item.asin}')">Remove</button></td>
    </tr>
  `).join('');
}

function updateQty(asin, val) {
  const item = cart.find(i => i.asin === asin);
  if (item) item.quantity = Math.max(1, parseInt(val, 10) || 1);
}

// ── Stepper navigation ───────────────────────────────────
function goToStep(step) {
  // Validate step 2 before moving to 3
  if (step === 3) {
    const prov = document.getElementById('province-select').value;
    if (!prov) { toast('Please select a province.', 'error'); return; }
    renderReview();
  }

  currentStep = step;
  document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(`step-${step}`).classList.remove('hidden');

  document.querySelectorAll('.stepper .step').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove('active', 'done');
    if (s === step) el.classList.add('active');
    else if (s < step) el.classList.add('done');
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Step 3: Review ───────────────────────────────────────
function renderReview() {
  const tbody = document.getElementById('review-items');
  tbody.innerHTML = cart.map(item => `
    <tr>
      <td><code>${item.asin}</code></td>
      <td>${item.title}</td>
      <td>${item.quantity}</td>
      <td>${item.targetUnitPrice ? '$' + item.targetUnitPrice.toFixed(2) : '—'}</td>
    </tr>
  `).join('');

  const prov = document.getElementById('province-select');
  const provName = prov.options[prov.selectedIndex].text;
  const postal = document.getElementById('postal-code').value || '—';
  const date = document.getElementById('delivery-date').value || '—';
  const notes = document.getElementById('notes').value || '—';

  document.getElementById('review-shipping').innerHTML = `
    <div class="form-row">
      <div><label>Province</label><p>${provName}</p></div>
      <div><label>Postal Code</label><p>${postal}</p></div>
      <div><label>Desired Delivery</label><p>${date}</p></div>
    </div>
    <div><label>Notes</label><p>${notes}</p></div>
  `;
}

// ── Submit quote → mock API ──────────────────────────────
async function submitQuote() {
  const province = document.getElementById('province-select').value;

  try {
    // Create quote request
    const res = await fetch(`${API}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shippingProvince: province,
        shippingPostalCode: document.getElementById('postal-code').value,
        desiredDeliveryDate: document.getElementById('delivery-date').value || null,
        notes: document.getElementById('notes').value,
        items: cart,
      }),
    });
    const quote = await res.json();
    activeQuoteId = quote.id;

    // Submit to vendors
    const submitRes = await fetch(`${API}/api/quotes/${quote.id}/submit`, { method: 'POST' });
    const submitted = await submitRes.json();

    toast(`Quote sent to ${submitted.matched_vendors.length} vendors!`, 'success');

    // Simulate vendor responses after a short delay, then show comparison
    setTimeout(async () => {
      const compRes = await fetch(`${API}/api/quotes/${quote.id}/compare`);
      const comparison = await compRes.json();
      renderComparison(comparison);
      goToStep(4);
    }, 800);

  } catch (err) {
    toast('Error submitting quote. Check console.', 'error');
    console.error(err);
  }
}

// ── Step 4: Comparison view ──────────────────────────────
function renderComparison(data) {
  const area = document.getElementById('comparison-area');

  if (!data.comparisons || data.comparisons.length === 0) {
    area.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="icon">&#9203;</div>
          <p>Waiting for vendor responses... Vendors have been notified.</p>
        </div>
      </div>`;
    return;
  }

  area.innerHTML = `
    <div class="card mb-4">
      <div class="flex justify-between items-center">
        <div>
          <span class="badge badge-quoted">Quoted</span>
          <span class="text-sm text-muted" style="margin-left:8px">
            ${data.comparisons.length} vendor(s) responded &middot; Shipping to ${data.quote_request.shipping_province}
          </span>
        </div>
      </div>
    </div>
    <div class="comparison-grid">
      ${data.comparisons.map((c, i) => renderVendorCard(c, i === 0)).join('')}
    </div>
  `;
}

function renderVendorCard(comp, isBest) {
  const taxLines = comp.tax.components.map(t =>
    `<div class="price-row"><span>${t.name} (${t.rate}%)</span><span>$${t.amount.toFixed(2)}</span></div>`
  ).join('');

  const itemLines = comp.quotes.map(q =>
    `<div class="price-row">
      <span><code>${q.asin}</code> x ${q.quantity}</span>
      <span>$${q.unit_price.toFixed(2)} ea &rarr; $${q.line_total.toFixed(2)}</span>
    </div>`
  ).join('');

  return `
    <div class="vendor-card ${isBest ? 'best' : ''}">
      <div class="vendor-name">
        ${comp.vendor.business_name}
        ${isBest ? '<span class="best-badge">BEST VALUE</span>' : ''}
      </div>
      <div class="vendor-meta">
        Rating: ${comp.vendor.rating}/5.00 &middot; ${comp.vendor.fulfillment_type}
      </div>
      ${itemLines}
      <div class="price-row"><span>Subtotal</span><span>$${comp.subtotal.toFixed(2)}</span></div>
      ${taxLines}
      <div class="price-row total-row"><span>Total (CAD)</span><span>$${comp.total.toFixed(2)}</span></div>
      <div class="mt-4">
        <button class="btn ${isBest ? 'btn-success' : 'btn-primary'} btn-sm" style="width:100%"
                onclick="acceptVendor('${comp.vendor.id}', '${comp.vendor.business_name}')">
          ${isBest ? 'Accept Best Quote' : 'Accept This Quote'}
        </button>
      </div>
    </div>
  `;
}

async function acceptVendor(vendorId, vendorName) {
  try {
    const res = await fetch(`${API}/api/quotes/${activeQuoteId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId }),
    });
    const po = await res.json();
    toast(`Purchase order created with ${vendorName} — PO #${po.id.slice(0, 8)}`, 'success');

    document.getElementById('comparison-area').innerHTML += `
      <div class="card mt-4" style="border: 2px solid var(--success);">
        <h2>Purchase Order Created</h2>
        <div class="form-row">
          <div><label>PO ID</label><p><code>${po.id}</code></p></div>
          <div><label>Vendor</label><p>${vendorName}</p></div>
          <div><label>Total</label><p><strong>$${po.total.toFixed(2)} CAD</strong></p></div>
          <div><label>Status</label><p><span class="badge badge-accepted">${po.status}</span></p></div>
        </div>
      </div>
    `;
  } catch (err) {
    toast('Error accepting quote.', 'error');
    console.error(err);
  }
}

function resetQuote() {
  cart = [];
  activeQuoteId = null;
  renderCart();
  document.getElementById('province-select').value = '';
  document.getElementById('postal-code').value = '';
  document.getElementById('delivery-date').value = '';
  document.getElementById('notes').value = '';
  goToStep(1);
}

// ── Toast notifications ──────────────────────────────────
function toast(msg, type = 'info') {
  const container = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
