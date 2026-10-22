/* JewelleryApp - app shell, theming and hash router */
(function (global) {
  'use strict';

  const esc = U.esc;
  const root = document.getElementById('app');

  const NAV = [
    { group: 'Overview', ids: ['dashboard', 'rates'] },
    { group: 'Sales', ids: ['pos', 'sales', 'customers'] },
    { group: 'Inventory', ids: ['stock', 'purchases', 'vendors'] },
    { group: 'Admin', ids: ['reports', 'masters', 'settings'] },
  ];

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function applyTheme() {
    const s = DB.settings;
    const st = document.documentElement.style;
    st.setProperty('--primary', s.primaryColor || '#7a1f2b');
    st.setProperty('--accent', s.accentColor || '#c9a227');
    const rgb = hexToRgb(s.primaryColor);
    if (rgb) st.setProperty('--primary-rgb', rgb.join(','));
    document.title = (s.shopName || 'JewelleryApp') + ' | JewelleryApp';
  }

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const params = {};
    (qs || '').split('&').filter(Boolean).forEach((kv) => {
      const [k, v] = kv.split('=');
      params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return { id: path || 'dashboard', params };
  }

  function rateTicker() {
    const latest = DB.latestRate();
    const v = latest.values || {};
    const show = [['G24K', '24K'], ['G22K', '22K'], ['G18K', '18K'], ['S999', 'Silver']];
    return '<a class="ticker" href="#/rates" title="Latest rates per gram. Click to update.">' +
      show.map(([k, l]) => '<span><b>' + l + '</b> ' + U.inr(v[k], { whole: true }) + '</span>').join('') +
      '<em>' + (latest.at ? 'as of ' + U.fmtDateTime(latest.at) : 'no rates set') + '</em></a>';
  }

  function renderShell() {
    const s = DB.settings;
    const u = Auth.user;
    const nav = NAV.map((g) => {
      const links = g.ids.map((id) => Pages.get(id)).filter((p) => p && Auth.can(p.roles));
      if (!links.length) return '';
      return '<div class="nav-group"><div class="nav-title">' + g.group + '</div>' +
        links.map((p) => '<a href="#/' + p.id + '" data-nav="' + p.id + '"><span class="ico">' + p.icon + '</span>' + esc(p.title) + '</a>').join('') + '</div>';
    }).join('');

    root.innerHTML =
      '<div class="shell">' +
      '<aside class="sidebar">' +
      '<div class="brand">' + (s.logo ? '<img src="' + esc(s.logo) + '" alt="">' : '<div class="mono">' + esc((s.shopName || 'J').charAt(0)) + '</div>') +
      '<div><div class="brand-name">' + esc(s.shopName) + '</div><div class="brand-sub">JewelleryApp</div></div></div>' +
      '<nav>' + nav + '</nav>' +
      '</aside>' +
      '<div class="scrim"></div>' +
      '<main class="main">' +
      '<header class="topbar">' +
      '<button class="icon-btn menu-btn" aria-label="Menu">&#9776;</button>' +
      '<h2 class="page-title"></h2>' +
      '<div class="ticker-slot">' + rateTicker() + '</div>' +
      '<div class="user-menu"><button class="user-btn">' + esc(u.name) + ' <small>' + esc(u.role) + '</small> &#9662;</button>' +
      '<div class="user-drop" hidden><button data-act="password">Change password</button><button data-act="logout">Sign out</button></div></div>' +
      '</header>' +
      (Auth.usingDefaultPassword() ? '<div class="banner warn">You are using the default demo password. <a href="#" data-act="password">Change it now</a>.</div>' : '') +
      '<div id="view" class="view"></div>' +
      '</main></div>';

  }

  // Shell interactions are delegated once on the root, so re-rendering the shell never stacks listeners
  root.addEventListener('click', (e) => {
    const shell = root.querySelector('.shell');
    if (!shell) return;
    const drop = root.querySelector('.user-drop');
    if (e.target.closest('.user-btn')) { drop.hidden = !drop.hidden; return; }
    if (drop) drop.hidden = true;
    if (e.target.closest('.menu-btn')) { shell.classList.toggle('nav-open'); return; }
    if (e.target.closest('.scrim') || e.target.closest('.sidebar a')) shell.classList.remove('nav-open');
    const act = e.target.closest('[data-act]');
    if (!act) return;
    e.preventDefault();
    if (act.dataset.act === 'logout') { Auth.logout(); history.replaceState(null, '', location.pathname); start(); }
    if (act.dataset.act === 'password') changePassword();
  });

  function changePassword() {
    const fields = [
      { name: 'current', label: 'Current password', type: 'password', required: true },
      { name: 'next', label: 'New password', type: 'password', required: true, help: 'At least 6 characters' },
      { name: 'confirm', label: 'Confirm new password', type: 'password', required: true },
    ];
    UI.modal({
      title: 'Change password',
      body: UI.formHtml(fields, {}),
      actions: [{ label: 'Cancel' }, {
        label: 'Update', cls: 'btn primary', onClick: (el) => {
          const d = UI.readForm(el, fields);
          if (!d) return false;
          if (U.hashPassword(d.current, Auth.user.salt) !== Auth.user.passwordHash) { UI.toast('Current password is wrong', 'error'); return false; }
          if (d.next.length < 6) { UI.toast('New password must be at least 6 characters', 'error'); return false; }
          if (d.next !== d.confirm) { UI.toast('Passwords do not match', 'error'); return false; }
          Auth.setPassword(Auth.user.id, d.next);
          UI.toast('Password updated');
          renderShell();
          route();
        },
      }],
    });
  }

  function route() {
    if (!Auth.user) return;
    const { id, params } = parseHash();
    let page = Pages.get(id);
    if (!page || !Auth.can(page.roles)) page = Pages.get('dashboard');
    root.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === page.id));
    root.querySelector('.page-title').textContent = page.title;
    root.querySelector('.ticker-slot').innerHTML = rateTicker();
    // Fresh element per page so listeners a page attaches to its view never outlive it
    const old = root.querySelector('#view');
    const view = old.cloneNode(false);
    old.replaceWith(view);
    window.scrollTo(0, 0);
    page.render(view, params);
  }

  function start() {
    DB.load();
    applyTheme();
    if (!Auth.restore()) {
      Auth.renderLogin(root, () => { renderShell(); route(); });
      return;
    }
    renderShell();
    route();
  }

  global.App = {
    start, route, applyTheme,
    refreshShell() { applyTheme(); renderShell(); route(); },
    go(hash) { if (location.hash === hash) route(); else location.hash = hash; },
  };

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', start);
})(window);
