import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const opts = { suppressAuth: true };

async function memberships(memberId) {
  const r = await wixData.query('SpaceMembers').eq('memberId', memberId).find(opts);
  return r.items.map(m => ({ spaceId: m.spaceId, spaceName: m.spaceName, role: m.role }));
}

// Spaces the logged-in student belongs to
export const mySpaces = webMethod(Permissions.SiteMember, async () => {
  const m = await currentMember.getMember();
  if (!m) return [];
  return memberships(m._id);
});

// Join a space with an invite code
export const joinSpace = webMethod(Permissions.SiteMember, async (code) => {
  const m = await currentMember.getMember();
  if (!m) return { ok: false, message: 'Please log in first.' };

  const clean = String(code || '').trim().toUpperCase();
  if (clean.length < 4 || clean.length > 30) return { ok: false, message: 'Please enter a valid invite code.' };

  const s = await wixData.query('Spaces').eq('inviteCode', clean).eq('active', true).limit(1).find(opts);
if (!s.items.length) return { ok: false, message: "That code didn't work. Please check it with your teacher." };
  const space = s.items[0];

  const existing = await wixData.query('SpaceMembers')
    .eq('memberId', m._id).eq('spaceId', space._id).limit(1).find(opts);
  if (existing.items.length) return { ok: true, message: "You're already in " + space.title + '.', spaceName: space.title };

  await wixData.insert('SpaceMembers', {
    memberId: m._id, spaceId: space._id, spaceName: space.title, role: 'student'
  }, opts);

  return { ok: true, message: "You've joined " + space.title + '!', spaceName: space.title };
});
// Rooms of all the classes the student is in (no links sent)
export const myRooms = webMethod(Permissions.SiteMember, async () => {
  const m = await currentMember.getMember();
  if (!m) return [];
  const mem = await memberships(m._id);
  const ids = mem.map(x => x.spaceId);
  if (!ids.length) return [];
  const r = await wixData.query('ClassRooms').hasSome('space', ids).limit(100).find(opts);
  return r.items.map(i => ({ id: i._id, name: i.title, spaceId: i.space }));
});

// Give a room link only to members of that room's class
export const getClassRoom = webMethod(Permissions.SiteMember, async (roomId) => {
  const m = await currentMember.getMember();
  if (!m) throw new Error('login');
  const room = await wixData.get('ClassRooms', roomId, opts);
  if (!room || !room.roomUrl) throw new Error('not found');
  const ok = await wixData.query('SpaceMembers')
    .eq('memberId', m._id).eq('spaceId', room.space).limit(1).find(opts);
  if (!ok.items.length) throw new Error('not a member');
  return room.roomUrl + '?audio=off&video=off&logo=off';
});