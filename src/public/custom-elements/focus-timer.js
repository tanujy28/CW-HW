// Background videos: pick a lighter version on phones and slow connections (1080p is heavy and
// mostly hidden behind the glass panels). If a size isn't available, the player falls back.
const NET = (typeof navigator !== 'undefined' && navigator.connection) || {};
const SLOW = !!NET.saveData || /(^|-)(2g|3g)$/.test(NET.effectiveType || '');
const SMALL = typeof window !== 'undefined' && Math.max(window.screen.width, window.screen.height) <= 900;
const QUALITIES = SLOW || SMALL ? ['480p', '720p', '1080p'] : ['720p', '1080p', '480p'];
const V = id => 'https://video.wixstatic.com/video/' + id + '/' + QUALITIES[0] + '/mp4/file.mp4';
const nextQuality = url => {
  const m = /\/(\d+p)\/mp4\//.exec(url || '');
  if (!m) return null;
  const i = QUALITIES.indexOf(m[1]);
  return i >= 0 && i < QUALITIES.length - 1 ? url.replace('/' + m[1] + '/', '/' + QUALITIES[i + 1] + '/') : null;
};
const M = id => 'https://static.wixstatic.com/preview/' + id + '-128.mp3';

const THEMES = [
  { name: 'Chill',      video: V('73c6a3_ea27b0a4934b4d3699b1a570b2eb8e7f') },
  { name: 'Classic',    video: V('73c6a3_70416d693a2341309bc88729b6a73f64') },
  { name: 'Batman',     video: V('73c6a3_fb96a537feff4b97b2647ace3c65fbaa') },
  { name: 'Star Wars',  video: V('73c6a3_a6c57b5225574eb4ad9cb67cf3764a3c') },
  { name: 'The Matrix', video: V('73c6a3_e6f63190bef4452082ce6af5c0f8b0af') },
  { name: 'Messi',      video: V('73c6a3_6994e66aa879463fb663c9e795b1ece9') },
  { name: 'Ronaldo',    video: V('73c6a3_0b6bbf4cb5bb4583b3b5856d7b39387e') }
];

const TRACKS = [
  { title: 'Night Sounds',                        artist: 'Handpicked By Tanuj',   src: M('73c6a3_624d019898874bffa453ba7760d4cf8d') },
  { title: 'Rain Sounds',                         artist: 'Handpicked By Tanuj',   src: M('73c6a3_b4091954cfe74d0cad88cf0cd49ef66b') },
  { title: 'Interstellar Main Theme',             artist: 'Hans Zimmer',           src: M('73c6a3_f6d78a681d68493d845c5cec1616baf9') },
  { title: 'Time',                                artist: 'Hans Zimmer',           src: M('73c6a3_0d91be7b525244d792dd9f24f440e8b9') },
  { title: 'The Dark Knight Main Theme',          artist: 'Hans Zimmer',           src: M('73c6a3_ae72b4816dad44bda579d1cd35eff440') },
  { title: 'Star Wars - The Force Suite (Theme)', artist: 'John Williams',         src: M('73c6a3_07e7ccdc4e46470f843ffcf8a18b43b5') },
  { title: 'Batman Arkham City Soundtrack',       artist: 'Nick Arundel',          src: M('73c6a3_11eb46a0333a49559ca6fcbdedf499f9') },
  { title: 'Arrival To Earth',                    artist: 'Steve Jablonsky',       src: M('73c6a3_598baa618f4b4b0981a188a2414bde52') },
  { title: 'The Batman',                          artist: 'Michael Giacchino',     src: M('73c6a3_36f82efa25444f2db8addcdc32a09ef7') },
  { title: 'Can You Hear The Music',              artist: 'Ludwig Göransson',      src: M('73c6a3_8cb82199058f4503baed29993a29f531') },
  { title: 'Air',                                 artist: 'Johann Sebastian Bach', src: M('73c6a3_0049ead526e347ea97bb3c1a89e89571') },
  { title: 'The Three Hunters',                   artist: 'Howard Shore',          src: M('73c6a3_9483bf4554c94b8f9ebcbef36505deae') }
];

