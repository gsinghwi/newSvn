/* POS / Billing: scan tags, price at today's rate, old gold exchange, split payments, GST invoice */
(function () {
  'use strict';
  const esc = U.esc;
  let draft = null; // kept while navigating so an unfinished bill is not lost

  function blank() {
    return { customerId: 'cus_walkin', date: U.today(), interState: false, discount: '', notes: '', lines: [], oldGold: [], payments: [{ mode: 'Cash', amount: '', ref: '' }] };
  }

  const custLabel = (c) => c.name + ' - ' + (c.phone || c.code);
  const groupDiscount = (customerId) => {
    const c = DB.get('customers', customerId);
    const g = c && DB.get('customerGroups', c.groupId);
    return g ? U.n(g.makingDiscountPct) : 0;
  };

  function applyGroupDiscount(line) {
    if (line.makingEdited) return;
    const d = groupDiscount(draft.customerId);
    line.makingValue = U.r2(U.n(line.baseMakingValue) * (1 - d / 100));
  }

  Pages.register({
    id: 'pos', title: 'New Sale / Billing', icon: '&#10010;',
    render(el, params) {
      if (!draft) draft = blank();
      if (params.customer && DB.get('customers', params.customer)) draft.customerId = params.customer;
      const modes = DB.all('paymentModes').filter((m) => m.active !== false).map((m) => m.name);
      const purities = DB.all('purities').filter((p) => p.metalId !== 'NONE');

      el.innerHTML =
        '<div class="pos">' +
        '<div class="pos-main">' +
        '<section class="card"><div class="pos-head">' +
        '<div class="field grow"><label>Customer</label><div class="input-row"><input class="cust-input" list="cust-list" placeholder="Search name or mobile..."><button class="btn" data-new-cust>+ New</button></div><datalist id="cust-list"></datalist></div>' +
        '<div class="field"><label>Bill date</label><input type="date" data-h="date"></div>' +
        '<label class="check"><input type="checkbox" data-h="interState"> Inter-state (IGST)</label>' +
        '</div><div class="cust-info muted small"></div></section>' +
        '<section class="card"><div class="toolbar wrap">' +
        '<input class="scan grow" placeholder="Scan barcode or type Tag no. / HUID and press Enter" autocomplete="off">' +
        '<button class="btn" data-browse>Browse stock</button>' +
        '<button class="btn" data-refresh-rates title="Re-price all lines with the latest saved rates">Apply latest rates</button></div>' +
        '<div class="rates-used small muted"></div><div class="pos-lines"></div></section>' +
        '<section class="card"><div class="card-head"><h3>Old gold exchange <small>(URD purchase, deducted after GST)</small></h3><button class="btn sm" data-add-og>+ Add old gold</button></div><div class="pos-og"></div></section>' +
        '</div>' +
        '<aside class="pos-side card">' +
        '<h3>Bill summary</h3><div class="pos-totals"></div>' +
        '<div class="field"><label>Discount (₹, before GST)</label><input type="number" min="0" data-h="discount"></div>' +
        '<h4 class="sub">Payments</h4><div class="pos-pay"></div>' +
        '<div class="actions-row"><button class="btn sm" data-add-pay>+ Split payment</button><button class="btn sm" data-fill>Fill balance</button></div>' +
        '<div class="field"><label>Notes</label><textarea rows="2" data-h="notes" placeholder="Order ref, size alteration, etc."></textarea></div>' +
        '<div class="pos-buttons"><button class="btn primary block" data-save="print">Save &amp; Print</button><button class="btn block" data-save="view">Save</button><button class="btn ghost block" data-clear>Clear bill</button></div>' +
        '</aside></div>';

      const $ = (s) => el.querySelector(s);
      const custInput = $('.cust-input');

      function fillCustomers() {
        $('#cust-list').innerHTML = DB.all('customers').map((c) => '<option value="' + esc(custLabel(c)) + '"></option>').join('');
        const c = DB.get('customers', draft.customerId);
        custInput.value = c ? custLabel(c) : '';
        const s = c ? DB.customerSummary(c.id) : null;
        const g = c && DB.get('customerGroups', c.groupId);
        $('.cust-info').innerHTML = c ? esc([c.city, g && g.name + (U.n(g.makingDiscountPct) ? ' (' + g.makingDiscountPct + '% off making)' : ''), c.pan && 'PAN ' + c.pan, c.gstin && 'GSTIN ' + c.gstin].filter(Boolean).join(' · ')) +
          (s && s.outstanding > 0 ? ' · <b class="warn-text">Previous due ' + U.inr(s.outstanding) + '</b>' : '') +
          (c.notes ? ' · ' + esc(c.notes) : '') : '';
      }

      function renderHeader() {
        $('[data-h=date]').value = draft.date;
        $('[data-h=interState]').checked = !!draft.interState;
        $('[data-h=discount]').value = draft.discount;
        $('[data-h=notes]').value = draft.notes;
        const r = DB.latestRate();
        $('.rates-used').innerHTML = 'Rates as of ' + (r.at ? U.fmtDateTime(r.at) : '-') + ': ' +
          purities.filter((p) => p.showRate).map((p) => esc(p.name) + ' <b>' + U.inr(r.values[p.id], { whole: true }) + '</b>').join(' · ');
      }

      function renderLines() {
        if (!draft.lines.length) {
          $('.pos-lines').innerHTML = '<div class="empty">Scan a tag or use "Browse stock" to add items</div>';
          recalc();
          return;
        }
        const numIn = (i, k, v, extra) => '<input type="number" step="any" min="0" data-l="' + i + '" data-k="' + k + '" value="' + esc(v) + '"' + (extra || '') + '>';
        $('.pos-lines').innerHTML = '<div class="table-wrap"><table class="grid edit-grid pos-grid"><thead><tr>' +
          '<th>Item</th><th class="right">Gross / Net g</th><th>Rate ₹/g</th><th>VA %</th><th>Making</th><th>Stone ₹</th><th>Other ₹</th><th class="right">Amount</th><th></th></tr></thead><tbody>' +
          draft.lines.map((l, i) => {
            const fixed = l.pricing === 'FIXED';
            return '<tr><td><b>' + esc(l.itemName) + '</b><br><small class="muted">' + esc(l.tagNo) + (l.huid ? ' · HUID ' + esc(l.huid) : '') + (fixed ? ' · Fixed price' : ' · ' + esc(Biz.purityName(l.purityId))) + '</small></td>' +
              '<td class="right nowrap">' + (fixed ? '-' : U.num(l.grossWt) + ' / <b>' + U.num(l.netWt) + '</b>') + '</td>' +
              (fixed
                ? '<td colspan="3"><label class="inline small">MRP ₹ ' + numIn(i, 'fixedPrice', l.fixedPrice) + '</label></td>'
                : '<td>' + numIn(i, 'rate', l.rate, ' class="' + (U.n(l.rate) ? '' : 'invalid') + '"') + '</td>' +
                  '<td>' + numIn(i, 'wastagePct', l.wastagePct, ' class="sm"') + '</td>' +
                  '<td class="nowrap"><select data-l="' + i + '" data-k="makingType">' + Pricing.MAKING_TYPES.map((m) => '<option value="' + m.value + '"' + (m.value === l.makingType ? ' selected' : '') + '>' + (m.value === 'PERCENT' ? '%' : m.value === 'PER_GRAM' ? '₹/g' : '₹ flat') + '</option>').join('') + '</select>' + numIn(i, 'makingValue', l.makingValue, ' class="sm"') + '</td>') +
              '<td>' + numIn(i, 'stoneValue', l.stoneValue) + '</td>' +
              '<td>' + numIn(i, 'otherCharges', l.otherCharges, ' class="sm"') + '</td>' +
              '<td class="right nowrap" data-amt="' + i + '"></td>' +
              '<td><button class="icon-btn danger" data-rm-line="' + i + '" title="Remove">&times;</button></td></tr>';
          }).join('') + '</tbody></table></div>';
        recalc();
      }

      function renderOG() {
        if (!draft.oldGold.length) { $('.pos-og').innerHTML = '<p class="muted small">No old gold taken in this bill.</p>'; recalc(); return; }
        $('.pos-og').innerHTML = '<div class="table-wrap"><table class="grid edit-grid"><thead><tr><th>Description</th><th>Purity</th><th>Gross g</th><th>Less %</th><th class="right">Net g</th><th>Rate ₹/g</th><th class="right">Value</th><th></th></tr></thead><tbody>' +
          draft.oldGold.map((o, i) => '<tr>' +
            '<td><input data-o="' + i + '" data-k="description" value="' + esc(o.description) + '"></td>' +
            '<td><select data-o="' + i + '" data-k="purityId">' + purities.map((p) => '<option value="' + p.id + '"' + (p.id === o.purityId ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select></td>' +
            '<td><input type="number" step="0.001" min="0" data-o="' + i + '" data-k="grossWt" value="' + esc(o.grossWt) + '"></td>' +
            '<td><input type="number" step="any" min="0" class="sm" data-o="' + i + '" data-k="deductionPct" value="' + esc(o.deductionPct) + '" title="Melting / purity deduction"></td>' +
            '<td class="right" data-ognet="' + i + '"></td>' +
            '<td><input type="number" step="any" min="0" data-o="' + i + '" data-k="rate" value="' + esc(o.rate) + '"></td>' +
            '<td class="right" data-ogval="' + i + '"></td>' +
            '<td><button class="icon-btn danger" data-rm-og="' + i + '">&times;</button></td></tr>').join('') + '</tbody></table></div>';
        recalc();
      }

      function renderPayments() {
        $('.pos-pay').innerHTML = draft.payments.map((p, i) => '<div class="pay-row">' +
          '<select data-p="' + i + '" data-k="mode">' + modes.map((m) => '<option' + (m === p.mode ? ' selected' : '') + '>' + esc(m) + '</option>').join('') + '</select>' +
          '<input type="number" min="0" step="any" placeholder="Amount" data-p="' + i + '" data-k="amount" value="' + esc(p.amount) + '">' +
          '<input placeholder="Ref / UTR" data-p="' + i + '" data-k="ref" value="' + esc(p.ref) + '">' +
          (draft.payments.length > 1 ? '<button class="icon-btn danger" data-rm-pay="' + i + '">&times;</button>' : '') + '</div>').join('');
      }

      function recalc() {
        const inv = Pricing.calcInvoice(draft);
        inv.lines.forEach((l, i) => {
          const cell = el.querySelector('[data-amt="' + i + '"]');
          if (cell) cell.innerHTML = '<b>' + U.inr(l.amount) + '</b>' + (l.pricing === 'FIXED' ? '' : '<br><small class="muted">metal ' + U.inr(l.metalValue, { whole: true }) + ' + mk ' + U.inr(l.making, { whole: true }) + '</small>');
        });
        inv.oldGold.forEach((o, i) => {
          const n = el.querySelector('[data-ognet="' + i + '"]');
          const v = el.querySelector('[data-ogval="' + i + '"]');
          if (n) n.textContent = U.num(o.netWt);
          if (v) v.textContent = U.inr(o.value);
        });
        const row = (k, v, cls) => '<div class="' + (cls || '') + '"><span>' + k + '</span><b>' + v + '</b></div>';
        $('.pos-totals').innerHTML = '<div class="totals-box">' +
          row('Items', inv.lines.length + ' · ' + U.wt(U.sum(inv.lines, 'netWt'))) +
          row('Sub total', U.inr(inv.subTotal)) +
          (inv.discount ? row('Discount', '- ' + U.inr(inv.discount)) : '') +
          row('Taxable value', U.inr(inv.taxable)) +
          (draft.interState ? row('IGST', U.inr(inv.igst)) : row('CGST', U.inr(inv.cgst)) + row('SGST', U.inr(inv.sgst))) +
          row('Invoice value', U.inr(inv.invoiceValue)) +
          (inv.oldGoldValue ? row('Less old gold', '- ' + U.inr(inv.oldGoldValue)) : '') +
          (inv.roundOff ? row('Round off', U.inr(inv.roundOff)) : '') +
          row('Net payable', U.inr(inv.grandTotal), 'grand') +
          row('Paid', U.inr(inv.paid)) +
          row(inv.balance >= 0 ? 'Balance due' : 'Excess paid', U.inr(Math.abs(inv.balance)), inv.balance ? 'due' : 'ok') +
          '</div>';
        return inv;
      }

      function addPiece(piece) {
        if (!piece) { UI.toast('No stock found for that tag / HUID', 'error'); return; }
        if (piece.status !== 'IN_STOCK') { UI.toast(piece.tagNo + ' is already sold', 'error'); return; }
        if (draft.lines.some((l) => l.stockId === piece.id)) { UI.toast(piece.tagNo + ' is already on this bill', 'error'); return; }
        const item = Biz.item(piece.itemId);
        const line = Pricing.lineFromStock(piece, item, Biz.hsn(item.hsn), DB.currentRates());
        line.baseMakingValue = line.makingValue;
        applyGroupDiscount(line);
        draft.lines.push(line);
        if (item.pricing === 'WEIGHT' && !U.n(line.rate)) UI.toast('No rate saved for ' + Biz.purityName(line.purityId) + '. Enter the rate on the line.', 'error');
        renderLines();
      }

      function browseStock() {
        const m = UI.modal({
          title: 'Add from stock', size: 'wide',
          body: '<input type="search" class="b-q" placeholder="Search tag, HUID, item, category..."><div class="b-list"></div>',
          actions: [{ label: 'Done', cls: 'btn primary' }],
        });
        const drawList = () => {
          const q = m.el.querySelector('.b-q').value.trim().toLowerCase();
          const rows = Biz.inStock().filter((s) => !draft.lines.some((l) => l.stockId === s.id)).filter((s) => {
            const it = Biz.item(s.itemId);
            return !q || [s.tagNo, s.huid, it.name, it.code, DB.name('categories', it.categoryId)].some((v) => String(v || '').toLowerCase().includes(q));
          }).slice(0, 100);
          const rates = DB.currentRates();
          m.el.querySelector('.b-list').innerHTML = UI.table({
            columns: [
              { label: 'Tag', key: 'tagNo' }, { label: 'Item', render: (s) => esc(Biz.item(s.itemId).name) },
              { label: 'Purity', render: (s) => esc(Biz.purityName(s.purityId)) },
              { label: 'Net g', align: 'right', render: (s) => U.num(s.netWt) },
              { label: 'Est. price', align: 'right', render: (s) => U.inr(Biz.pieceValue(s, rates), { whole: true }) },
              { label: '', align: 'right', render: (s) => '<button class="btn sm primary" data-pick="' + s.id + '">Add</button>' },
            ],
            rows, empty: 'No matching pieces in stock',
          });
        };
        m.el.querySelector('.b-q').addEventListener('input', U.debounce(drawList, 120));
        m.el.querySelector('.b-list').addEventListener('click', (e) => {
          const b = e.target.closest('[data-pick]');
          if (b) { addPiece(DB.get('stock', b.dataset.pick)); drawList(); }
        });
        drawList();
      }

      function quickCustomer() {
        const fields = Schemas.customers.fields.filter((f) => ['name', 'phone', 'email', 'groupId', 'city', 'pan', 'gstin', 'dob', 'anniversary'].includes(f.name));
        UI.modal({
          title: 'New customer', size: 'wide', body: UI.formHtml(fields, Schemas.customers.defaults()),
          actions: [{ label: 'Cancel' }, {
            label: 'Save', cls: 'btn primary', onClick: (mel) => {
              const d = UI.readForm(mel, fields);
              if (!d) return false;
              d.state = DB.settings.state;
              const err = Schemas.customers.beforeSave(d, true, null);
              if (err) { UI.toast(err, 'error'); return false; }
              const c = DB.insert('customers', d);
              draft.customerId = c.id;
              draft.lines.forEach(applyGroupDiscount);
              fillCustomers();
              renderLines();
              UI.toast('Customer ' + c.name + ' added');
            },
          }],
        });
      }

      function save(mode) {
        const inv = recalc();
        const c = DB.get('customers', draft.customerId);
        if (!c) { UI.toast('Select a customer', 'error'); return; }
        if (!inv.lines.length) { UI.toast('Add at least one item', 'error'); return; }
        const bad = inv.lines.find((l) => (l.pricing === 'FIXED' ? !U.n(l.fixedPrice) : !U.n(l.rate)));
        if (bad) { UI.toast('Enter the rate / price for ' + bad.itemName, 'error'); return; }
        const sold = inv.lines.find((l) => { const s = DB.get('stock', l.stockId); return !s || s.status !== 'IN_STOCK'; });
        if (sold) { UI.toast(sold.tagNo + ' is no longer in stock', 'error'); return; }
        if (inv.balance < 0) { UI.toast('Payment exceeds the bill amount by ' + U.inr(-inv.balance), 'error'); return; }
        if (inv.balance > 0 && c.id === 'cus_walkin') { UI.toast('Select or add the customer to bill on credit (balance due)', 'error'); return; }
        const cash = U.sum(inv.payments.filter((p) => p.mode === 'Cash'), 'amount');
        if (cash >= 200000) { UI.toast('Cash receipt of ₹2 lakh or more in one bill is not allowed (Sec 269ST). Use another mode.', 'error'); return; }
        if (inv.grandTotal >= 200000 && !c.pan) { UI.toast('PAN is mandatory for bills of ₹2 lakh or more. Add PAN to the customer.', 'error'); return; }

        const record = DB.insert('invoices', Object.assign(inv, {
          invoiceNo: DB.nextNo('invoice', DB.settings.invoicePrefix || 'INV', inv.date),
          status: 'ACTIVE', createdBy: Auth.user.username,
        }));
        record.lines.forEach((l) => {
          const s = DB.get('stock', l.stockId);
          s.status = 'SOLD';
          s.soldInvoiceId = record.id;
        });
        DB.persist();
        draft = blank();
        UI.toast('Invoice ' + record.invoiceNo + ' saved');
        App.route();
        if (mode === 'print') UI.print(InvoiceUI.html(record));
        else InvoiceUI.view(record);
      }

      // ---- events ----
      custInput.addEventListener('change', () => {
        const c = DB.all('customers').find((x) => custLabel(x) === custInput.value.trim());
        if (c) {
          draft.customerId = c.id;
          if (c.state && c.state !== DB.settings.state && !draft.interState) { draft.interState = true; UI.toast('Customer is from ' + c.state + ': IGST applied'); }
          draft.lines.forEach(applyGroupDiscount);
          renderHeader();
          renderLines();
        }
        fillCustomers();
      });
      custInput.addEventListener('focus', () => custInput.select());

      $('.scan').addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const v = e.target.value.trim().toLowerCase();
        if (!v) return;
        addPiece(DB.find('stock', (s) => s.tagNo.toLowerCase() === v || (s.huid && s.huid.toLowerCase() === v)));
        e.target.value = '';
      });

      el.addEventListener('input', (e) => {
        const t = e.target;
        const k = t.dataset.k;
        if (t.dataset.h) {
          draft[t.dataset.h] = t.type === 'checkbox' ? t.checked : t.value;
          recalc();
        } else if (t.dataset.l != null && k) {
          const line = draft.lines[+t.dataset.l];
          line[k] = t.value;
          if (k === 'makingValue' || k === 'makingType') line.makingEdited = true;
          t.classList.toggle('invalid', k === 'rate' && !U.n(t.value));
          recalc();
        } else if (t.dataset.o != null && k) {
          const o = draft.oldGold[+t.dataset.o];
          o[k] = t.value;
          if (k === 'purityId') {
            o.rate = DB.currentRates()[o.purityId] || '';
            t.closest('tr').querySelector('[data-k=rate]').value = o.rate;
          }
          recalc();
        } else if (t.dataset.p != null && k) {
          draft.payments[+t.dataset.p][k] = t.value;
          recalc();
        }
      });

      el.addEventListener('click', async (e) => {
        const t = e.target.closest('button');
        if (!t) return;
        const d = t.dataset;
        if (d.rmLine != null) { draft.lines.splice(+d.rmLine, 1); renderLines(); }
        else if (d.rmOg != null) { draft.oldGold.splice(+d.rmOg, 1); renderOG(); }
        else if (d.rmPay != null) { draft.payments.splice(+d.rmPay, 1); renderPayments(); recalc(); }
        else if ('addOg' in d) {
          draft.oldGold.push({ description: 'Old gold ornament', purityId: 'G22K', grossWt: '', deductionPct: 8, rate: DB.currentRates().G22K || '' });
          renderOG();
        } else if ('addPay' in d) {
          draft.payments.push({ mode: modes.find((m) => m !== draft.payments[0].mode) || modes[0], amount: '', ref: '' });
          renderPayments();
        } else if ('fill' in d) {
          const inv = Pricing.calcInvoice(draft);
          const last = draft.payments[draft.payments.length - 1];
          last.amount = U.r2(U.n(last.amount) + inv.balance);
          renderPayments();
          recalc();
        } else if ('browse' in d) browseStock();
        else if ('newCust' in d) quickCustomer();
        else if ('refreshRates' in d) {
          const rates = DB.currentRates();
          draft.lines.forEach((l) => { if (l.pricing !== 'FIXED') l.rate = rates[l.purityId] || l.rate; });
          draft.oldGold.forEach((o) => { o.rate = rates[o.purityId] || o.rate; });
          renderHeader(); renderLines(); renderOG();
          UI.toast('Latest rates applied');
        } else if ('save' in d) save(d.save);
        else if ('clear' in d) {
          if (draft.lines.length && !(await UI.confirm('Clear this bill?', 'Clear'))) return;
          draft = blank();
          App.route();
        }
      });

      fillCustomers();
      renderHeader();
      renderPayments();
      renderOG();
      renderLines();
      setTimeout(() => $('.scan').focus(), 50);
    },
  });
})();
