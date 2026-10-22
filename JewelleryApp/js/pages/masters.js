/* Masters: one screen to maintain every master list (items, categories, purities, HSN, vendors, customers ...) */
(function () {
  'use strict';
  const esc = U.esc;

  const TABS = [
    { id: 'items', label: 'Item Master' },
    { id: 'categories', label: 'Categories' },
    { id: 'metals', label: 'Metals' },
    { id: 'purities', label: 'Purity / Karat' },
    { id: 'hsn', label: 'HSN & GST' },
    { id: 'stoneTypes', label: 'Stone Types' },
    { id: 'paymentModes', label: 'Payment Modes' },
    { id: 'customerGroups', label: 'Customer Groups' },
    { id: 'customers', label: 'Customers' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'users', label: 'Users & Roles', roles: ['Admin'] },
  ];

  // Minimal CSV parser (handles quoted fields and commas inside quotes)
  function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim()));
  }

  function exportCols(schema) {
    const fields = typeof schema.fields === 'function' ? schema.fields({}, true) : schema.fields;
    return fields.filter((f) => f.type !== 'password' && f.type !== 'image').map((f) => ({ key: f.name, label: f.name }));
  }

  function importCSV(schema, file, done) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(String(reader.result));
        if (rows.length < 2) throw new Error('File has no data rows');
        const head = rows[0].map((h) => h.trim());
        const fields = typeof schema.fields === 'function' ? schema.fields({}, true) : schema.fields;
        const keyField = head.includes('code') ? 'code' : head.includes('id') ? 'id' : 'name';
        let added = 0, updated = 0;
        const errors = [];
        rows.slice(1).forEach((r, idx) => {
          const rec = {};
          head.forEach((h, i) => {
            const f = fields.find((x) => x.name === h);
            if (!f) return;
            let v = (r[i] || '').trim();
            if (f.type === 'number') v = v === '' ? '' : parseFloat(v);
            if (f.type === 'checkbox') v = /^(1|true|yes|y)$/i.test(v);
            rec[h] = v;
          });
          const missing = fields.filter((f) => f.required && f.type !== 'password' && (rec[f.name] === '' || rec[f.name] == null)).map((f) => f.name);
          if (missing.length) { errors.push('Row ' + (idx + 2) + ': missing ' + missing.join(', ')); return; }
          const existing = DB.find(schema.col, (x) => String(x[keyField]).toLowerCase() === String(rec[keyField]).toLowerCase());
          if (schema.beforeSave && schema.col !== 'users') {
            const err = schema.beforeSave(rec, !existing, existing);
            if (err) { errors.push('Row ' + (idx + 2) + ': ' + err); return; }
          }
          if (existing) { DB.update(schema.col, existing.id, rec); updated++; } else {
            if (schema.col === 'hsn') rec.id = rec.code;
            DB.insert(schema.col, Object.assign(schema.defaults ? schema.defaults() : {}, rec)); added++;
          }
        });
        UI.toast('Import done: ' + added + ' added, ' + updated + ' updated' + (errors.length ? ', ' + errors.length + ' skipped' : ''), errors.length ? 'error' : 'ok');
        if (errors.length) console.warn(errors.join('\n'));
        done();
      } catch (e) {
        UI.toast('Import failed: ' + e.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  Pages.register({
    id: 'masters', title: 'Master Data', icon: '&#9776;', roles: ['Admin', 'Manager'],
    render(el, params) {
      const tabs = TABS.filter((t) => Auth.can(t.roles));
      let active = tabs.find((t) => t.id === params.tab) ? params.tab : 'items';
      el.innerHTML = '<div class="masters">' +
        '<nav class="tabs">' + tabs.map((t) => '<button data-tab="' + t.id + '">' + esc(t.label) + ' <small>' + DB.all(t.id).length + '</small></button>').join('') +
        (Auth.can(['Admin']) ? '<a class="tab-link" href="#/settings">Shop &amp; Branding &rarr;</a>' : '') + '</nav>' +
        '<section class="card master-body"><div class="master-head"></div><div class="crud"></div></section></div>';

      function show(id) {
        active = id;
        el.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === id));
        const schema = Schemas[id];
        const canEdit = schema.canEdit ? schema.canEdit() : true;
        el.querySelector('.master-head').innerHTML = '<h3>' + esc(TABS.find((t) => t.id === id).label) + '</h3>' +
          '<div class="actions-row"><button class="btn sm" data-export>Export CSV</button>' +
          (canEdit && id !== 'users' ? '<label class="btn sm file-btn">Import CSV<input type="file" accept=".csv,text/csv" data-import hidden></label>' : '') + '</div>';
        const crud = UI.crud(el.querySelector('.crud'), Object.assign({}, schema, {
          afterSave: () => { const b = el.querySelector('[data-tab="' + id + '"] small'); if (b) b.textContent = DB.all(id).length; },
        }));
        el.querySelector('[data-export]').onclick = () => {
          U.download(id + '.csv', U.toCSV(exportCols(schema), DB.all(schema.col)), 'text/csv');
        };
        const imp = el.querySelector('[data-import]');
        if (imp) imp.onchange = () => { if (imp.files[0]) importCSV(schema, imp.files[0], () => { crud.render(); show(id); }); };
      }

      el.querySelector('.tabs').addEventListener('click', (e) => {
        const b = e.target.closest('[data-tab]');
        if (b) { history.replaceState(null, '', '#/masters?tab=' + b.dataset.tab); show(b.dataset.tab); }
      });
      show(active);
    },
  });
})();
