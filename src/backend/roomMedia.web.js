import { Permissions, webMethod } from 'wix-web-module';
import { files } from 'wix-media.v2';
import { elevate } from 'wix-auth';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const COLL = 'MyRoomMedia';

async function listMine() {
  const m = await currentMember.getMember();
  if (!m) return [];
  const r = await wixData.query(COLL).eq('_owner', m._id).limit(100).find();
  return r.items.map(i => ({ id: i._id, title: i.title, kind: i.kind, mediaType: i.mediaType, url: i.url }));
}

export const myItems = webMethod(Permissions.SiteMember, listMine);

export const getUploadUrl = webMethod(Permissions.SiteMember, async (mimeType, fileName) => {
  if (!/^(image|video|audio)\//.test(mimeType)) throw new Error('File type not allowed');
  const generate = elevate(files.generateFileUploadUrl);
  const res = await generate(mimeType, { fileName: String(fileName).slice(0, 80) });
  return res.uploadUrl;
});

export const saveItem = webMethod(Permissions.SiteMember, async (title, kind, mediaType, url) => {
  if (!['bg', 'music'].includes(kind) || !['image', 'video', 'audio'].includes(mediaType)) throw new Error('Bad item');
  if (!/^https:\/\//.test(url)) throw new Error('Bad link');
  await wixData.insert(COLL, { title: String(title).slice(0, 40), kind, mediaType, url });
  return listMine();
});

export const deleteItem = webMethod(Permissions.SiteMember, async (id) => {
  await wixData.remove(COLL, id);
  return listMine();
});