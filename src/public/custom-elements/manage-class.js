const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LENGTHS = [30, 45, 60, 90, 120];

function hmClock(hhmm) {
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
    if (d.usage !== undefined) this.usage = d.usage;
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
cwhw-manage .uhead{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
cwhw-manage .uhead h3{margin:0}
cwhw-manage .uhead select{width:auto}
cwhw-manage .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
cwhw-manage .tile{background:#fff;border:2px solid #2F3E4E;border-radius:12px;padding:12px 14px}
cwhw-manage .tile b{display:block;font-size:24px}
cwhw-manage .tile span{font-size:13px;color:#4a5866}
cwhw-manage .lbl{font-size:13px;font-weight:700;letter-spacing:1px;margin:18px 0 8px;color:#4a5866}
cwhw-manage .chart{display:flex;align-items:flex-end;gap:3px;height:140px;background:#fff;border:2px solid #2F3E4E;border-radius:12px;padding:12px 10px 0}
cwhw-manage .col{flex:1;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}
cwhw-manage .bar{width:100%;max-width:38px;background:#FFC124;border:1.5px solid #2F3E4E;border-bottom:0;border-radius:5px 5px 0 0;box-sizing:border-box}
cwhw-manage .col span{font-size:11px;color:#4a5866;height:20px;line-height:20px;white-space:nowrap}
cwhw-manage .chip{font-size:13px;font-weight:700;padding:4px 10px;border-radius:999px;background:#e9eef2;color:#2F3E4E;white-space:nowrap}
cwhw-manage .tablewrap{overflow-x:auto;background:#fff;border:2px solid #2F3E4E;border-radius:12px}
cwhw-manage table{width:100%;border-collapse:collapse;font-size:15px}
cwhw-manage th,cwhw-manage td{text-align:left;padding:9px 12px;border-bottom:1px solid #eadfd6;white-space:nowrap}
cwhw-manage th{font-size:13px;color:#4a5866}
cwhw-manage tr:last-child td{border-bottom:0}
cwhw-manage tr.idle td{color:#8a96a3}
cwhw-manage .note{font-size:13px;color:#4a5866;margin:10px 0 0}
@media (max-width:600px){cwhw-manage .band{padding:20px 12px}cwhw-manage h2{font-size:30px}cwhw-manage .two{grid-template-columns:1fr}cwhw-manage .row{flex-wrap:wrap}}
</style>
<div class="band"><div class="inner">
 <div class="head"><h2>Manage Programme</h2><div id="picker"></div></div>
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
      sel.setAttribute('aria-label', 'Choose a programme');
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
      e.append(this.el('h3', null, 'You’re not a mentor of any programme yet'));
      e.append(this.el('p', null, 'Enter the mentor code CWHW gave you on the Join a Programme page.'));
      const a = this.el('a', 'btn', 'Enter mentor code'); a.href = '/join';
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
    s1.append(this.el('b', null, String(det.studentCount)), this.el('span', null, det.studentCount === 1 ? 'member joined' : 'members joined'));
    stats.append(s1);
    if (det.inviteCode) {
      const s2 = this.el('div', 'stat');
      const code = this.el('div', 'code', det.inviteCode);
      s2.append(this.el('span', null, 'Member code (share with your group)'), code);
      stats.append(s2);
      const copy = this.button('Copy invite', 'btn2', () => {
        const text = 'Join my programme on CWHW: go to cwhw.in/join and enter the code ' + det.inviteCode;
        try { navigator.clipboard.writeText(text); copy.textContent = 'Copied!'; } catch (e) { copy.textContent = 'Copy failed'; }
        setTimeout(() => { copy.textContent = 'Copy invite'; }, 2000);
      });
      copy.disabled = false;
      stats.append(copy);
    }
    ov.append(stats);
    grid.append(ov);

    // Sessions
    const sc = this.el('div', 'card wide');
    sc.append(this.el('h3', null, 'Sessions'));
    if (!det.sessionsReady) {
      sc.append(this.el('p', 'muted', 'Sessions aren’t set up yet. Please contact CWHW.'));
    } else {
      sc.append(this.el('p', 'muted', 'Weekly sessions show up on your members’ My Programmes page. Paste a Google Meet or YouTube Live link for each one. Members only see the link when the session is about to start.'));
            if (!det.sessions.length && !this.editing) sc.append(this.el('p', 'muted', 'No sessions yet.'));
      det.sessions.forEach(s => {
        const row = this.el('div', 'row');
        const info = this.el('div');
        info.append(this.el('b', null, s.title));
        info.append(this.el('span', null, s.days + ' · ' + hmClock(s.startTime) + ' · ' + s.duration + ' min' + (s.meetLink ? '' : ' · no link yet')));
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
      else {
        sc.append(this.button('+ Add session', 'btn', () => {
          this.editing = { title: '', meetLink: '', days: '', startTime: '18:00', duration: 60, host: '' };
          this.render();
        }));
      }
    }
    grid.append(sc);
    grid.append(this.usageCard());
    body.append(grid);
  }

  usageCard() {
    const u = this.usage;
    const card = this.el('div', 'card wide');
    const top = this.el('div', 'uhead');
    top.append(this.el('h3', null, 'Attendance report'));
    const range = this.el('select');
    range.setAttribute('aria-label', 'Report period');
    [[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days']].forEach(([v, t]) => {
      const o = this.el('option', null, t); o.value = v;
      if (u && u.days === v) o.selected = true;
      range.append(o);
    });
    range.disabled = !!this.busy;
    range.onchange = () => { this.usage = null; this.send('usage-range', { days: Number(range.value) }); };
    top.append(range);
    card.append(top);

    if (!u) { card.append(this.el('p', 'muted', 'Loading report…')); return card; }
    if (!u.ready) { card.append(this.el('p', 'muted', 'Attendance tracking isn’t set up yet. Please contact CWHW.')); return card; }

    const stats = this.el('div', 'tiles');
    const tile = (big, small) => { const t = this.el('div', 'tile'); t.append(this.el('b', null, big), this.el('span', null, small)); stats.append(t); };
    tile(u.activeStudents + ' / ' + u.studentCount, 'members attended');
    tile(String(u.sessionsHeld), 'sessions held');
    tile(String(u.avgAttendance), 'average attendance');
    card.append(stats);

    if (u.sessions.length) {
      card.append(this.el('div', 'lbl', 'SESSIONS'));
      u.sessions.forEach(s => {
        const row = this.el('div', 'row');
        const info = this.el('div');
        info.append(this.el('b', null, s.title));
        info.append(this.el('span', null, s.held ? 'Held ' + s.held + (s.held === 1 ? ' time' : ' times') + ' · last time ' + s.last + ' of ' + u.studentCount : 'Not held in this period yet'));
        row.append(info, this.el('span', 'chip', s.held ? 'Avg ' + s.avg : '—'));
        card.append(row);
      });
    }

    card.append(this.el('div', 'lbl', 'MEMBERS'));
    if (!u.students.length) {
      card.append(this.el('p', 'muted', 'No one has joined yet. Share your member code.'));
      return card;
    }
    const when = d => {
      if (!d) return 'Not yet';
      const n = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
      return n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : n + ' days ago';
    };
    const wrap = this.el('div', 'tablewrap');
    const table = this.el('table');
    const head = this.el('tr');
    ['Member', 'Sessions attended', 'Last attended'].forEach(h => head.append(this.el('th', null, h)));
    table.append(head);
    u.students.forEach(r => {
      const tr = this.el('tr');
      if (!r.attended) tr.className = 'idle';
      [r.name, String(r.attended), when(r.lastSeen)].forEach(v => tr.append(this.el('td', null, v)));
      table.append(tr);
    });
    wrap.append(table);
    card.append(wrap);

    const dl = this.button('Download CSV', 'btn2', () => {
      const q = v => '"' + String(v).replace(/"/g, '""') + '"';
      const lines = [['Member', 'Sessions attended', 'Last attended', 'Joined'].map(q).join(',')];
      u.students.forEach(r => lines.push([r.name, r.attended,
        r.lastSeen ? new Date(r.lastSeen).toLocaleDateString() : '', r.joined ? new Date(r.joined).toLocaleDateString() : ''].map(q).join(',')));
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = ((this.details && this.details.name) || 'programme').replace(/[^a-z0-9]+/gi, '-') + '-attendance-' + u.days + 'd.csv';
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    dl.disabled = false;
    dl.style.marginTop = '12px';
    card.append(dl);
    card.append(this.el('p', 'note', 'A member counts as attending when they click Join for a session on CWHW.'));
    return card;
  }

  sessionForm(det) {
    const s = this.editing;
    const f = this.el('div', 'form');
    const field = (label, input) => { const w = this.el('div'); const l = this.el('label', null, label); w.append(l, input); return w; };

    const title = this.el('input'); title.value = s.title; title.maxLength = 60; title.placeholder = 'e.g. Board prep: Algebra';
    f.append(field('Session name', title));

    const link = this.el('input'); link.type = 'url'; link.value = s.meetLink || ''; link.maxLength = 300;
    link.placeholder = 'https://meet.google.com/abc-defg-hij';
    f.append(field('Google Meet or YouTube Live link', link));

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
      this.editing = { ...s, title: title.value, meetLink: link.value, days: boxes.filter(b => b.checked).map(b => b.value).join(', '),
        startTime: time.value, duration: Number(len.value), host: host.value };
      this.send('save-session', { session: { ...this.editing, days: boxes.filter(b => b.checked).map(b => b.value) } });
    }));
    acts.append(this.button('Cancel', 'btn2', () => { this.editing = null; this.render(); }));
    f.append(acts);
    return f;
  }
});
