/* JewelleryApp - shared helpers (formatting, ids, hashing, CSV) */
(function (global) {
  'use strict';

  function sha256(text) {
    // Compact pure-JS SHA-256 so hashing also works when opened via file://
    const ascii = unescape(encodeURIComponent(text));
    const rightRotate = (v, a) => (v >>> a) | (v << (32 - a));
    const maxWord = Math.pow(2, 32);
    let result = '';
    const words = [];
    const bitLength = ascii.length * 8;
    let hash = [];
    const k = [];
    const isComposite = {};
    let primeCounter = 0;
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    hash = hash.slice(0, 8);
    let msg = ascii + '\x80';
    while ((msg.length % 64) - 56) msg += '\x00';
    for (let i = 0; i < msg.length; i++) {
      words[i >> 2] |= msg.charCodeAt(i) << (((3 - i) % 4) * 8);
    }
    words[words.length] = (bitLength / maxWord) | 0;
    words[words.length] = bitLength;
    for (let j = 0; j < words.length;) {
      const w = words.slice(j, (j += 16));
      const oldHash = hash;
      hash = hash.slice(0, 8);
      for (let i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ (~e & hash[6]))
          + k[i]
          + (w[i] = i < 16 ? w[i] : (w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
        const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (let i = 0; i < 8; i++) {
      for (let j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }

  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const U = {
    sha256,

    esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    uid(prefix) {
      return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },

    salt() {
      return Math.random().toString(36).slice(2, 12);
    },

    hashPassword(password, salt) {
      return sha256(salt + ':' + password);
    },

    n(v) {
      const x = parseFloat(v);
      return isFinite(x) ? x : 0;
    },

    r2(v) { return Math.round((U.n(v) + Number.EPSILON) * 100) / 100; },
    r3(v) { return Math.round((U.n(v) + Number.EPSILON) * 1000) / 1000; },

    inr(v, opts) {
      const digits = opts && opts.whole ? 0 : 2;
      return '₹' + U.n(v).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    },

    num(v, d = 3) {
      return U.n(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
    },

    wt(v) { return U.num(v, 3) + ' g'; },

    today() {
      const d = new Date();
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    },

    isoDate(d) {
      d = d instanceof Date ? d : new Date(d);
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    },

    addDays(isoDate, days) {
      const d = new Date(isoDate + 'T00:00:00');
      d.setDate(d.getDate() + days);
      return U.isoDate(d);
    },

    fmtDate(v) {
      if (!v) return '';
      const d = new Date(v.length === 10 ? v + 'T00:00:00' : v);
      if (isNaN(d)) return v;
      return pad(d.getDate()) + '-' + MONTHS[d.getMonth()] + '-' + d.getFullYear();
    },

    fmtDateTime(v) {
      if (!v) return '';
      const d = new Date(v);
      return U.fmtDate(v) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    },

    // Indian financial year label for a date, e.g. 2026-27
    finYear(isoDate) {
      const d = new Date((isoDate || U.today()) + 'T00:00:00');
      const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
      return y + '-' + String(y + 1).slice(2);
    },

    inRange(date, from, to) {
      const d = (date || '').slice(0, 10);
      return (!from || d >= from) && (!to || d <= to);
    },

    sum(arr, fn) {
      return arr.reduce((s, x) => s + U.n(typeof fn === 'function' ? fn(x) : x[fn]), 0);
    },

    groupBy(arr, fn) {
      return arr.reduce((m, x) => {
        const k = fn(x);
        (m[k] = m[k] || []).push(x);
        return m;
      }, {});
    },

    toCSV(columns, rows) {
      const cell = (v) => {
        const s = String(v == null ? '' : v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      const head = columns.map((c) => cell(c.label)).join(',');
      const body = rows.map((r) => columns.map((c) => cell(c.csv ? c.csv(r) : r[c.key])).join(','));
      return [head].concat(body).join('\n');
    },

    download(filename, text, mime) {
      const blob = new Blob([text], { type: mime || 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    },

    readFileAsDataURL(file) {
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
    },

    debounce(fn, ms) {
      let t;
      return function () {
        clearTimeout(t);
        const args = arguments;
        t = setTimeout(() => fn.apply(this, args), ms || 200);
      };
    },

    // Amount in words using the Indian numbering system (lakh / crore)
    amountInWords(amount) {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven',
        'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      const two = (n) => (n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : ''));
      const three = (n) => (n >= 100 ? ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + two(n % 100) : '') : two(n));
      let n = Math.floor(Math.abs(U.n(amount)));
      const paise = Math.round((Math.abs(U.n(amount)) - n) * 100);
      if (n === 0 && !paise) return 'Zero Rupees Only';
      const parts = [];
      const crore = Math.floor(n / 10000000); n %= 10000000;
      const lakh = Math.floor(n / 100000); n %= 100000;
      const thousand = Math.floor(n / 1000); n %= 1000;
      if (crore) parts.push(three(crore) + ' Crore');
      if (lakh) parts.push(two(lakh) + ' Lakh');
      if (thousand) parts.push(two(thousand) + ' Thousand');
      if (n) parts.push(three(n));
      let words = parts.join(' ') + ' Rupees';
      if (paise) words += ' and ' + two(paise) + ' Paise';
      return words + ' Only';
    },
  };

  global.U = U;
})(window);
