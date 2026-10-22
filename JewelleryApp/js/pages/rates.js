/* Rates: daily metal rates per gram used for billing, with history */
(function () {
  'use strict';
  const esc = U.esc;

  function lineChart(history, key) {
    const pts = history.slice(-30).filter((h) => h.values[key]);
    if (pts.length < 2) return '<p class="muted">Not enough history to chart yet.</p>';
    const w = 560, h = 170, pad = 34;
    const vals = pts.map((p) => p.values[key]);
    const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
    const x = (i) => pad + (i * (w - pad * 2)) / (pts.length - 1);
    const y = (v) => h - pad - ((v - min) / span) * (h - pad * 2);
    const path = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.values[key]).toFixed(1)).join(' ');
    const dots = pts.map((p, i) => '<circle cx="' + x(i) + '" cy="' + y(p.values[key]) + '" r="3.5" class="dot"><title>' +
      U.fmtDateTime(p.at) + ': ' + U.inr(p.values[key], { whole: true }) + '</title></circle>').join('');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="chart" role="img" aria-label="Rate trend">' +
      '<text x="4" y="' + (y(max) + 4) + '" class="axis">' + U.inr(max, { whole: true }) + '</text>' +
      '<text x="4" y="' + (y(min) + 4) + '" class="axis">' + U.inr(min, { whole: true }) + '</text>' +
      '<path d="' + path + '" class="line"/>' + dots +
      '<text x="' + pad + '" y="' + (h - 8) + '" class="axis">' + U.fmtDate(pts[0].at) + '</text>' +
      '<text x="' + (w - pad) + '" y="' + (h - 8) + '" text-anchor="end" class="axis">' + U.fmtDate(pts[pts.length - 1].at) + '</text></svg>';
  }

  Pages.register({
    id: 'rates', title: "Today's Rates", icon: '&#8377;',
    render(el) {
      const canEdit = Auth.can(['Admin', 'Manager']);
      const purities = DB.all('purities').filter((p) => p.metalId !== 'NONE');
      const history = DB.rateHistory();
      const latest = DB.latestRate();
      const cur = latest.values || {};
      let chartKey = 'G22K';

      el.innerHTML =
        '<div class="grid-2">' +
        '<section class="card"><div class="card-head"><h3>' + (canEdit ? 'Update rates' : 'Current rates') + ' <small>₹ per gram</small></h3></div>' +
        '<form class="rate-form" onsubmit="return false">' +
        '<div class="rate-inputs">' + purities.map((p) =>
          '<label class="rate-input ' + p.metalId.toLowerCase() + '"><span>' + esc(p.name) + '</span>' +
          '<input type="number" step="any" min="0" name="' + p.id + '" value="' + esc(cur[p.id] || '') + '"' + (canEdit ? '' : ' readonly') + '></label>').join('') + '</div>' +
        (canEdit ? '<div class="actions-row">' +
          '<button type="button" class="btn" data-derive>Auto-fill from 24K &amp; Fine Silver</button>' +
          (DB.settings.rateApiUrl ? '<button type="button" class="btn" data-fetch>Fetch live rate</button>' : '') +
          '<span class="spacer"></span><button type="button" class="btn primary" data-save>Save rates</button></div>' +
          '<p class="muted small">Saved rates are used immediately on new bills. ' +
          (DB.settings.rateApiUrl ? '' : 'You can connect a live rate feed in Settings &rarr; Rate feed.') + '</p>' : '') +
        '<p class="muted small">Last updated: ' + (latest.at ? U.fmtDateTime(latest.at) + ' by ' + esc(latest.by || '-') + ' (' + esc(latest.source || '') + ')' : 'never') + '</p>' +
        '</form></section>' +
        '<section class="card"><div class="card-head"><h3>Trend</h3>' +
        '<select class="chart-key">' + purities.map((p) => '<option value="' + p.id + '"' + (p.id === chartKey ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select></div>' +
        '<div class="chart-box"></div></section></div>' +
        '<section class="card"><div class="card-head"><h3>Rate history</h3></div>' +
        UI.table({
          columns: [{ label: 'Date & time', render: (r) => U.fmtDateTime(r.at) }]
            .concat(purities.map((p) => ({ label: p.name, align: 'right', render: (r) => (r.values[p.id] ? U.num(r.values[p.id], 0) : '-') })))
            .concat([{ label: 'Source', key: 'source' }, { label: 'By', key: 'by' }]),
          rows: history.slice().reverse().slice(0, 60), empty: 'No rates recorded',
        }) + '</section>';

      const drawChart = () => { el.querySelector('.chart-box').innerHTML = lineChart(history, chartKey); };
      drawChart();
      el.querySelector('.chart-key').addEventListener('change', (e) => { chartKey = e.target.value; drawChart(); });

      if (!canEdit) return;
      const form = el.querySelector('.rate-form');
      el.querySelector('[data-derive]').addEventListener('click', () => {
        const g24 = U.n(form.G24K && form.G24K.value);
        const s999 = U.n(form.S999 && form.S999.value);
        purities.forEach((p) => {
          if (p.metalId === 'GOLD' && p.id !== 'G24K' && g24) form[p.id].value = Math.round(g24 * p.fineness / 999);
          if (p.metalId === 'SILVER' && p.id !== 'S999' && s999) form[p.id].value = Math.round(s999 * p.fineness / 999 * 100) / 100;
        });
        UI.toast('Derived from purity (fineness). Adjust to your market rate if needed.');
      });
      const fetchBtn = el.querySelector('[data-fetch]');
      if (fetchBtn) fetchBtn.addEventListener('click', async () => {
        try {
          const res = await fetch(DB.settings.rateApiUrl);
          const json = await res.json();
          let n = 0;
          purities.forEach((p) => { if (json[p.id]) { form[p.id].value = json[p.id]; n++; } });
          UI.toast(n ? 'Fetched ' + n + ' rate(s). Review and Save.' : 'Feed returned no matching rates', n ? 'ok' : 'error');
        } catch (e) {
          UI.toast('Could not fetch rates: ' + e.message, 'error');
        }
      });
      el.querySelector('[data-save]').addEventListener('click', () => {
        const values = {};
        let missing = false;
        purities.forEach((p) => {
          const v = U.n(form[p.id].value);
          if (v > 0) values[p.id] = v; else if (p.showRate) missing = true;
        });
        if (missing) { UI.toast('Please enter all highlighted rates', 'error'); return; }
        DB.insert('rates', { at: new Date().toISOString(), values, source: 'Manual', by: Auth.user.username });
        UI.toast('Rates saved and applied to new bills');
        App.route();
      });
    },
  });
})();
