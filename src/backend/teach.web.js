import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';
import { getSecret } from 'wix-secrets-backend';
import { fetch } from 'wix-fetch';

const opts = { suppressAuth: true };
const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_ROOMS = 10;
const MAX_SESSIONS = 30;

// The logged-in member must be a teacher of this class
async function requireTeacher(spaceId) {
  const m = await currentMember.getMember();
  if (!m) throw new Error('Please log in first.');
  const r = await wixData.query('SpaceMembers')
    .eq('memberId', m._id).eq('spaceId', String(spaceId)).eq('role', 'teacher').limit(1).find(opts);
  if (!r.items.length) throw new Error("You're not a teacher of this class.");
  return m;
}

function clean(s, max) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max);
}

async function safeQuery(collection, field, value) {
  try {
    const r = await wixData.query(collection).hasSome(field, [value]).limit(100).find(opts);
    return r.items;
  } catch (e) {
    return null; // collection not set up yet
  }
}

async function details(spaceId) {
  const space = await wixData.get('Spaces', spaceId, opts);
  const members = await wixData.query('SpaceMembers').eq('spaceId', spaceId).limit(1000).find(opts);
  const rooms = (await safeQuery('ClassRooms', 'space', spaceId)) || [];
  const sessions = await safeQuery('ClassSessions', 'space', spaceId);
  return {
    spaceId,
    name: space ? space.title : '',
    inviteCode: space ? space.inviteCode || '' : '',
    studentCount: members.items.filter(x => x.role !== 'teacher').length,
    rooms: rooms.map(r => ({ id: r._id, name: r.title })),
    sessionsReady: sessions !== null,
    sessions: (sessions || []).map(s => ({
      id: s._id, title: s.title || '', roomId: s.room || '', days: s.days || '',
      startTime: s.startTime || '', duration: s.duration || 60, host: s.host || ''
    }))
  };
}

// Classes the logged-in member teaches
export const myTeaching = webMethod(Permissions.SiteMember, async () => {
  const m = await currentMember.getMember();
  if (!m) return [];
  const r = await wixData.query('SpaceMembers').eq('memberId', m._id).eq('role', 'teacher').find(opts);
  return r.items.map(x => ({ spaceId: x.spaceId, name: x.spaceName }));
});

export const classDetails = webMethod(Permissions.SiteMember, async (spaceId) => {
  await requireTeacher(spaceId);
  return details(String(spaceId));
});

// Create a Whereby room for the class (API key stays on the server)
export const createRoom = webMethod(Permissions.SiteMember, async (spaceId, name) => {
  await requireTeacher(spaceId);
  spaceId = String(spaceId);
  const title = clean(name, 40);
  if (!title) throw new Error('Please give the room a name.');

  const existing = (await safeQuery('ClassRooms', 'space', spaceId)) || [];
  if (existing.length >= MAX_ROOMS) throw new Error('A class can have up to ' + MAX_ROOMS + ' rooms.');

  let key;
  try { key = await getSecret('WHEREBY_API_KEY'); } catch (e) { key = null; }
  if (!key) throw new Error('Room creation is not set up yet. Please contact CWHW.');

  const prefix = title.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'room';
  const res = await fetch('https://api.whereby.dev/v1/meetings', {
    method: 'post',
    headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ endDate: '2099-12-31T00:00:00.000Z', roomMode: 'group', roomNamePrefix: prefix })
  });
  if (!res.ok) throw new Error('Could not create the room right now. Please try again later.');
  const meeting = await res.json();
  if (!meeting.roomUrl) throw new Error('Could not create the room right now. Please try again later.');

  await wixData.insert('ClassRooms', {
    title, space: spaceId, roomUrl: meeting.roomUrl, meetingId: meeting.meetingId || ''
  }, opts);
  return details(spaceId);
});

export const deleteRoom = webMethod(Permissions.SiteMember, async (spaceId, roomId) => {
  await requireTeacher(spaceId);
  spaceId = String(spaceId);
  const room = await wixData.get('ClassRooms', String(roomId), opts);
  if (!room || room.space !== spaceId) throw new Error('Room not found.');

  if (room.meetingId) {
    try {
      const key = await getSecret('WHEREBY_API_KEY');
      await fetch('https://api.whereby.dev/v1/meetings/' + encodeURIComponent(room.meetingId), {
        method: 'delete', headers: { 'Authorization': 'Bearer ' + key }
      });
    } catch (e) { /* the record is still removed below */ }
  }

  // Remove sessions that used this room
  const sessions = (await safeQuery('ClassSessions', 'space', spaceId)) || [];
  const ids = sessions.filter(s => s.room === room._id).map(s => s._id);
  if (ids.length) await wixData.bulkRemove('ClassSessions', ids, opts);

  await wixData.remove('ClassRooms', room._id, opts);
  return details(spaceId);
});

export const saveSession = webMethod(Permissions.SiteMember, async (spaceId, s) => {
  await requireTeacher(spaceId);
  spaceId = String(spaceId);
  s = s || {};

  const title = clean(s.title, 60);
  if (!title) throw new Error('Please give the session a name.');

  const days = DAY_KEYS.filter(d => (s.days || []).includes(d));
  if (!days.length) throw new Error('Please pick at least one day.');

  const startTime = String(s.startTime || '');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) throw new Error('Please pick a start time.');

  const duration = Math.round(Number(s.duration));
  if (!(duration >= 15 && duration <= 300)) throw new Error('Length must be between 15 and 300 minutes.');

  const room = await wixData.get('ClassRooms', String(s.roomId || ''), opts).catch(() => null);
  if (!room || room.space !== spaceId) throw new Error('Please pick a study room.');

  const record = {
    title, space: spaceId, room: room._id, days: days.join(', '),
    startTime, duration, host: clean(s.host, 40)
  };

  if (s.id) {
    const old = await wixData.get('ClassSessions', String(s.id), opts);
    if (!old || old.space !== spaceId) throw new Error('Session not found.');
    await wixData.update('ClassSessions', { ...old, ...record }, opts);
  } else {
    const existing = (await safeQuery('ClassSessions', 'space', spaceId)) || [];
    if (existing.length >= MAX_SESSIONS) throw new Error('A class can have up to ' + MAX_SESSIONS + ' sessions.');
    await wixData.insert('ClassSessions', record, opts);
  }
  return details(spaceId);
});

export const deleteSession = webMethod(Permissions.SiteMember, async (spaceId, id) => {
  await requireTeacher(spaceId);
  spaceId = String(spaceId);
  const old = await wixData.get('ClassSessions', String(id), opts);
  if (!old || old.space !== spaceId) throw new Error('Session not found.');
  await wixData.remove('ClassSessions', old._id, opts);
  return details(spaceId);
});
