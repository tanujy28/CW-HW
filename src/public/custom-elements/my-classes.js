const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseDays(s) {
  return String(s).toLowerCase().split(/[^a-z]+/).map(x => DAYS.indexOf(x.slice(0, 3))).filter(i => i >= 0);
}
function nextTime(sess, now) {
  const days = parseDays(sess.days);
  const [h, mi] = String(sess.startTime).split(':').map(Number);
  if (!days.length || isNaN(h)) return null;
  for (let k = 0; k <= 7; k++) {
    const d = new Date(now); d.setDate(now.getDate() + k);
    if (!days.includes(d.getDay())) continue;
    d.setHours(h, mi || 0, 0, 0);
    const end = new Date(d.getTime() + (sess.duration || 60) * 60000);
    if (end > now) return { start: d, end };
  }
  return null;
}
function clock(d) {
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
  return h + ':' + m + ' ' + ap;
}
function whenText(t, now) {
  const day0 = new Date(now); day0.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(t.start).setHours(0, 0, 0, 0) - day0) / 86400000);
  const day = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : DAY_NAMES[t.start.getDay()];
  return day + ', ' + clock(t.start);
}
function status(t, now) {
  if (!t) return { live: false, label: '' };
  const ms = t.start - now;
  if (now >= t.start) return { live: true, label: 'Live now' };
  if (ms <= 10 * 60000) return { live: true, label: 'Starting soon' };
  const mins = Math.round(ms / 60000);
  if (mins < 60) return { live: false, label: 'In ' + mins + ' min' };
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return { live: false, label: 'In ' + hrs + ' hr' };
  return { live: false, label: '' };
}

