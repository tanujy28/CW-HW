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
cwhw-classes .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}
cwhw-classes .card{background:#FDF5EF;border:3px solid #2F3E4E;border-radius:16px;box-shadow:6px 6px 0 #F2B8A2;padding:24px;box-sizing:border-box}
cwhw-classes .card h3{margin:0 0 14px;font-size:22px}
cwhw-classes .room{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#fff;border:2px solid #2F3E4E;border-radius:10px;padding:10px 12px;margin-bottom:10px}
cwhw-classes .room span{font-weight:700;font-size:16px}
cwhw-classes .btn,cwhw-classes .btn2{display:inline-block;border:2px solid #1d1d1d;border-radius:8px;padding:9px 16px;font:700 15px 'Space Grotesk',sans-serif;cursor:pointer;text-decoration:none;color:#1d1d1d}
cwhw-classes .btn{background:#FFC124;box-shadow:3px 3px 0 #2F3E4E}
cwhw-classes .btn2{background:#fff}
cwhw-classes .muted{font-size:15px;color:#4a5866;margin:0}
cwhw-classes .empty{text-align:center;background:#FDF5EF;border:3px solid #2F3E4E;border-radius:16px;padding:40px 24px}
cwhw-classes .empty h3{margin:0 0 8px;font-size:26px}
cwhw-classes .empty p{margin:0 0 18px;font-size:16px}
@media (max-width:600px){cwhw-classes .band{padding:20px 12px}cwhw-classes h2{font-size:30px}}
</style>
<div class="band"><div class="inner">
 <div class="head"><h2>My Classes</h2><a class="btn2" href="/join">+ Join another class</a></div>
 <div id="list"><p class="muted">Loading your classes…</p></div>
</div></div>`;
    this.band = this.querySelector('.band');
    this.fit = () => {
      this.band.style.width = document.documentElement.clientWidth + 'px';
      this.band.style.marginLeft = '0px';
      this.band.style.marginLeft = (-this.band.getBoundingClientRect().left) + 'px';
    };
    this.fit(); setTimeout(this.fit, 500); setTimeout(this.fit, 1500);
    window.addEventListener('resize', this.fit);
    if (this.data) this.renderList();
  }

  renderList() {
    const list = this.querySelector('#list');
    list.innerHTML = '';
    const d = this.data || {};
    const classes = d.classes || [];
    if (d.error) { list.innerHTML = '<p class="muted"></p>'; list.firstChild.textContent = d.error; return; }
    if (!classes.length) {
      list.innerHTML = '<div class="empty"><h3>You haven\u2019t joined a class yet</h3><p>Ask your teacher for a class code.</p><a class="btn" href="/join">Join your class</a></div>';
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'grid';
    classes.forEach(c => {
      const card = document.createElement('div');
      card.className = 'card';
      const h = document.createElement('h3'); h.textContent = c.name; card.append(h);
      if (!c.rooms.length) {
        const p = document.createElement('p'); p.className = 'muted';
        p.textContent = 'Your teacher hasn\u2019t set up study rooms yet.';
        card.append(p);
      }
      c.rooms.forEach(r => {
        const row = document.createElement('div'); row.className = 'room';
        const s = document.createElement('span'); s.textContent = r.name;
        const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.textContent = 'Join';
        b.onclick = () => this.openRoom(r);
        row.append(s, b); card.append(row);
      });
      grid.append(card);
    });
    list.append(grid);
  }

  openRoom(r) {
    this.closeRoom();
    const o = document.createElement('div');
    Object.assign(o.style, { position: 'fixed', inset: '0', zIndex: '2147483000', background: '#00594c' });
    const bar = document.createElement('div');
    Object.assign(bar.style, { height: '48px', display: 'flex', alignItems: 'center', gap: '14px', padding: '0 12px', background: '#0b3d3a', color: '#fff', font: "700 16px 'Space Grotesk',sans-serif" });
    const back = document.createElement('button');
    back.textContent = '\u2190 Back to My Classes';
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
    this.msg('Connecting to study room\u2026');
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
    this.msg('Connecting to study room\u2026');
    const f = document.createElement('iframe');
    f.src = d.url;
    f.allow = 'camera; microphone; fullscreen; display-capture; autoplay';
    Object.assign(f.style, { position: 'relative', zIndex: '1', width: '100%', height: '100%', border: '0' });
    this.stage.append(f);
  }

  closeRoom() {
    if (this.overlay) { this.overlay.remove(); this.overlay = null; }
    document.body.style.overflow = '';
  }

  disconnectedCallback() {
    this.closeRoom();
    window.removeEventListener('resize', this.fit);
  }
});