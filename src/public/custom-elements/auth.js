// CWHW log in / sign up form, used on the /login page.
// The page code sets the "config" attribute ({ mode, google, links }) and answers events via "result".
const CLASSES = ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'College', 'Other'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

customElements.define('cwhw-auth', class extends HTMLElement {
  static get observedAttributes() { return ['config', 'result']; }

  attributeChangedCallback(name, oldV, val) {
    if (!val) return;
    let d; try { d = JSON.parse(val); } catch (e) { return; }
    if (name === 'config') {
      this.cfg = d;
      if (d.mode && !this.modeSet) { this.mode = d.mode; this.modeSet = true; }
      if (this.ready) this.render();
    }
    if (name === 'result') this.onResult(d);
  }

  connectedCallback() {
    if (this.ready) return;
    this.ready = true;
    this.cfg = this.cfg || {};
    this.mode = this.mode || 'login';
    if (!document.getElementById('cwhw-font')) {
      const l = document.createElement('link');
      l.id = 'cwhw-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap';
      document.head.appendChild(l);
    }
    this.style.display = 'block';
    this.innerHTML = `<style>
cwhw-auth .band{box-sizing:border-box;font-family:'Space Grotesk',sans-serif;color:#2F3E4E;padding:24px 16px 32px}
cwhw-auth .card{max-width:420px;margin:0 auto;background:#fff;border:2px solid #2F3E4E;border-radius:18px;box-shadow:6px 6px 0 #FFC124;padding:28px 28px 24px;box-sizing:border-box}
cwhw-auth h2{margin:0 0 4px;font-size:26px;line-height:1.15;letter-spacing:-.3px}
cwhw-auth .sub{margin:0 0 20px;font-size:15px;color:#5B6B7B}
cwhw-auth .tabs{display:flex;background:#F3EEE8;border-radius:12px;padding:4px;margin-bottom:20px}
cwhw-auth .tab{flex:1;border:0;background:none;border-radius:9px;padding:9px 0;font:700 14px 'Space Grotesk',sans-serif;color:#5B6B7B;cursor:pointer}
cwhw-auth .tab.on{background:#fff;color:#2F3E4E;box-shadow:0 1px 3px rgba(47,62,78,.18)}
cwhw-auth label{display:block;font-weight:700;font-size:13px;margin:0 0 6px}
cwhw-auth .f{margin-bottom:14px}
cwhw-auth input,cwhw-auth select{width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid #CFC8C1;border-radius:10px;font:500 15px 'Space Grotesk',sans-serif;background:#fff;color:#1d1d1d;transition:border-color .15s,box-shadow .15s}
cwhw-auth input:focus,cwhw-auth select:focus{outline:none;border-color:#2F3E4E;box-shadow:0 0 0 3px rgba(255,193,36,.45)}
cwhw-auth .pw{position:relative}
cwhw-auth .pw input{padding-right:64px}
cwhw-auth .eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);border:0;background:none;font:700 12px 'Space Grotesk',sans-serif;color:#5B6B7B;cursor:pointer;padding:6px 8px}
cwhw-auth .hint{font-size:12px;color:#5B6B7B;margin-top:5px}
cwhw-auth .err{color:#b3261e;font-size:12px;margin-top:5px;font-weight:500}
cwhw-auth .row{display:flex;justify-content:flex-end;margin:-6px 0 16px}
cwhw-auth .lnk{border:0;background:none;padding:0;font:700 13px 'Space Grotesk',sans-serif;color:#2F3E4E;text-decoration:underline;cursor:pointer}
cwhw-auth .tick{display:flex;gap:10px;align-items:flex-start;font-size:13px;font-weight:500;line-height:1.45;margin:4px 0 18px;color:#4a5866}
cwhw-auth .tick input{width:18px;height:18px;flex:0 0 18px;margin:1px 0 0;padding:0;accent-color:#2F3E4E}
cwhw-auth .tick a{color:#2F3E4E;font-weight:700}
cwhw-auth .btn{margin-top:6px;width:100%;border:2px solid #2F3E4E;border-radius:10px;padding:12px 20px;font:700 16px 'Space Grotesk',sans-serif;cursor:pointer;background:#FFC124;color:#1d1d1d;box-shadow:3px 3px 0 #2F3E4E;transition:transform .08s,box-shadow .08s}
cwhw-auth .btn:hover{background:#FFCB45}
cwhw-auth .btn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #2F3E4E}
cwhw-auth .btn:disabled{opacity:.6;cursor:default}
cwhw-auth .or{display:flex;align-items:center;gap:10px;color:#8A96A3;font-size:12px;margin:16px 0}
cwhw-auth .or:before,cwhw-auth .or:after{content:'';flex:1;height:1px;background:#E6E0DA}
cwhw-auth .gbtn{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;border:1.5px solid #CFC8C1;border-radius:10px;padding:11px 18px;font:700 15px 'Space Grotesk',sans-serif;cursor:pointer;background:#fff;color:#1d1d1d}
cwhw-auth .gbtn:hover{border-color:#2F3E4E}
cwhw-auth .msg{border-radius:10px;padding:10px 12px;font-size:13px;font-weight:500;margin-bottom:14px}
cwhw-auth .msg.bad{background:#fde8e6;color:#8c1d14;border:1px solid #e6a59e}
cwhw-auth .msg.ok{background:#e3f4ec;color:#1d6b4f;border:1px solid #9fd4bb}
@media (max-width:600px){cwhw-auth .band{padding:16px 12px 24px}cwhw-auth .card{padding:22px 18px 20px;box-shadow:4px 4px 0 #FFC124}cwhw-auth h2{font-size:24px}}
</style>
<div class="band"><div class="card" id="card"></div></div>`;
    this.band = this.querySelector('.band');
    // Fill the full page width wherever Wix places the element
    this.fit = () => {
      this.band.style.width = document.documentElement.clientWidth + 'px';
      this.band.style.marginLeft = '0px';
      this.band.style.marginLeft = (-this.band.getBoundingClientRect().left) + 'px';
    };
    this.fit(); setTimeout(this.fit, 500); setTimeout(this.fit, 1500);
    window.addEventListener('resize', this.fit);
    this.render();
  }

  disconnectedCallback() { window.removeEventListener('resize', this.fit); }

  el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  field(id, labelText, input, hint) {
    const f = this.el('div', 'f');
    const l = this.el('label', null, labelText); l.htmlFor = id;
    input.id = id;
    f.append(l, input);
    if (hint) f.append(this.el('div', 'hint', hint));
    const e = this.el('div', 'err'); e.id = id + '-err'; f.append(e);
    return f;
  }

  input(type, autocomplete, placeholder) {
    const i = this.el('input');
    i.type = type; i.autocomplete = autocomplete; if (placeholder) i.placeholder = placeholder;
    return i;
  }

  passwordInput(autocomplete) {
    const wrap = this.el('div', 'pw');
    const i = this.input('password', autocomplete);
    const eye = this.el('button', 'eye', 'Show'); eye.type = 'button';
    eye.setAttribute('aria-label', 'Show password');
    eye.onclick = () => {
      const show = i.type === 'password';
      i.type = show ? 'text' : 'password';
      eye.textContent = show ? 'Hide' : 'Show';
      eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    };
    wrap.append(i, eye);
    return { wrap, input: i };
  }

  setErr(id, text) {
    const e = this.querySelector('#' + id + '-err');
    if (e) e.textContent = text || '';
    const i = this.querySelector('#' + id);
    if (i) i.setAttribute('aria-invalid', text ? 'true' : 'false');
    return !text;
  }

  showMsg(text, ok) {
    const m = this.querySelector('#msg');
    if (!m) return;
    m.className = text ? 'msg ' + (ok ? 'ok' : 'bad') : '';
    m.textContent = text || '';
    m.style.display = text ? '' : 'none';
  }

  busy(on, label) {
    this.isBusy = on;
    const b = this.querySelector('#go');
    if (b) { b.disabled = on; b.textContent = on ? label : (this.mode === 'signup' ? 'Create account' : 'Log in'); }
    this.querySelectorAll('.gbtn, .tab').forEach(x => { x.disabled = on; });
  }

  render() {
    const card = this.querySelector('#card');
    if (!card) return;
    const cfg = this.cfg || {};
    const keepEmail = (this.querySelector('#email') || {}).value || '';
    card.innerHTML = '';
    const signup = this.mode === 'signup';

    card.append(this.el('h2', null, signup ? 'Create your account' : 'Welcome back'));
    card.append(this.el('p', 'sub', signup ? 'Join CWHW and start studying together. It’s free.' : 'Log in to continue studying with CWHW.'));

    const tabs = this.el('div', 'tabs');
    tabs.setAttribute('role', 'tablist');
    [['login', 'Log in'], ['signup', 'Sign up']].forEach(([m, t]) => {
      const b = this.el('button', 'tab' + (this.mode === m ? ' on' : ''), t);
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(this.mode === m));
      b.onclick = () => { if (this.mode !== m && !this.isBusy) { this.mode = m; this.render(); } };
      tabs.append(b);
    });
    card.append(tabs);

    const msg = this.el('div'); msg.id = 'msg'; msg.setAttribute('role', 'status'); msg.style.display = 'none';
    card.append(msg);

    const form = this.el('form');
    form.noValidate = true;

    if (signup) {
      const name = this.input('text', 'name', ''); name.maxLength = 40;
      form.append(this.field('name', 'Your name', name, 'Shown to others in doubts and study rooms.'));
    }
    const email = this.input('email', 'email', 'you@example.com'); email.maxLength = 100; email.value = keepEmail;
    form.append(this.field('email', 'Email', email));

    const pw = this.passwordInput(signup ? 'new-password' : 'current-password');
    pw.input.maxLength = 100;
    form.append(this.field('password', 'Password', pw.wrap, signup ? 'At least 8 characters.' : null));
    // field() set the id on the wrapper; move it to the real input
    pw.wrap.removeAttribute('id'); pw.input.id = 'password';
    form.querySelector('label[for="password"]').htmlFor = 'password';

    if (signup) {
      const cls = this.el('select');
      const first = this.el('option', null, 'Choose your class'); first.value = ''; cls.append(first);
      CLASSES.forEach(c => { const o = this.el('option', null, c); o.value = c; cls.append(o); });
      form.append(this.field('classLevel', 'Class', cls));

      const links = cfg.links || {};
      const tick = this.el('label', 'tick');
      const cb = this.el('input'); cb.type = 'checkbox'; cb.id = 'terms';
      const text = this.el('span');
      text.append('I am 13 or older and agree to the ');
      const r = this.el('a', null, 'community rules'); r.href = links.rules || '#'; r.target = '_blank'; r.rel = 'noopener';
      const p = this.el('a', null, 'privacy policy'); p.href = links.privacy || '#'; p.target = '_blank'; p.rel = 'noopener';
      text.append(r, ' and ', p, '.');
      tick.append(cb, text);
      form.append(tick);
      const te = this.el('div', 'err'); te.id = 'terms-err'; te.style.margin = '-12px 0 14px'; form.append(te);
    } else {
      const row = this.el('div', 'row');
      const forgot = this.el('button', 'lnk', 'Forgot password?'); forgot.type = 'button';
      forgot.onclick = () => this.forgot();
      row.append(this.el('span'), forgot);
      form.append(row);
    }

    const go = this.el('button', 'btn', signup ? 'Create account' : 'Log in');
    go.type = 'submit'; go.id = 'go';
    form.append(go);
    form.onsubmit = (e) => { e.preventDefault(); if (!this.isBusy) (signup ? this.submitSignup() : this.submitLogin()); };
    card.append(form);

    if (cfg.google) {
      card.append(this.el('div', 'or', 'or'));
      const g = this.el('button', 'gbtn'); g.type = 'button';
      g.innerHTML = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>';
      g.append('Continue with Google');
      g.onclick = () => { if (!this.isBusy) this.dispatchEvent(new CustomEvent('google', { detail: { mode: this.mode } })); };
      card.append(g);
    }
    if (this.pendingMsg) { this.showMsg(this.pendingMsg.text, this.pendingMsg.ok); this.pendingMsg = null; }
  }

  values() {
    const v = id => { const e = this.querySelector('#' + id); return e ? e.value : ''; };
    return {
      name: v('name').trim(), email: v('email').trim().toLowerCase(), password: v('password'),
      classLevel: v('classLevel'), terms: !!(this.querySelector('#terms') || {}).checked
    };
  }

  submitLogin() {
    const d = this.values();
    this.showMsg('');
    let ok = this.setErr('email', EMAIL_RE.test(d.email) ? '' : 'Enter a valid email address.');
    ok = this.setErr('password', d.password ? '' : 'Enter your password.') && ok;
    if (!ok) return;
    this.busy(true, 'Logging in…');
    this.dispatchEvent(new CustomEvent('login', { detail: { email: d.email, password: d.password } }));
  }

  submitSignup() {
    const d = this.values();
    this.showMsg('');
    let ok = this.setErr('name', d.name.length >= 2 ? '' : 'Enter your name.');
    ok = this.setErr('email', EMAIL_RE.test(d.email) ? '' : 'Enter a valid email address.') && ok;
    ok = this.setErr('password', d.password.length >= 8 ? '' : 'Use at least 8 characters.') && ok;
    ok = this.setErr('classLevel', d.classLevel ? '' : 'Choose your class.') && ok;
    const te = this.querySelector('#terms-err');
    if (te) te.textContent = d.terms ? '' : 'Please tick this box to continue.';
    ok = d.terms && ok;
    if (!ok) return;
    this.busy(true, 'Creating account…');
    this.dispatchEvent(new CustomEvent('signup', { detail: d }));
  }

  forgot() {
    const email = this.values().email;
    if (!EMAIL_RE.test(email)) { this.setErr('email', 'Enter your email above first.'); this.querySelector('#email').focus(); return; }
    this.setErr('email', '');
    this.busy(true, 'Sending…');
    this.dispatchEvent(new CustomEvent('forgot', { detail: { email } }));
  }

  onResult(d) {
    this.busy(false);
    if (d.switchTo && d.switchTo !== this.mode) {
      this.mode = d.switchTo;
      this.pendingMsg = d.message ? { text: d.message, ok: !!d.ok } : null;
      this.render();
      return;
    }
    if (d.message) this.showMsg(d.message, !!d.ok);
    if (d.ok && d.done) {
      const b = this.querySelector('#go');
      if (b) { b.disabled = true; b.textContent = 'Redirecting…'; }
    }
  }
});
