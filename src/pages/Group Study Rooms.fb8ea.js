import { roomInfo, allRoomsInfo } from 'backend/rooms.web';
import { authentication, currentMember } from 'wix-members-frontend';

// Focus blocks follow Indian time: focus :00–:50 (same rule as backend/discord.js)
const FOCUS_MIN = 50;
const inFocus = () => Math.floor((Date.now() + 330 * 60000) / 60000) % 60 < FOCUS_MIN;
const MAX_AGE = 10 * 60000; // refresh the room details after 10 minutes

// Fetch details for all rooms once, as soon as the page opens, so Join answers instantly
let cache = null; // { at, promise }
function loadRooms() {
  if (cache && Date.now() - cache.at < MAX_AGE) return cache.promise;
  const promise = currentMember.getMember().then((m) => (m ? allRoomsInfo() : { login: true }));
  cache = { at: Date.now(), promise };
  promise.catch(() => { cache = null; });
  return promise;
}

$w.onReady(function () {
  const rooms = $w('#roomsOverlay');
  const send = (d) => rooms.setAttribute('room-info', JSON.stringify(d));
  loadRooms().catch(() => {});
  authentication.onLogin(() => { cache = null; loadRooms().catch(() => {}); });

  rooms.on('need-room', async (e) => {
    const key = e.detail.key;
    try {
      const all = await loadRooms();
      if (all.login) return send({ key, error: 'login' });
      if (all[key]) return send({ key, ...all[key], focus: inFocus() });
      send({ key, ...(await roomInfo(key)) }); // unknown room: ask the backend directly
    } catch (err) {
      send({ key, error: 'failed' });
    }
  });
});
