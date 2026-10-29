import { mySpaces, myRooms, getClassRoom } from 'backend/spaces.web';

$w.onReady(async function () {
  const box = $w('#classesBox');

  try {
    const [spaces, rooms] = await Promise.all([mySpaces(), myRooms()]);
    const classes = spaces.map(s => ({
      name: s.spaceName,
      rooms: rooms.filter(r => r.spaceId === s.spaceId).map(r => ({ id: r.id, name: r.name }))
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
      box.setAttribute('room', JSON.stringify({ error: 'You can\u2019t open this room.', t: Date.now() }));
    }
  });
});