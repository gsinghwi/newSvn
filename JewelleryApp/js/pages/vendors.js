/* Vendors: supplier list and ledger (purchases, payments, payable) */
(function () {
  'use strict';
  const esc = U.esc;

  function ledger(v, refresh) {
    const s = DB.vendorSummary(v.id);
    const entries = [{ date: '', desc: 'Opening balance', debit: 0, credit: U.n(v.openingBalance) }]
      .concat(s.purchases.map((p) => ({ date: p.billDate, desc: p.purchaseNo + ' (bill ' + p.billNo + ', ' + p.lines.length + ' pcs)', credit: p.total, debit: 0 })))
      .concat(s.purchases.filter((p) => p.paid).map((p) => ({ date: p.billDate, desc: 'Paid with ' + p.purchaseNo + (p.mode ? ' - ' + p.mode : ''), debit: p.paid, credit: 0 })))
      .concat(s.payments.map((p) => ({ date: p.date, desc: 'Payment - ' + p.mode + (p.ref ? ' (' + p.ref + ')' : ''), debit: p.amount, credit: 0 })))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    let bal = 0;
    entries.forEach((e) => { bal += U.n(e.credit) - U.n(e.debit); e.balance = bal; });
    const m = UI.modal({
      title: v.name + ' - ledger', size: 'wide',
      body: '<div class="kpis compact">' +
        '<div class="kpi"><span>Purchased</span><b>' + U.inr(s.purchased, { whole: true }) + '</b><small>' + s.purchases.length + ' bill(s)</small></div>' +
        '<div class="kpi"><span>Paid</span><b>' + U.inr(s.paid, { whole: true }) + '</b></div>' +
        '<div class="kpi ' + (s.payable > 0 ? 'warn' : '') + '"><span>Payable</span><b>' + U.inr(s.payable, { whole: true }) + '</b></div>' +
        '<div class="kpi"><span>Pieces in stock</span><b>' + Biz.inStock().filter((x) => x.vendorId === v.id).length + '</b></div></div>' +
        '<p class="muted">' + esc([v.contactPerson, v.phone, v.email, v.gstin && 'GSTIN ' + v.gstin, v.address].filter(Boolean).join(' · ')) + '</p>' +
        UI.table({
          columns: [
            { label: 'Date', render: (e) => U.fmtDate(e.date) }, { label: 'Particulars', key: 'desc' },
            { label: 'Purchase (Cr)', align: 'right', render: (e) => (e.credit ? U.inr(e.credit) : '') },
            { label: 'Paid (Dr)', align: 'right', render: (e) => (e.debit ? U.inr(e.debit) : '') },
            { label: 'Balance', align: 'right', render: (e) => U.inr(e.balance) },
          ],
          rows: entries,
        }),
      actions: [{ label: 'Close' }, { label: 'Pay vendor', cls: 'btn primary', onClick: () => PurchaseUI.vendorPayment(v.id, refresh) }],
    });
    return m;
  }

  Pages.register({
    id: 'vendors', title: 'Vendors', icon: '&#9881;', roles: ['Admin', 'Manager'],
    render(el) {
      el.innerHTML = '<section class="card"><div class="crud"></div></section>';
      const crud = UI.crud(el.querySelector('.crud'), Object.assign({}, Schemas.vendors, {
        onRowClick: (v) => ledger(v, () => crud.render()),
      }));
    },
  });
})();
