import { mySpaces, mySessions, joinSession } from 'backend/spaces.web';
import { session } from 'wix-storage-frontend';

// Last-seen programmes for this tab, shown instantly on the next visit (cleared on login/logout in masterPage.js)
const CACHE = 'cwhwCacheProgrammes';

$w.onReady(async function () {
  const box = $w('#classesBox');
  try {
    const saved = session.getItem(CACHE);
    if (saved) box.setAttribute('data', saved);
  } catch (e) { /* no saved copy */ }

  try {
    const [spaces, sessions] = await Promise.all([mySpaces(), mySessions()]);
    const classes = spaces.map(s => ({
      spaceId: s.spaceId,
      name: s.spaceName,
      teacher: s.role === 'teacher',
      sessions: sessions.filter(x => x.spaceId === s.spaceId)
    }));
    const data = JSON.stringify({ classes });
    box.setAttribute('data', data);
    try { session.setItem(CACHE, data); } catch (x) { /* storage full or blocked */ }
  } catch (e) {
    box.setAttribute('data', JSON.stringify({ classes: [], error: 'Could not load your programmes. Please refresh.' }));
  }

  box.on('join-session', async (e) => {
    try {
      const url = await joinSession(e.detail.id);
      box.setAttribute('link', JSON.stringify({ url, t: Date.now() }));
    } catch (err) {
      const text = err && err.message ? String(err.message).replace(/^Error:\s*/, '') : 'Could not open this session.';
      box.setAttribute('link', JSON.stringify({ error: text, t: Date.now() }));
    }
  });
});
