/* Reports: on-demand sales, GST, stock, purchase, customer and vendor reports with CSV export and print */
(function () {
  'use strict';
  const esc = U.esc;
  const money = (v) => U.inr(v);
  const R = (label, key, extra) => Object.assign({ label, key }, extra || {});
  const M = (label, key) => ({ label, key, align: 'right', render: (r) => money(r[key]), csv: (r) => U.r2(r[key]) });
  const Wt = (label, key) => ({ label, key, align: 'right', render: (r) => U.num(r[key]), csv: (r) => U.r3(r[key]) });
  const N = (label, key) => ({ label, key, align: 'right' });

  const invoicesIn = (p) => Biz.activeInvoices().filter((i) => U.inRange(i.date, p.from, p.to));
  const totalsFor = (rows, keys) => keys.reduce((t, k) => { t[k] = U.sum(rows, k); return t; }, {});

  const REPORTS = [
    {
      id: 'salesRegister', group: 'Sales', title: 'Sales register', params: ['range'],
      run(p) {
        const rows = invoicesIn(p).sort((a, b) => (a.invoiceNo < b.invoiceNo ? -1 : 1)).map((i) => {
          const c = DB.get('customers', i.customerId) || {};
          return {
            invoiceNo: i.invoiceNo, date: U.fmtDate(i.date), customer: c.name, phone: c.phone || '', gstin: c.gstin || '',
            pcs: i.lines.length, netWt: U.sum(i.lines, 'netWt'), taxable: i.taxable, cgst: i.cgst, sgst: i.sgst, igst: i.igst,
            oldGold: i.oldGoldValue, total: i.grandTotal, paid: i.paid, balance: i.balance,
          };
        });
        return {
          columns: [R('Invoice', 'invoiceNo'), R('Date', 'date'), R('Customer', 'customer'), R('Mobile', 'phone'), R('GSTIN', 'gstin'), N('Pcs', 'pcs'), Wt('Net g', 'netWt'),
            M('Taxable', 'taxable'), M('CGST', 'cgst'), M('SGST', 'sgst'), M('IGST', 'igst'), M('Old gold', 'oldGold'), M('Net total', 'total'), M('Paid', 'paid'), M('Due', 'balance')],
          rows, totals: totalsFor(rows, ['pcs', 'netWt', 'taxable', 'cgst', 'sgst', 'igst', 'oldGold', 'total', 'paid', 'balance']),
        };
      },
    },
    {
      id: 'itemSales', group: 'Sales', title: 'Item / category wise sales', params: ['range', 'groupBy'],
      run(p) {
        const lines = [];
        invoicesIn(p).forEach((i) => i.lines.forEach((l) => lines.push(l)));
        const key = (l) => {
          const it = DB.get('items', l.itemId) || {};
          return p.groupBy === 'category' ? DB.name('categories', it.categoryId) || 'Other' : p.groupBy === 'purity' ? Biz.purityName(l.purityId) : l.itemName;
        };
        const rows = Object.entries(U.groupBy(lines, key)).map(([name, ls]) => ({
          name, pcs: ls.length, netWt: U.sum(ls, 'netWt'), metal: U.sum(ls, 'metalValue'), making: U.sum(ls, 'making'),
          stone: U.sum(ls, 'stoneValue'), taxable: U.sum(ls, 'taxable'),
        })).sort((a, b) => b.taxable - a.taxable);
        return {
          columns: [R(p.groupBy === 'category' ? 'Category' : p.groupBy === 'purity' ? 'Purity' : 'Item', 'name'), N('Pcs', 'pcs'), Wt('Net g', 'netWt'),
            M('Metal value', 'metal'), M('Making', 'making'), M('Stone', 'stone'), M('Taxable', 'taxable')],
          rows, totals: totalsFor(rows, ['pcs', 'netWt', 'metal', 'making', 'stone', 'taxable']),
        };
      },
    },
    {
      id: 'gstHsn', group: 'Sales', title: 'GST summary (HSN wise) - for GSTR-1', params: ['range'],
      run(p) {
        const lines = [];
        invoicesIn(p).forEach((i) => {
          const c = DB.get('customers', i.customerId) || {};
          i.lines.forEach((l) => lines.push(Object.assign({ b2b: c.gstin ? 'B2B' : 'B2C' }, l)));
        });
        const rows = Object.entries(U.groupBy(lines, (l) => l.hsn + '|' + l.gstPct + '|' + l.b2b)).map(([k, ls]) => {
          const [hsn, gst, type] = k.split('|');
          return {
            hsn, desc: DB.name('hsn', hsn, 'description'), type, gst: gst + '%', qty: ls.length, netWt: U.sum(ls, 'netWt'),
            taxable: U.sum(ls, 'taxable'), cgst: U.sum(ls, 'cgst'), sgst: U.sum(ls, 'sgst'), igst: U.sum(ls, 'igst'),
            total: U.sum(ls, (l) => l.taxable + l.cgst + l.sgst + l.igst),
          };
        });
        return {
          columns: [R('HSN', 'hsn'), R('Description', 'desc'), R('Type', 'type'), R('GST', 'gst'), N('Qty', 'qty'), Wt('Net g', 'netWt'),
            M('Taxable', 'taxable'), M('CGST', 'cgst'), M('SGST', 'sgst'), M('IGST', 'igst'), M('Total', 'total')],
          rows, totals: totalsFor(rows, ['qty', 'netWt', 'taxable', 'cgst', 'sgst', 'igst', 'total']),
        };
      },
    },
    {
      id: 'payments', group: 'Sales', title: 'Collections by payment mode', params: ['range'],
      run(p) {
        const entries = [];
        invoicesIn(p).forEach((i) => i.payments.forEach((x) => entries.push({ mode: x.mode, amount: U.n(x.amount), src: 'Bills' })));
        DB.all('receipts').filter((r) => U.inRange(r.date, p.from, p.to)).forEach((r) => entries.push({ mode: r.mode, amount: U.n(r.amount), src: 'Receipts' }));
        const rows = Object.entries(U.groupBy(entries, (e) => e.mode)).map(([mode, es]) => ({
          mode, count: es.length, bills: U.sum(es.filter((e) => e.src === 'Bills'), 'amount'), receipts: U.sum(es.filter((e) => e.src === 'Receipts'), 'amount'), total: U.sum(es, 'amount'),
        })).sort((a, b) => b.total - a.total);
        return { columns: [R('Mode', 'mode'), N('Entries', 'count'), M('At billing', 'bills'), M('Due receipts', 'receipts'), M('Total', 'total')], rows, totals: totalsFor(rows, ['count', 'bills', 'receipts', 'total']) };
      },
    },
    {
      id: 'oldGold', group: 'Sales', title: 'Old gold received', params: ['range'],
      run(p) {
        const rows = [];
        invoicesIn(p).forEach((i) => i.oldGold.forEach((o) => rows.push({
          invoiceNo: i.invoiceNo, date: U.fmtDate(i.date), customer: DB.name('customers', i.customerId), desc: o.description,
          purity: Biz.purityName(o.purityId), grossWt: o.grossWt, netWt: o.netWt, rate: o.rate, value: o.value,
        })));
        return { columns: [R('Invoice', 'invoiceNo'), R('Date', 'date'), R('Customer', 'customer'), R('Description', 'desc'), R('Purity', 'purity'), Wt('Gross g', 'grossWt'), Wt('Net g', 'netWt'), M('Rate', 'rate'), M('Value', 'value')], rows, totals: totalsFor(rows, ['grossWt', 'netWt', 'value']) };
      },
    },
    {
      id: 'dayBook', group: 'Sales', title: 'Day book (cash flow)', params: ['range'],
      run(p) {
        const rows = [];
        invoicesIn(p).forEach((i) => rows.push({ date: i.date, type: 'Sale', ref: i.invoiceNo, party: DB.name('customers', i.customerId), inflow: i.paid, outflow: 0 }));
        DB.all('receipts').filter((r) => U.inRange(r.date, p.from, p.to)).forEach((r) => rows.push({ date: r.date, type: 'Receipt', ref: r.receiptNo, party: DB.name('customers', r.customerId), inflow: r.amount, outflow: 0 }));
        DB.all('purchases').filter((x) => U.inRange(x.billDate, p.from, p.to) && x.paid).forEach((x) => rows.push({ date: x.billDate, type: 'Purchase payment', ref: x.purchaseNo, party: DB.name('vendors', x.vendorId), inflow: 0, outflow: x.paid }));
        DB.all('vendorPayments').filter((x) => U.inRange(x.date, p.from, p.to)).forEach((x) => rows.push({ date: x.date, type: 'Vendor payment', ref: x.ref || x.mode, party: DB.name('vendors', x.vendorId), inflow: 0, outflow: x.amount }));
        rows.sort((a, b) => (a.date < b.date ? -1 : 1));
        rows.forEach((r) => { r.dateF = U.fmtDate(r.date); });
        return { columns: [R('Date', 'dateF'), R('Type', 'type'), R('Ref', 'ref'), R('Party', 'party'), M('In', 'inflow'), M('Out', 'outflow')], rows, totals: totalsFor(rows, ['inflow', 'outflow']) };
      },
    },
    {
      id: 'stockSummary', group: 'Stock', title: 'Stock summary & valuation', params: ['groupBy'],
      run(p) {
        const rates = DB.currentRates();
        const stock = Biz.inStock();
        const key = (s) => {
          const it = Biz.item(s.itemId);
          return p.groupBy === 'category' ? DB.name('categories', it.categoryId) : p.groupBy === 'purity' ? Biz.purityName(s.purityId) : it.name;
        };
        const rows = Object.entries(U.groupBy(stock, key)).map(([name, ss]) => ({
          name, pcs: ss.length, grossWt: U.sum(ss, 'grossWt'), netWt: U.sum(ss, 'netWt'), fineWt: U.sum(ss, (s) => Biz.fineWt(s)),
          stone: U.sum(ss, 'stoneValue'), cost: U.sum(ss, 'costPrice'), value: U.sum(ss, (s) => Biz.pieceValue(s, rates)),
        })).sort((a, b) => b.value - a.value);
        return {
          note: 'Valued at rates saved on ' + U.fmtDateTime(DB.latestRate().at) + ' (before GST).',
          columns: [R(p.groupBy === 'category' ? 'Category' : p.groupBy === 'purity' ? 'Purity' : 'Item', 'name'), N('Pcs', 'pcs'), Wt('Gross g', 'grossWt'), Wt('Net g', 'netWt'), Wt('Fine g', 'fineWt'), M('Stone value', 'stone'), M('Purchase cost', 'cost'), M('Value today', 'value')],
          rows, totals: totalsFor(rows, ['pcs', 'grossWt', 'netWt', 'fineWt', 'stone', 'cost', 'value']),
        };
      },
    },
    {
      id: 'stockDetail', group: 'Stock', title: 'Stock detail (tag wise)', params: ['category'],
      run(p) {
        const rates = DB.currentRates();
        const rows = Biz.inStock().filter((s) => !p.category || Biz.item(s.itemId).categoryId === p.category).map((s) => ({
          tag: s.tagNo, item: Biz.item(s.itemId).name, purity: Biz.purityName(s.purityId), huid: s.huid, grossWt: s.grossWt, netWt: s.netWt,
          stone: s.stoneValue, vendor: DB.name('vendors', s.vendorId), location: s.location, received: U.fmtDate(s.receivedOn),
          age: s.receivedOn ? Math.max(0, Math.round((new Date(U.today()) - new Date(s.receivedOn)) / 86400000)) : '', value: Biz.pieceValue(s, rates),
        })).sort((a, b) => (a.tag < b.tag ? -1 : 1));
        return {
          columns: [R('Tag', 'tag'), R('Item', 'item'), R('Purity', 'purity'), R('HUID', 'huid'), Wt('Gross g', 'grossWt'), Wt('Net g', 'netWt'), M('Stone', 'stone'),
            R('Vendor', 'vendor'), R('Location', 'location'), R('Received', 'received'), N('Age (days)', 'age'), M('Value today', 'value')],
          rows, totals: totalsFor(rows, ['grossWt', 'netWt', 'stone', 'value']),
        };
      },
    },
    {
      id: 'reorder', group: 'Stock', title: 'Re-order / low stock', params: [],
      run() {
        const inStock = U.groupBy(Biz.inStock(), (s) => s.itemId);
        const sold = U.groupBy(DB.all('stock').filter((s) => s.status === 'SOLD'), (s) => s.itemId);
        const rows = DB.all('items').filter((it) => it.active !== false && U.n(it.reorderLevel) > 0).map((it) => ({
          code: it.code, name: it.name, category: DB.name('categories', it.categoryId), inStock: (inStock[it.id] || []).length,
          reorder: it.reorderLevel, sold: (sold[it.id] || []).length,
        })).filter((r) => r.inStock < r.reorder).sort((a, b) => b.sold - a.sold || a.inStock - b.inStock);
        return { columns: [R('Code', 'code'), R('Item', 'name'), R('Category', 'category'), N('In stock', 'inStock'), N('Re-order level', 'reorder'), N('Sold (all time)', 'sold')], rows };
      },
    },
    {
      id: 'purchaseRegister', group: 'Purchases', title: 'Purchase register', params: ['range'],
      run(p) {
        const rows = DB.all('purchases').filter((x) => U.inRange(x.billDate, p.from, p.to)).map((x) => ({
          no: x.purchaseNo, date: U.fmtDate(x.billDate), vendor: DB.name('vendors', x.vendorId), gstin: DB.name('vendors', x.vendorId, 'gstin'), bill: x.billNo,
          pcs: x.lines.length, netWt: U.sum(x.lines, 'netWt'), sub: x.subTotal, gst: x.gst, total: x.total, paid: x.paid,
        }));
        return { columns: [R('Purchase no', 'no'), R('Date', 'date'), R('Vendor', 'vendor'), R('GSTIN', 'gstin'), R('Bill no', 'bill'), N('Pcs', 'pcs'), Wt('Net g', 'netWt'), M('Cost', 'sub'), M('GST', 'gst'), M('Total', 'total'), M('Paid', 'paid')], rows, totals: totalsFor(rows, ['pcs', 'netWt', 'sub', 'gst', 'total', 'paid']) };
      },
    },
    {
      id: 'vendorPayables', group: 'Purchases', title: 'Vendor payables', params: [],
      run() {
        const rows = DB.all('vendors').map((v) => {
          const s = DB.vendorSummary(v.id);
          return { name: v.name, type: v.type, phone: v.phone, opening: U.n(v.openingBalance), purchased: s.purchased, paid: s.paid, payable: s.payable, stock: Biz.inStock().filter((x) => x.vendorId === v.id).length };
        }).sort((a, b) => b.payable - a.payable);
        return { columns: [R('Vendor', 'name'), R('Type', 'type'), R('Phone', 'phone'), M('Opening', 'opening'), M('Purchased', 'purchased'), M('Paid', 'paid'), M('Payable', 'payable'), N('Pcs in stock', 'stock')], rows, totals: totalsFor(rows, ['opening', 'purchased', 'paid', 'payable', 'stock']) };
      },
    },
    {
      id: 'customerDues', group: 'Customers', title: 'Customer outstanding', params: [],
      run() {
        const rows = DB.all('customers').map((c) => Object.assign({ name: c.name, phone: c.phone }, DB.customerSummary(c.id)))
          .filter((r) => r.outstanding > 0).map((r) => ({ name: r.name, phone: r.phone, billed: r.billed, paid: r.paid, outstanding: r.outstanding, last: U.fmtDate(r.lastVisit) }))
          .sort((a, b) => b.outstanding - a.outstanding);
        return { columns: [R('Customer', 'name'), R('Mobile', 'phone'), M('Billed', 'billed'), M('Paid', 'paid'), M('Outstanding', 'outstanding'), R('Last visit', 'last')], rows, totals: totalsFor(rows, ['billed', 'paid', 'outstanding']) };
      },
    },
    {
      id: 'topCustomers', group: 'Customers', title: 'Top customers', params: ['range'],
      run(p) {
        const rows = Object.entries(U.groupBy(invoicesIn(p), (i) => i.customerId)).filter(([id]) => id !== 'cus_walkin').map(([id, invs]) => {
          const c = DB.get('customers', id) || {};
          return { name: c.name, phone: c.phone, group: DB.name('customerGroups', c.groupId), bills: invs.length, netWt: U.sum(invs, (i) => U.sum(i.lines, 'netWt')), total: U.sum(invs, 'grandTotal') };
        }).sort((a, b) => b.total - a.total);
        return { columns: [R('Customer', 'name'), R('Mobile', 'phone'), R('Group', 'group'), N('Bills', 'bills'), Wt('Net g', 'netWt'), M('Purchases', 'total')], rows, totals: totalsFor(rows, ['bills', 'netWt', 'total']) };
      },
    },
    {
      id: 'occasions', group: 'Customers', title: 'Birthdays & anniversaries', params: ['days'],
      run(p) {
        const rows = Biz.upcomingEvents(U.n(p.days) || 30).map((e) => ({ name: e.customer.name, phone: e.customer.phone, type: e.type, date: U.fmtDate(e.date), inDays: e.inDays }));
        return { columns: [R('Customer', 'name'), R('Mobile', 'phone'), R('Occasion', 'type'), R('Date', 'date'), N('In days', 'inDays')], rows };
      },
    },
    {
      id: 'rateHistory', group: 'Rates', title: 'Rate history', params: ['range'],
      run(p) {
        const purities = DB.all('purities').filter((x) => x.metalId !== 'NONE');
        const rows = DB.rateHistory().filter((r) => U.inRange(U.isoDate(r.at), p.from, p.to)).map((r) => {
          const o = { at: U.fmtDateTime(r.at), by: r.by, source: r.source };
          purities.forEach((x) => { o[x.id] = r.values[x.id] || ''; });
          return o;
        });
        return { columns: [R('Date & time', 'at')].concat(purities.map((x) => N(x.name, x.id))).concat([R('Source', 'source'), R('By', 'by')]), rows };
      },
    },
  ];

  Pages.register({
    id: 'reports', title: 'Reports', icon: '&#9636;', roles: ['Admin', 'Manager'],
    render(el, params) {
      let current = REPORTS.find((r) => r.id === params.r) || REPORTS[0];
      const today = U.today();
      const p = { from: today.slice(0, 8) + '01', to: today, groupBy: 'category', category: '', days: 30 };
      const groups = U.groupBy(REPORTS, (r) => r.group);
      el.innerHTML = '<div class="reports">' +
        '<nav class="report-list card">' + Object.entries(groups).map(([g, rs]) => '<div class="nav-title">' + esc(g) + '</div>' +
          rs.map((r) => '<button data-r="' + r.id + '">' + esc(r.title) + '</button>').join('')).join('') + '</nav>' +
        '<section class="card report-body"><div class="report-head"></div><div class="report-out"></div></section></div>';

      function paramsHtml(r) {
        const presets = '<select data-preset><option value="">Quick range...</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="7">Last 7 days</option><option value="month">This month</option><option value="lastmonth">Last month</option><option value="fy">This financial year</option></select>';
        return r.params.map((k) => {
          if (k === 'range') return '<label class="inline">From <input type="date" data-p="from" value="' + p.from + '"></label><label class="inline">To <input type="date" data-p="to" value="' + p.to + '"></label>' + presets;
          if (k === 'groupBy') return '<select data-p="groupBy">' + [['category', 'By category'], ['item', 'By item'], ['purity', 'By purity']].map(([v, l]) => '<option value="' + v + '"' + (p.groupBy === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>';
          if (k === 'category') return '<select data-p="category"><option value="">All categories</option>' + DB.all('categories').map((c) => '<option value="' + c.id + '"' + (p.category === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select>';
          if (k === 'days') return '<label class="inline">Next <input type="number" min="1" class="sm" data-p="days" value="' + p.days + '"> days</label>';
          return '';
        }).join('');
      }

      function run() {
        const out = current.run(p);
        current.last = out;
        const foot = out.totals ? {} : null;
        if (foot) {
          out.columns.forEach((c, i) => {
            if (i === 0) foot[c.key] = '<b>Total</b>';
            else if (out.totals[c.key] != null) foot[c.key] = '<b>' + (c.render ? c.render(out.totals) : esc(U.r3(out.totals[c.key]))) + '</b>';
          });
        }
        el.querySelector('.report-out').innerHTML = (out.note ? '<p class="muted small">' + esc(out.note) + '</p>' : '') +
          '<p class="muted small">' + out.rows.length + ' row(s)</p>' + UI.table({ columns: out.columns, rows: out.rows, foot, empty: 'No data for the selected filters' });
      }

      function select(r) {
        current = r;
        history.replaceState(null, '', '#/reports?r=' + r.id);
        el.querySelectorAll('[data-r]').forEach((b) => b.classList.toggle('active', b.dataset.r === r.id));
        el.querySelector('.report-head').innerHTML = '<h3>' + esc(r.title) + '</h3><div class="toolbar wrap">' + paramsHtml(r) +
          '<span class="spacer"></span><button class="btn" data-csv>Export CSV</button><button class="btn" data-print>Print / PDF</button></div>';
        run();
      }

      function preset(v) {
        const t = U.today();
        const d = new Date(t + 'T00:00:00');
        if (v === 'today') { p.from = p.to = t; }
        if (v === 'yesterday') { p.from = p.to = U.addDays(t, -1); }
        if (v === '7') { p.from = U.addDays(t, -6); p.to = t; }
        if (v === 'month') { p.from = t.slice(0, 8) + '01'; p.to = t; }
        if (v === 'lastmonth') { const s = new Date(d.getFullYear(), d.getMonth() - 1, 1); p.from = U.isoDate(s); p.to = U.isoDate(new Date(d.getFullYear(), d.getMonth(), 0)); }
        if (v === 'fy') { p.from = U.finYear(t).slice(0, 4) + '-04-01'; p.to = t; }
      }

      el.addEventListener('click', (e) => {
        const r = e.target.closest('[data-r]');
        if (r) select(REPORTS.find((x) => x.id === r.dataset.r));
        if (e.target.closest('[data-csv]') && current.last) {
          U.download(current.id + '_' + U.today() + '.csv', U.toCSV(current.last.columns, current.last.rows), 'text/csv');
        }
        if (e.target.closest('[data-print]') && current.last) {
          const s = DB.settings;
          UI.print('<div class="report-print"><h2>' + esc(s.shopName) + '</h2><h3>' + esc(current.title) + '</h3><p>' +
            (current.params.includes('range') ? 'Period: ' + U.fmtDate(p.from) + ' to ' + U.fmtDate(p.to) + ' &middot; ' : '') + 'Generated ' + U.fmtDateTime(new Date().toISOString()) + ' by ' + esc(Auth.user.name) + '</p>' +
            el.querySelector('.report-out').innerHTML + '</div>');
        }
      });
      el.addEventListener('change', (e) => {
        if (e.target.dataset.preset != null) {
          if (!e.target.value) return;
          preset(e.target.value);
          select(current);
          return;
        }
        const k = e.target.dataset.p;
        if (k) { p[k] = e.target.value; run(); }
      });
      select(current);
    },
  });
})();
