function ago(at) {
  const s = Math.max(0, (Date.now() - new Date(at).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' hr ago';
  const d = Math.floor(s / 86400);
  if (d < 7) return d + (d === 1 ? ' day ago' : ' days ago');
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

customElements.define('cwhw-doubts', class extends HTMLElement {
  static get observedAttributes() { return ['data']; }

  attributeChangedCallback(name, oldV, val) {
    if (name !== 'data' || !val) return;
    let d; try { d = JSON.parse(val); } catch (e) { return; }
    if (d.board) this.board = d.board;
    if (d.sent) this.clearDraft = d.sent;
    this.data = d;
    this.busy = false;
    if (this.ready) this.render();
  }

  connectedCallback() {
    if (this.ready) return;
    this.ready = true;
    this.filter = 'all';
    this.open = {};
    if (!document.getElementById('cwhw-font')) {
      const l = document.createElement('link');
      l.id = 'cwhw-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap';
      document.head.appendChild(l);
    }
    this.style.display = 'block';
    this.innerHTML = `<style>
cwhw-doubts .band{box-sizing:border-box;font-family:'Space Grotesk',sans-serif;color:#2F3E4E;padding:40px 24px}
cwhw-doubts .inner{max-width:860px;margin:0 auto}
cwhw-doubts .head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin-bottom:6px}
cwhw-doubts h2{margin:0;font-size:38px}
cwhw-doubts .sub{margin:0 0 20px;font-size:16px;color:#4a5866}
cwhw-doubts .card{background:#FDF5EF;border:3px solid #2F3E4E;border-radius:16px;box-shadow:6px 6px 0 #F2B8A2;padding:20px;box-sizing:border-box;margin-bottom:18px}
cwhw-doubts textarea,cwhw-doubts input,cwhw-doubts select{width:100%;box-sizing:border-box;padding:10px 12px;border:2px solid #1d1d1d;border-radius:8px;font:500 15px 'Space Grotesk',sans-serif;background:#fff;color:#1d1d1d}
cwhw-doubts textarea{resize:vertical;min-height:84px}
cwhw-doubts .askrow{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
cwhw-doubts .askrow input{flex:1 1 180px;width:auto}
cwhw-doubts .btn,cwhw-doubts .btn2,cwhw-doubts .lnk{border:2px solid #1d1d1d;border-radius:8px;padding:9px 16px;font:700 15px 'Space Grotesk',sans-serif;cursor:pointer;color:#1d1d1d;white-space:nowrap}
cwhw-doubts .btn{background:#FFC124;box-shadow:3px 3px 0 #2F3E4E}
cwhw-doubts .btn2{background:#fff}
cwhw-doubts .lnk{background:none;border:0;padding:4px 2px;text-decoration:underline;font-weight:500;font-size:14px}
cwhw-doubts .lnk.del{color:#b3261e}
cwhw-doubts button:disabled{opacity:.6;cursor:default}
cwhw-doubts .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 14px}
cwhw-doubts .tab{border:2px solid #2F3E4E;border-radius:999px;padding:6px 14px;font:700 14px 'Space Grotesk',sans-serif;background:#fff;color:#2F3E4E;cursor:pointer}
cwhw-doubts .tab.on{background:#2F3E4E;color:#fff}
cwhw-doubts .q{background:#fff;border:2px solid #2F3E4E;border-radius:12px;padding:14px 16px;margin-bottom:12px}
cwhw-doubts .meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-size:13px;color:#4a5866;margin-bottom:6px}
cwhw-doubts .meta b{color:#2F3E4E;font-size:14px}
cwhw-doubts .tag{font-size:12px;font-weight:700;padding:2px 9px;border-radius:999px;background:#e9eef2;color:#2F3E4E}
cwhw-doubts .tag.ok{background:#d9f2e6;color:#1d6b4f}
cwhw-doubts .tag.open{background:#ffe9b3;color:#7a5200}
cwhw-doubts .tag.t{background:#2F3E4E;color:#fff}
cwhw-doubts .txt{white-space:pre-wrap;word-break:break-word;font-size:16px;line-height:1.45;margin:0}
cwhw-doubts .acts{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:8px;align-items:center}
cwhw-doubts .replies{margin-top:10px;border-left:3px solid #F2B8A2;padding-left:12px}
cwhw-doubts .rep{padding:8px 0;border-bottom:1px solid #eadfd6}
cwhw-doubts .rep:last-child{border-bottom:0}
cwhw-doubts .rep.t{background:#f3f7fa;border-radius:8px;padding:8px 10px;border-bottom:0;margin:4px 0}
cwhw-doubts .reply{display:flex;gap:8px;margin-top:10px}
cwhw-doubts .reply input{flex:1;width:auto}
cwhw-doubts .muted{font-size:15px;color:#4a5866;margin:0}
cwhw-doubts .msg{min-height:22px;font-size:15px;font-weight:700;margin-bottom:10px}
cwhw-doubts .empty{text-align:center;padding:30px 16px}
cwhw-doubts a.btn{display:inline-block;text-decoration:none}
cwhw-doubts .back{font-size:14px;font-weight:700;color:#2F3E4E}
@media (max-width:600px){cwhw-doubts .band{padding:20px 12px}cwhw-doubts h2{font-size:30px}}
</style>
<div class="band"><div class="inner">
 <a class="back" href="/my-classes">← My Programmes</a>
 <div class="head"><h2>Programme Doubts</h2><div id="picker"></div></div>
 <p class="sub" id="sub">Ask your mentor and the group. Only members can see this.</p>
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
    // Check for new doubts and replies every minute, unless the user is typing
    this.tick = setInterval(() => {
      if (!this.board || this.busy || this.typing()) return;
      this.dispatchEvent(new CustomEvent('refresh', { detail: { spaceId: this.board.spaceId } }));
    }, 60000);
    if (this.data) this.render();
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.fit);
    clearInterval(this.tick);
  }

  typing() {
    return [...this.querySelectorAll('textarea, input')].some(x => x.value.trim());
  }

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
    m.textContent = 'Sending…'; m.style.color = '#4a5866';
    this.dispatchEvent(new CustomEvent(type, { detail: { spaceId: this.board && this.board.spaceId, ...detail } }));
  }

  // Keep what the user typed when the list re-renders
  drafts() {
    const out = {};
    this.querySelectorAll('[data-draft]').forEach(x => { out[x.dataset.draft] = x.value; });
    return out;
  }

  render() {
    const d = this.data || {};
    const keep = this.drafts();
    if (this.clearDraft) { delete keep[this.clearDraft]; if (this.clearDraft === 'ask') delete keep.subject; this.clearDraft = null; }

    const msg = this.querySelector('#msg');
    msg.textContent = d.error || d.message || '';
    msg.style.color = d.error ? '#b3261e' : '#1d6b4f';

    const classes = d.classes || [];
    const picker = this.querySelector('#picker');
    picker.innerHTML = '';
    if (classes.length > 1) {
      const sel = this.el('select');
      sel.setAttribute('aria-label', 'Choose a programme');
      classes.forEach(c => {
        const o = this.el('option', null, c.name); o.value = c.spaceId;
        if (this.board && c.spaceId === this.board.spaceId) o.selected = true;
        sel.append(o);
      });
      sel.onchange = () => { this.open = {}; this.send('select-class', { spaceId: sel.value }); };
      picker.append(sel);
    }

    const body = this.querySelector('#body');
    body.innerHTML = '';
    if (!classes.length) {
      const e = this.el('div', 'card empty');
      e.append(this.el('h3', null, 'Join a programme to ask doubts'));
      e.append(this.el('p', 'muted', 'Ask your mentor for a programme code.'));
      const a = this.el('a', 'btn', 'Join a programme'); a.href = '/join'; a.style.marginTop = '14px';
      e.append(a);
      body.append(e);
      return;
    }
    const b = this.board;
    if (!b) { if (!d.error) body.append(this.el('p', 'muted', 'Loading…')); return; }
    this.querySelector('#sub').textContent = b.name + ' · Ask your mentor and the group. Only members can see this.';
    if (!b.ready) { body.append(this.el('p', 'muted', 'The doubts board for this programme isn’t set up yet.')); return; }

    // Ask box
    const ask = this.el('div', 'card');
    const ta = this.el('textarea');
    ta.placeholder = 'What’s your doubt? Write the question fully so others can help.';
    ta.maxLength = 1000; ta.dataset.draft = 'ask';
    ta.setAttribute('aria-label', 'Your doubt');
    ta.value = keep.ask || '';
    const row = this.el('div', 'askrow');
    const subj = this.el('input');
    subj.placeholder = 'Subject or chapter (optional)'; subj.maxLength = 30; subj.dataset.draft = 'subject';
    subj.setAttribute('aria-label', 'Subject');
    subj.value = keep.subject || '';
    const go = this.button('Ask doubt', 'btn', () => {
      if (ta.value.trim().length < 5) { ta.focus(); return; }
      this.send('ask', { text: ta.value, subject: subj.value });
    });
    row.append(subj, go);
    ask.append(ta, row);
    body.append(ask);

    // Filters
    const tabs = this.el('div', 'tabs');
    const open = b.doubts.filter(x => !x.answered).length;
    [['all', 'All'], ['open', 'Unanswered (' + open + ')'], ['mine', 'My doubts']].forEach(([k, t]) => {
      const tb = this.el('button', 'tab' + (this.filter === k ? ' on' : ''), t);
      tb.type = 'button';
      tb.onclick = () => { this.filter = k; this.render(); };
      tabs.append(tb);
    });
    body.append(tabs);

    const list = b.doubts.filter(x => this.filter === 'all' || (this.filter === 'open' ? !x.answered : x.mine));
    if (!list.length) {
      body.append(this.el('p', 'muted', this.filter === 'all' ? 'No doubts yet. Be the first to ask!' : 'Nothing here.'));
      return;
    }

    list.forEach(q => {
      const c = this.el('div', 'q');
      const meta = this.el('div', 'meta');
      meta.append(this.el('b', null, q.mine ? 'You' : q.author));
      if (q.byTeacher) meta.append(this.el('span', 'tag t', 'Mentor'));
      meta.append(this.el('span', null, ago(q.at)));
      if (q.subject) meta.append(this.el('span', 'tag', q.subject));
      meta.append(this.el('span', q.answered ? 'tag ok' : 'tag open', q.answered ? 'Answered' : 'Unanswered'));
      c.append(meta, this.el('p', 'txt', q.text));

      const acts = this.el('div', 'acts');
      const n = q.replies.length;
      const shown = this.open[q.id] || n <= 2;
      if (n > 2) {
        acts.append(this.button(shown ? 'Hide replies' : 'Show ' + n + ' replies', 'lnk', () => {
          this.open[q.id] = !this.open[q.id]; this.render();
        }));
        acts.lastChild.disabled = false;
      }
      if (q.canEdit) {
        acts.append(this.button(q.answered ? 'Mark unanswered' : 'Mark answered', 'lnk', () => this.send('answered', { doubtId: q.id, value: !q.answered })));
        acts.append(this.button('Delete', 'lnk del', () => {
          if (confirm('Delete this doubt and its replies?')) this.send('delete-doubt', { doubtId: q.id });
        }));
      }
      if (acts.children.length) c.append(acts);

      if (n && shown) {
        const reps = this.el('div', 'replies');
        q.replies.forEach(r => {
          const rp = this.el('div', 'rep' + (r.teacher ? ' t' : ''));
          const rm = this.el('div', 'meta');
          rm.append(this.el('b', null, r.author));
          if (r.teacher) rm.append(this.el('span', 'tag t', 'Mentor'));
          rm.append(this.el('span', null, ago(r.at)));
          if (r.canDelete) rm.append(this.button('Delete', 'lnk del', () => {
            if (confirm('Delete this reply?')) this.send('delete-reply', { replyId: r.id });
          }));
          rp.append(rm, this.el('p', 'txt', r.text));
          reps.append(rp);
        });
        c.append(reps);
      }

      const rr = this.el('div', 'reply');
      const ri = this.el('input');
      ri.placeholder = b.isTeacher ? 'Answer this doubt…' : 'Reply or help out…';
      ri.maxLength = 1000; ri.dataset.draft = 'r-' + q.id;
      ri.setAttribute('aria-label', 'Reply');
      ri.value = keep['r-' + q.id] || '';
      const rb = this.button('Reply', 'btn2', () => {
        if (!ri.value.trim()) { ri.focus(); return; }
        this.open[q.id] = true;
        this.send('reply', { doubtId: q.id, text: ri.value });
      });
      ri.onkeydown = (e) => { if (e.key === 'Enter') rb.click(); };
      rr.append(ri, rb);
      c.append(rr);
      body.append(c);
    });
  }
});
