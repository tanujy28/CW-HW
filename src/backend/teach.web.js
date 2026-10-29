import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember, members as siteMembers } from 'wix-members-backend';

const opts = { suppressAuth: true };
const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_SESSIONS = 30;
// Video links mentors can use for sessions
const LINK_HOSTS = ['meet.google.com', 'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'zoom.us', 'teams.microsoft.com', 'teams.live.com'];

// The logged-in member must be a mentor ("teacher" role) of this programme
async function requireTeacher(spaceId) {
  const m = await currentMember.getMember();
  if (!m) throw new Error('Please log in first.');
  const r = await wixData.query('SpaceMembers')
    .eq('memberId', m._id).eq('spaceId', String(spaceId)).eq('role', 'teacher').limit(1).find(opts);
  if (!r.items.length) throw new Error("You're not a mentor of this programme.");
  return m;
}

function clean(s, max) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanLink(s) {
  const raw = String(s || '').trim();
  if (!raw) throw new Error('Please paste the Google Meet (or YouTube Live) link for this session.');
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); } catch (e) { u = null; }
  if (u && u.protocol === 'http:') u.protocol = 'https:';
  const host = u ? u.hostname.toLowerCase() : '';
  const ok = u && u.protocol === 'https:' && LINK_HOSTS.some(h => host === h || host.endsWith('.' + h));
  if (!ok) throw new Error('Please use a Google Meet, YouTube, Zoom or Teams link.');
  return u.toString().slice(0, 300);
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
  const sessions = await safeQuery('ClassSessions', 'space', spaceId);
  return {
    spaceId,
    name: space ? space.title : '',
    inviteCode: space ? space.inviteCode || '' : '',
    studentCount: members.items.filter(x => x.role !== 'teacher').length,
    sessionsReady: sessions !== null,
    sessions: (sessions || []).map(s => ({
      id: s._id, title: s.title || '', days: s.days || '', startTime: s.startTime || '',
      duration: s.duration || 60, host: s.host || '', meetLink: s.meetLink || ''
    }))
  };
}

// Programmes the logged-in member mentors
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

  const record = {
    title, space: spaceId, days: days.join(', '),
    startTime, duration, host: clean(s.host, 40), meetLink: cleanLink(s.meetLink)
  };

  if (s.id) {
    const old = await wixData.get('ClassSessions', String(s.id), opts);
    if (!old || old.space !== spaceId) throw new Error('Session not found.');
    await wixData.update('ClassSessions', { ...old, ...record }, opts);
  } else {
    const existing = (await safeQuery('ClassSessions', 'space', spaceId)) || [];
    if (existing.length >= MAX_SESSIONS) throw new Error('A programme can have up to ' + MAX_SESSIONS + ' sessions.');
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

// ---------- Attendance report ----------
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
  } catch (e) { /* fall back to names saved with attendance and doubts */ }
  return out;
}

export const usageReport = webMethod(Permissions.SiteMember, async (spaceId, days) => {
  await requireTeacher(spaceId);
  spaceId = String(spaceId);
  days = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;

  const nowMs = Date.now();
  const todayIst = Math.floor((nowMs + IST) / 86400000) * 86400000;
  const fromIst = todayIst - (days - 1) * 86400000;
  const since = new Date(fromIst - IST);

  const mem = await queryAll(wixData.query('SpaceMembers').eq('spaceId', spaceId));
  const students = mem.filter(x => x.role !== 'teacher');
  const studentIds = new Set(students.map(x => x.memberId));

  // Each "Join" click on a session is saved in ClassVisits with the session id
  let visits = [];
  let ready = true;
  try {
    visits = await queryAll(wixData.query('ClassVisits').hasSome('space', [spaceId]).ge('start', since));
  } catch (e) { ready = false; }
  visits = visits.filter(v => v.session && studentIds.has(v.memberId));

  let doubts = [];
  try {
    doubts = await queryAll(wixData.query('ClassDoubts').hasSome('space', [spaceId]).ge('_createdDate', since));
  } catch (e) { doubts = []; }

  const names = await namesFor([...studentIds]);
  visits.forEach(v => { if (!names[v.memberId] && v.author) names[v.memberId] = v.author; });
  doubts.forEach(d => { if (!names[d.memberId] && d.author) names[d.memberId] = d.author; });

  // Attendance at each session, counted per time it was held
  let sessions = [];
  try {
    sessions = await queryAll(wixData.query('ClassSessions').hasSome('space', [spaceId]));
  } catch (e) { sessions = []; }
  const attendedBy = {}; // memberId -> number of session meetings attended
  let held = 0;
  let attendanceSum = 0;
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
          if (v.session !== s._id) return;
          const t = new Date(v.start).getTime();
          if (t >= startMs - 15 * 60000 && t < endMs) who.add(v.memberId);
        });
        who.forEach(id => { attendedBy[id] = (attendedBy[id] || 0) + 1; });
        counts.push(who.size);
      }
    }
    held += counts.length;
    attendanceSum += counts.reduce((a, b) => a + b, 0);
    return {
      title: s.title || 'Session',
      held: counts.length,
      avg: counts.length ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length * 10) / 10 : 0,
      last: counts.length ? counts[counts.length - 1] : null
    };
  });

  const rows = students.map(st => {
    const vs = visits.filter(v => v.memberId === st.memberId);
    const last = vs.reduce((a, v) => Math.max(a, new Date(v.start).getTime()), 0);
    return {
      name: names[st.memberId] || 'Member',
      joined: st._createdDate,
      attended: attendedBy[st.memberId] || 0,
      lastSeen: last ? new Date(last) : null,
      doubts: doubts.filter(d => d.memberId === st.memberId).length
    };
  }).sort((a, b) => b.attended - a.attended || a.name.localeCompare(b.name));

  const memberDoubts = doubts.filter(d => studentIds.has(d.memberId));
  return {
    ready,
    days,
    studentCount: students.length,
    activeStudents: rows.filter(r => r.attended > 0).length,
    sessionsHeld: held,
    avgAttendance: held ? Math.round(attendanceSum / held * 10) / 10 : 0,
    doubtsAsked: memberDoubts.length,
    doubtsAnswered: memberDoubts.filter(d => d.answered).length,
    sessions: sessionStats,
    students: rows
  };
});
