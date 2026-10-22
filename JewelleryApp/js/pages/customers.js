/* Customers (CRM): customer list, profile with purchase history, dues and payment receipts */
(function (global) {
  'use strict';
  const esc = U.esc;

  function receivePayment(customer, onDone) {
    const sum = DB.customerSummary(customer.id);
    const fields = [
      { name: 'date', label: 'Date', type: 'date', required: true, default: U.today() },
      { name: 'amount', label: 'Amount received (₹)', type: 'number', required: true, min: 1, default: sum.outstanding > 0 ? sum.outstanding : '' },
      { name: 'mode', label: 'Mode', type: 'select', required: true, options: DB.all('paymentModes').filter((m) => m.active !== false).map((m) => m.name) },
      { name: 'ref', label: 'Reference / UTR / Cheque no.' },
      { name: 'notes', label: 'Notes', full: true },
    ];
    UI.modal({
      title: 'Receive payment - ' + customer.name,
      body: '<p class="muted">Outstanding: <b>' + U.inr(sum.outstanding) + '</b></p>' + UI.formHtml(fields, {}),
      actions: [{ label: 'Cancel' }, {
        label: 'Save receipt', cls: 'btn primary', onClick: (el) => {
          const d = UI.readForm(el, fields);
          if (!d) return false;
          if (d.amount <= 0) { UI.toast('Amount must be positive', 'error'); return false; }
          d.customerId = customer.id;
          d.receiptNo = DB.nextNo('receipt', 'RCT', d.date);
          d.by = Auth.user.username;
          // Settle the oldest bills with a balance first so each invoice shows its current due
          let left = d.amount;
          DB.all('invoices').filter((i) => i.customerId === customer.id && i.status !== 'CANCELLED' && i.balance > 0)
            .sort((a, b) => (a.date < b.date ? -1 : 1)).forEach((inv) => {
              if (left <= 0) return;
              const part = Math.min(left, inv.balance);
              inv.balance = U.r2(inv.balance - part);
              (inv.settlements = inv.settlements || []).push({ receiptNo: d.receiptNo, date: d.date, amount: part });
              left -= part;
            });
          DB.insert('receipts', d);
          UI.toast('Receipt ' + d.receiptNo + ' saved');
          if (onDone) onDone();
        },
      }],
    });
  }

  function profile(c, refresh) {
    const s = DB.customerSummary(c.id);
    const info = [
      ['Mobile', c.phone], ['Email', c.email], ['Group', DB.name('customerGroups', c.groupId)], ['City', c.city],
      ['Birthday', U.fmtDate(c.dob)], ['Anniversary', U.fmtDate(c.anniversary)], ['PAN', c.pan], ['GSTIN', c.gstin],
      ['Ring / bangle size', c.ringSize], ['Address', [c.address, c.city, c.state].filter(Boolean).join(', ')], ['Notes', c.notes],
    ].filter((x) => x[1]);
    const history = s.invoices.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    const m = UI.modal({
      title: c.name + ' (' + c.code + ')', size: 'wide',
      body:
        '<div class="kpis compact">' +
        '<div class="kpi"><span>Total purchases</span><b>' + U.inr(s.billed, { whole: true }) + '</b><small>' + s.invoices.length + ' bill(s)</small></div>' +
        '<div class="kpi"><span>Paid</span><b>' + U.inr(s.paid, { whole: true }) + '</b></div>' +
        '<div class="kpi ' + (s.outstanding > 0 ? 'warn' : '') + '"><span>Outstanding</span><b>' + U.inr(s.outstanding, { whole: true }) + '</b></div>' +
        '<div class="kpi"><span>Last visit</span><b>' + (s.lastVisit ? U.fmtDate(s.lastVisit) : '-') + '</b></div></div>' +
        '<dl class="info">' + info.map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>').join('') + '</dl>' +
        '<h4 class="sub">Purchase history</h4>' +
        UI.table({
          columns: [
            { label: 'Invoice', render: (r) => '<a href="#/sales?open=' + r.id + '">' + esc(r.invoiceNo) + '</a>' },
            { label: 'Date', render: (r) => U.fmtDate(r.date) },
            { label: 'Items', render: (r) => esc(r.lines.map((l) => l.itemName).join(', ')) },
            { label: 'Amount', align: 'right', render: (r) => U.inr(r.grandTotal, { whole: true }) },
          ],
          rows: history, empty: 'No purchases yet',
        }) +
        (s.receipts.length ? '<h4 class="sub">Payments received</h4>' + UI.table({
          columns: [
            { label: 'Receipt', key: 'receiptNo' }, { label: 'Date', render: (r) => U.fmtDate(r.date) },
            { label: 'Mode', key: 'mode' }, { label: 'Ref', key: 'ref' },
            { label: 'Amount', align: 'right', render: (r) => U.inr(r.amount) },
          ],
          rows: s.receipts,
        }) : ''),
      actions: [
        { label: 'Close' },
        { label: 'Receive payment', cls: 'btn', onClick: () => { receivePayment(c, refresh); } },
        { label: 'New sale', cls: 'btn primary', onClick: () => { App.go('#/pos?customer=' + c.id); } },
      ],
    });
    m.el.addEventListener('click', (e) => { if (e.target.closest('a[href^="#/"]')) m.close(); });
  }

  Pages.register({
    id: 'customers', title: 'Customers', icon: '&#9786;',
    render(el, params) {
      el.innerHTML = '<section class="card"><div class="crud"></div></section>';
      const crud = UI.crud(el.querySelector('.crud'), Object.assign({}, Schemas.customers, {
        onRowClick: (c) => profile(c, () => crud.render()),
        rowActions: (r) => '<button class="btn sm" data-sale="' + r.id + '">Bill</button>',
      }));
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-sale]');
        if (b) { e.stopPropagation(); App.go('#/pos?customer=' + b.dataset.sale); }
      }, true);
      if (params.new) crud.openForm(null);
      if (params.open) { const c = DB.get('customers', params.open); if (c) profile(c, () => crud.render()); }
    },
  });

  global.CRM = { receivePayment, profile };
})(window);
