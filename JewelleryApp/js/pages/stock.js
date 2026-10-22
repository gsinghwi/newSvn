/* Stock: every tagged piece with weights, HUID, vendor, location and value at today's rate */
(function (global) {
  'use strict';
  const esc = U.esc;

  const itemOptions = () => DB.all('items').filter((i) => i.active !== false)
    .sort((a, b) => (a.code < b.code ? -1 : 1)).map((i) => ({ value: i.id, label: i.code + ' - ' + i.name }));

  function pieceFields() {
    return [
      { name: 'itemId', label: 'Item', type: 'select', required: true, options: itemOptions, full: true },
      { name: 'tagNo', label: 'Tag / barcode no.', help: 'Leave blank to auto-generate' },
      { name: 'huid', label: 'HUID (BIS hallmark)', maxlength: 6, help: '6-character hallmark unique ID' },
      { name: 'purityId', label: 'Purity', type: 'select', options: () => DB.all('purities').map((p) => ({ value: p.id, label: p.name })) },
      { name: 'qty', label: 'Quantity (pcs)', type: 'number', min: 1, default: 1 },
      { name: 'grossWt', label: 'Gross weight (g)', type: 'number', min: 0, step: '0.001' },
      { name: 'stoneWt', label: 'Stone / less weight (g)', type: 'number', min: 0, step: '0.001' },
      { name: 'netWt', label: 'Net weight (g)', type: 'number', min: 0, step: '0.001', help: 'Auto = gross - stone' },
      { name: 'stoneDetails', label: 'Stone details', placeholder: 'e.g. 0.24 ct VS-GH diamonds' },
      { name: 'stoneValue', label: 'Stone value (₹)', type: 'number', min: 0 },
      { name: 'otherCharges', label: 'Hallmark / other charges (₹)', type: 'number', min: 0 },
      { name: 'makingType', label: 'Making type (blank = item default)', type: 'select', options: Pricing.MAKING_TYPES },
      { name: 'makingValue', label: 'Making value (blank = item default)', type: 'number', min: 0 },
      { name: 'wastagePct', label: 'Wastage % (blank = item default)', type: 'number', min: 0 },
      { name: 'fixedPrice', label: 'Fixed price / MRP (₹)', type: 'number', min: 0, help: 'Only for fixed price items' },
      { name: 'size', label: 'Size / length' },
      { name: 'vendorId', label: 'Vendor', type: 'select', options: () => DB.all('vendors').map((v) => ({ value: v.id, label: v.name })) },
      { name: 'costPrice', label: 'Purchase cost (₹)', type: 'number', min: 0 },
      { name: 'location', label: 'Location', type: 'select', options: ['Counter 1', 'Counter 2', 'Counter 3', 'Locker', 'Display Window', 'Repair / Karigar'] },
      { name: 'receivedOn', label: 'Received on', type: 'date' },
    ];
  }

  function bindPieceForm(el) {
    const f = (n) => el.querySelector('[name="' + n + '"]');
    const recalc = () => { f('netWt').value = U.r3(U.n(f('grossWt').value) - U.n(f('stoneWt').value)); };
    f('grossWt').addEventListener('input', recalc);
    f('stoneWt').addEventListener('input', recalc);
    f('itemId').addEventListener('change', () => {
      const it = DB.get('items', f('itemId').value);
      if (it) f('purityId').value = it.purityId || '';
    });
  }

  function validatePiece(d, rec) {
    const item = DB.get('items', d.itemId);
    if (!item) return 'Choose an item';
    if (item.pricing === 'WEIGHT' && !(U.n(d.netWt) > 0)) return 'Net weight is required for weight based items';
    if (item.pricing === 'WEIGHT' && !d.purityId) return 'Choose a purity';
    if (item.pricing === 'FIXED' && !(U.n(d.fixedPrice) > 0)) return 'Enter the fixed price / MRP';
    if (U.n(d.stoneWt) > U.n(d.grossWt) && U.n(d.grossWt) > 0) return 'Stone weight cannot exceed gross weight';
    if (d.huid && !/^[A-Z0-9]{6}$/i.test(d.huid)) return 'HUID must be 6 letters/digits';
    d.huid = (d.huid || '').toUpperCase();
    if (d.tagNo) {
      const dup = DB.find('stock', (s) => s.tagNo.toLowerCase() === d.tagNo.toLowerCase() && (!rec || s.id !== rec.id));
      if (dup) return 'Tag ' + d.tagNo + ' already exists';
    } else {
      d.tagNo = DB.nextTag();
    }
    if (!d.qty) d.qty = 1;
    return null;
  }

  function openPiece(rec, onSave) {
    const fields = pieceFields();
    const values = rec ? Object.assign({}, rec) : { qty: 1, receivedOn: U.today(), location: 'Counter 1', otherCharges: DB.settings.hallmarkCharge, purityId: 'G22K' };
    UI.modal({
      title: rec ? 'Edit piece ' + rec.tagNo : 'Add stock piece', size: 'wide',
      body: UI.formHtml(fields, values),
      onOpen: bindPieceForm,
      actions: [{ label: 'Cancel' }, {
        label: 'Save', cls: 'btn primary', onClick: (el) => {
          const d = UI.readForm(el, fields);
          if (!d) return false;
          const err = validatePiece(d, rec);
          if (err) { UI.toast(err, 'error'); return false; }
          if (rec) DB.update('stock', rec.id, d);
          else DB.insert('stock', Object.assign(d, { status: 'IN_STOCK' }));
          UI.toast('Piece ' + d.tagNo + ' saved');
          onSave();
        },
      }],
    });
  }

  function tagLabels(pieces) {
    const s = DB.settings;
    return '<div class="tags-print">' + pieces.map((p) => {
      const it = Biz.item(p.itemId);
      return '<div class="tag-label"><b>' + esc(s.shopName) + '</b><span class="tag-no">' + esc(p.tagNo) + '</span>' +
        '<span>' + esc(it.name) + '</span><span>' + esc(Biz.purityName(p.purityId)) + (p.huid ? ' &middot; HUID ' + esc(p.huid) : '') + '</span>' +
        (it.pricing === 'FIXED' ? '<span>MRP ' + U.inr(p.fixedPrice, { whole: true }) + '</span>' :
          '<span>G ' + U.num(p.grossWt) + ' &middot; N ' + U.num(p.netWt) + '</span>') + '</div>';
    }).join('') + '</div>';
  }

  Pages.register({
    id: 'stock', title: 'Stock', icon: '&#9670;',
    render(el) {
      const canEdit = Auth.can(['Admin', 'Manager']);
      const state = { q: '', cat: '', purity: '', status: 'IN_STOCK', loc: '' };
      el.innerHTML =
        '<section class="card">' +
        '<div class="toolbar wrap">' +
        '<input type="search" data-f="q" placeholder="Search tag, HUID, item...">' +
        '<select data-f="cat"><option value="">All categories</option>' + DB.all('categories').map((c) => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('') + '</select>' +
        '<select data-f="purity"><option value="">All purities</option>' + DB.all('purities').map((p) => '<option value="' + p.id + '">' + esc(p.name) + '</option>').join('') + '</select>' +
        '<select data-f="status"><option value="IN_STOCK">In stock</option><option value="SOLD">Sold</option><option value="">All</option></select>' +
        '<span class="spacer"></span>' +
        '<button class="btn" data-print>Print tags</button>' +
        (canEdit ? '<a class="btn" href="#/purchases?new=1">Purchase entry</a><button class="btn primary" data-add>+ Add piece</button>' : '') +
        '</div><div class="stock-summary"></div><div class="stock-body"></div></section>';

      function filtered() {
        const q = state.q.toLowerCase();
        return DB.all('stock').filter((s) => {
          const it = Biz.item(s.itemId);
          if (state.status && s.status !== state.status) return false;
          if (state.cat && it.categoryId !== state.cat) return false;
          if (state.purity && s.purityId !== state.purity) return false;
          if (q && ![s.tagNo, s.huid, it.name, it.code, s.location, DB.name('vendors', s.vendorId)].some((v) => String(v || '').toLowerCase().includes(q))) return false;
          return true;
        }).sort((a, b) => (a.tagNo < b.tagNo ? -1 : 1));
      }

      function draw() {
        const rows = filtered();
        const rates = DB.currentRates();
        const value = U.sum(rows, (s) => Biz.pieceValue(s, rates));
        el.querySelector('.stock-summary').innerHTML =
          '<span><b>' + rows.length + '</b> pieces</span>' +
          '<span>Gross <b>' + U.wt(U.sum(rows, 'grossWt')) + '</b></span>' +
          '<span>Net <b>' + U.wt(U.sum(rows, 'netWt')) + '</b></span>' +
          '<span>Stone value <b>' + U.inr(U.sum(rows, 'stoneValue'), { whole: true }) + '</b></span>' +
          '<span>Value at today\'s rate <b>' + U.inr(value, { whole: true }) + '</b></span>';
        el.querySelector('.stock-body').innerHTML = UI.table({
          columns: [
            { label: 'Tag', render: (s) => '<b>' + esc(s.tagNo) + '</b>' },
            { label: 'Item', render: (s) => esc(Biz.item(s.itemId).name) + (s.stoneDetails ? '<br><small class="muted">' + esc(s.stoneDetails) + '</small>' : '') },
            { label: 'Purity', render: (s) => esc(Biz.purityName(s.purityId)) },
            { label: 'Gross (g)', align: 'right', render: (s) => U.num(s.grossWt) },
            { label: 'Net (g)', align: 'right', render: (s) => U.num(s.netWt) },
            { label: 'Stone ₹', align: 'right', render: (s) => (s.stoneValue ? U.inr(s.stoneValue, { whole: true }) : '-') },
            { label: 'HUID', key: 'huid' },
            { label: 'Vendor', render: (s) => esc(DB.name('vendors', s.vendorId)) },
            { label: 'Location', key: 'location' },
            { label: 'Value today', align: 'right', render: (s) => U.inr(Biz.pieceValue(s, rates), { whole: true }) },
            { label: 'Status', render: (s) => (s.status === 'SOLD' ? UI.badge('Sold') : UI.badge('In stock', 'ok')) },
            {
              label: '', align: 'right', render: (s) => (canEdit && s.status === 'IN_STOCK'
                ? '<button class="icon-btn" data-edit="' + s.id + '" title="Edit">&#9998;</button><button class="icon-btn danger" data-del="' + s.id + '" title="Delete">&#128465;</button>' : ''),
            },
          ],
          rows, empty: 'No stock matches these filters',
        });
      }

      el.querySelectorAll('[data-f]').forEach((inp) => inp.addEventListener('input', U.debounce(() => { state[inp.dataset.f] = inp.value.trim(); draw(); }, 120)));
      el.querySelector('[data-print]').addEventListener('click', () => {
        const rows = filtered().filter((s) => s.status === 'IN_STOCK');
        if (!rows.length) { UI.toast('No in-stock pieces to print', 'error'); return; }
        UI.print(tagLabels(rows));
      });
      const add = el.querySelector('[data-add]');
      if (add) add.addEventListener('click', () => openPiece(null, draw));
      el.querySelector('.stock-body').addEventListener('click', async (e) => {
        const ed = e.target.closest('[data-edit]');
        const del = e.target.closest('[data-del]');
        if (ed) openPiece(DB.get('stock', ed.dataset.edit), draw);
        if (del && await UI.confirm('Delete this stock piece?', 'Delete')) {
          DB.remove('stock', del.dataset.del);
          UI.toast('Piece deleted');
          draw();
        }
      });
      draw();
    },
  });

  global.StockUI = { openPiece, validatePiece };
})(window);
