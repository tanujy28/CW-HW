// Study rooms panel (the file keeps its old name so the Wix element still points at it).
// Rooms live on Discord; this shows the focus/break status and the way in.
const ROOMS = {
  math: 'Maths', science: 'Science', technology: 'Technology',
  languages: 'Languages', social: 'Social Sciences', creative: 'Creative'
};
const IST = 330 * 60000;

function phase(focusMin) {
  const min = Math.floor((Date.now() + IST) / 60000) % 60;
  const sec = Math.floor((Date.now() + IST) / 1000) % 60;
  const focus = min < focusMin;
  const left = Math.ceil(((focus ? focusMin : 60) * 60 - (min * 60 + sec)) / 60);
  return { focus, left };
}

customElements.define('cwhw-rooms', class extends HTMLElement {
  static get observedAttributes() { return ['room-info']; }

  attributeChangedCallback(name, oldV, val) {
    if (name !== 'room-info' || !val) return;
    let d; try { d = JSON.parse(val); } catch (e) { return; }
    if (d.key !== this.current) return;
    this.answered = true;
    this.info = d;
    this.renderPanel();
  }

  connectedCallback() {
    this.current = undefined;
    if (!document.getElementById('cwhw-font')) {
      const l = document.createElement('link');
      l.id = 'cwhw-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap';
      document.head.appendChild(l);
    }
    this.onClick = (e) => {
      const a = e.target.closest && e.target.closest('a');
      if (!a || !a.href) return;
      const u = new URL(a.href, location.href);
      if (u.pathname === location.pathname && ROOMS[u.searchParams.get('room')]) {
        e.preventDefault(); e.stopPropagation();
        history.pushState({}, '', u.pathname + u.search);
        this.render();
      }
    };
    this.onPop = () => this.render();
    document.addEventListener('click', this.onClick, true);
    window.addEventListener('popstate', this.onPop);
    this.render();
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.onClick, true);
    window.removeEventListener('popstate', this.onPop);
    clearInterval(this.retry);
    clearInterval(this.tick);
  }

  render() {
    const params = new URLSearchParams(location.search);
    const key = params.get('room');
    if (key === this.current) return;
    this.current = key;
    this.info = null;
    this.failed = params.get('discord');
    clearInterval(this.retry);
    clearInterval(this.tick);
    this.innerHTML = '';

    if (!ROOMS[key]) {
      this.removeAttribute('style');
      Object.assign(this.style, { display: 'block', width: '1px', height: '1px', overflow: 'hidden' });
      return;
    }

    Object.assign(this.style, {
      display: 'block', position: 'fixed', top: '0', left: '0',
      width: '100vw', height: '100vh', zIndex: '99999', background: '#00594c', overflow: 'auto'
    });
    this.innerHTML = `<style>
cwhw-rooms .bar{height:44px;display:flex;align-items:center;padding:0 12px;background:#0b3d3a}
cwhw-rooms .back{background:#FFC124;color:#000;border:0;border-radius:6px;padding:6px 12px;font:bold 14px sans-serif;cursor:pointer}
cwhw-rooms .wrap{min-height:calc(100% - 44px);display:flex;align-items:center;justify-content:center;padding:24px 16px;box-sizing:border-box}
cwhw-rooms .card{box-sizing:border-box;width:100%;max-width:520px;background:#FDF5EF;color:#2F3E4E;border:3px solid #2F3E4E;border-radius:16px;box-shadow:8px 8px 0 #0b3d3a;padding:28px 24px;font-family:'Space Grotesk',sans-serif}
cwhw-rooms h2{margin:0 0 6px;font-size:30px;line-height:1.1}
cwhw-rooms p{margin:0 0 14px;font-size:16px;line-height:1.45}
cwhw-rooms .status{display:flex;align-items:center;gap:10px;border-radius:10px;padding:12px 14px;margin:14px 0 18px;font-weight:700;font-size:16px}
cwhw-rooms .status.focus{background:#2F3E4E;color:#fff}
cwhw-rooms .status.break{background:#d7f0e4;color:#1d6b4f}
cwhw-rooms .dot{width:10px;height:10px;border-radius:50%;background:currentColor;flex:0 0 auto}
cwhw-rooms .btn{display:inline-block;border:2px solid #1d1d1d;border-radius:8px;padding:11px 18px;font:700 16px 'Space Grotesk',sans-serif;background:#FFC124;box-shadow:3px 3px 0 #2F3E4E;color:#1d1d1d;text-decoration:none;cursor:pointer}
cwhw-rooms .small{font-size:14px;color:#4a5866;margin:14px 0 0}
cwhw-rooms .small a{color:#2F3E4E;font-weight:700}
cwhw-rooms .err{color:#b3261e;font-weight:700}
</style>
<div class="bar"><button class="back" type="button">← Back to study rooms</button></div>
<div class="wrap"><div class="card" id="card"><p>Loading…</p></div></div>`;
    this.querySelector('.back').onclick = () => { history.pushState({}, '', location.pathname); this.render(); };

    // Ask the page (and backend) for this room; retry in case the page code is still loading
    this.answered = false;
    let tries = 0;
    const ask = () => {
      if (this.answered || tries++ > 6) { clearInterval(this.retry); return; }
      this.dispatchEvent(new CustomEvent('need-room', { detail: { key } }));
    };
    ask();
    this.retry = setInterval(ask, 1500);
    this.tick = setInterval(() => { if (this.info) this.renderPanel(); }, 15000);
  }

  el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  renderPanel() {
    const card = this.querySelector('#card');
    if (!card) return;
    const d = this.info || {};
    card.innerHTML = '';
    card.append(this.el('h2', null, ROOMS[this.current] + ' study room'));

    if (d.error) {
      card.append(this.el('p', 'err', d.error === 'login'
        ? 'Please log in to CWHW to join study rooms.'
        : 'Could not open this room. Please try again.'));
      return;
    }

    const focusMin = d.focusMin || 50;
    const ph = phase(focusMin);
    const st = this.el('div', 'status ' + (ph.focus ? 'focus' : 'break'));
    st.append(this.el('span', 'dot'), this.el('span', null, ph.focus
      ? 'Focus block · ' + ph.left + ' min left'
      : 'Break · ' + ph.left + ' min left'));
    card.append(st);
    card.append(this.el('p', null, 'Rooms are on Discord and always silent, so everyone can focus. Camera or screen share is optional. Every hour there is a '
      + focusMin + '-minute focus block, then a ' + (60 - focusMin) + '-minute break. Chat in #break-chat and ask questions in #doubts.'));

    if (this.failed) {
      card.append(this.el('p', 'err', this.failed === 'expired' ? 'That sign-in link expired. Please click Join with Discord again.'
        : this.failed === 'cancelled' ? 'Discord sign-in was cancelled.' : "Joining didn't finish. Please try again."));
    }
    if (!d.ready) { card.append(this.el('p', 'err', "This room isn't open yet. Please try another room.")); return; }

    if (d.linked) {
      const a = this.el('a', 'btn', 'Open ' + ROOMS[this.current] + ' in Discord');
      a.href = d.roomUrl; a.target = '_blank'; a.rel = 'noopener';
      card.append(a);
      const p = this.el('p', 'small', 'Joined as ' + (d.discordName || 'your Discord account') + '. Not seeing the room? ');
      const re = this.el('a', null, 'Join the server again');
      re.href = d.joinUrl;
      p.append(re);
      card.append(p);
    } else {
      const a = this.el('a', 'btn', 'Join with Discord');
      a.href = d.joinUrl;
      card.append(a);
      card.append(this.el('p', 'small', "You'll sign in with Discord once and we'll add you to the CWHW study server. You need a Discord account (13+)."));
    }
  }
});
