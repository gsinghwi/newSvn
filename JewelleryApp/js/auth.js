/* JewelleryApp - authentication, roles and the branded login page */
(function (global) {
  'use strict';

  const SESSION_KEY = 'jewelleryapp.session';
  const esc = U.esc;

  const Auth = {
    user: null,

    restore() {
      try {
        const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
        if (s && s.userId) {
          const u = DB.get('users', s.userId);
          if (u && u.active) this.user = u;
        }
      } catch (e) { /* no session */ }
      return this.user;
    },

    login(username, password) {
      const u = DB.find('users', (x) => x.username.toLowerCase() === String(username).trim().toLowerCase());
      if (!u || !u.active) return null;
      if (U.hashPassword(password, u.salt) !== u.passwordHash) return null;
      this.user = u;
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: u.id, at: Date.now() })); } catch (e) { /* ignore */ }
      DB.log('login', 'users', u.id);
      DB.persist();
      return u;
    },

    logout() {
      this.user = null;
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    },

    setPassword(userId, password) {
      const salt = U.salt();
      DB.update('users', userId, { salt, passwordHash: U.hashPassword(password, salt), mustChange: false });
    },

    can(roles) {
      return !!this.user && (!roles || roles.includes(this.user.role));
    },

    usingDefaultPassword() {
      const u = this.user;
      const defaults = { admin: 'admin123', manager: 'manager123', sales: 'sales123' };
      return u && defaults[u.username] && U.hashPassword(defaults[u.username], u.salt) === u.passwordHash;
    },

    renderLogin(root, onSuccess) {
      const s = DB.settings;
      const bg = s.loginBg ? 'background-image:linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.55)),url(' + s.loginBg + ')' : '';
      root.innerHTML =
        '<div class="login">' +
        '<section class="login-brand" style="' + esc(bg) + '">' +
        '<div class="login-brand-inner">' +
        (s.logo ? '<img class="login-logo" src="' + esc(s.logo) + '" alt="">' : '<div class="login-mono">' + esc((s.shopName || 'J').charAt(0)) + '</div>') +
        '<h1>' + esc(s.shopName) + '</h1>' +
        '<p class="login-tagline">' + esc(s.tagline) + '</p>' +
        '<div class="login-meta">' + esc(s.address || '') + (s.phone ? '<br>' + esc(s.phone) : '') + '</div>' +
        '</div></section>' +
        '<section class="login-form-wrap"><form class="login-form" autocomplete="on">' +
        '<h2>Sign in</h2><p class="muted">' + esc(s.loginWelcome || '') + '</p>' +
        '<div class="field"><label for="lg_user">Username</label><input id="lg_user" name="username" autocomplete="username" required></div>' +
        '<div class="field"><label for="lg_pass">Password</label><input id="lg_pass" name="password" type="password" autocomplete="current-password" required></div>' +
        '<div class="login-error" hidden></div>' +
        '<button class="btn primary block" type="submit">Sign in</button>' +
        (s.showDemoHint ? '<div class="demo-hint"><b>Demo logins</b><br>admin / admin123 &middot; manager / manager123 &middot; sales / sales123</div>' : '') +
        '<p class="powered">JewelleryApp</p>' +
        '</form></section></div>';

      const form = root.querySelector('form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = Auth.login(form.username.value, form.password.value);
        if (!u) {
          const err = root.querySelector('.login-error');
          err.textContent = 'Invalid username or password';
          err.hidden = false;
          form.password.value = '';
          form.password.focus();
          return;
        }
        onSuccess(u);
      });
      setTimeout(() => form.username.focus(), 30);
    },
  };

  global.Auth = Auth;
})(window);
