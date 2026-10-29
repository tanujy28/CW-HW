const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LENGTHS = [30, 45, 60, 90, 120];

function clock(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  if (isNaN(h)) return hhmm;
  return ((h % 12) || 12) + ':' + String(m || 0).padStart(2, '0') + ' ' + (h >= 12 ? 'pm' : 'am');
}

customElements.define('cwhw-manage', class extends HTMLElement {
  static get observedAttributes() { return ['data']; }

  attributeChangedCallback(name, oldV, val) {
    if (name !== 'data' || !val) return;
    let d; try { d = JSON.parse(val); } catch (e) { return; }
    if (d.details) this.details = d.details;
    if (d.saved) this.editing = null;
    this.data = d;
    this.busy = false;
    if (this.ready) this.render();
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
cwhw-manage .band{box-sizing:border-box;font-family:'Space Grotesk',sans-serif;color:#2F3E4E;padding:40px 24px}
cwhw-manage .inner{max-width:1080px;margin:0 auto}
cwhw-manage .head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-bottom:20px}
cwhw-manage h2{margin:0;font-size:38px}
cwhw-manage h3{margin:0 0 12px;font-size:22px}
cwhw-manage .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;align-items:start}
cwhw-manage .card{background:#FDF5EF;border:3px solid #2F3E4E;border-radius:16px;box-shadow:6px 6px 0 #F2B8A2;padding:22px;box-sizing:border-box}
cwhw-manage .card.wide{grid-column:1/-1}
cwhw-manage .stats{display:flex;flex-wrap:wrap;gap:12px 28px;align-items:center}
cwhw-manage .stat b{display:block;font-size:28px}
cwhw-manage .stat span{font-size:14px;color:#4a5866}
cwhw-manage .code{font-size:20px;font-weight:700;letter-spacing:1px;background:#fff;border:2px dashed #2F3E4E;border-radius:8px;padding:6px 12px}
cwhw-manage .row{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#fff;border:2px solid #2F3E4E;border-radius:10px;padding:10px 12px;margin-bottom:10px}
cwhw-manage .row b{display:block;font-size:16px}
cwhw-manage .row span{font-size:14px;color:#4a5866}
cwhw-manage select.mode{width:auto;margin-top:6px;padding:5px 8px;font-size:14px;border-width:1.5px}
cwhw-manage .acts{display:flex;gap:8px;flex-shrink:0}
cwhw-manage .btn,cwhw-manage .btn2,cwhw-manage .lnk{border:2px solid #1d1d1d;border-radius:8px;padding:9px 16px;font:700 15px 'Space Grotesk',sans-serif;cursor:pointer;color:#1d1d1d;white-space:nowrap}
cwhw-manage .btn{background:#FFC124;box-shadow:3px 3px 0 #2F3E4E}
cwhw-manage .btn2{background:#fff}
cwhw-manage .lnk{background:none;border:0;padding:6px 4px;text-decoration:underline;font-weight:500}
cwhw-manage .lnk.del{color:#b3261e}
cwhw-manage button:disabled{opacity:.6;cursor:default}
cwhw-manage .form{display:flex;flex-direction:column;gap:12px;background:#fff;border:2px solid #2F3E4E;border-radius:12px;padding:16px;margin-top:10px}
cwhw-manage label{font-weight:700;font-size:14px;display:block;margin-bottom:4px}
cwhw-manage input,cwhw-manage select{width:100%;box-sizing:border-box;padding:10px 12px;border:2px solid #1d1d1d;border-radius:8px;font:500 15px 'Space Grotesk',sans-serif;background:#fff;color:#1d1d1d}
cwhw-manage .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
cwhw-manage .days{display:flex;flex-wrap:wrap;gap:6px}
cwhw-manage .day{display:inline-flex;align-items:center;gap:6px;border:2px solid #2F3E4E;border-radius:999px;padding:6px 12px;font-size:14px;font-weight:700;cursor:pointer;margin:0}
cwhw-manage .day input{width:auto;margin:0}
cwhw-manage .inline{display:flex;gap:10px;flex-wrap:wrap}
cwhw-manage .inline input{flex:1 1 180px;width:auto}
cwhw-manage .muted{font-size:15px;color:#4a5866;margin:0 0 10px}
cwhw-manage .msg{min-height:22px;font-size:15px;font-weight:700;margin-bottom:14px}
cwhw-manage .empty{text-align:center;background:#FDF5EF;border:3px solid #2F3E4E;border-radius:16px;padding:40px 24px}
cwhw-manage .empty p{margin:8px 0 18px}
cwhw-manage a.btn{display:inline-block;text-decoration:none}
@media (max-width:600px){cwhw-manage .band{padding:20px 12px}cwhw-manage h2{font-size:30px}cwhw-manage .two{grid-template-columns:1fr}cwhw-manage .row{flex-wrap:wrap}}
</style>
<div class="band"><div class="inner">
 <div class="head"><h2>Manage Class</h2><div id="picker"></div></div>
 <div class="msg" id="msg" role="status"></div>
 <div id="body"><p class="muted">Loading…</p></div>
</div></div>`;
    this.band = this.querySelector('.band');
    this.fit = () => {
      this.band.style.width = document.documentElement.clientWidth + 'px';
      this.band.style.marginLeft = '0px';
      this.band.style.marginLeft = (-this.band.getBoundingClientRect().left) + 'px';
    };
    this.fit(); setTimeout(this.fit, 500); setTimeout(this.fit, 1500);
    window.addEventListener('resize', this.fit);
    if (this.data) this.render();
  }

  disconnectedCallback() { window.removeEventListener('resize', this.fit); }

  el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  button(text, cls, onClick) {
    const b = this.el('button', cls, text);
    b.type = 'button';
    b.disabled = !!this.busy;
    b.onclick = onClick;
    return b;
  }

  send(type, detail) {
    this.busy = true;
    this.querySelectorAll('button, select').forEach(b => { b.disabled = true; });
    const m = this.querySelector('#msg');
    m.textContent = 'Saving…'; m.style.color = '#4a5866';
    this.dispatchEvent(new CustomEvent(type, { detail: { spaceId: this.details && this.details.spaceId, ...detail } }));
  }

  render() {
    const d = this.data || {};
    const msg = this.querySelector('#msg');
    msg.textContent = d.error || d.message || '';
    msg.style.color = d.error ? '#b3261e' : '#1d6b4f';

    const picker = this.querySelector('#picker');
    picker.innerHTML = '';
    const classes = d.classes || [];
    if (classes.length > 1) {
      const sel = this.el('select');
      sel.setAttribute('aria-label', 'Choose a class');
      classes.forEach(c => {
        const o = this.el('option', null, c.name); o.value = c.spaceId;
        if (this.details && c.spaceId === this.details.spaceId) o.selected = true;
        sel.append(o);
      });
      sel.onchange = () => { this.editing = null; this.send('select-class', { spaceId: sel.value }); };
      picker.append(sel);
    }

    const body = this.querySelector('#body');
    body.innerHTML = '';
    if (!classes.length) {
      const e = this.el('div', 'empty');
      e.append(this.el('h3', null, 'You’re not a teacher of any class yet'));
      e.append(this.el('p', null, 'Enter the teacher code CWHW gave you on the Join Your Class page.'));
      const a = this.el('a', 'btn', 'Enter teacher code'); a.href = '/join';
      e.append(a);
      body.append(e);
      return;
    }
    const det = this.details;
    if (!det) { body.append(this.el('p', 'muted', d.error ? '' : 'Loading…')); return; }

    const grid = this.el('div', 'grid');

    // Overview
    const ov = this.el('div', 'card wide');
    ov.append(this.el('h3', null, det.name));
    const stats = this.el('div', 'stats');
    const s1 = this.el('div', 'stat');
    s1.append(this.el('b', null, String(det.studentCount)), this.el('span', null, det.studentCount === 1 ? 'student joined' : 'students joined'));
    stats.append(s1);
    if (det.inviteCode) {
      const s2 = this.el('div', 'stat');
      const code = this.el('div', 'code', det.inviteCode);
      s2.append(this.el('span', null, 'Student code (share with your class)'), code);
      stats.append(s2);
      const copy = this.button('Copy invite', 'btn2', () => {
        const text = 'Join our class on CWHW: go to cwhw.in/join and enter the code ' + det.inviteCode;
        try { navigator.clipboard.writeText(text); copy.textContent = 'Copied!'; } catch (e) { copy.textContent = 'Copy failed'; }
        setTimeout(() => { copy.textContent = 'Copy invite'; }, 2000);
      });
      copy.disabled = false;
      stats.append(copy);
    }
    ov.append(stats);
    grid.append(ov);

    // Rooms
    const rc = this.el('div', 'card');
    rc.append(this.el('h3', null, 'Study rooms'));
    rc.append(this.el('p', 'muted', 'Private video rooms only your students can join. Choose if each room is always open or opens only during its sessions.'));
    if (!det.rooms.length) rc.append(this.el('p', 'muted', 'No rooms yet. Create your first one below.'));
    det.rooms.forEach(r => {
      const row = this.el('div', 'row');
      const info = this.el('div');
      info.append(this.el('b', null, r.name));
      const mode = this.el('select', 'mode');
      mode.setAttribute('aria-label', 'When students can enter ' + r.name);
      [['open', 'Always open'], ['sessions', 'Only during sessions']].forEach(([v, t]) => {
        const o = this.el('option', null, t); o.value = v;
        if ((v === 'sessions') === !!r.sessionsOnly) o.selected = true;
        mode.append(o);
      });
      mode.disabled = !!this.busy;
      mode.onchange = () => this.send('room-mode', { roomId: r.id, sessionsOnly: mode.value === 'sessions' });
      info.append(mode);
      row.append(info);
      row.append(this.button('Delete', 'lnk del', () => {
        if (!confirm('Delete "' + r.name + '"? Sessions using this room will also be deleted.')) return;
        this.send('delete-room', { roomId: r.id });
      }));
      rc.append(row);
    });
    const add = this.el('div', 'inline');
    const name = this.el('input');
    name.placeholder = 'e.g. Math room'; name.maxLength = 40;
    name.setAttribute('aria-label', 'New room name');
    const create = this.button('Create room', 'btn', () => {
      if (!name.value.trim()) { name.focus(); return; }
      this.send('create-room', { name: name.value.trim() });
    });
    name.onkeydown = (e) => { if (e.key === 'Enter') create.click(); };
    add.append(name, create);
    rc.append(add);
    grid.append(rc);

    // Sessions
    const sc = this.el('div', 'card');
    sc.append(this.el('h3', null, 'Study sessions'));
    if (!det.sessionsReady) {
      sc.append(this.el('p', 'muted', 'The timetable isn’t set up yet. Please contact CWHW.'));
    } else {
      sc.append(this.el('p', 'muted', 'Weekly sessions show up on your students’ My Classes page.'));
      const roomName = id => (det.rooms.find(r => r.id === id) || {}).name || 'No room';
      if (!det.sessions.length && !this.editing) sc.append(this.el('p', 'muted', 'No sessions yet.'));
      det.sessions.forEach(s => {
        const row = this.el('div', 'row');
        const info = this.el('div');
        info.append(this.el('b', null, s.title));
        info.append(this.el('span', null, s.days + ' · ' + clock(s.startTime) + ' · ' + s.duration + ' min · ' + roomName(s.roomId)));
        const acts = this.el('div', 'acts');
        acts.append(this.button('Edit', 'lnk', () => { this.editing = { ...s }; this.render(); }));
        acts.append(this.button('Delete', 'lnk del', () => {
          if (!confirm('Delete "' + s.title + '"?')) return;
          this.send('delete-session', { id: s.id });
        }));
        row.append(info, acts);
        sc.append(row);
      });

      if (this.editing) sc.append(this.sessionForm(det));
      else if (det.rooms.length) {
        sc.append(this.button('+ Add session', 'btn', () => {
          this.editing = { title: '', roomId: det.rooms[0].id, days: '', startTime: '18:00', duration: 60, host: '' };
          this.render();
        }));
      } else sc.append(this.el('p', 'muted', 'Create a study room first, then add sessions.'));
    }
    grid.append(sc);
    body.append(grid);
  }

  sessionForm(det) {
    const s = this.editing;
    const f = this.el('div', 'form');
    const field = (label, input) => { const w = this.el('div'); const l = this.el('label', null, label); w.append(l, input); return w; };

    const title = this.el('input'); title.value = s.title; title.maxLength = 60; title.placeholder = 'e.g. Class 10 Math practice';
    f.append(field('Session name', title));

    const room = this.el('select');
    det.rooms.forEach(r => { const o = this.el('option', null, r.name); o.value = r.id; if (r.id === s.roomId) o.selected = true; room.append(o); });
    f.append(field('Study room', room));

    const daysWrap = this.el('div', 'days');
    const chosen = String(s.days).split(/[^A-Za-z]+/).map(x => x.slice(0, 3));
    const boxes = DAY_KEYS.map(k => {
      const lab = this.el('label', 'day');
      const cb = this.el('input'); cb.type = 'checkbox'; cb.value = k; cb.checked = chosen.includes(k);
      lab.append(cb, document.createTextNode(k));
      daysWrap.append(lab);
      return cb;
    });
    const dw = this.el('div'); dw.append(this.el('label', null, 'Days'), daysWrap); f.append(dw);

    const two = this.el('div', 'two');
    const time = this.el('input'); time.type = 'time'; time.value = s.startTime || '18:00';
    const len = this.el('select');
    LENGTHS.concat(LENGTHS.includes(Number(s.duration)) ? [] : [Number(s.duration)]).forEach(n => {
      const o = this.el('option', null, n + ' min'); o.value = n; if (n === Number(s.duration)) o.selected = true; len.append(o);
    });
    two.append(field('Start time', time), field('Length', len));
    f.append(two);

    const host = this.el('input'); host.value = s.host; host.maxLength = 40; host.placeholder = 'Optional, e.g. Mr. Sharma';
    f.append(field('Host', host));

    const acts = this.el('div', 'inline');
    acts.append(this.button(s.id ? 'Save changes' : 'Add session', 'btn', () => {
      this.editing = { ...s, title: title.value, roomId: room.value, days: boxes.filter(b => b.checked).map(b => b.value).join(', '),
        startTime: time.value, duration: Number(len.value), host: host.value };
      this.send('save-session', { session: { ...this.editing, days: boxes.filter(b => b.checked).map(b => b.value) } });
    }));
    acts.append(this.button('Cancel', 'btn2', () => { this.editing = null; this.render(); }));
    f.append(acts);
    return f;
  }
});
