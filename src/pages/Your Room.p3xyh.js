import { myItems, getUploadUrl, saveItem, deleteItem } from 'backend/roomMedia.web';
import { currentMember } from 'wix-members-frontend';

$w.onReady(async function () {
  const room = $w('#focusRoom');
  const send = (items, extra = {}) =>
    room.setAttribute('items', JSON.stringify({ loggedIn: true, items, t: Date.now(), ...extra }));

  room.on('need-upload-url', async (e) => {
    const { reqId, mimeType, fileName } = e.detail;
    try {
      const url = await getUploadUrl(mimeType, fileName);
      room.setAttribute('upload-url', JSON.stringify({ reqId, url }));
    } catch (err) {
      room.setAttribute('upload-url', JSON.stringify({ reqId, error: String(err.message || err) }));
    }
  });

  room.on('save-item', async (e) => {
    const { title, kind, mediaType, url } = e.detail;
    try { send(await saveItem(title, kind, mediaType, url), { select: url }); }
    catch (err) { send(await myItems(), { error: 'Could not save that file.' }); }
  });

  room.on('delete-item', async (e) => {
    try { send(await deleteItem(e.detail.id)); }
    catch (err) { send(await myItems(), { error: 'Could not remove that file.' }); }
  });

  // Check login and load files at the same time
  const [member, items] = await Promise.all([
    currentMember.getMember().catch(() => null),
    myItems().catch(() => null)
  ]);
  if (!member) room.setAttribute('items', JSON.stringify({ loggedIn: false, items: [] }));
  else if (items) send(items);
  else send([], { error: 'Could not load your files.' });
});
