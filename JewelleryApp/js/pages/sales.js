/* Sales: invoice register, branded GST tax invoice view/print and cancellation */
(function (global) {
  'use strict';
  const esc = U.esc;

  function invoiceHtml(inv) {
    const s = DB.settings;
    const c = DB.get('customers', inv.customerId) || {};
    const gstHalf = (l) => U.n(l.gstPct) / 2;
    const lineRows = inv.lines.map((l, i) =>
      '<tr><td>' + (i + 1) + '</td>' +
      '<td><b>' + esc(l.itemName) + '</b><br><small>Tag ' + esc(l.tagNo) + (l.huid ? ' &middot; HUID ' + esc(l.huid) : '') + '</small></td>' +
      '<td>' + esc(l.hsn) + '</td>' +
      '<td>' + esc(l.pricing === 'FIXED' ? '-' : Biz.purityName(l.purityId)) + '</td>' +
      '<td class="right">' + (l.pricing === 'FIXED' ? '-' : U.num(l.grossWt)) + '</td>' +
      '<td class="right">' + (l.pricing === 'FIXED' ? '-' : U.num(l.netWt) + (U.n(l.wastagePct) ? '<br><small>+' + l.wastagePct + '% VA</small>' : '')) + '</td>' +
      '<td class="right">' + (l.pricing === 'FIXED' ? '-' : U.num(l.rate, 2)) + '</td>' +
      '<td class="right">' + (l.pricing === 'FIXED' ? '-' : U.num(l.metalValue, 2)) + '</td>' +
      '<td class="right">' + (l.pricing === 'FIXED' ? '-' : U.num(l.making, 2)) + '</td>' +
      '<td class="right">' + U.num(U.n(l.stoneValue) + U.n(l.otherCharges) + (l.pricing === 'FIXED' ? U.n(l.fixedPrice) * U.n(l.qty || 1) : 0), 2) + '</td>' +
      '<td class="right">' + U.num(l.amount, 2) + '</td></tr>').join('');
    const og = inv.oldGold && inv.oldGold.length ? '<h4>Old gold / exchange received</h4><table class="inv-table"><thead><tr><th>Description</th><th>Purity</th><th class="right">Gross g</th><th class="right">Less %</th><th class="right">Net g</th><th class="right">Rate</th><th class="right">Value</th></tr></thead><tbody>' +
      inv.oldGold.map((o) => '<tr><td>' + esc(o.description) + '</td><td>' + esc(Biz.purityName(o.purityId)) + '</td><td class="right">' + U.num(o.grossWt) + '</td><td class="right">' + U.n(o.deductionPct) + '</td><td class="right">' + U.num(o.netWt) + '</td><td class="right">' + U.num(o.rate, 2) + '</td><td class="right">' + U.num(o.value, 2) + '</td></tr>').join('') + '</tbody></table>' : '';
    const pct = inv.lines.length ? gstHalf(inv.lines[0]) : 1.5;
    const mixed = inv.lines.some((l) => U.n(l.gstPct) !== U.n(inv.lines[0].gstPct));
    const row = (label, val, cls) => '<tr class="' + (cls || '') + '"><td>' + label + '</td><td class="right">' + val + '</td></tr>';

    return '<div class="invoice">' +
      (inv.status === 'CANCELLED' ? '<div class="stamp">CANCELLED</div>' : '') +
      '<header class="inv-head">' +
      (s.logo ? '<img src="' + esc(s.logo) + '" alt="" class="inv-logo">' : '') +
      '<div class="inv-shop"><h2>' + esc(s.shopName) + '</h2><p>' + esc(s.address) + '<br>' + esc([s.phone, s.email].filter(Boolean).join(' | ')) + '</p>' +
      '<p><b>GSTIN:</b> ' + esc(s.gstin) + (s.bisLicence ? ' &nbsp; <b>BIS Licence:</b> ' + esc(s.bisLicence) : '') + '</p></div>' +
      '<div class="inv-title"><h3>TAX INVOICE</h3><p><b>' + esc(inv.invoiceNo) + '</b><br>Date: ' + U.fmtDate(inv.date) + '</p></div></header>' +
      '<section class="inv-parties"><div><h4>Bill to</h4><p><b>' + esc(c.name) + '</b><br>' + esc([c.address, c.city, c.state].filter(Boolean).join(', ')) +
      (c.phone ? '<br>Mobile: ' + esc(c.phone) : '') + (c.gstin ? '<br>GSTIN: ' + esc(c.gstin) : '') + (c.pan ? '<br>PAN: ' + esc(c.pan) : '') + '</p></div>' +
      '<div><h4>Place of supply</h4><p>' + esc(inv.interState ? (c.state || 'Other state') : (s.state + ' (' + s.stateCode + ')')) + '</p></div></section>' +
      '<table class="inv-table"><thead><tr><th>#</th><th>Item</th><th>HSN</th><th>Purity</th><th class="right">Gross g</th><th class="right">Net g</th><th class="right">Rate/g</th><th class="right">Metal ₹</th><th class="right">Making ₹</th><th class="right">Stone/Other ₹</th><th class="right">Amount ₹</th></tr></thead><tbody>' + lineRows + '</tbody></table>' +
      '<div class="inv-bottom"><div class="inv-words">' + og +
      '<p><b>Amount in words:</b> ' + esc(U.amountInWords(inv.grandTotal)) + '</p>' +
      (inv.payments.length ? '<p><b>Payment:</b> ' + inv.payments.map((p) => esc(p.mode) + ' ' + U.inr(p.amount) + (p.ref ? ' (' + esc(p.ref) + ')' : '')).join(', ') + '</p>' : '') +
      (inv.notes ? '<p><b>Notes:</b> ' + esc(inv.notes) + '</p>' : '') + '</div>' +
      '<table class="inv-totals">' +
      row('Sub total', U.inr(inv.subTotal)) +
      (inv.discount ? row('Discount', '- ' + U.inr(inv.discount)) : '') +
      row('Taxable value', U.inr(inv.taxable)) +
      (inv.interState ? row('IGST' + (mixed ? '' : ' @ ' + pct * 2 + '%'), U.inr(inv.igst))
        : row('CGST' + (mixed ? '' : ' @ ' + pct + '%'), U.inr(inv.cgst)) + row('SGST' + (mixed ? '' : ' @ ' + pct + '%'), U.inr(inv.sgst))) +
      row('Invoice value', U.inr(inv.invoiceValue)) +
      (inv.oldGoldValue ? row('Less: old gold', '- ' + U.inr(inv.oldGoldValue)) : '') +
      (inv.roundOff ? row('Round off', U.inr(inv.roundOff)) : '') +
      row('<b>Net payable</b>', '<b>' + U.inr(inv.grandTotal) + '</b>', 'grand') +
      row('Paid', U.inr(inv.paid)) +
      (inv.settlements && inv.settlements.length ? row('Received later', U.inr(U.sum(inv.settlements, 'amount'))) : '') +
      (inv.balance > 0 ? row('<b>Balance due</b>', '<b>' + U.inr(inv.balance) + '</b>') : '') +
      '</table></div>' +
      '<footer class="inv-foot"><div class="terms"><b>Terms &amp; conditions</b><br>' + esc(s.terms || '').replace(/\n/g, '<br>') + '</div>' +
      '<div class="sign"><span>Customer signature</span><span>For ' + esc(s.shopName) + '<br><br>Authorised signatory</span></div></footer></div>';
  }

  function viewInvoice(inv, onChange) {
    const actions = [{ label: 'Close' }];
    if (inv.status !== 'CANCELLED' && Auth.can(['Admin', 'Manager'])) {
      actions.push({ label: 'Cancel invoice', cls: 'btn danger', onClick: () => { cancelInvoice(inv, onChange); } });
    }
    const due = DB.customerSummary(inv.customerId).outstanding;
    if (inv.status !== 'CANCELLED' && due > 0 && inv.customerId !== 'cus_walkin') {
      actions.push({ label: 'Receive payment', cls: 'btn', onClick: () => { CRM.receivePayment(DB.get('customers', inv.customerId), onChange); } });
    }
    actions.push({ label: 'Print', cls: 'btn primary', onClick: () => { UI.print(invoiceHtml(inv)); return false; } });
    UI.modal({ title: 'Invoice ' + inv.invoiceNo, size: 'xl', body: '<div class="invoice-preview">' + invoiceHtml(inv) + '</div>', actions });
  }

  async function cancelInvoice(inv, onChange) {
    if (!(await UI.confirm('Cancel invoice ' + inv.invoiceNo + '? Items will go back into stock.', 'Cancel invoice'))) return;
    inv.lines.forEach((l) => {
      const piece = DB.get('stock', l.stockId);
      if (piece) Object.assign(piece, { status: 'IN_STOCK', soldInvoiceId: '' });
    });
    DB.update('invoices', inv.id, { status: 'CANCELLED', cancelledBy: Auth.user.username, cancelledAt: new Date().toISOString() });
    UI.toast('Invoice cancelled and stock restored');
    if (onChange) onChange();
  }

  Pages.register({
    id: 'sales', title: 'Sales & Invoices', icon: '&#9776;',
    render(el, params) {
      const state = { from: U.addDays(U.today(), -30), to: U.today(), q: '', status: '' };
      el.innerHTML = '<section class="card"><div class="toolbar wrap">' +
        '<label class="inline">From <input type="date" data-f="from" value="' + state.from + '"></label>' +
        '<label class="inline">To <input type="date" data-f="to" value="' + state.to + '"></label>' +
        '<input type="search" data-f="q" placeholder="Invoice no, customer, tag...">' +
        '<select data-f="status"><option value="">All</option><option value="ACTIVE">Active</option><option value="DUE">With balance due</option><option value="CANCELLED">Cancelled</option></select>' +
        '<span class="spacer"></span><a class="btn primary" href="#/pos">+ New sale</a></div>' +
        '<div class="s-summary stock-summary"></div><div class="s-body"></div></section>';

      const draw = () => {
        const q = state.q.toLowerCase();
        const rows = DB.all('invoices').filter((i) => {
          if (!U.inRange(i.date, state.from, state.to)) return false;
          if (state.status === 'DUE' && !(i.status !== 'CANCELLED' && i.balance > 0)) return false;
          if (state.status && state.status !== 'DUE' && i.status !== state.status) return false;
          if (q) {
            const c = DB.get('customers', i.customerId) || {};
            if (![i.invoiceNo, c.name, c.phone].concat(i.lines.map((l) => l.tagNo)).some((v) => String(v || '').toLowerCase().includes(q))) return false;
          }
          return true;
        }).sort((a, b) => (a.invoiceNo < b.invoiceNo ? 1 : -1));
        const active = rows.filter((r) => r.status !== 'CANCELLED');
        el.querySelector('.s-summary').innerHTML = '<span><b>' + active.length + '</b> bills</span>' +
          '<span>Sales <b>' + U.inr(U.sum(active, 'grandTotal'), { whole: true }) + '</b></span>' +
          '<span>GST <b>' + U.inr(U.sum(active, 'totalTax'), { whole: true }) + '</b></span>' +
          '<span>Old gold <b>' + U.inr(U.sum(active, 'oldGoldValue'), { whole: true }) + '</b></span>' +
          '<span>Due <b>' + U.inr(U.sum(active, 'balance'), { whole: true }) + '</b></span>';
        el.querySelector('.s-body').innerHTML = UI.table({
          columns: [
            { label: 'Invoice', render: (i) => '<b>' + esc(i.invoiceNo) + '</b>' },
            { label: 'Date', render: (i) => U.fmtDate(i.date) },
            { label: 'Customer', render: (i) => esc(DB.name('customers', i.customerId)) },
            { label: 'Items', render: (i) => esc(i.lines.map((l) => l.itemName).join(', ')) },
            { label: 'Net wt', align: 'right', render: (i) => U.num(U.sum(i.lines, 'netWt')) },
            { label: 'Total', align: 'right', render: (i) => U.inr(i.grandTotal, { whole: true }) },
            { label: 'Status', render: (i) => (i.status === 'CANCELLED' ? UI.badge('Cancelled', 'err') : i.balance > 0 ? UI.badge('Due ' + U.inr(i.balance, { whole: true }), 'warn') : UI.badge('Paid', 'ok')) },
            { label: 'By', key: 'createdBy' },
          ],
          rows, empty: 'No invoices in this period',
          rowAttr: (i) => 'class="clickable" data-open="' + i.id + '"',
        });
      };
      el.querySelectorAll('[data-f]').forEach((i) => i.addEventListener('input', U.debounce(() => { state[i.dataset.f] = i.value.trim(); draw(); }, 150)));
      el.querySelector('.s-body').addEventListener('click', (e) => {
        const r = e.target.closest('[data-open]');
        if (r) viewInvoice(DB.get('invoices', r.dataset.open), draw);
      });
      draw();
      if (params.open) { const inv = DB.get('invoices', params.open); if (inv) viewInvoice(inv, draw); }
    },
  });

  global.InvoiceUI = { html: invoiceHtml, view: viewInvoice };
})(window);