customElements.define('cwhw-focus', class extends HTMLElement {
  static get observedAttributes() { return ['items', 'upload-url']; }

  attributeChangedCallback(name, oldV, val) {
    if (!val) return;
    let data; try { data = JSON.parse(val); } catch (e) { return; }
    if (name === 'items') { this.pendingItems = data; if (this.applyItems) this.applyItems(data); }
    if (name === 'upload-url' && this.waiting && this.waiting[data.reqId]) {
      this.waiting[data.reqId](data); delete this.waiting[data.reqId];
    }
  }

  connectedCallback() {
    if (this.root) return;
    this.waiting = {};
    // Start connecting to the video server early so the background shows sooner
    if (!document.getElementById('cwhw-preconnect-video')) {
      const pc = document.createElement('link');
      pc.id = 'cwhw-preconnect-video'; pc.rel = 'preconnect'; pc.href = 'https://video.wixstatic.com';
      document.head.appendChild(pc);
    }
    if (!document.getElementById('cwhw-font')) {
      const l = document.createElement('link');
      l.id = 'cwhw-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap';
      document.head.appendChild(l);
    }
    const today = new Date().toDateString();
    const getLS = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const setLS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
    let st = {}; try { st = JSON.parse(getLS('cwhw-focus') || '{}'); } catch (e) {}
    if (st.day !== today) st = { day: today, sessions: 0, minutes: 0 };
    const save = () => setLS('cwhw-focus', JSON.stringify(st));
    let focusMin = 25, breakMin = 5, left = 1500, onBreak = false;
    this.timer = null;

    const root = document.createElement('div');
    root.className = 'cwhw-room';
    document.body.appendChild(root);
    this.root = root;

    root.innerHTML = `<style>
.cwhw-room{position:fixed;inset:0;z-index:2147483000;overflow:hidden;background:#1b2530;font-family:'Space Grotesk',sans-serif;color:#fff}
.cwhw-room .bg,.cwhw-room video.bgv{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background-size:cover;background-position:center}
.cwhw-room .glass{background:rgba(255,255,255,.14);-webkit-backdrop-filter:blur(22px) saturate(180%);backdrop-filter:blur(22px) saturate(180%);
  border:1px solid rgba(255,255,255,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 -1px 0 rgba(255,255,255,.12),0 10px 34px rgba(0,0,0,.28)}
.cwhw-room .pill{border-radius:999px;padding:7px 14px;font:600 14px 'Space Grotesk',sans-serif;color:#fff;cursor:pointer;text-shadow:0 1px 2px rgba(0,0,0,.35);white-space:nowrap}
.cwhw-room .pill:hover{background:rgba(255,255,255,.24)}
.cwhw-room .pill.on{background:rgba(255,255,255,.42);color:#111;text-shadow:none}
.cwhw-room .pill.yellow{background:rgba(255,193,36,.75);color:#111;text-shadow:none}
.cwhw-room .pill:active{transform:scale(.96)}
.cwhw-room .x{margin-left:8px;opacity:.7}
.cwhw-room .x:hover{opacity:1}
.cwhw-room .exit{position:absolute;top:16px;left:16px}
.cwhw-room .themes{position:absolute;top:16px;right:16px;left:130px;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.cwhw-room .card{position:absolute;left:24px;bottom:24px;width:300px;border-radius:26px;padding:18px 20px;box-sizing:border-box}
.cwhw-room .top{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;text-shadow:0 1px 2px rgba(0,0,0,.35)}
.cwhw-room .pre{background:none;border:0;font:700 13px 'Space Grotesk',sans-serif;color:#fff;cursor:pointer;opacity:.55;padding:2px 4px}
.cwhw-room .pre.on{opacity:1;text-decoration:underline}
.cwhw-room .time{font-size:60px;font-weight:700;line-height:1.1;margin:6px 0 12px;text-shadow:0 2px 10px rgba(0,0,0,.35)}
.cwhw-room .row{display:flex;gap:8px;align-items:center}
.cwhw-room .stats{font-size:13px;margin-top:12px;opacity:.9}
.cwhw-room .music{border-top:1px solid rgba(255,255,255,.35);margin-top:14px;padding-top:12px}
.cwhw-room .ttl{font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cwhw-room .art{font-size:13px;opacity:.8;margin-bottom:10px}
.cwhw-room .ib{padding:6px 11px;font-size:14px}
.cwhw-room select{flex:1;min-width:0;padding:7px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.14);color:#fff;font:500 13px 'Space Grotesk',sans-serif;outline:none}
.cwhw-room select option{color:#111}
.cwhw-room input[type=file]{display:none}
.cwhw-room .toast{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);border-radius:999px;padding:10px 18px;font-size:14px;opacity:0;transition:opacity .3s;pointer-events:none;max-width:80vw;text-align:center}
@media (max-width:600px){
 .cwhw-room .themes{left:12px;right:12px;top:64px;flex-wrap:nowrap;overflow-x:auto;justify-content:flex-start;padding-bottom:4px}
 .cwhw-room .exit{top:12px;left:12px}
 .cwhw-room .card{left:12px;right:12px;bottom:12px;width:auto}
 .cwhw-room .time{font-size:48px}
 .cwhw-room .toast{top:110px;bottom:auto}}
</style>
<div class="bg"></div><video class="bgv" muted loop playsinline autoplay preload="auto"></video><audio preload="none"></audio>
<button class="glass pill exit" id="exit">← Exit</button>
<div class="themes"></div>
<div class="card glass">
 <div class="top"><span id="mode">Focus</span>
  <span><button class="pre on" data-p="25,5">25/5</button><button class="pre" data-p="50,10">50/10</button></span></div>
 <div class="time" id="time">25:00</div>
 <div class="row">
  <button class="glass pill yellow" id="start">Start</button>
  <button class="glass pill" id="reset">Reset</button>
  <button class="glass pill" id="full" title="Full screen">⛶</button></div>
 <div class="stats" id="stats"></div>
 <div class="music">
  <div class="ttl" id="ttl"></div>
  <div class="art" id="art"></div>
  <div class="row">
   <button class="glass pill ib" id="prev" title="Previous">⏮</button>
   <button class="glass pill ib" id="play" title="Play/Pause">▶</button>
   <button class="glass pill ib" id="next" title="Next">⏭</button>
   <select id="pick"></select>
  </div>
  <div class="row" style="margin-top:8px">
   <button class="glass pill ib" id="addMusic" title="Add your own music">+ Add music</button>
   <button class="glass pill ib" id="delMusic" title="Remove this track" style="display:none">🗑</button>
  </div>
 </div>
</div>
<div class="toast glass" id="toast"></div>
<input type="file" id="bgFile" accept="image/*,video/*">
<input type="file" id="musicFile" accept="audio/*">`;

    const $ = s => root.querySelector(s);
    const bg = $('.bg'), video = $('video.bgv'), audio = $('audio');
    const toast = (msg, ms = 3500) => {
      const t = $('#toast'); t.textContent = msg; t.style.opacity = 1;
      clearTimeout(this.tt); if (ms) this.tt = setTimeout(() => { t.style.opacity = 0; }, ms);
    };

    document.body.style.overflow = 'hidden';
    $('#exit').onclick = () => { window.location.href = '/'; };
    $('#full').onclick = () => {
      if (!document.fullscreenElement) { root.requestFullscreen && root.requestFullscreen(); }
      else document.exitFullscreen();
    };

    // ---------- Backgrounds ----------
    let bgs = THEMES.map((t, i) => ({ key: 'b' + i, name: t.name, kind: 'video', url: t.video }));
    let bgKey = getLS('cwhw-bg') || 'b0';

    const setBg = (key) => {
      const b = bgs.find(x => x.key === key) || bgs[0];
      bgKey = b.key; setLS('cwhw-bg', bgKey);
      root.querySelectorAll('.themes .chip').forEach(c => c.classList.toggle('on', c.dataset.key === bgKey));
      if (b.kind === 'image') {
        video.pause(); video.removeAttribute('src'); video.style.display = 'none';
        bg.style.backgroundImage = 'url("' + b.url + '")';
      } else {
        bg.style.backgroundImage = 'none';
        if (video.getAttribute('src') !== b.url) video.src = b.url;
        video.style.display = 'block'; video.play().catch(() => {});
      }
    };
    video.onerror = () => {
      const b = bgs.find(x => x.key === bgKey);
      if (b && b.id) { toast('This video is still processing. Try again in a few minutes.'); return; }
      // Built-in theme: try the next size if this one isn't available
      const alt = b && nextQuality(video.getAttribute('src'));
      if (alt) { b.url = alt; video.src = alt; video.play().catch(() => {}); }
    };
    // Don't keep decoding the background video while the tab is hidden
    this.onVis = () => {
      if (video.style.display === 'none' || !video.getAttribute('src')) return;
      if (document.hidden) video.pause(); else video.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', this.onVis);

    const renderChips = () => {
      const box = $('.themes'); box.innerHTML = '';
      bgs.forEach(b => {
        const c = document.createElement('button');
        c.className = 'glass pill chip'; c.dataset.key = b.key; c.textContent = b.name;
        if (b.id) {
          const x = document.createElement('span'); x.className = 'x'; x.textContent = '×'; x.title = 'Remove';
          x.onclick = (e) => {
            e.stopPropagation();
            if (!confirm('Remove "' + b.name + '" from your backgrounds?')) return;
            if (bgKey === b.key) setBg('b0');
            this.dispatchEvent(new CustomEvent('delete-item', { detail: { id: b.id } }));
          };
          c.append(x);
        }
        c.onclick = () => setBg(b.key);
        box.append(c);
      });
      const add = document.createElement('button');
      add.className = 'glass pill'; add.textContent = '+ Background';
      add.title = 'Add your own photo or video (only you can see it)';
      add.onclick = () => $('#bgFile').click();
      box.append(add);
      root.querySelectorAll('.themes .chip').forEach(c => c.classList.toggle('on', c.dataset.key === bgKey));
    };

    // ---------- Music ----------
    let tracks = TRACKS.map((t, i) => ({ key: 'b' + i, title: t.title, artist: t.artist, src: t.src }));
    let trackKey = getLS('cwhw-track-key') || 'b0';
    let track = 0;

    const renderPick = () => {
      const p = $('#pick'); p.innerHTML = '';
      tracks.forEach((t, i) => {
        const o = document.createElement('option');
        o.value = i; o.textContent = (t.id ? '★ ' : '') + t.title;
        p.append(o);
      });
      $('#pick').value = track;
    };
    const showTrackInfo = () => {
      const t = tracks[track]; if (!t) return;
      $('#ttl').textContent = t.title;
      $('#art').textContent = t.artist;
      $('#pick').value = track;
      $('#delMusic').style.display = t.id ? '' : 'none';
    };
    const loadTrack = (i, autoplay) => {
      if (!tracks.length) return;
      track = (i + tracks.length) % tracks.length;
      const t = tracks[track];
      audio.src = t.src;
      trackKey = t.key; setLS('cwhw-track-key', trackKey);
      showTrackInfo();
      if (autoplay) audio.play().catch(() => {});
    };
    const isPlaying = () => !audio.paused;
    audio.onplay = () => { $('#play').textContent = '⏸'; };
    audio.onpause = () => { $('#play').textContent = '▶'; };
    audio.onended = () => loadTrack(track + 1, true);
    $('#play').onclick = () => { if (isPlaying()) audio.pause(); else audio.play().catch(() => {}); };
    $('#prev').onclick = () => loadTrack(track - 1, isPlaying());
    $('#next').onclick = () => loadTrack(track + 1, isPlaying());
    $('#pick').onchange = e => loadTrack(+e.target.value, true);
    $('#addMusic').onclick = () => $('#musicFile').click();
    $('#delMusic').onclick = () => {
      const t = tracks[track];
      if (!t || !t.id) return;
      if (!confirm('Remove "' + t.title + '" from your music?')) return;
      audio.pause();
      this.dispatchEvent(new CustomEvent('delete-item', { detail: { id: t.id } }));
    };

    // ---------- Your saved files (from your account) ----------
    this.applyItems = (data) => {
      this.loggedIn = data.loggedIn;
      bgs = bgs.filter(b => !b.id);
      tracks = tracks.filter(t => !t.id);
      (data.items || []).forEach(it => {
        if (it.kind === 'bg') bgs.push({ key: 'c' + it.id, id: it.id, name: it.title, kind: it.mediaType, url: it.url });
        if (it.kind === 'music') tracks.push({ key: 'c' + it.id, id: it.id, title: it.title, artist: 'Your music', src: it.url });
      });
      if (data.select) {
        const b = bgs.find(x => x.url === data.select); if (b) bgKey = b.key;
        const ti = tracks.findIndex(x => x.src === data.select); if (ti >= 0) trackKey = tracks[ti].key;
      }
      renderChips();
      setBg(bgs.some(b => b.key === bgKey) ? bgKey : 'b0');
      let idx = tracks.findIndex(t => t.key === trackKey);
      if (idx < 0) idx = 0;
      const same = tracks[idx] && audio.getAttribute('src') === tracks[idx].src;
      track = idx;
      renderPick();
      if (same) showTrackInfo(); else loadTrack(idx, !!data.select && tracks[idx].src === data.select);
      if (data.error) toast(data.error);
    };

    // ---------- Uploading ----------
    const upload = async (file, kind) => {
      if (this.loggedIn === false) { toast('Log in to CWHW to add your own files.'); return; }
      if (!getLS('cwhw-upload-ok')) {
        if (!confirm('Only upload photos, videos or music you have the right to use. Your files are private to your account.')) return;
        setLS('cwhw-upload-ok', '1');
      }
      const isImg = file.type.startsWith('image'), isVid = file.type.startsWith('video'), isAud = file.type.startsWith('audio');
      if ((kind === 'bg' && !(isImg || isVid)) || (kind === 'music' && !isAud)) { toast("That file type isn't supported here."); return; }
      const limitMB = isImg ? 10 : isVid ? 50 : 20;
      if (file.size > limitMB * 1024 * 1024) { toast('Too big: the limit is ' + limitMB + ' MB.'); return; }

      toast('Uploading ' + file.name + '…', 0);
      const reqId = Date.now() + '-' + Math.random();
      const res = await new Promise(r => {
        this.waiting[reqId] = r;
        this.dispatchEvent(new CustomEvent('need-upload-url', { detail: { reqId, mimeType: file.type, fileName: file.name } }));
        setTimeout(() => { if (this.waiting[reqId]) { delete this.waiting[reqId]; r({ error: 'timeout' }); } }, 20000);
      });
      if (res.error || !res.url) { toast('Upload failed: ' + (res.error || 'no upload link')); return; }
      try {
        const sep = res.url.includes('?') ? '&' : '?';
        const put = await fetch(res.url + sep + 'filename=' + encodeURIComponent(file.name), {
          method: 'PUT', headers: { 'Content-Type': file.type }, body: file
        });
        const j = await put.json();
        const fileUrl = j && j.file && j.file.url;
        if (!fileUrl) throw new Error('no file link returned');
        const title = file.name.replace(/\.[^.]+$/, '').slice(0, 30);
        this.dispatchEvent(new CustomEvent('save-item', {
          detail: { title, kind, mediaType: isImg ? 'image' : isVid ? 'video' : 'audio', url: fileUrl }
        }));
        toast(isVid ? 'Uploaded! Videos can take a few minutes to be ready.' : 'Uploaded!');
      } catch (e) {
        toast('Upload failed: ' + e.message);
      }
    };
    $('#bgFile').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) upload(f, 'bg'); };
    $('#musicFile').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) upload(f, 'music'); };

    // ---------- Timer ----------
    const show = () => {
      const m = String(Math.floor(left / 60)).padStart(2, '0'), s = String(left % 60).padStart(2, '0');
      $('#time').textContent = m + ':' + s;
      $('#mode').textContent = onBreak ? 'Break' : 'Focus';
      $('#stats').innerHTML = `Today: <b>${st.sessions}</b> sessions · <b>${st.minutes}</b> min`;
      document.title = (this.timer ? m + ':' + s + ' · ' : '') + 'Your Room | CW HW';
    };
    const beep = () => { try { const a = new AudioContext(), o = a.createOscillator();
      o.connect(a.destination); o.frequency.value = 660; o.start(); o.stop(a.currentTime + 0.4); } catch (e) {} };
    const stop = () => { clearInterval(this.timer); this.timer = null; $('#start').textContent = 'Start'; };

    $('#start').onclick = () => {
      if (this.timer) { stop(); show(); return; }
      $('#start').textContent = 'Pause';
      this.timer = setInterval(() => {
        left--;
        if (left <= 0) {
          beep();
          if (!onBreak) { st.sessions++; st.minutes += focusMin; save(); }
          onBreak = !onBreak;
          left = (onBreak ? breakMin : focusMin) * 60;
        }
        show();
      }, 1000);
      show();
    };
    $('#reset').onclick = () => { stop(); onBreak = false; left = focusMin * 60; show(); };
    root.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
      root.querySelectorAll('[data-p]').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      [focusMin, breakMin] = b.dataset.p.split(',').map(Number);
      stop(); onBreak = false; left = focusMin * 60; show();
    });

    // Start up
    renderChips(); setBg(bgKey);
    track = Math.max(0, tracks.findIndex(t => t.key === trackKey));
    renderPick(); loadTrack(track, false);
    show();
    if (this.pendingItems) this.applyItems(this.pendingItems);
  }

  disconnectedCallback() {
    clearInterval(this.timer);
    if (this.onVis) document.removeEventListener('visibilitychange', this.onVis);
    if (this.root) {
      const a = this.root.querySelector('audio'); if (a) a.pause();
      this.root.remove(); this.root = null;
    }
    this.applyItems = null;
    document.body.style.overflow = '';
    document.title = 'CW HW';
  }
});