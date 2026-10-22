/* Settings: shop branding (login page + invoices), billing preferences, users, backup/restore */
(function () {
  'use strict';
  const esc = U.esc;

  const brandFields = [
    { name: 'shopName', label: 'Shop name', required: true },
    { name: 'tagline', label: 'Tagline' },
    { name: 'loginWelcome', label: 'Login page message', full: true },
    { name: 'logo', label: 'Logo (PNG/JPG/SVG, under 600 KB)', type: 'image' },
    { name: 'loginBg', label: 'Login background image (optional)', type: 'image' },
    { name: 'primaryColor', label: 'Primary colour', type: 'color' },
    { name: 'accentColor', label: 'Accent colour', type: 'color' },
  ];
  const shopFields = [
    { name: 'address', label: 'Shop address', full: true },
    { name: 'phone', label: 'Phone' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'gstin', label: 'GSTIN', maxlength: 15 },
    { name: 'pan', label: 'PAN', maxlength: 10 },
    { name: 'bisLicence', label: 'BIS hallmark licence no.' },
    { name: 'state', label: 'State', type: 'select', options: Schemas.STATES },
    { name: 'stateCode', label: 'GST state code', maxlength: 2 },
  ];
  const billingFields = [
    { name: 'invoicePrefix', label: 'Invoice prefix', required: true },
    { name: 'purchasePrefix', label: 'Purchase prefix', required: true },
    { name: 'tagPrefix', label: 'Stock tag prefix', required: true },
    { name: 'hallmarkCharge', label: 'Default hallmark charge per piece (₹)', type: 'number', min: 0 },
    { name: 'terms', label: 'Invoice terms & conditions', type: 'textarea', rows: 5, full: true },
    { name: 'rateApiUrl', label: 'Live rate feed URL (optional)', full: true, help: 'Should return JSON like {"G24K": 12850, "G22K": 11780, "S999": 165}. Adds a "Fetch live rate" button on the Rates screen.' },
    { name: 'showDemoHint', label: 'Show demo logins on the sign-in page', type: 'checkbox', full: true },
  ];

  const PRESETS = [
    ['Royal Maroon', '#7a1f2b', '#c9a227'], ['Emerald', '#0f5c4a', '#d4af37'], ['Midnight', '#1d2a4d', '#c9a227'],
    ['Rose Gold', '#8c4a52', '#e0a98f'], ['Classic Black', '#1f1f1f', '#d4af37'], ['Peacock', '#0b4f6c', '#e3b23c'],
  ];

  function preview(s) {
    return '<div class="brand-preview" style="--p:' + esc(s.primaryColor) + ';--a:' + esc(s.accentColor) + '">' +
      '<div class="bp-left" style="' + (s.loginBg ? 'background-image:linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.55)),url(' + esc(s.loginBg) + ')' : '') + '">' +
      (s.logo ? '<img src="' + esc(s.logo) + '" alt="">' : '<div class="login-mono">' + esc((s.shopName || 'J').charAt(0)) + '</div>') +
      '<b>' + esc(s.shopName) + '</b><small>' + esc(s.tagline) + '</small></div>' +
      '<div class="bp-right"><b>Sign in</b><span></span><span></span><i></i></div></div>';
  }

  Pages.register({
    id: 'settings', title: 'Settings & Branding', icon: '&#9881;', roles: ['Admin'],
    render(el) {
      const s = DB.settings;
      el.innerHTML =
        '<div class="grid-2 settings">' +
        '<section class="card"><div class="card-head"><h3>Branding (login page, sidebar &amp; invoices)</h3></div>' +
        '<div class="brand-form">' + UI.formHtml(brandFields, s) + '</div>' +
        '<div class="presets"><span class="muted small">Colour themes:</span>' + PRESETS.map(([n, p, a]) => '<button class="preset" data-preset="' + p + ',' + a + '" title="' + n + '" style="background:linear-gradient(135deg,' + p + ' 60%,' + a + ' 60%)"></button>').join('') + '</div>' +
        '<h4 class="sub">Login page preview</h4><div class="preview-box">' + preview(s) + '</div></section>' +
        '<section class="card"><div class="card-head"><h3>Shop details</h3></div><div class="shop-form">' + UI.formHtml(shopFields, s) + '</div>' +
        '<div class="card-head"><h3>Billing &amp; rates</h3></div><div class="billing-form">' + UI.formHtml(billingFields, s) + '</div></section>' +
        '</div>' +
        '<div class="sticky-save"><button class="btn primary" data-save>Save settings</button></div>' +
        '<section class="card"><div class="card-head"><h3>Users &amp; roles</h3><small class="muted">Admin: everything &middot; Manager: all except settings &amp; users &middot; Sales: billing, customers, stock view</small></div><div class="users-crud"></div></section>' +
        '<section class="card"><div class="card-head"><h3>Data &amp; backup</h3></div>' +
        '<p class="muted">This prototype stores data in this browser. Take a backup regularly and restore it on another computer if needed.</p>' +
        '<div class="actions-row"><button class="btn" data-backup>Download backup</button>' +
        '<label class="btn file-btn">Restore backup<input type="file" accept=".json,application/json" data-restore hidden></label>' +
        '<span class="spacer"></span><button class="btn danger" data-reset>Reset to demo data</button></div>' +
        '<h4 class="sub">Recent activity</h4><div class="audit"></div></section>';

      UI.bindImageInputs(el);
      UI.crud(el.querySelector('.users-crud'), Schemas.users);

      const current = () => {
        const d = {};
        [['.brand-form', brandFields], ['.shop-form', shopFields], ['.billing-form', billingFields]].forEach(([sel, f]) => {
          f.forEach((field) => {
            const inp = el.querySelector(sel + ' [name="' + field.name + '"]');
            if (!inp) return;
            d[field.name] = field.type === 'checkbox' ? inp.checked : field.type === 'number' ? U.n(inp.value) : inp.value.trim();
          });
        });
        return d;
      };
      const refreshPreview = () => { el.querySelector('.preview-box').innerHTML = preview(Object.assign({}, s, current())); };
      el.querySelector('.brand-form').addEventListener('input', refreshPreview);
      el.querySelector('.brand-form').addEventListener('imagechange', refreshPreview);

      el.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
        const [p, a] = b.dataset.preset.split(',');
        el.querySelector('[name=primaryColor]').value = p;
        el.querySelector('[name=accentColor]').value = a;
        refreshPreview();
      }));

      el.querySelector('[data-save]').addEventListener('click', () => {
        const d = current();
        if (!d.shopName) { UI.toast('Shop name is required', 'error'); return; }
        if (!d.invoicePrefix || !d.tagPrefix || !d.purchasePrefix) { UI.toast('Prefixes cannot be empty', 'error'); return; }
        if (d.gstin && !/^[0-9]{2}[A-Z0-9]{13}$/i.test(d.gstin)) { UI.toast('GSTIN should be 15 characters', 'error'); return; }
        d.gstin = (d.gstin || '').toUpperCase();
        if (d.gstin && !d.stateCode) d.stateCode = d.gstin.slice(0, 2);
        const before = JSON.stringify(DB.settings);
        Object.assign(DB.settings, d);
        if (!DB.persist()) { DB.data.settings = JSON.parse(before); return; }
        UI.toast('Settings saved');
        App.refreshShell();
      });

      el.querySelector('[data-backup]').addEventListener('click', () => {
        U.download('jewelleryapp-backup-' + U.today() + '.json', DB.exportJSON(), 'application/json');
      });
      el.querySelector('[data-restore]').addEventListener('change', async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        if (!(await UI.confirm('Restore will replace ALL current data with the backup. Continue?', 'Restore'))) { e.target.value = ''; return; }
        try {
          DB.importJSON(await f.text());
          UI.toast('Backup restored');
          Auth.logout();
          App.start();
        } catch (err) {
          UI.toast('Restore failed: ' + err.message, 'error');
        }
      });
      el.querySelector('[data-reset]').addEventListener('click', async () => {
        if (!(await UI.confirm('Erase everything and reload the demo data? Download a backup first if you need it.', 'Reset'))) return;
        DB.reset();
        Auth.logout();
        location.hash = '';
        App.start();
      });

      el.querySelector('.audit').innerHTML = UI.table({
        columns: [
          { label: 'When', render: (a) => U.fmtDateTime(a.at) }, { label: 'User', key: 'user' },
          { label: 'Action', key: 'action' }, { label: 'Record', render: (a) => esc(a.col + ' ' + (a.id || '')) },
        ],
        rows: DB.all('audit').slice(-25).reverse(), empty: 'No activity yet',
      });
    },
  });
})();
