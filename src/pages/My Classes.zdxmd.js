import { mySpaces, myRooms, mySessions, getClassRoom } from 'backend/spaces.web';

$w.onReady(async function () {
  const box = $w('#classesBox');

  try {
    const [spaces, rooms, sessions] = await Promise.all([mySpaces(), myRooms(), mySessions()]);
    const classes = spaces.map(s => ({
      spaceId: s.spaceId,
      name: s.spaceName,
      teacher: s.role === 'teacher',
      rooms: rooms.filter(r => r.spaceId === s.spaceId).map(r => ({ id: r.id, name: r.name, sessionsOnly: r.sessionsOnly })),
      sessions: sessions.filter(x => x.spaceId === s.spaceId)
    }));
    box.setAttribute('data', JSON.stringify({ classes }));
  } catch (e) {
    box.setAttribute('data', JSON.stringify({ classes: [], error: 'Could not load your classes. Please refresh.' }));
  }

  box.on('open-room', async (e) => {
    try {
      const url = await getClassRoom(e.detail.id);
      box.setAttribute('room', JSON.stringify({ url, t: Date.now() }));
    } catch (err) {
      const closed = String(err && err.message).includes('closed');
      box.setAttribute('room', JSON.stringify({ error: closed ? 'This room opens only during its study sessions.' : 'You can’t open this room.', t: Date.now() }));
    }
  });
});
