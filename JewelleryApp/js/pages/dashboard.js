/* Dashboard: today's numbers, live rates, alerts and recent bills */
(function () {
  'use strict';
  const esc = U.esc;

  function barChart(series) {
    const max = Math.max(1, ...series.map((s) => s.amount));
    const w = 560, h = 160, gap = 10, bw = (w - gap * (series.length + 1)) / series.length;
    const bars = series.map((s, i) => {
      const bh = Math.round((s.amount / max) * (h - 30));
      const x = gap + i * (bw + gap);
      const day = new Date(s.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
      return '<g><title>' + U.fmtDate(s.date) + ': ' + U.inr(s.amount, { whole: true }) + ' (' + s.count + ' bills)</title>' +
        '<rect x="' + x + '" y="' + (h - 18 - bh) + '" width="' + bw + '" height="' + Math.max(bh, 1) + '" rx="4" class="bar"/>' +
        '<text x="' + (x + bw / 2) + '" y="' + (h - 4) + '" text-anchor="middle" class="axis">' + day + '</text></g>';
    }).join('');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart" role="img" aria-label="Sales for the last 7 days">' + bars + '</svg>';
  }

  Pages.register({
    id: 'dashboard', title: 'Dashboard', icon: '&#9673;',
    render(el) {
      const today = U.today();
      const month = today.slice(0, 7);
      const invs = Biz.activeInvoices();
      const todays = invs.filter((i) => i.date === today);
      const monthly = invs.filter((i) => i.date.slice(0, 7) === month);
      const stock = Biz.inStock();
      const rates = DB.currentRates();
      const goldNet = U.sum(stock.filter((s) => (DB.get('purities', s.purityId) || {}).metalId === 'GOLD'), 'netWt');
      const silverNet = U.sum(stock.filter((s) => (DB.get('purities', s.purityId) || {}).metalId === 'SILVER'), 'netWt');
      const stockValue = U.sum(stock, (s) => Biz.pieceValue(s, rates));
      const receivable = U.sum(DB.all('customers'), (c) => Math.max(0, DB.customerSummary(c.id).outstanding));
      const payable = U.sum(DB.all('vendors'), (v) => Math.max(0, DB.vendorSummary(v.id).payable));

      const counts = U.groupBy(stock, (s) => s.itemId);
      const lowStock = DB.all('items').filter((it) => it.active !== false && it.reorderLevel > 0 &&
        (counts[it.id] || []).length < it.reorderLevel && DB.all('stock').some((s) => s.itemId === it.id)).slice(0, 8);
      const events = Biz.upcomingEvents(15).slice(0, 8);
      const recent = invs.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 6);
      const latest = DB.latestRate();
      const purities = DB.all('purities').filter((p) => p.showRate);

      el.innerHTML =
        '<div class="quick-actions">' +
        '<a class="btn primary" href="#/pos">+ New Sale / Bill</a>' +
        (Auth.can(['Admin', 'Manager']) ? '<a class="btn" href="#/rates">Update Today\'s Rate</a><a class="btn" href="#/purchases?new=1">+ Purchase Entry</a>' : '') +
        '<a class="btn" href="#/customers?new=1">+ Customer</a>' +
        (Auth.can(['Admin', 'Manager']) ? '<a class="btn" href="#/reports">Reports</a>' : '') +
        '</div>' +
        '<div class="kpis">' +
        kpi("Today's Sales", U.inr(U.sum(todays, 'grandTotal'), { whole: true }), todays.length + ' bill(s)') +
        kpi('This Month', U.inr(U.sum(monthly, 'grandTotal'), { whole: true }), monthly.length + ' bill(s)') +
        kpi('Stock in Hand', stock.length + ' pcs', U.wt(goldNet) + ' gold · ' + U.wt(silverNet) + ' silver') +
        kpi('Stock Value (today\'s rate)', U.inr(stockValue, { whole: true }), 'before GST') +
        kpi('Customer Dues', U.inr(receivable, { whole: true }), 'receivable', receivable > 0 ? 'warn' : '') +
        kpi('Vendor Payable', U.inr(payable, { whole: true }), 'to suppliers') +
        '</div>' +
        '<div class="grid-2">' +
        '<section class="card"><div class="card-head"><h3>Today\'s Rates <small>per gram</small></h3><a href="#/rates">History &rarr;</a></div>' +
        '<div class="rate-cards">' + purities.map((p) => '<div class="rate-card ' + p.metalId.toLowerCase() + '"><span>' + esc(p.name) + '</span><b>' + U.inr(rates[p.id], { whole: true }) + '</b></div>').join('') + '</div>' +
        '<p class="muted small">Last updated ' + (latest.at ? U.fmtDateTime(latest.at) + ' by ' + esc(latest.by || '-') : 'never') + '</p></section>' +
        '<section class="card"><div class="card-head"><h3>Sales - last 7 days</h3></div>' + barChart(Biz.salesByDay(7)) + '</section>' +
        '</div>' +
        '<div class="grid-2">' +
        '<section class="card"><div class="card-head"><h3>Recent Bills</h3><a href="#/sales">All bills &rarr;</a></div>' +
        UI.table({
          columns: [
            { label: 'Invoice', render: (r) => '<a href="#/sales?open=' + r.id + '">' + esc(r.invoiceNo) + '</a>' },
            { label: 'Date', render: (r) => U.fmtDate(r.date) },
            { label: 'Customer', render: (r) => esc(DB.name('customers', r.customerId)) },
            { label: 'Amount', align: 'right', render: (r) => U.inr(r.grandTotal, { whole: true }) },
            { label: 'Due', align: 'right', render: (r) => (r.balance > 0 ? UI.badge(U.inr(r.balance, { whole: true }), 'warn') : UI.badge('Paid', 'ok')) },
          ],
          rows: recent, empty: 'No bills yet',
        }) + '</section>' +
        '<section class="card"><div class="card-head"><h3>Reminders</h3></div>' +
        '<h4 class="sub">Birthdays &amp; anniversaries (next 15 days)</h4>' +
        (events.length ? '<ul class="list">' + events.map((e) => '<li><a href="#/customers?open=' + e.customer.id + '">' + esc(e.customer.name) + '</a> &mdash; ' + e.type + ' on ' + U.fmtDate(e.date) +
          ' <span class="muted">(' + (e.inDays === 0 ? 'today' : 'in ' + e.inDays + ' day' + (e.inDays > 1 ? 's' : '')) + ')</span>' + (e.customer.phone ? ' <span class="muted">' + esc(e.customer.phone) + '</span>' : '') + '</li>').join('') + '</ul>' : '<p class="muted">None coming up.</p>') +
        '<h4 class="sub">Low stock</h4>' +
        (lowStock.length ? '<ul class="list">' + lowStock.map((it) => '<li>' + esc(it.name) + ' <span class="muted">(' + (counts[it.id] || []).length + ' in stock, reorder at ' + it.reorderLevel + ')</span></li>').join('') + '</ul>' : '<p class="muted">All good.</p>') +
        '</section></div>';
    },
  });

  function kpi(label, value, sub, cls) {
    return '<div class="kpi ' + (cls || '') + '"><span>' + esc(label) + '</span><b>' + value + '</b><small>' + esc(sub || '') + '</small></div>';
  }
})();
