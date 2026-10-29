import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const opts = { suppressAuth: true };

async function memberships(memberId) {
  const r = await wixData.query('SpaceMembers').eq('memberId', memberId).find(opts);
  return r.items.map(m => ({ spaceId: m.spaceId, spaceName: m.spaceName, role: m.role }));
}

// Classes the logged-in member belongs to
export const mySpaces = webMethod(Permissions.SiteMember, async () => {
  const m = await currentMember.getMember();
  if (!m) return [];
  return memberships(m._id);
});

// Join a class with a student code, or as a teacher with a teacher code
export const joinSpace = webMethod(Permissions.SiteMember, async (code) => {
  const m = await currentMember.getMember();
  if (!m) return { ok: false, message: 'Please log in first.' };

  const clean = String(code || '').trim().toUpperCase();
  if (clean.length < 4 || clean.length > 30) return { ok: false, message: 'Please enter a valid class code.' };

  const base = wixData.query('Spaces').eq('active', true);
  const s = await base.eq('inviteCode', clean).or(base.eq('teacherCode', clean)).limit(1).find(opts);
  if (!s.items.length) return { ok: false, message: "That code didn't work. Please check it with your teacher." };
  const space = s.items[0];
  const role = String(space.teacherCode || '').trim().toUpperCase() === clean ? 'teacher' : 'student';

  const existing = await wixData.query('SpaceMembers')
    .eq('memberId', m._id).eq('spaceId', space._id).limit(1).find(opts);

  if (existing.items.length) {
    const cur = existing.items[0];
    if (role === 'teacher' && cur.role !== 'teacher') {
      await wixData.update('SpaceMembers', { ...cur, role: 'teacher' }, opts);
      return { ok: true, role, message: "You're now a teacher of " + space.title + '.', spaceName: space.title };
    }
    return { ok: true, role: cur.role, message: "You're already in " + space.title + '.', spaceName: space.title };
  }

  await wixData.insert('SpaceMembers', {
    memberId: m._id, spaceId: space._id, spaceName: space.title, role
  }, opts);

  return {
    ok: true, role,
    message: role === 'teacher' ? "You've joined " + space.title + ' as a teacher!' : "You've joined " + space.title + '!',
    spaceName: space.title
  };
});

// Rooms of all the classes the member is in (no links sent)
export const myRooms = webMethod(Permissions.SiteMember, async () => {
  const m = await currentMember.getMember();
  if (!m) return [];
  const mem = await memberships(m._id);
  const ids = mem.map(x => x.spaceId);
  if (!ids.length) return [];
  const r = await wixData.query('ClassRooms').hasSome('space', ids).limit(100).find(opts);
  return r.items.map(i => ({ id: i._id, name: i.title, spaceId: i.space }));
});

// Timetable for all of the member's classes
export const mySessions = webMethod(Permissions.SiteMember, async () => {
  const m = await currentMember.getMember();
  if (!m) return [];
  const mem = await memberships(m._id);
  const ids = mem.map(x => x.spaceId);
  if (!ids.length) return [];
  try {
    const r = await wixData.query('ClassSessions').hasSome('space', ids).limit(200).find(opts);
    return r.items.map(i => ({
      title: i.title, spaceId: i.space, roomId: i.room,
      days: i.days || '', startTime: i.startTime || '', duration: i.duration || 60, host: i.host || ''
    }));
  } catch (e) {
    return []; // ClassSessions not set up yet
  }
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
