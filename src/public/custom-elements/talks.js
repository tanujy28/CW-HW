const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EARLY_MIN = 15;
const IST = 330 * 60000;

function clock(d) {
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
  return h + ':' + m + ' ' + ap;
}
function whenText(start, now) {
  const day0 = new Date(now); day0.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(start).setHours(0, 0, 0, 0) - day0) / 86400000);
  const day = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow'
    : diff > 1 && diff < 7 ? DAY_NAMES[start.getDay()]
      : DAY_NAMES[start.getDay()].slice(0, 3) + ', ' + start.getDate() + ' ' + MONTHS[start.getMonth()];
  return day + ', ' + clock(start);
}
function times(t) {
  const start = new Date(t.start);
  return { start, end: new Date(start.getTime() + (t.duration || 60) * 60000) };
}
function status(t, now) {
  const { start, end } = times(t);
  if (now >= end) return { open: false, ended: true, label: 'Ended' };
  if (now >= start) return { open: true, label: 'Live now' };
  const ms = start - now;
  if (ms <= EARLY_MIN * 60000) return { open: true, label: 'Starting soon' };
  const mins = Math.round(ms / 60000);
  if (mins < 60) return { open: false, label: 'In ' + mins + ' min' };
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return { open: false, label: 'In ' + hrs + ' hr' };
  return { open: false, label: '' };
}
function gcal(t) {
  const { start, end } = times(t);
  const f = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text=' + encodeURIComponent(t.title + (t.speaker ? ' — ' + t.speaker : ''))
    + '&dates=' + f(start) + '/' + f(end)
    + '&details=' + encodeURIComponent('Watch live on CWHW: ' + location.origin + location.pathname);
}
// Date and time inputs for the host form are in Indian time
function istParts(iso) {
  const d = new Date(new Date(iso).getTime() + IST);
  const p = n => String(n).padStart(2, '0');
  return { date: d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()), time: p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) };
}

