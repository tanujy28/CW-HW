customElements.define('cwhw-join', class extends HTMLElement {
  static get observedAttributes() { return ['result']; }

  attributeChangedCallback(name, oldV, val) {
    if (name !== 'result' || !val || !this.msg) return;
    let d; try { d = JSON.parse(val); } catch (e) { return; }
    this.btn.disabled = false;
    this.btn.textContent = 'Join';
    if (d.message) {
      this.msg.textContent = d.message;
      this.msg.style.color = d.ok ? '#1d6b4f' : '#b3261e';
    }
    if (d.ok && d.joined) {
      this.input.value = '';
      this.msg.innerHTML = '';
      this.msg.append(d.message + ' ');
      const a = document.createElement('a');
      if (d.role === 'teacher') { a.href = '/manage-class'; a.textContent = 'Go to Manage Programme →'; }
      else { a.href = '/my-classes'; a.textContent = 'Go to My Programmes →'; }
      a.style.color = '#2F3E4E'; a.style.fontWeight = '700';
      this.msg.append(a);
    }
    if (d.classes && d.classes.length) {
      this.list.innerHTML = '';
      const h = document.createElement('div');
      h.textContent = 'Your programmes';
      h.className = 'lh';
      this.list.append(h);
      d.classes.forEach(c => {
        const p = document.createElement('span');
        p.className = 'pill';
        p.textContent = c;
        this.list.append(p);
      });
    }
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
cwhw-join .band{box-sizing:border-box;font-family:'Space Grotesk',sans-serif;color:#2F3E4E;padding:48px 24px}
cwhw-join .grid{max-width:1080px;margin:0 auto;display:flex;flex-wrap:wrap;gap:32px;align-items:stretch}
cwhw-join .card{flex:1 1 420px;min-width:0;background:#FDF5EF;border:3px solid #2F3E4E;border-radius:16px;box-shadow:8px 8px 0 #F2B8A2;padding:32px 28px;box-sizing:border-box}
cwhw-join .side{flex:1 1 320px;min-width:0;background:#2F3E4E;color:#fff;border-radius:16px;padding:32px 28px;box-sizing:border-box;display:flex;flex-direction:column;gap:18px}
cwhw-join h2{margin:0 0 8px;font-size:38px;line-height:1.1}
cwhw-join h3{margin:0;font-size:22px}
cwhw-join p{margin:0 0 22px;font-size:17px}
cwhw-join label{display:block;font-weight:700;font-size:14px;margin-bottom:6px}
cwhw-join .row{display:flex;gap:10px;flex-wrap:wrap}
cwhw-join input{flex:1 1 200px;min-width:0;padding:12px 14px;border:2px solid #1d1d1d;border-radius:8px;font:500 17px 'Space Grotesk',sans-serif;text-transform:uppercase;background:#fff;color:#1d1d1d}
cwhw-join input::placeholder{text-transform:none;color:#6b7785}
cwhw-join button{border:2px solid #1d1d1d;border-radius:8px;padding:12px 22px;font:700 16px 'Space Grotesk',sans-serif;cursor:pointer;background:#FFC124;color:#1d1d1d;box-shadow:4px 4px 0 #2F3E4E}
cwhw-join button:active{transform:translate(2px,2px);box-shadow:2px 2px 0 #2F3E4E}
cwhw-join button:disabled{opacity:.6;cursor:default}
cwhw-join .msg{min-height:22px;margin-top:12px;font-size:15px;font-weight:500}
cwhw-join .lh{font-weight:700;font-size:14px;margin:18px 0 6px}
cwhw-join .pill{display:inline-block;background:#fff;border:2px solid #2F3E4E;border-radius:999px;padding:5px 12px;font-size:14px;margin:0 6px 6px 0}
cwhw-join .foot{margin-top:18px;font-size:15px}
cwhw-join .foot a{color:#2F3E4E;font-weight:700}
cwhw-join .item{display:flex;gap:12px;align-items:flex-start}
cwhw-join .ic{flex:0 0 36px;height:36px;border-radius:10px;background:#FFC124;color:#1d1d1d;display:flex;align-items:center;justify-content:center}
cwhw-join .item b{display:block;font-size:16px}
cwhw-join .item span{font-size:15px;color:#dce4ec}
@media (max-width:600px){cwhw-join .band{padding:20px 12px}cwhw-join h2{font-size:30px}cwhw-join .card,cwhw-join .side{padding:22px 18px}cwhw-join .side{display:grid;grid-template-columns:1fr 1fr;gap:12px}cwhw-join .side h3{grid-column:1/-1;font-size:18px}cwhw-join .item span{display:none}cwhw-join .item b{font-size:14px}}
</style>
<div class="band">
 <div class="grid">
  <div class="card">
   <h2>Join a programme</h2>
   <p>Enter the code your mentor gave you.</p>
   <label for="cwhw-code">Programme code</label>
   <div class="row">
    <input id="cwhw-code" placeholder="e.g. SUN-7KQ2-M9X" autocomplete="off" maxlength="30">
    <button type="button" id="cwhw-joinbtn">Join</button>
   </div>
   <div class="msg" id="cwhw-msg" role="status"></div>
   <div id="cwhw-list"></div>
  <div class="foot">No code? Ask your mentor, or study with anyone in our <a href="/general-6">Group Study Rooms →</a></div>
  </div>
  <div class="side">
   <h3>What you get in a programme</h3>
   <div class="item"><div class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="13" height="14" rx="2"></rect><path d="M16 10l5-3v10l-5-3z"></path></svg></div>
    <div><b>Live sessions</b><span>Join your mentor’s sessions right from CWHW.</span></div></div>
   <div class="item"><div class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"></rect><path d="M3 9h18M8 2v4M16 2v4"></path></svg></div>
    <div><b>A fixed weekly schedule</b><span>Know exactly when the next session is.</span></div></div>
   <div class="item"><div class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"></path></svg></div>
    <div><b>Doubts answered</b><span>Ask your mentor and the group anytime.</span></div></div>
   <div class="item"><div class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2M9 2h6"></path></svg></div>
    <div><b>Your Room</b><span>Focus timer, themes and music for solo study.</span></div></div>
  </div>
 </div>
</div>`;

    this.band = this.querySelector('.band');
    this.input = this.querySelector('#cwhw-code');
    this.btn = this.querySelector('#cwhw-joinbtn');
    this.msg = this.querySelector('#cwhw-msg');
    this.list = this.querySelector('#cwhw-list');

    // Make the section span the full page width, wherever Wix places the element
    this.fit = () => {
      this.band.style.width = document.documentElement.clientWidth + 'px';
      this.band.style.marginLeft = '0px';
      const left = this.band.getBoundingClientRect().left;
      this.band.style.marginLeft = (-left) + 'px';
    };
    this.fit();
    setTimeout(this.fit, 500);
    setTimeout(this.fit, 1500);
    window.addEventListener('resize', this.fit);

    const join = () => {
      const code = this.input.value.trim();
      if (!code) { this.msg.textContent = 'Please enter your programme code.'; this.msg.style.color = '#b3261e'; return; }
      this.btn.disabled = true;
      this.btn.textContent = 'Checking…';
      this.msg.textContent = '';
      this.dispatchEvent(new CustomEvent('join', { detail: { code } }));
    };
    this.btn.onclick = join;
    this.input.onkeydown = (e) => { if (e.key === 'Enter') join(); };
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.fit);
  }
});