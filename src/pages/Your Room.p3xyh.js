import { myItems, getUploadUrl, saveItem, deleteItem } from 'backend/roomMedia.web';
import { currentMember } from 'wix-members-frontend';

$w.onReady(async function () {
  const room = $w('#focusRoom');
  const send = (items, extra = {}) =>
    room.setAttribute('items', JSON.stringify({ loggedIn: true, items, t: Date.now(), ...extra }));

  const member = await currentMember.getMember();
  if (!member) {
    room.setAttribute('items', JSON.stringify({ loggedIn: false, items: [] }));
    return;
  }
  try { send(await myItems()); } catch (e) { send([], { error: 'Could not load your files.' }); }

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
});