/* JewelleryApp - data layer.
 * Prototype storage lives in the browser (localStorage). Every read/write goes through
 * this module, so swapping it for a REST API / database later only touches this file.
 */
(function (global) {
  'use strict';

  const KEY = 'jewelleryapp.data.v1';

  const DB = {
    data: null,

    load() {
      try {
        const raw = localStorage.getItem(KEY);
        this.data = raw ? JSON.parse(raw) : null;
      } catch (e) {
        this.data = null;
      }
      if (!this.data || !this.data.version) {
        this.data = Seed.build();
        this.persist();
      }
      return this.data;
    },

    persist() {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.data));
        return true;
      } catch (e) {
        if (global.UI) UI.toast('Could not save data: browser storage is full or blocked. Try a smaller logo image.', 'error');
        return false;
      }
    },

    reset() {
      this.data = Seed.build();
      this.persist();
    },

    exportJSON() {
      return JSON.stringify(this.data, null, 2);
    },

    importJSON(text) {
      const parsed = JSON.parse(text);
      if (!parsed || !parsed.version || !Array.isArray(parsed.items)) throw new Error('Not a JewelleryApp backup file');
      this.data = parsed;
      this.persist();
    },

    get settings() { return this.data.settings; },

    saveSettings(patch) {
      Object.assign(this.data.settings, patch);
      this.persist();
    },

    all(col) {
      return this.data[col] || (this.data[col] = []);
    },

    get(col, id) {
      return this.all(col).find((x) => x.id === id) || null;
    },

    find(col, pred) {
      return this.all(col).find(pred) || null;
    },

    insert(col, obj) {
      const rec = Object.assign({ id: U.uid(col.slice(0, 3)) }, obj, { createdAt: obj.createdAt || new Date().toISOString() });
      this.all(col).push(rec);
      this.log('create', col, rec.id);
      this.persist();
      return rec;
    },

    update(col, id, patch) {
      const rec = this.get(col, id);
      if (!rec) return null;
      Object.assign(rec, patch, { updatedAt: new Date().toISOString() });
      this.log('update', col, id);
      this.persist();
      return rec;
    },

    remove(col, id) {
      const arr = this.all(col);
      const i = arr.findIndex((x) => x.id === id);
      if (i >= 0) arr.splice(i, 1);
      this.log('delete', col, id);
      this.persist();
    },

    log(action, col, id) {
      const user = global.Auth && Auth.user ? Auth.user.username : 'system';
      const audit = this.all('audit');
      audit.push({ at: new Date().toISOString(), user, action, col, id });
      if (audit.length > 500) audit.splice(0, audit.length - 500);
    },

    // Running document numbers, e.g. INV/2026-27/0007
    nextNo(counter, prefix, date) {
      const c = this.data.counters;
      c[counter] = (c[counter] || 0) + 1;
      return prefix + '/' + U.finYear(date) + '/' + String(c[counter]).padStart(4, '0');
    },

    nextTag() {
      const c = this.data.counters;
      let tag;
      do {
        c.tag = (c.tag || 1000) + 1;
        tag = (this.settings.tagPrefix || 'T') + c.tag;
      } while (this.find('stock', (s) => s.tagNo === tag));
      return tag;
    },

    nextCode(counter, prefix, width) {
      const c = this.data.counters;
      c[counter] = (c[counter] || 0) + 1;
      return prefix + String(c[counter]).padStart(width || 4, '0');
    },

    // ---- rates ----
    rateHistory() {
      return this.all('rates').slice().sort((a, b) => new Date(a.at) - new Date(b.at));
    },

    latestRate() {
      const h = this.rateHistory();
      return h.length ? h[h.length - 1] : { values: {}, at: null };
    },

    currentRates() {
      return this.latestRate().values || {};
    },

    // ---- derived balances ----
    customerSummary(customerId) {
      const invs = this.all('invoices').filter((i) => i.customerId === customerId && i.status !== 'CANCELLED');
      const receipts = this.all('receipts').filter((r) => r.customerId === customerId);
      const billed = U.sum(invs, 'grandTotal');
      const paidAtBill = U.sum(invs, 'paid');
      const received = U.sum(receipts, 'amount');
      const lastVisit = invs.map((i) => i.date).sort().pop() || '';
      return {
        invoices: invs, receipts, billed,
        paid: paidAtBill + received,
        outstanding: U.r2(billed - paidAtBill - received),
        lastVisit,
      };
    },

    vendorSummary(vendorId) {
      const v = this.get('vendors', vendorId) || {};
      const purchases = this.all('purchases').filter((p) => p.vendorId === vendorId);
      const payments = this.all('vendorPayments').filter((p) => p.vendorId === vendorId);
      const purchased = U.sum(purchases, 'total');
      const paid = U.sum(purchases, 'paid') + U.sum(payments, 'amount');
      return {
        purchases, payments, purchased, paid,
        payable: U.r2(U.n(v.openingBalance) + purchased - paid),
      };
    },

    // Display helpers used across pages
    name(col, id, field) {
      const r = this.get(col, id);
      return r ? r[field || 'name'] : '';
    },
  };

  global.DB = DB;
})(window);
