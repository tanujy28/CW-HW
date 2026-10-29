import { roomInfo } from 'backend/rooms.web';
import { currentMember } from 'wix-members-frontend';

$w.onReady(function () {
  const rooms = $w('#roomsOverlay');
  rooms.on('need-room', async (e) => {
    const key = e.detail.key;
    const member = await currentMember.getMember();
    if (!member) {
      rooms.setAttribute('room-info', JSON.stringify({ key, error: 'login' }));
      return;
    }
    try {
      const info = await roomInfo(key);
      rooms.setAttribute('room-info', JSON.stringify({ key, ...info }));
    } catch (err) {
      rooms.setAttribute('room-info', JSON.stringify({ key, error: 'failed' }));
    }
  });
});