customElements.define('cwhw-classes', class extends HTMLElement {
  static get observedAttributes() { return ['data', 'room']; }

  attributeChangedCallback(name, oldV, val) {
    if (!val) return;
    let d; try { d = JSON.parse(val); } catch (e) { return; }
    if (name === 'data') { this.data = d; if (this.ready) this.renderList(); }
    if (name === 'room' && this.overlay) this.showRoom(d);
  }

  connectedCallback() {
    if (this.ready) return;
    this.ready = true;
    if (!document.getElementById('cwhw-font')) {
      const l = document.createElement('link');
      l.id = 'cwhw-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap';
      document.head.appendChild(l);
    }
    this.style.display = 'block';
    this.innerHTML = `<style>
cwhw-classes .band{box-sizing:border-box;font-family:'Space Grotesk',sans-serif;color:#2F3E4E;padding:40px 24px}
cwhw-classes .inner{max-width:1080px;margin:0 auto}
cwhw-classes .head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-bottom:24px}
cwhw-classes h2{margin:0;font-size:38px}
cwhw-classes .next{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:14px;background:#2F3E4E;color:#fff;border-radius:16px;padding:20px 24px;margin-bottom:24px}
cwhw-classes .next small{display:block;font-size:13px;letter-spacing:1px;color:#FFC124;font-weight:700;margin-bottom:4px}
cwhw-classes .next b{display:block;font-size:22px}
cwhw-classes .next span{font-size:15px;color:#dce4ec}
cwhw-classes .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}
cwhw-classes .card{background:#FDF5EF;border:3px solid #2F3E4E;border-radius:16px;box-shadow:6px 6px 0 #F2B8A2;padding:24px;box-sizing:border-box}
cwhw-classes .ch{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:0 0 14px}
cwhw-classes .card h3{margin:0;font-size:22px}
cwhw-classes .links{display:flex;gap:14px;flex-shrink:0}
cwhw-classes .manage{font-size:14px;font-weight:700;color:#2F3E4E}
cwhw-classes .lbl{font-size:13px;font-weight:700;letter-spacing:1px;margin:16px 0 8px;color:#4a5866}
cwhw-classes .row{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#fff;border:2px solid #2F3E4E;border-radius:10px;padding:10px 12px;margin-bottom:10px}
cwhw-classes .row b{display:block;font-size:16px}
cwhw-classes .row span{font-size:14px;color:#4a5866}
cwhw-classes .chip{font-size:13px;font-weight:700;padding:4px 10px;border-radius:999px;background:#e9eef2;color:#2F3E4E;white-space:nowrap}
cwhw-classes .btn,cwhw-classes .btn2{display:inline-block;border:2px solid #1d1d1d;border-radius:8px;padding:9px 16px;font:700 15px 'Space Grotesk',sans-serif;cursor:pointer;text-decoration:none;color:#1d1d1d;white-space:nowrap}
cwhw-classes .btn{background:#FFC124;box-shadow:3px 3px 0 #2F3E4E}
cwhw-classes .btn2{background:#fff}
cwhw-classes .btn2:disabled{opacity:.7;cursor:default}
cwhw-classes .muted{font-size:15px;color:#4a5866;margin:0}
cwhw-classes .empty{text-align:center;background:#FDF5EF;border:3px solid #2F3E4E;border-radius:16px;padding:40px 24px}
cwhw-classes .empty h3{margin:0 0 8px;font-size:26px}
cwhw-classes .empty p{margin:0 0 18px;font-size:16px}
@media (max-width:600px){cwhw-classes .band{padding:20px 12px}cwhw-classes h2{font-size:30px}}
</style>
<div class="band"><div class="inner">
 <div class="head"><h2>My Classes</h2><a class="btn2" href="/join">+ Join another class</a></div>
 <div id="list"><p class="muted">Loading…</p></div>
</div></div>`;
    this.band = this.querySelector('.band');
    this.fit = () => {
      this.band.style.width = document.documentElement.clientWidth + 'px';
      this.band.style.marginLeft = '0px';
      this.band.style.marginLeft = (-this.band.getBoundingClientRect().left) + 'px';
    };
    this.fit(); setTimeout(this.fit, 500); setTimeout(this.fit, 1500);
    window.addEventListener('resize', this.fit);
    this.tick = setInterval(() => { if (this.data && !this.overlay) this.renderList(); }, 30000);
    if (this.data) this.renderList();
  }

  el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  joinButton(roomId, name, enabled, label) {
    const b = this.el('button', enabled ? 'btn' : 'btn2', label || 'Join');
    b.type = 'button';
    if (enabled && roomId) b.onclick = () => this.openRoom({ id: roomId, name });
    else b.disabled = true;
    return b;
  }

  renderList() {
    const list = this.querySelector('#list');
    list.innerHTML = '';
    const d = this.data || {};
    const classes = d.classes || [];
    const now = new Date();
    if (d.error) { list.append(this.el('p', 'muted', d.error)); return; }
    if (!classes.length) {
      list.innerHTML = '<div class="empty"><h3>You haven’t joined a class yet</h3><p>Ask your teacher for a class code.</p><a class="btn" href="/join">Join your class</a></div>';
      return;
    }

    // Up next, across all classes
    let best = null;
    classes.forEach(c => (c.sessions || []).forEach(s => {
      const t = nextTime(s, now);
      if (t && (!best || t.start < best.t.start)) best = { s, t, c };
    }));
    if (best) {
      const st = status(best.t, now);
      const box = this.el('div', 'next');
      const info = this.el('div');
      info.append(this.el('small', null, st.live ? st.label.toUpperCase() : 'UP NEXT'));
      info.append(this.el('b', null, best.s.title));
      info.append(this.el('span', null, best.c.name + ' · ' + whenText(best.t, now) + (best.s.host ? ' · with ' + best.s.host : '')));
      box.append(info, this.joinButton(best.s.roomId, best.s.title, st.live, st.live ? 'Join now' : (st.label || 'Not started')));
      list.append(box);
    }

    const grid = this.el('div', 'grid');
    classes.forEach(c => {
      const card = this.el('div', 'card');
      const ch = this.el('div', 'ch');
      ch.append(this.el('h3', null, c.name));
      const links = this.el('div', 'links');
      const dl = this.el('a', 'manage', 'Doubts →');
      dl.href = '/class-doubts' + (c.spaceId ? '?class=' + encodeURIComponent(c.spaceId) : '');
      links.append(dl);
      if (c.teacher) {
        const a = this.el('a', 'manage', 'Manage →');
        a.href = '/manage-class';
        links.append(a);
      }
      ch.append(links);
      card.append(ch);

      // Sessions
      const sessions = (c.sessions || []).map(s => ({ s, t: nextTime(s, now) })).filter(x => x.t)
        .sort((a, b) => a.t.start - b.t.start);
      if (sessions.length) {
        card.append(this.el('div', 'lbl', 'STUDY SESSIONS'));
        sessions.forEach(({ s, t }) => {
          const st = status(t, now);
          const row = this.el('div', 'row');
          const info = this.el('div');
          info.append(this.el('b', null, s.title));
          info.append(this.el('span', null, s.days + ' · ' + clock(t.start) + ' · ' + (s.duration || 60) + ' min'));
          const right = st.live ? this.joinButton(s.roomId, s.title, true, 'Join') : this.el('span', 'chip', st.label || whenText(t, now));
          row.append(info, right);
          card.append(row);
        });
      }

      // Rooms (always open)
      card.append(this.el('div', 'lbl', 'STUDY ROOMS'));
      if (!c.rooms.length) card.append(this.el('p', 'muted', 'Your teacher hasn’t set up study rooms yet.'));
      c.rooms.forEach(r => {
        const row = this.el('div', 'row');
        if (!r.sessionsOnly || c.teacher) {
          row.append(this.el('b', null, r.name), this.joinButton(r.id, r.name, true, 'Join'));
        } else {
          // Locked room: open only while one of its sessions is on
          const next = (c.sessions || []).filter(s => s.roomId === r.id).map(s => nextTime(s, now)).filter(Boolean)
            .sort((a, b) => a.start - b.start)[0];
          const live = next && status(next, now).live;
          const info = this.el('div');
          info.append(this.el('b', null, r.name));
          info.append(this.el('span', null, 'Opens during study sessions'));
          row.append(info, live ? this.joinButton(r.id, r.name, true, 'Join')
            : this.el('span', 'chip', next ? 'Opens ' + whenText(next, now) : 'No sessions yet'));
        }
        card.append(row);
      });

      grid.append(card);
    });
    list.append(grid);
  }

  openRoom(r) {
    this.closeRoom(true);
    const o = document.createElement('div');
    Object.assign(o.style, { position: 'fixed', inset: '0', zIndex: '2147483000', background: '#00594c' });
    const bar = document.createElement('div');
    Object.assign(bar.style, { height: '48px', display: 'flex', alignItems: 'center', gap: '14px', padding: '0 12px', background: '#0b3d3a', color: '#fff', font: "700 16px 'Space Grotesk',sans-serif" });
    const back = document.createElement('button');
    back.textContent = '← Back to My Classes';
    Object.assign(back.style, { background: '#FFC124', color: '#000', border: '0', borderRadius: '6px', padding: '7px 12px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' });
    back.onclick = () => this.closeRoom();
    const t = document.createElement('span'); t.textContent = r.name;
    bar.append(back, t);
    this.stage = document.createElement('div');
    Object.assign(this.stage.style, { position: 'relative', width: '100%', height: 'calc(100% - 48px)' });
    o.append(bar, this.stage);
    document.body.append(o);
    document.body.style.overflow = 'hidden';
    this.overlay = o;
    this.msg('Connecting to study room…');
    this.dispatchEvent(new CustomEvent('open-room', { detail: { id: r.id } }));
  }

  msg(text) {
    this.stage.innerHTML = '';
    const m = document.createElement('div');
    m.textContent = text;
    Object.assign(m.style, { position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', font: "700 20px 'Space Grotesk',sans-serif", textAlign: 'center', padding: '0 20px' });
    this.stage.append(m);
  }

  showRoom(d) {
    if (d.error || !d.url) { this.msg(d.error || 'Could not open this room.'); return; }
    this.msg('Connecting to study room…');
    const f = document.createElement('iframe');
    f.src = d.url;
    f.allow = 'camera; microphone; fullscreen; display-capture; autoplay';
    Object.assign(f.style, { position: 'relative', zIndex: '1', width: '100%', height: '100%', border: '0' });
    this.stage.append(f);
  }

  closeRoom(silent) {
    if (this.overlay) { this.overlay.remove(); this.overlay = null; }
    document.body.style.overflow = '';
    if (!silent && this.data) this.renderList();
  }

  disconnectedCallback() {
    clearInterval(this.tick);
    if (this.overlay) { this.overlay.remove(); this.overlay = null; }
    document.body.style.overflow = '';
    window.removeEventListener('resize', this.fit);
  }
});
