import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const opts = { suppressAuth: true };
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const TZ_OFFSET_MIN = 330; // session times are in Indian time (IST)
const EARLY_MIN = 15;      // members can join a little before the start

// Is any of these sessions running right now (or about to start)?
function anyLive(sessions) {
  const now = new Date(Date.now() + TZ_OFFSET_MIN * 60000); // read with getUTC* = IST clock
  return sessions.some(s => {
    const days = String(s.days || '').toLowerCase().split(/[^a-z]+/).map(x => DAYS.indexOf(x.slice(0, 3))).filter(i => i >= 0);
    const [h, m] = String(s.startTime || '').split(':').map(Number);
    if (!days.length || isNaN(h)) return false;
    return [-1, 0].some(k => {
      const d = new Date(now.getTime() + k * 86400000);
      if (!days.includes(d.getUTCDay())) return false;
      d.setUTCHours(h, m || 0, 0, 0);
      const start = d.getTime() - EARLY_MIN * 60000;
      const end = d.getTime() + (Number(s.duration) || 60) * 60000;
      return now.getTime() >= start && now.getTime() < end;
    });
  });
}

async function memberships(memberId) {
  const r = await wixData.query('SpaceMembers').eq('memberId', memberId).find(opts);
  return r.items.map(m => ({ spaceId: m.spaceId, spaceName: m.spaceName, role: m.role }));
}

// Programmes the logged-in member belongs to
export const mySpaces = webMethod(Permissions.SiteMember, async () => {
  const m = await currentMember.getMember();
  if (!m) return [];
  return memberships(m._id);
});

// Join a programme with a member code, or as a mentor with a mentor code
export const joinSpace = webMethod(Permissions.SiteMember, async (code) => {
  const m = await currentMember.getMember();
  if (!m) return { ok: false, message: 'Please log in first.' };

  const clean = String(code || '').trim().toUpperCase();
  if (clean.length < 4 || clean.length > 30) return { ok: false, message: 'Please enter a valid programme code.' };

  const base = wixData.query('Spaces').eq('active', true);
  const s = await base.eq('inviteCode', clean).or(base.eq('teacherCode', clean)).limit(1).find(opts);
  if (!s.items.length) return { ok: false, message: "That code didn't work. Please check it with your mentor." };
  const space = s.items[0];
  const role = String(space.teacherCode || '').trim().toUpperCase() === clean ? 'teacher' : 'student';

  const existing = await wixData.query('SpaceMembers')
    .eq('memberId', m._id).eq('spaceId', space._id).limit(1).find(opts);

  if (existing.items.length) {
    const cur = existing.items[0];
    if (role === 'teacher' && cur.role !== 'teacher') {
      await wixData.update('SpaceMembers', { ...cur, role: 'teacher' }, opts);
      return { ok: true, role, message: "You're now a mentor of " + space.title + '.', spaceName: space.title };
    }
    return { ok: true, role: cur.role, message: "You're already in " + space.title + '.', spaceName: space.title };
  }

  await wixData.insert('SpaceMembers', {
    memberId: m._id, spaceId: space._id, spaceName: space.title, role
  }, opts);

  return {
    ok: true, role,
    message: role === 'teacher' ? "You've joined " + space.title + ' as a mentor!' : "You've joined " + space.title + '!',
    spaceName: space.title
  };
});

// Timetable for all of the member's programmes (links are not sent here)
export const mySessions = webMethod(Permissions.SiteMember, async () => {
  const m = await currentMember.getMember();
  if (!m) return [];
  const mem = await memberships(m._id);
  const ids = mem.map(x => x.spaceId);
  if (!ids.length) return [];
  try {
    const r = await wixData.query('ClassSessions').hasSome('space', ids).limit(200).find(opts);
    return r.items.map(i => ({
      id: i._id, title: i.title, spaceId: i.space,
      days: i.days || '', startTime: i.startTime || '', duration: i.duration || 60, host: i.host || '',
      hasLink: !!i.meetLink
    }));
  } catch (e) {
    return []; // ClassSessions not set up yet
  }
});

// Give the session's Meet link only to members, only around session time, and note attendance
export const joinSession = webMethod(Permissions.SiteMember, async (sessionId) => {
  const m = await currentMember.getMember();
  if (!m) throw new Error('Please log in first.');
  const s = await wixData.get('ClassSessions', String(sessionId), opts).catch(() => null);
  if (!s || !s.meetLink) throw new Error('This session has no link yet. Please ask your mentor.');
  const mem = await wixData.query('SpaceMembers').eq('memberId', m._id).eq('spaceId', s.space).limit(1).find(opts);
  if (!mem.items.length) throw new Error("You're not in this programme.");
  const isMentor = mem.items[0].role === 'teacher';
  if (!isMentor && !anyLive([s])) throw new Error('This session opens 15 minutes before it starts.');

  if (!isMentor) {
    try {
      const full = await currentMember.getMember({ fieldsets: ['FULL'] });
      const p = (full && full.profile) || {};
      const c = (full && full.contactDetails) || {};
      await wixData.insert('ClassVisits', {
        title: s.title || 'Session',
        space: s.space, session: s._id, memberId: m._id,
        author: String(p.nickname || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Member').slice(0, 40),
        teacher: false, start: new Date()
      }, opts);
    } catch (e) { /* attendance is best effort */ }
  }
  return s.meetLink;
});
