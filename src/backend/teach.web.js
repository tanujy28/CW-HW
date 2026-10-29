import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember, members as siteMembers } from 'wix-members-backend';
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
    rooms: rooms.map(r => ({ id: r._id, name: r.title, sessionsOnly: !!r.sessionsOnly })),
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

// Choose whether a room is always open or only open during its sessions
export const setRoomMode = webMethod(Permissions.SiteMember, async (spaceId, roomId, sessionsOnly) => {
  await requireTeacher(spaceId);
  spaceId = String(spaceId);
  const room = await wixData.get('ClassRooms', String(roomId), opts);
  if (!room || room.space !== spaceId) throw new Error('Room not found.');
  await wixData.update('ClassRooms', { ...room, sessionsOnly: !!sessionsOnly }, opts);
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

// ---------- Usage report ----------
const IST = 330 * 60000; // report days follow Indian time
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function queryAll(q) {
  let r = await q.limit(1000).find(opts);
  const items = r.items.slice();
  while (r.hasNext() && items.length < 5000) { r = await r.next(); items.push(...r.items); }
  return items;
}

async function namesFor(ids) {
  const out = {};
  if (!ids.length) return out;
  try {
    const r = await siteMembers.queryMembers().hasSome('_id', ids).limit(1000).find({ suppressAuth: true });
    r.items.forEach(x => {
      const p = x.profile || {};
      const c = x.contactDetails || {};
      const n = p.nickname || [c.firstName, c.lastName].filter(Boolean).join(' ');
      if (n) out[x._id] = n;
    });
  } catch (e) { /* fall back to names saved with visits and doubts */ }
  return out;
}

export const usageReport = webMethod(Permissions.SiteMember, async (spaceId, days) => {
  await requireTeacher(spaceId);
  spaceId = String(spaceId);
  days = [7, 30, 90].includes(Number(days)) ? Number(days) : 7;

  const nowMs = Date.now();
  // Start of the first day in the range, Indian time
  const todayIst = Math.floor((nowMs + IST) / 86400000) * 86400000;
  const fromIst = todayIst - (days - 1) * 86400000;
  const since = new Date(fromIst - IST);

  const mem = await queryAll(wixData.query('SpaceMembers').eq('spaceId', spaceId));
  const students = mem.filter(x => x.role !== 'teacher');
  const studentIds = new Set(students.map(x => x.memberId));

  let visits = [];
  let ready = true;
  try {
    visits = await queryAll(wixData.query('ClassVisits').hasSome('space', [spaceId]).ge('start', since));
  } catch (e) { ready = false; }
  visits = visits.filter(v => studentIds.has(v.memberId));

  let doubts = [];
  try {
    doubts = await queryAll(wixData.query('ClassDoubts').hasSome('space', [spaceId]).ge('_createdDate', since));
  } catch (e) { doubts = []; }

  const names = await namesFor([...studentIds]);
  visits.forEach(v => { if (!names[v.memberId] && v.author) names[v.memberId] = v.author; });
  doubts.forEach(d => { if (!names[d.memberId] && d.author) names[d.memberId] = d.author; });

  const mins = v => Math.max(1, Number(v.minutes) || 0);

  // Study minutes per day
  const daily = [];
  for (let i = 0; i < days; i++) {
    const dayStart = fromIst + i * 86400000;
    const d = new Date(dayStart);
    daily.push({
      label: days <= 7 ? WEEK[d.getUTCDay()] : d.getUTCDate() + '/' + (d.getUTCMonth() + 1),
      minutes: 0
    });
  }
  visits.forEach(v => {
    const i = Math.floor((new Date(v.start).getTime() + IST - fromIst) / 86400000);
    if (daily[i]) daily[i].minutes += mins(v);
  });

  // Attendance at each weekly session
  let sessions = [];
  try {
    sessions = await queryAll(wixData.query('ClassSessions').hasSome('space', [spaceId]));
  } catch (e) { sessions = []; }
  const sessionStats = sessions.map(s => {
    const dset = String(s.days || '').split(/[^A-Za-z]+/).map(x => x.slice(0, 3)).filter(Boolean);
    const [h, m] = String(s.startTime || '').split(':').map(Number);
    const counts = [];
    if (!isNaN(h)) {
      for (let i = 0; i < days; i++) {
        const dayStart = fromIst + i * 86400000;
        if (!dset.includes(WEEK[new Date(dayStart).getUTCDay()])) continue;
        const startMs = dayStart + (h * 60 + (m || 0)) * 60000 - IST;
        const endMs = startMs + (Number(s.duration) || 60) * 60000;
        if (startMs > nowMs) continue; // not happened yet
        if (s._createdDate && endMs < new Date(s._createdDate).getTime()) continue; // before it was added
        const who = new Set();
        visits.forEach(v => {
          if (v.room !== s.room) return;
          const a = new Date(v.start).getTime();
          const b = new Date(v.lastSeen || v.start).getTime() + 60000;
          if (a < endMs && b > startMs - 12 * 60000) who.add(v.memberId);
        });
        counts.push(who.size);
      }
    }
    return {
      title: s.title || 'Session',
      held: counts.length,
      avg: counts.length ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length * 10) / 10 : 0,
      last: counts.length ? counts[counts.length - 1] : null
    };
  });

  // Per student
  const rows = students.map(st => {
    const vs = visits.filter(v => v.memberId === st.memberId);
    const last = vs.reduce((a, v) => Math.max(a, new Date(v.lastSeen || v.start).getTime()), 0);
    return {
      name: names[st.memberId] || 'Student',
      joined: st._createdDate,
      visits: vs.length,
      minutes: vs.reduce((a, v) => a + mins(v), 0),
      lastSeen: last ? new Date(last) : null,
      doubts: doubts.filter(d => d.memberId === st.memberId).length
    };
  }).sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));

  const studentDoubts = doubts.filter(d => studentIds.has(d.memberId));
  return {
    ready,
    days,
    studentCount: students.length,
    activeStudents: rows.filter(r => r.visits > 0).length,
    totalMinutes: rows.reduce((a, r) => a + r.minutes, 0),
    visits: visits.length,
    doubtsAsked: studentDoubts.length,
    doubtsAnswered: studentDoubts.filter(d => d.answered).length,
    daily,
    sessions: sessionStats,
    students: rows
  };
});
