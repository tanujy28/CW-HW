const ROOM_KEYS = ['math', 'science', 'technology', 'languages', 'social', 'creative'];

customElements.define('cwhw-rooms', class extends HTMLElement {
  static get observedAttributes() { return ['room-url']; }

  attributeChangedCallback(name, oldV, val) {
    if (name !== 'room-url' || !val) return;
    let d; try { d = JSON.parse(val); } catch (e) { return; }
    if (d.key !== this.current) return;
    this.answered = true;
    if (d.url) this.showFrame(d.url);
    else this.showMsg(d.error === 'login'
      ? 'Please log in to CWHW to join study rooms.'
      : 'Could not open this room. Please try again.');
  }

  connectedCallback() {
    this.current = undefined;
    this.onClick = (e) => {
      const a = e.target.closest && e.target.closest('a');
      if (!a || !a.href) return;
      const u = new URL(a.href, location.href);
      if (u.pathname === location.pathname && ROOM_KEYS.includes(u.searchParams.get('room'))) {
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
  }

  render() {
    const key = new URLSearchParams(location.search).get('room');
    if (key === this.current) return;
    this.current = key;
    clearInterval(this.retry);
    this.innerHTML = '';
    const cover = document.getElementById('cwhw-room-cover');
    if (cover) cover.remove();

    if (!ROOM_KEYS.includes(key)) {
      this.removeAttribute('style');
      Object.assign(this.style, { display: 'block', width: '1px', height: '1px', overflow: 'hidden' });
      return;
    }

    Object.assign(this.style, {
      display: 'block', position: 'fixed', top: '0', left: '0',
      width: '100vw', height: '100vh', zIndex: '99999',
      background: '#00594c', visibility: 'visible'
    });

    const bar = document.createElement('div');
    Object.assign(bar.style, { height: '44px', display: 'flex', alignItems: 'center',
      padding: '0 12px', background: '#0b3d3a' });
    const back = document.createElement('button');
    back.textContent = '← Back to study rooms';
    Object.assign(back.style, { background: '#FFC124', color: '#000', border: '0',
      borderRadius: '6px', padding: '6px 12px', fontWeight: 'bold',
      fontFamily: 'sans-serif', cursor: 'pointer' });
    back.onclick = () => { history.pushState({}, '', location.pathname); this.render(); };
    bar.append(back);

    this.stage = document.createElement('div');
    Object.assign(this.stage.style, { position: 'relative', width: '100%', height: 'calc(100% - 44px)' });
    this.append(bar, this.stage);
    this.showMsg('Connecting to study room…');

    // Ask the page (and backend) for the room link; retry in case the page code is still loading
    this.answered = false;
    let tries = 0;
    const ask = () => {
      if (this.answered || tries++ > 6) { clearInterval(this.retry); return; }
      this.dispatchEvent(new CustomEvent('need-room', { detail: { key } }));
    };
    ask();
    this.retry = setInterval(ask, 1500);
  }

  showMsg(text) {
    if (!this.stage) return;
    this.stage.innerHTML = '';
    const m = document.createElement('div');
    m.textContent = text;
    Object.assign(m.style, { position: 'absolute', inset: '0', display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#fff', font: 'bold 20px sans-serif', textAlign: 'center', padding: '0 20px' });
    this.stage.append(m);
  }

  showFrame(url) {
    clearInterval(this.retry);
    this.showMsg('Connecting to study room…');
    const frame = document.createElement('iframe');
    frame.src = url;
    frame.allow = 'camera; microphone; fullscreen; display-capture; autoplay';
    Object.assign(frame.style, { position: 'relative', zIndex: '1', width: '100%', height: '100%', border: '0' });
    this.stage.append(frame);
  }
});