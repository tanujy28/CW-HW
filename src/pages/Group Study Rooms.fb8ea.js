import { getRoomUrl } from 'backend/rooms.web';
import { currentMember } from 'wix-members-frontend';

$w.onReady(function () {
  const rooms = $w('#roomsOverlay');
  rooms.on('need-room', async (e) => {
    const key = e.detail.key;
    const member = await currentMember.getMember();
    if (!member) {
      rooms.setAttribute('room-url', JSON.stringify({ key, error: 'login' }));
      return;
    }
    try {
      const url = await getRoomUrl(key);
      rooms.setAttribute('room-url', JSON.stringify({ key, url }));
    } catch (err) {
      rooms.setAttribute('room-url', JSON.stringify({ key, error: 'failed' }));
    }
  });
});