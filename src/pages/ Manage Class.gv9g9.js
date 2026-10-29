import { myTeaching, classDetails, createRoom, deleteRoom, saveSession, deleteSession, setRoomMode, usageReport } from 'backend/teach.web';

$w.onReady(async function () {
  const box = $w('#manageBox');
  let classes = [];
  let selected = null;
  let last = null;
  let usage = null;
  let usageDays = 7;

  const errText = (e) => (e && e.message ? String(e.message).replace(/^Error:\s*/, '') : 'Something went wrong. Please try again.');
  const send = (extra) => box.setAttribute('data', JSON.stringify({ classes, details: last, usage, ...extra, t: Date.now() }));

  const load = async (spaceId) => {
    selected = spaceId;
    try {
      last = await classDetails(spaceId);
      usage = null;
      send({});
      loadUsage();
    } catch (e) {
      send({ error: errText(e) });
    }
  };

  const loadUsage = async () => {
    const forClass = selected;
    try {
      const u = await usageReport(forClass, usageDays);
      if (forClass !== selected) return;
      usage = u;
      send({});
    } catch (e) {
      usage = { ready: false, days: usageDays };
      send({});
    }
  };

  // Run a teacher action, then refresh the class details
  const run = async (fn, okMessage, extra = {}) => {
    try {
      last = await fn();
      send({ message: okMessage, ...extra });
    } catch (e) {
      send({ error: errText(e) });
    }
  };

  try { classes = await myTeaching(); } catch (e) { classes = []; }
  if (!classes.length) { send({}); return; }
  await load(classes[0].spaceId);

  box.on('select-class', (e) => load(e.detail.spaceId));
  box.on('create-room', (e) => run(() => createRoom(selected, e.detail.name), 'Room created.'));
  box.on('delete-room', (e) => run(() => deleteRoom(selected, e.detail.roomId), 'Room deleted.'));
  box.on('room-mode', (e) => run(() => setRoomMode(selected, e.detail.roomId, e.detail.sessionsOnly),
    e.detail.sessionsOnly ? 'Room now opens only during sessions.' : 'Room is now always open.'));
  box.on('usage-range', (e) => { usageDays = e.detail.days; usage = null; send({}); loadUsage(); });
  box.on('save-session', (e) => run(() => saveSession(selected, e.detail.session), 'Session saved.', { saved: true }));
  box.on('delete-session', (e) => run(() => deleteSession(selected, e.detail.id), 'Session deleted.'));
});
