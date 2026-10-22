/* Purchases: inward stock from vendors (creates tagged pieces) and vendor payments */
(function (global) {
  'use strict';
  const esc = U.esc;

  function vendorPayment(vendorId, onDone) {
    const fields = [
      { name: 'vendorId', label: 'Vendor', type: 'select', required: true, options: () => DB.all('vendors').map((v) => ({ value: v.id, label: v.name })) },
      { name: 'date', label: 'Date', type: 'date', required: true, default: U.today() },
      { name: 'amount', label: 'Amount paid (₹)', type: 'number', required: true, min: 1 },
      { name: 'mode', label: 'Mode', type: 'select', required: true, options: DB.all('paymentModes').map((m) => m.name) },
      { name: 'ref', label: 'Reference / UTR / Cheque no.' },
      { name: 'notes', label: 'Notes', full: true },
    ];
    const vals = { vendorId };
    if (vendorId) vals.amount = Math.max(0, DB.vendorSummary(vendorId).payable) || '';
    UI.modal({
      title: 'Pay vendor', body: UI.formHtml(fields, vals),
      actions: [{ label: 'Cancel' }, {
        label: 'Save payment', cls: 'btn primary', onClick: (el) => {
          const d = UI.readForm(el, fields);
          if (!d) return false;
          d.by = Auth.user.username;
          DB.insert('vendorPayments', d);
          UI.toast('Payment recorded');
          if (onDone) onDone();
        },
      }],
    });
  }

  function lineRow(l, i) {
    const items = DB.all('items').filter((x) => x.active !== false).sort((a, b) => (a.code < b.code ? -1 : 1));
    const purities = DB.all('purities');
    return '<tr data-i="' + i + '">' +
      '<td><select data-k="itemId"><option value="">-- item --</option>' + items.map((it) => '<option value="' + it.id + '"' + (it.id === l.itemId ? ' selected' : '') + '>' + esc(it.code + ' - ' + it.name) + '</option>').join('') + '</select></td>' +
      '<td><select data-k="purityId"><option value="">-</option>' + purities.map((p) => '<option value="' + p.id + '"' + (p.id === l.purityId ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select></td>' +
      '<td><input type="number" step="0.001" min="0" data-k="grossWt" value="' + esc(l.grossWt) + '"></td>' +
      '<td><input type="number" step="0.001" min="0" data-k="stoneWt" value="' + esc(l.stoneWt) + '"></td>' +
      '<td><input type="number" step="0.001" min="0" data-k="netWt" value="' + esc(l.netWt) + '"></td>' +
      '<td><input type="number" min="0" data-k="stoneValue" value="' + esc(l.stoneValue) + '"></td>' +
      '<td><input data-k="huid" maxlength="6" value="' + esc(l.huid) + '"></td>' +
      '<td><input type="number" min="0" data-k="fixedPrice" value="' + esc(l.fixedPrice) + '" title="Only for fixed price items"></td>' +
      '<td><input type="number" min="0" data-k="amount" value="' + esc(l.amount) + '"></td>' +
      '<td class="nowrap"><button class="icon-btn" data-dup="' + i + '" title="Duplicate row">&#10697;</button><button class="icon-btn danger" data-rm="' + i + '" title="Remove">&times;</button></td></tr>';
  }

  function newPurchase(onDone) {
    const lines = [{ itemId: '', purityId: 'G22K', grossWt: '', stoneWt: '', netWt: '', stoneValue: '', huid: '', fixedPrice: '', amount: '' }];
    const head = [
      { name: 'vendorId', label: 'Vendor', type: 'select', required: true, options: () => DB.all('vendors').map((v) => ({ value: v.id, label: v.name })) },
      { name: 'billNo', label: 'Vendor bill no.', required: true },
      { name: 'billDate', label: 'Bill date', type: 'date', required: true, default: U.today() },
      { name: 'gstPct', label: 'GST % on purchase', type: 'number', min: 0, default: 3 },
      { name: 'paid', label: 'Paid now (₹)', type: 'number', min: 0, default: 0 },
      { name: 'mode', label: 'Payment mode', type: 'select', options: DB.all('paymentModes').map((m) => m.name) },
      { name: 'location', label: 'Put stock in', type: 'select', required: true, options: ['Counter 1', 'Counter 2', 'Counter 3', 'Locker', 'Display Window'] },
      { name: 'notes', label: 'Notes', full: true },
    ];

    UI.modal({
      title: 'Purchase entry (stock inward)', size: 'xl',
      body: UI.formHtml(head, { location: 'Locker' }) +
        '<div class="table-wrap"><table class="grid edit-grid"><thead><tr><th>Item</th><th>Purity</th><th>Gross g</th><th>Stone g</th><th>Net g</th><th>Stone ₹</th><th>HUID</th><th>MRP ₹</th><th>Cost ₹</th><th></th></tr></thead><tbody class="plines"></tbody></table></div>' +
        '<div class="actions-row"><button type="button" class="btn sm" data-addrow>+ Add row</button><span class="spacer"></span><div class="ptotals"></div></div>' +
        '<p class="muted small">Each row becomes one tagged stock piece. Tag numbers are generated automatically.</p>',
      onOpen: (el) => {
        const tbody = el.querySelector('.plines');
        const totals = () => {
          const sub = U.sum(lines, 'amount');
          const gst = sub * U.n(el.querySelector('[name=gstPct]').value) / 100;
          el.querySelector('.ptotals').innerHTML = 'Pieces <b>' + lines.length + '</b> &middot; Net <b>' + U.wt(U.sum(lines, 'netWt')) + '</b> &middot; Cost <b>' + U.inr(sub) + '</b> &middot; GST <b>' + U.inr(gst) + '</b> &middot; Total <b>' + U.inr(sub + gst) + '</b>';
        };
        const draw = () => { tbody.innerHTML = lines.map(lineRow).join(''); totals(); };
        tbody.addEventListener('input', (e) => {
          const k = e.target.dataset.k;
          if (!k) return;
          const i = +e.target.closest('tr').dataset.i;
          lines[i][k] = e.target.value;
          if (k === 'grossWt' || k === 'stoneWt') {
            lines[i].netWt = U.r3(U.n(lines[i].grossWt) - U.n(lines[i].stoneWt));
            e.target.closest('tr').querySelector('[data-k=netWt]').value = lines[i].netWt;
          }
          if (k === 'itemId') {
            const it = DB.get('items', lines[i].itemId);
            if (it) { lines[i].purityId = it.purityId; e.target.closest('tr').querySelector('[data-k=purityId]').value = it.purityId || ''; }
          }
          totals();
        });
        tbody.addEventListener('click', (e) => {
          const rm = e.target.closest('[data-rm]');
          const dup = e.target.closest('[data-dup]');
          if (rm && lines.length > 1) { lines.splice(+rm.dataset.rm, 1); draw(); }
          if (dup) { lines.splice(+dup.dataset.dup + 1, 0, Object.assign({}, lines[+dup.dataset.dup], { huid: '' })); draw(); }
        });
        el.querySelector('[data-addrow]').addEventListener('click', () => {
          const last = lines[lines.length - 1];
          lines.push({ itemId: last.itemId, purityId: last.purityId, grossWt: '', stoneWt: '', netWt: '', stoneValue: '', huid: '', fixedPrice: '', amount: '' });
          draw();
        });
        el.querySelector('[name=gstPct]').addEventListener('input', totals);
        draw();
      },
      actions: [{ label: 'Cancel' }, {
        label: 'Save purchase & add to stock', cls: 'btn primary', onClick: (el) => {
          const d = UI.readForm(el, head);
          if (!d) return false;
          const valid = lines.filter((l) => l.itemId);
          if (!valid.length) { UI.toast('Add at least one item row', 'error'); return false; }
          for (const l of valid) {
            const probe = Object.assign({}, l, { tagNo: 'probe-' + Math.random() });
            const err = StockUI.validatePiece(probe, null);
            if (err) { UI.toast(Biz.item(l.itemId).name + ': ' + err, 'error'); return false; }
          }
          const sub = U.r2(U.sum(valid, 'amount'));
          const gst = U.r2(sub * U.n(d.gstPct) / 100);
          const purchase = DB.insert('purchases', Object.assign(d, {
            purchaseNo: DB.nextNo('purchase', DB.settings.purchasePrefix || 'PUR', d.billDate),
            subTotal: sub, gst, total: U.r2(sub + gst), paid: U.n(d.paid), by: Auth.user.username, lines: [],
          }));
          valid.forEach((l) => {
            const it = Biz.item(l.itemId);
            const goldLike = it.metalId === 'GOLD' || it.metalId === 'PLATINUM';
            const piece = DB.insert('stock', {
              tagNo: DB.nextTag(), itemId: l.itemId, purityId: l.purityId, qty: 1,
              grossWt: U.n(l.grossWt), stoneWt: U.n(l.stoneWt), netWt: U.n(l.netWt), stoneValue: U.n(l.stoneValue),
              stoneDetails: '', huid: String(l.huid || '').toUpperCase(), fixedPrice: U.n(l.fixedPrice),
              wastagePct: '', makingType: '', makingValue: '',
              otherCharges: goldLike && it.pricing === 'WEIGHT' && it.categoryId !== 'cat_BULLION' ? DB.settings.hallmarkCharge : 0,
              vendorId: d.vendorId, purchaseId: purchase.id, costPrice: U.n(l.amount),
              location: d.location, status: 'IN_STOCK', receivedOn: d.billDate,
            });
            purchase.lines.push(Object.assign({}, l, { stockId: piece.id, tagNo: piece.tagNo }));
          });
          DB.persist();
          UI.toast(purchase.purchaseNo + ' saved: ' + valid.length + ' piece(s) added to stock');
          if (onDone) onDone();
        },
      }],
    });
  }

  function viewPurchase(p) {
    UI.modal({
      title: p.purchaseNo + ' - ' + DB.name('vendors', p.vendorId), size: 'wide',
      body: '<p>Vendor bill <b>' + esc(p.billNo) + '</b> dated ' + U.fmtDate(p.billDate) + (p.notes ? ' &middot; ' + esc(p.notes) : '') + '</p>' +
        UI.table({
          columns: [
            { label: 'Tag', key: 'tagNo' }, { label: 'Item', render: (l) => esc(Biz.item(l.itemId).name) },
            { label: 'Purity', render: (l) => esc(Biz.purityName(l.purityId)) },
            { label: 'Gross', align: 'right', render: (l) => U.num(l.grossWt) }, { label: 'Net', align: 'right', render: (l) => U.num(l.netWt) },
            { label: 'HUID', key: 'huid' }, { label: 'Cost', align: 'right', render: (l) => U.inr(l.amount) },
            { label: 'Status', render: (l) => { const s = DB.get('stock', l.stockId); return s ? (s.status === 'SOLD' ? UI.badge('Sold') : UI.badge('In stock', 'ok')) : '-'; } },
          ],
          rows: p.lines,
        }) +
        '<div class="totals-box"><div><span>Cost</span><b>' + U.inr(p.subTotal) + '</b></div><div><span>GST</span><b>' + U.inr(p.gst) + '</b></div>' +
        '<div class="grand"><span>Total</span><b>' + U.inr(p.total) + '</b></div><div><span>Paid at purchase</span><b>' + U.inr(p.paid) + '</b></div></div>',
    });
  }

  Pages.register({
    id: 'purchases', title: 'Purchases', icon: '&#8681;', roles: ['Admin', 'Manager'],
    render(el, params) {
      const state = { from: U.addDays(U.today(), -90), to: U.today(), vendor: '' };
      el.innerHTML = '<section class="card"><div class="toolbar wrap">' +
        '<label class="inline">From <input type="date" data-f="from" value="' + state.from + '"></label>' +
        '<label class="inline">To <input type="date" data-f="to" value="' + state.to + '"></label>' +
        '<select data-f="vendor"><option value="">All vendors</option>' + DB.all('vendors').map((v) => '<option value="' + v.id + '">' + esc(v.name) + '</option>').join('') + '</select>' +
        '<span class="spacer"></span><button class="btn" data-pay>Pay vendor</button><button class="btn primary" data-new>+ Purchase entry</button></div>' +
        '<div class="p-body"></div></section>';
      const draw = () => {
        const rows = DB.all('purchases').filter((p) => U.inRange(p.billDate, state.from, state.to) && (!state.vendor || p.vendorId === state.vendor))
          .sort((a, b) => (a.billDate < b.billDate ? 1 : -1));
        el.querySelector('.p-body').innerHTML = UI.table({
          columns: [
            { label: 'Purchase no', render: (p) => '<b>' + esc(p.purchaseNo) + '</b>' },
            { label: 'Date', render: (p) => U.fmtDate(p.billDate) },
            { label: 'Vendor', render: (p) => esc(DB.name('vendors', p.vendorId)) },
            { label: 'Bill no', key: 'billNo' },
            { label: 'Pcs', align: 'right', render: (p) => p.lines.length },
            { label: 'Net wt', align: 'right', render: (p) => U.num(U.sum(p.lines, 'netWt')) },
            { label: 'Total', align: 'right', render: (p) => U.inr(p.total) },
            { label: 'Paid', align: 'right', render: (p) => U.inr(p.paid) },
          ],
          rows, empty: 'No purchases in this period. Use "+ Purchase entry" to add stock from a vendor.',
          rowAttr: (p) => 'class="clickable" data-open="' + p.id + '"',
        });
      };
      el.querySelectorAll('[data-f]').forEach((i) => i.addEventListener('change', () => { state[i.dataset.f] = i.value; draw(); }));
      el.querySelector('[data-new]').addEventListener('click', () => newPurchase(draw));
      el.querySelector('[data-pay]').addEventListener('click', () => vendorPayment(state.vendor, draw));
      el.querySelector('.p-body').addEventListener('click', (e) => {
        const r = e.target.closest('[data-open]');
        if (r) viewPurchase(DB.get('purchases', r.dataset.open));
      });
      draw();
      if (params.new) newPurchase(draw);
    },
  });

  global.PurchaseUI = { newPurchase, vendorPayment };
})(window);