customElements.define('cwhw-talks', class extends HTMLElement {
  static get observedAttributes() { return ['data', 'link']; }

  attributeChangedCallback(name, oldV, val) {
    if (!val) return;
    let d; try { d = JSON.parse(val); } catch (e) { return; }
    if (name === 'data') { this.data = d; if (this.ready) this.gotData(); }
    if (name === 'link') this.gotLink(d);
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
cwhw-talks .band{box-sizing:border-box;font-family:'Space Grotesk',sans-serif;color:#2F3E4E;padding:40px 24px}
cwhw-talks .inner{max-width:1080px;margin:0 auto}
cwhw-talks .head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:24px}
cwhw-talks h2{margin:0;font-size:38px}
cwhw-talks .sub{margin:6px 0 0;font-size:17px;color:#4a5866}
cwhw-talks .next{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:14px;background:#2F3E4E;color:#fff;border-radius:16px;padding:20px 24px;margin-bottom:24px}
cwhw-talks .next small{display:block;font-size:13px;letter-spacing:1px;color:#FFC124;font-weight:700;margin-bottom:4px}
cwhw-talks .next b{display:block;font-size:22px}
cwhw-talks .next span{font-size:15px;color:#dce4ec}
cwhw-talks .lbl{font-size:13px;font-weight:700;letter-spacing:1px;margin:28px 0 12px;color:#4a5866}
cwhw-talks .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}
cwhw-talks .card{display:flex;gap:16px;background:#FDF5EF;border:3px solid #2F3E4E;border-radius:16px;box-shadow:6px 6px 0 #F2B8A2;padding:22px;box-sizing:border-box;min-width:0}
cwhw-talks .date{flex:0 0 64px;height:70px;background:#fff;border:2px solid #2F3E4E;border-radius:10px;text-align:center;display:flex;flex-direction:column;justify-content:center}
cwhw-talks .date b{font-size:26px;line-height:1}
cwhw-talks .date span{font-size:13px;font-weight:700;letter-spacing:1px}
cwhw-talks .body{flex:1;min-width:0}
cwhw-talks .card h3{margin:0 0 4px;font-size:21px;line-height:1.2}
cwhw-talks .who{font-size:15px;font-weight:700;margin:0 0 2px}
cwhw-talks .meta{font-size:14px;color:#4a5866;margin:0 0 10px}
cwhw-talks .desc{font-size:15px;margin:0 0 12px;white-space:pre-line;overflow-wrap:anywhere}
cwhw-talks .desc.short{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
cwhw-talks .more{background:none;border:0;padding:0;font:700 14px 'Space Grotesk',sans-serif;color:#2F3E4E;text-decoration:underline;cursor:pointer;margin:-6px 0 12px}
cwhw-talks .acts{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
cwhw-talks .chip{font-size:13px;font-weight:700;padding:4px 10px;border-radius:999px;background:#e9eef2;color:#2F3E4E;white-space:nowrap}
cwhw-talks .chip.ok{background:#d7f0e4;color:#1d6b4f}
cwhw-talks .chip.live{background:#b3261e;color:#fff}
cwhw-talks .lnk{font-size:14px;font-weight:700;color:#2F3E4E;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;font-family:'Space Grotesk',sans-serif}
cwhw-talks .btn,cwhw-talks .btn2{display:inline-block;border:2px solid #1d1d1d;border-radius:8px;padding:9px 16px;font:700 15px 'Space Grotesk',sans-serif;cursor:pointer;text-decoration:none;color:#1d1d1d;white-space:nowrap}
cwhw-talks .btn{background:#FFC124;box-shadow:3px 3px 0 #2F3E4E}
cwhw-talks .btn2{background:#fff}
cwhw-talks .btn:disabled,cwhw-talks .btn2:disabled{opacity:.7;cursor:default}
cwhw-talks .muted{font-size:15px;color:#4a5866;margin:0}
cwhw-talks .empty{text-align:center;background:#FDF5EF;border:3px solid #2F3E4E;border-radius:16px;padding:40px 24px}
cwhw-talks .empty h3{margin:0 0 8px;font-size:26px}
cwhw-talks .empty p{margin:0;font-size:16px}
cwhw-talks .msg{min-height:22px;font-size:15px;font-weight:700;margin-bottom:12px;color:#b3261e}
cwhw-talks .msg.good{color:#1d6b4f}
cwhw-talks .host{background:#fff;border:3px solid #2F3E4E;border-radius:16px;padding:24px;margin-top:12px}
cwhw-talks .host h3{margin:0 0 4px;font-size:24px}
cwhw-talks .form{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:16px}
cwhw-talks .form .wide{grid-column:1/-1}
cwhw-talks label{display:block;font-weight:700;font-size:14px;margin-bottom:6px}
cwhw-talks label i{font-style:normal;font-weight:500;color:#4a5866}
cwhw-talks input,cwhw-talks textarea{box-sizing:border-box;width:100%;padding:10px 12px;border:2px solid #1d1d1d;border-radius:8px;font:500 16px 'Space Grotesk',sans-serif;background:#fff;color:#1d1d1d}
cwhw-talks textarea{min-height:90px;resize:vertical}
cwhw-talks .check{display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px}
cwhw-talks .check input{width:auto}
cwhw-talks .row{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;border:2px solid #2F3E4E;border-radius:10px;padding:10px 12px;margin-bottom:10px;background:#FDF5EF}
cwhw-talks .row b{display:block;font-size:16px}
cwhw-talks .row span{font-size:14px;color:#4a5866}
@media (max-width:600px){cwhw-talks .band{padding:20px 12px}cwhw-talks h2{font-size:30px}cwhw-talks .card{padding:16px;gap:12px}cwhw-talks .date{flex-basis:54px}}
</style>
<div class="band"><div class="inner">
 <div class="head"><div><h2>Mentor Talks</h2><p class="sub">Live sessions with students and mentors who've been there. Register to get a reminder.</p></div></div>
 <div class="msg" id="msg" role="status"></div>
 <div id="list"><p class="muted">Loading…</p></div>
 <div id="hostBox"></div>
</div></div>`;
    this.band = this.querySelector('.band');
    this.fit = () => {
      this.band.style.width = document.documentElement.clientWidth + 'px';
      this.band.style.marginLeft = '0px';
      this.band.style.marginLeft = (-this.band.getBoundingClientRect().left) + 'px';
    };
    this.fit(); setTimeout(this.fit, 500); setTimeout(this.fit, 1500);
    window.addEventListener('resize', this.fit);
    this.expanded = new Set();
    this.tick = setInterval(() => { if (this.data) this.renderList(); }, 30000);
    if (this.data) this.gotData();
  }

  disconnectedCallback() {
    clearInterval(this.tick);
    window.removeEventListener('resize', this.fit);
  }

  el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  button(cls, text, onClick) {
    const b = this.el('button', cls, text);
    b.type = 'button';
    b.onclick = () => onClick(b);
    return b;
  }

  say(text, good) {
    const msg = this.querySelector('#msg');
    msg.textContent = text || '';
    msg.className = 'msg' + (good ? ' good' : '');
  }

  fire(name, detail, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    this.say('');
    this.dispatchEvent(new CustomEvent(name, { detail }));
  }

  gotData() {
    const d = this.data || {};
    if (d.error) this.say(d.error);
    else if (d.message) this.say(d.message, true);
    if (d.saved) this.editing = null;
    this.renderList();
    this.renderHost(!!d.saved);
  }

  // Open a tab straight away (so browsers don't block it), then send it to the live link
  watch(t, btn) {
    this.say('');
    let win = null;
    try { win = window.open('', '_blank'); } catch (e) { win = null; }
    if (win) {
      try { win.document.title = 'Joining…'; win.document.body.innerHTML = '<p style="font:16px sans-serif;padding:24px">Opening the talk…</p>'; } catch (e) {}
    }
    this.pending = { win, btn, label: btn.textContent };
    btn.disabled = true; btn.textContent = 'Opening…';
    this.dispatchEvent(new CustomEvent('watch-talk', { detail: { id: t.id } }));
  }

  gotLink(d) {
    const p = this.pending || {};
    this.pending = null;
    if (p.btn) { p.btn.disabled = false; p.btn.textContent = p.label || 'Watch live'; }
    if (d.url) {
      if (p.win && !p.win.closed) p.win.location.href = d.url;
      else window.location.href = d.url;
    } else {
      try { if (p.win && !p.win.closed) p.win.close(); } catch (e) {}
      this.say(d.error || 'Could not open this talk.');
    }
  }

  actions(t, now) {
    const d = this.data || {};
    const st = status(t, now);
    const acts = this.el('div', 'acts');
    if (st.ended) {
      if (t.recordingLink) {
        const a = this.el('a', 'btn', 'Watch recording');
        a.href = t.recordingLink; a.target = '_blank'; a.rel = 'noopener';
        acts.append(a);
      } else acts.append(this.el('span', 'chip', 'Ended'));
      return acts;
    }
    if (!d.loggedIn) {
      acts.append(this.button('btn', st.open ? 'Log in to watch' : 'Log in to register', () => this.fire('login', {})));
      if (st.label) acts.append(this.el('span', 'chip' + (st.open ? ' live' : ''), st.label));
      return acts;
    }
    const full = t.seatsLeft === 0 && !t.registered;
    if (t.mine && t.hasLink) acts.append(this.button(st.open ? 'btn' : 'btn2', st.open ? 'Watch live' : 'Open link', b => this.watch(t, b)));
    else if (st.open && t.hasLink && !full) acts.append(this.button('btn', 'Watch live', b => this.watch(t, b)));
    if (t.registered) {
      acts.append(this.el('span', 'chip ok', '✓ Registered'));
      if (!st.open) {
        const cal = this.el('a', 'lnk', 'Add to calendar');
        cal.href = gcal(t); cal.target = '_blank'; cal.rel = 'noopener';
        acts.append(cal);
        acts.append(this.button('lnk', 'Cancel', b => this.fire('cancel-registration', { id: t.id }, b)));
      }
    } else if (!st.open && !t.mine) {
      acts.append(full ? this.el('span', 'chip', 'Full') : this.button('btn', 'Register', b => this.fire('register-talk', { id: t.id }, b)));
    }
    if (st.label) acts.append(this.el('span', 'chip' + (st.open ? ' live' : ''), st.label));
    if (!t.hasLink && st.open) acts.append(this.el('span', 'chip', 'Link coming soon'));
    return acts;
  }

  card(t, now) {
    const { start } = times(t);
    const card = this.el('div', 'card');
    const date = this.el('div', 'date');
    date.append(this.el('b', null, String(start.getDate())), this.el('span', null, MONTHS[start.getMonth()].toUpperCase()));
    const body = this.el('div', 'body');
    body.append(this.el('h3', null, t.title));
    body.append(this.el('p', 'who', t.speaker + (t.speakerInfo ? ' · ' + t.speakerInfo : '')));
    const seats = t.seats && !status(t, now).ended ? ' · ' + (t.seatsLeft ? t.seatsLeft + ' seats left' : 'full') : '';
    body.append(this.el('p', 'meta', whenText(start, now) + ' · ' + t.duration + ' min' + seats + (t.published ? '' : ' · Hidden')));
    if (t.description) {
      const open = this.expanded.has(t.id);
      body.append(this.el('p', 'desc' + (open ? '' : ' short'), t.description));
      if (t.description.length > 160) {
        body.append(this.button('more', open ? 'Show less' : 'Read more', () => {
          if (open) this.expanded.delete(t.id); else this.expanded.add(t.id);
          this.renderList();
        }));
      }
    }
    body.append(this.actions(t, now));
    card.append(date, body);
    return card;
  }

  renderList() {
    const list = this.querySelector('#list');
    list.innerHTML = '';
    const d = this.data || {};
    const now = new Date();
    if (d.ready === false) { list.append(this.el('p', 'muted', 'Talks are being set up. Please check back soon.')); return; }
    const talks = d.talks || [];
    const upcoming = talks.filter(t => !status(t, now).ended).sort((a, b) => new Date(a.start) - new Date(b.start));
    const past = talks.filter(t => status(t, now).ended).sort((a, b) => new Date(b.start) - new Date(a.start));

    const first = upcoming.find(t => t.published);
    if (first) {
      const st = status(first, now);
      const box = this.el('div', 'next');
      const info = this.el('div');
      info.append(this.el('small', null, st.open ? st.label.toUpperCase() : 'NEXT TALK'));
      info.append(this.el('b', null, first.title));
      info.append(this.el('span', null, first.speaker + ' · ' + whenText(times(first).start, now)));
      const acts = this.actions(first, now);
      acts.querySelectorAll('.chip,.lnk').forEach(x => x.remove());
      box.append(info, acts);
      list.append(box);
    }

    list.append(this.el('div', 'lbl', 'UPCOMING TALKS'));
    if (!upcoming.length) {
      const e = this.el('div', 'empty');
      e.append(this.el('h3', null, 'No talks scheduled right now'), this.el('p', null, 'New mentor talks are added often. Check back soon!'));
      list.append(e);
    } else {
      const grid = this.el('div', 'grid');
      upcoming.forEach(t => grid.append(this.card(t, now)));
      list.append(grid);
    }

    if (past.length) {
      list.append(this.el('div', 'lbl', 'PAST TALKS'));
      const grid = this.el('div', 'grid');
      past.forEach(t => grid.append(this.card(t, now)));
      list.append(grid);
    }
  }

  // ---------- Hosting (mentors) ----------
  renderHost(reset) {
    const box = this.querySelector('#hostBox');
    const d = this.data || {};
    if (!d.canHost) { box.innerHTML = ''; return; }
    if (!this.hostBuilt) this.buildHost(box);
    if (reset) this.fillForm(null);
    this.renderMine();
  }

  buildHost(box) {
    this.hostBuilt = true;
    box.innerHTML = `<div class="lbl">FOR MENTORS</div><div class="host">
 <h3 id="fTitle">Host a talk</h3><p class="muted">Times are in Indian time (IST). The link is only shown to registered members from ${EARLY_MIN} minutes before the start.</p>
 <div class="form">
  <div class="wide"><label>Title</label><input id="f-title" maxlength="90" placeholder="How I got 99% in Class 10 boards"></div>
  <div><label>Speaker</label><input id="f-speaker" maxlength="60" placeholder="Name"></div>
  <div><label>About the speaker <i>(optional)</i></label><input id="f-speakerInfo" maxlength="120" placeholder="99.2% in CBSE Class 10, 2025"></div>
  <div class="wide"><label>What the talk covers <i>(optional)</i></label><textarea id="f-description" maxlength="1500"></textarea></div>
  <div><label>Date</label><input id="f-date" type="date"></div>
  <div><label>Start time (IST)</label><input id="f-time" type="time"></div>
  <div><label>Length (minutes)</label><input id="f-duration" type="number" min="15" max="300" value="60"></div>
  <div><label>Seats <i>(blank = no limit)</i></label><input id="f-seats" type="number" min="0"></div>
  <div class="wide"><label>Watch link — YouTube Live or Google Meet</label><input id="f-watchLink" placeholder="https://youtube.com/live/… or https://meet.google.com/…"></div>
  <div class="wide"><label>Recording link <i>(optional, shown to everyone after the talk)</i></label><input id="f-recordingLink" placeholder="https://youtube.com/watch?v=…"></div>
  <div class="wide"><label class="check"><input id="f-published" type="checkbox" checked> Show on the Sessions page</label></div>
  <div class="wide acts" id="fActs"></div>
 </div>
 <div id="mine"></div>
</div>`;
    const acts = this.querySelector('#fActs');
    this.saveBtn = this.button('btn', 'Save talk', b => this.save(b));
    this.cancelBtn = this.button('btn2', 'Cancel edit', () => this.fillForm(null));
    acts.append(this.saveBtn, this.cancelBtn);
    this.fillForm(null);
  }

  f(id) { return this.querySelector('#f-' + id); }

  fillForm(t) {
    this.editing = t ? t.id : null;
    const p = t ? istParts(t.start) : { date: '', time: '' };
    this.f('title').value = t ? t.title : '';
    this.f('speaker').value = t ? t.speaker : '';
    this.f('speakerInfo').value = t ? t.speakerInfo : '';
    this.f('description').value = t ? t.description : '';
    this.f('date').value = p.date;
    this.f('time').value = p.time;
    this.f('duration').value = t ? t.duration : 60;
    this.f('seats').value = t && t.seats ? t.seats : '';
    this.f('watchLink').value = t ? t.watchLink || '' : '';
    this.f('recordingLink').value = t ? t.recordingLinkEdit || '' : '';
    this.f('published').checked = t ? t.published : true;
    this.querySelector('#fTitle').textContent = t ? 'Edit talk' : 'Host a talk';
    this.saveBtn.disabled = false; this.saveBtn.textContent = 'Save talk';
    this.cancelBtn.style.display = t ? '' : 'none';
  }

  save(btn) {
    const talk = {
      id: this.editing || undefined,
      title: this.f('title').value, speaker: this.f('speaker').value, speakerInfo: this.f('speakerInfo').value,
      description: this.f('description').value, date: this.f('date').value, time: this.f('time').value,
      duration: this.f('duration').value, seats: this.f('seats').value,
      watchLink: this.f('watchLink').value, recordingLink: this.f('recordingLink').value,
      published: this.f('published').checked
    };
    this.fire('save-talk', { talk }, btn);
  }

  renderMine() {
    const box = this.querySelector('#mine');
    box.innerHTML = '';
    if (this.saveBtn) { this.saveBtn.disabled = false; this.saveBtn.textContent = 'Save talk'; }
    const mine = ((this.data || {}).talks || []).filter(t => t.mine).sort((a, b) => new Date(b.start) - new Date(a.start));
    if (!mine.length) return;
    box.append(this.el('div', 'lbl', 'TALKS YOU HOST'));
    const now = new Date();
    mine.forEach(t => {
      const row = this.el('div', 'row');
      const info = this.el('div');
      info.append(this.el('b', null, t.title));
      const st = status(t, now);
      info.append(this.el('span', null, whenText(times(t).start, now) + ' · ' + t.registrations + ' registered'
        + (t.watched || st.ended ? ' · ' + t.watched + ' joined' : '') + (t.published ? '' : ' · Hidden')));
      const acts = this.el('div', 'acts');
      acts.append(this.button('btn2', 'Edit', () => { this.fillForm(t); this.querySelector('.host').scrollIntoView({ behavior: 'smooth' }); }));
      acts.append(this.button('lnk', 'Delete', b => {
        if (confirm('Delete "' + t.title + '"? Registrations will be removed too.')) this.fire('delete-talk', { id: t.id }, b);
      }));
      row.append(info, acts);
      box.append(row);
    });
  }
});
