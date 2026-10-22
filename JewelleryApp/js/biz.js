/* JewelleryApp - business helpers shared by several screens */
(function (global) {
  'use strict';

  const Biz = {
    item(id) { return DB.get('items', id) || { name: '(deleted item)', pricing: 'WEIGHT', makingType: 'FLAT', makingValue: 0 }; },
    hsn(code) { return DB.get('hsn', code); },
    purityName(id) { return DB.name('purities', id) || id || '-'; },

    activeInvoices() {
      return DB.all('invoices').filter((i) => i.status !== 'CANCELLED');
    },

    inStock() {
      return DB.all('stock').filter((s) => s.status === 'IN_STOCK');
    },

    // Estimated selling value of a piece at given rates (before GST)
    pieceValue(piece, rates) {
      const item = Biz.item(piece.itemId);
      return Pricing.lineFromStock(piece, item, Biz.hsn(item.hsn), rates || DB.currentRates()).amount;
    },

    // Fine (pure) metal content of a piece in grams
    fineWt(piece) {
      const p = DB.get('purities', piece.purityId);
      return p ? U.r3(U.n(piece.netWt) * p.fineness / 1000) : 0;
    },

    // Birthdays / anniversaries falling in the next `days` days (ignores the year)
    upcomingEvents(days) {
      const today = new Date(U.today() + 'T00:00:00');
      const out = [];
      DB.all('customers').forEach((c) => {
        [['dob', 'Birthday'], ['anniversary', 'Anniversary']].forEach(([key, label]) => {
          if (!c[key]) return;
          const d = new Date(c[key] + 'T00:00:00');
          if (isNaN(d)) return;
          let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
          if (next < today) next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
          const inDays = Math.round((next - today) / 86400000);
          if (inDays <= days) out.push({ customer: c, type: label, date: U.isoDate(next), inDays });
        });
      });
      return out.sort((a, b) => a.inDays - b.inDays);
    },

    salesByDay(days) {
      const today = U.today();
      const list = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = U.addDays(today, -i);
        const invs = Biz.activeInvoices().filter((x) => x.date === d);
        list.push({ date: d, amount: U.sum(invs, 'grandTotal'), count: invs.length });
      }
      return list;
    },

    customerLabel(c) {
      return c ? c.name + (c.phone ? ' (' + c.phone + ')' : '') : '';
    },
  };

  global.Biz = Biz;
})(window);
