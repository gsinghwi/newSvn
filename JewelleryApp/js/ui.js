/* JewelleryApp - UI building blocks: modal, toast, forms, tables and a generic master CRUD screen */
(function (global) {
  'use strict';

  const esc = U.esc;

  function opts(field) {
    const o = typeof field.options === 'function' ? field.options() : field.options || [];
    return o.map((x) => (typeof x === 'object' ? x : { value: x, label: x }));
  }

  const UI = {
    esc,

    toast(msg, type) {
      let box = document.getElementById('toasts');
      if (!box) {
        box = document.createElement('div');
        box.id = 'toasts';
        document.body.appendChild(box);
      }
      const t = document.createElement('div');
      t.className = 'toast ' + (type || 'ok');
      t.textContent = msg;
      box.appendChild(t);
      setTimeout(() => t.classList.add('hide'), 2800);
      setTimeout(() => t.remove(), 3300);
    },

    modal({ title, body, actions, size, onOpen }) {
      const wrap = document.createElement('div');
      wrap.className = 'modal-wrap';
      wrap.innerHTML =
        '<div class="modal ' + (size || '') + '" role="dialog" aria-modal="true">' +
        '<div class="modal-head"><h3>' + esc(title) + '</h3><button class="icon-btn" data-close aria-label="Close">&times;</button></div>' +
        '<div class="modal-body">' + body + '</div>' +
        '<div class="modal-foot"></div></div>';
      const foot = wrap.querySelector('.modal-foot');
      const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      (actions || [{ label: 'Close', cls: 'btn' }]).forEach((a) => {
        const b = document.createElement('button');
        b.className = a.cls || 'btn';
        b.textContent = a.label;
        b.addEventListener('click', () => {
          const res = a.onClick ? a.onClick(wrap) : undefined;
          if (res !== false) close();
        });
        foot.appendChild(b);
      });
      if (!foot.children.length) foot.remove();
      wrap.querySelector('[data-close]').addEventListener('click', close);
      wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(wrap);
      const first = wrap.querySelector('input:not([type=hidden]):not([readonly]), select, textarea');
      if (first) setTimeout(() => first.focus(), 30);
      if (onOpen) onOpen(wrap, close);
      return { el: wrap, close };
    },

    confirm(message, okLabel) {
      return new Promise((resolve) => {
        let answered = false;
        const m = UI.modal({
          title: 'Please confirm',
          body: '<p>' + esc(message) + '</p>',
          actions: [
            { label: 'Cancel', cls: 'btn', onClick: () => { answered = true; resolve(false); } },
            { label: okLabel || 'Yes, continue', cls: 'btn danger', onClick: () => { answered = true; resolve(true); } },
          ],
        });
        const obs = new MutationObserver(() => {
          if (!document.body.contains(m.el)) { obs.disconnect(); if (!answered) resolve(false); }
        });
        obs.observe(document.body, { childList: true });
      });
    },

    fieldHtml(f, value) {
      const id = 'f_' + f.name;
      const req = f.required ? ' required' : '';
      const ro = f.readonly ? ' readonly' : '';
      const v = value == null ? (f.default != null ? f.default : '') : value;
      let input;
      switch (f.type) {
        case 'select':
          input = '<select id="' + id + '" name="' + f.name + '"' + req + (f.readonly ? ' disabled' : '') + '>' +
            (f.required ? '' : '<option value="">-- Select --</option>') +
            opts(f).map((o) => '<option value="' + esc(o.value) + '"' + (String(o.value) === String(v) ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') +
            '</select>';
          break;
        case 'textarea':
          input = '<textarea id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 3) + '"' + req + ro + '>' + esc(v) + '</textarea>';
          break;
        case 'checkbox':
          return '<label class="check' + (f.full ? ' full' : '') + '"><input type="checkbox" name="' + f.name + '"' + (v ? ' checked' : '') + '> ' + esc(f.label) + '</label>';
        case 'image':
          input = '<div class="img-field"><img src="' + esc(v) + '" alt="" class="' + (v ? '' : 'empty') + '">' +
            '<input type="file" accept="image/*" data-image-for="' + f.name + '">' +
            '<input type="hidden" name="' + f.name + '" value="' + esc(v) + '">' +
            '<button type="button" class="btn sm" data-image-clear="' + f.name + '">Remove</button></div>';
          break;
        default:
          input = '<input id="' + id + '" name="' + f.name + '" type="' + (f.type || 'text') + '" value="' + esc(v) + '"' +
            (f.step ? ' step="' + f.step + '"' : f.type === 'number' ? ' step="any"' : '') +
            (f.min != null ? ' min="' + f.min + '"' : '') +
            (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') +
            (f.maxlength ? ' maxlength="' + f.maxlength + '"' : '') + req + ro + '>';
      }
      return '<div class="field' + (f.full ? ' full' : '') + '"><label for="' + id + '">' + esc(f.label) + (f.required ? ' <b class="req">*</b>' : '') + '</label>' +
        input + (f.help ? '<small>' + esc(f.help) + '</small>' : '') + '</div>';
    },

    formHtml(fields, values) {
      values = values || {};
      return '<form class="form-grid" onsubmit="return false">' + fields.map((f) => UI.fieldHtml(f, values[f.name])).join('') + '</form>';
    },

    bindImageInputs(root) {
      root.querySelectorAll('[data-image-for]').forEach((inp) => {
        inp.addEventListener('change', async () => {
          const file = inp.files[0];
          if (!file) return;
          if (file.size > 600 * 1024) { UI.toast('Please use an image under 600 KB', 'error'); inp.value = ''; return; }
          const url = await U.readFileAsDataURL(file);
          const box = inp.closest('.img-field');
          box.querySelector('input[type=hidden]').value = url;
          const img = box.querySelector('img');
          img.src = url; img.classList.remove('empty');
          inp.dispatchEvent(new Event('imagechange', { bubbles: true }));
        });
      });
      root.querySelectorAll('[data-image-clear]').forEach((b) => {
        b.addEventListener('click', () => {
          const box = b.closest('.img-field');
          box.querySelector('input[type=hidden]').value = '';
          const img = box.querySelector('img');
          img.removeAttribute('src'); img.classList.add('empty');
          b.dispatchEvent(new Event('imagechange', { bubbles: true }));
        });
      });
    },

    readForm(root, fields) {
      const out = {};
      const missing = [];
      fields.forEach((f) => {
        const el = root.querySelector('[name="' + f.name + '"]');
        if (!el) return;
        let v;
        if (f.type === 'checkbox') v = el.checked;
        else if (f.type === 'number') v = el.value === '' ? '' : parseFloat(el.value);
        else v = el.value.trim();
        if (f.required && (v === '' || v == null)) missing.push(f.label);
        out[f.name] = v;
      });
      if (missing.length) {
        UI.toast('Please fill: ' + missing.join(', '), 'error');
        return null;
      }
      return out;
    },

    table({ columns, rows, empty, rowAttr, foot }) {
      if (!rows.length) return '<div class="empty">' + esc(empty || 'No records found') + '</div>';
      const th = columns.map((c) => '<th class="' + (c.align || '') + '">' + esc(c.label) + '</th>').join('');
      const body = rows.map((r) => '<tr ' + (rowAttr ? rowAttr(r) : '') + '>' + columns.map((c) =>
        '<td class="' + (c.align || '') + '" data-label="' + esc(c.label) + '">' + (c.render ? c.render(r) : esc(r[c.key])) + '</td>').join('') + '</tr>').join('');
      const tf = foot ? '<tfoot><tr>' + columns.map((c) => '<td class="' + (c.align || '') + '">' + (foot[c.key] != null ? foot[c.key] : '') + '</td>').join('') + '</tr></tfoot>' : '';
      return '<div class="table-wrap"><table class="grid"><thead><tr>' + th + '</tr></thead><tbody>' + body + '</tbody>' + tf + '</table></div>';
    },

    badge(text, kind) {
      return '<span class="badge ' + (kind || '') + '">' + esc(text) + '</span>';
    },

    /* Generic searchable list + add/edit/delete for a master collection */
    crud(container, schema) {
      let query = '';
      const canEdit = schema.canEdit ? schema.canEdit() : true;

      function rows() {
        let list = DB.all(schema.col).slice();
        if (schema.filter) list = list.filter(schema.filter);
        if (query) {
          const q = query.toLowerCase();
          const keys = schema.searchKeys || schema.columns.map((c) => c.key);
          list = list.filter((r) => keys.some((k) => String(typeof k === 'function' ? k(r) : r[k] || '').toLowerCase().includes(q)));
        }
        if (schema.sort) list.sort(schema.sort);
        return list;
      }

      function render() {
        const list = rows();
        const cols = schema.columns.concat(canEdit || schema.rowActions ? [{
          label: '', align: 'right', render: (r) =>
            (schema.rowActions ? schema.rowActions(r) : '') +
            (canEdit ? '<button class="icon-btn" data-edit="' + r.id + '" title="Edit">&#9998;</button>' +
              '<button class="icon-btn danger" data-del="' + r.id + '" title="Delete">&#128465;</button>' : ''),
        }] : []);
        container.querySelector('.crud-body').innerHTML = UI.table({
          columns: cols, rows: list,
          empty: 'No ' + schema.title.toLowerCase() + ' yet',
          rowAttr: (r) => 'data-row="' + r.id + '"' + (schema.onRowClick ? ' class="clickable"' : ''),
        });
        container.querySelector('.crud-count').textContent = list.length + ' record' + (list.length === 1 ? '' : 's');
      }

      function openForm(rec) {
        const isNew = !rec;
        const values = rec ? Object.assign({}, rec) : (schema.defaults ? schema.defaults() : {});
        const fields = typeof schema.fields === 'function' ? schema.fields(values, isNew) : schema.fields;
        UI.modal({
          title: (isNew ? 'Add ' : 'Edit ') + schema.singular,
          size: schema.modalSize || '',
          body: UI.formHtml(fields, values),
          onOpen: (el) => { UI.bindImageInputs(el); if (schema.onFormOpen) schema.onFormOpen(el, values, isNew); },
          actions: [
            { label: 'Cancel' },
            {
              label: 'Save', cls: 'btn primary',
              onClick: (el) => {
                const data = UI.readForm(el, fields);
                if (!data) return false;
                if (schema.beforeSave) {
                  const err = schema.beforeSave(data, isNew, rec);
                  if (err) { UI.toast(err, 'error'); return false; }
                }
                if (isNew) DB.insert(schema.col, data); else DB.update(schema.col, rec.id, data);
                UI.toast(schema.singular + ' saved');
                if (schema.afterSave) schema.afterSave();
                render();
              },
            },
          ],
        });
      }

      container.innerHTML =
        '<div class="toolbar">' +
        '<input type="search" class="crud-search" placeholder="Search ' + esc(schema.title.toLowerCase()) + '...">' +
        '<span class="crud-count muted"></span><span class="spacer"></span>' +
        (schema.toolbarExtra || '') +
        (canEdit ? '<button class="btn primary crud-add">+ Add ' + esc(schema.singular) + '</button>' : '') +
        '</div><div class="crud-body"></div>';

      container.querySelector('.crud-search').addEventListener('input', U.debounce((e) => { query = e.target.value.trim(); render(); }, 150));
      const add = container.querySelector('.crud-add');
      if (add) add.addEventListener('click', () => openForm(null));
      container.querySelector('.crud-body').addEventListener('click', async (e) => {
        const edit = e.target.closest('[data-edit]');
        const del = e.target.closest('[data-del]');
        if (edit) { e.stopPropagation(); openForm(DB.get(schema.col, edit.dataset.edit)); return; }
        if (del) {
          e.stopPropagation();
          const rec = DB.get(schema.col, del.dataset.del);
          const block = schema.canDelete ? schema.canDelete(rec) : null;
          if (block) { UI.toast(block, 'error'); return; }
          if (await UI.confirm('Delete this ' + schema.singular.toLowerCase() + '? This cannot be undone.', 'Delete')) {
            DB.remove(schema.col, rec.id);
            UI.toast(schema.singular + ' deleted');
            render();
          }
          return;
        }
        if (e.target.closest('button, a')) return;
        const row = e.target.closest('[data-row]');
        if (row && schema.onRowClick) schema.onRowClick(DB.get(schema.col, row.dataset.row));
      });
      render();
      return { render, openForm };
    },

    // Print arbitrary HTML using the shop's print stylesheet
    print(html) {
      let root = document.getElementById('print-root');
      if (!root) {
        root = document.createElement('div');
        root.id = 'print-root';
        document.body.appendChild(root);
      }
      root.innerHTML = html;
      document.body.classList.add('printing');
      setTimeout(() => {
        window.print();
        document.body.classList.remove('printing');
      }, 50);
    },
  };

  global.UI = UI;

  // Page registry: each screen in js/pages registers itself here
  global.Pages = {
    list: [],
    register(page) { this.list.push(page); },
    get(id) { return this.list.find((p) => p.id === id); },
  };
})(window);
