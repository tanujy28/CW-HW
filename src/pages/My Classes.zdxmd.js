import { mySpaces, mySessions, joinSession } from 'backend/spaces.web';

$w.onReady(async function () {
  const box = $w('#classesBox');

  try {
    const [spaces, sessions] = await Promise.all([mySpaces(), mySessions()]);
    const classes = spaces.map(s => ({
      spaceId: s.spaceId,
      name: s.spaceName,
      teacher: s.role === 'teacher',
      sessions: sessions.filter(x => x.spaceId === s.spaceId)
    }));
    box.setAttribute('data', JSON.stringify({ classes }));
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
