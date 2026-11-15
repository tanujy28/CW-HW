import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';
import { sendConfirmation, reminderFlags } from 'backend/talkEmails';

const opts = { suppressAuth: true };
const IST_MIN = 330;     // talk times are entered in Indian time (IST)
const EARLY_MIN = 15;    // the watch link opens a little before the start
const PAST_DAYS = 60;    // how long past talks (and recordings) stay on the page
const LINK_HOSTS = ['meet.google.com', 'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'zoom.us'];

function clean(s, max) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanLink(s, required) {
  const raw = String(s || '').trim();
  if (!raw) {
    if (required) throw new Error('Please paste the YouTube Live or Google Meet link for this talk.');
    return '';
  }
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); } catch (e) { u = null; }
  if (u && u.protocol === 'http:') u.protocol = 'https:';
  const host = u ? u.hostname.toLowerCase() : '';
  const ok = u && u.protocol === 'https:' && LINK_HOSTS.some(h => host === h || host.endsWith('.' + h));
  if (!ok) throw new Error('Please use a YouTube, Google Meet or Zoom link.');
  return u.toString().slice(0, 300);
}

function endOf(t) {
  return new Date(t.start).getTime() + (Number(t.duration) || 60) * 60000;
}

function isOpen(t, now = Date.now()) {
  return now >= new Date(t.start).getTime() - EARLY_MIN * 60000 && now < endOf(t);
}

async function memberName(m) {
  try {
    const full = await currentMember.getMember({ fieldsets: ['FULL'] });
    const p = (full && full.profile) || {};
    const c = (full && full.contactDetails) || {};
    return String(p.nickname || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Member').slice(0, 40);
  } catch (e) { return 'Member'; }
}

// Mentors of any programme, and site admins, can host talks
async function hostInfo(m) {
  if (!m) return { canHost: false, admin: false };
  // Check site roles and mentor status at the same time
  const [roles, r] = await Promise.all([
    currentMember.getRoles().catch(() => []),
    wixData.query('SpaceMembers').eq('memberId', m._id).eq('role', 'teacher').limit(1).find(opts)
  ]);
  const admin = (roles || []).some(x => /admin|owner/i.test(String(x.title || x.name || x._id || '')));
  return { canHost: admin || r.items.length > 0, admin };
}

async function regsFor(ids) {
  if (!ids.length) return [];
  let r = await wixData.query('TalkRegistrations').hasSome('talkId', ids).limit(1000).find(opts);
  const items = r.items.slice();
  while (r.hasNext() && items.length < 5000) { r = await r.next(); items.push(...r.items); }
  return items;
}

// Everything the Sessions page needs. Live links are never sent here.
async function listing(m) {
  const now = Date.now();
  // Host check runs alongside the talks + registrations lookup
  const [host, found] = await Promise.all([
    hostInfo(m),
    wixData.query('Talks').ge('start', new Date(now - PAST_DAYS * 86400000))
      .ascending('start').limit(100).find(opts)
      .catch(() => null) // Talks not set up yet
      .then(async (res) => res && ({ talks: res.items, regs: await regsFor(res.items.map(t => t._id)) }))
  ]);
  if (!found) {
    return { ready: false, loggedIn: !!m, canHost: host.canHost, talks: [] };
  }
  const { talks, regs } = found;

  const out = talks.filter(t => t.published || (m && (t.createdBy === m._id || host.admin))).map(t => {
    const mine = !!m && (t.createdBy === m._id || host.admin);
    const tr = regs.filter(r => r.talkId === t._id);
    const ended = endOf(t) <= now;
    const seats = Number(t.seats) || 0;
    const item = {
      id: t._id, title: t.title || '', speaker: t.speaker || '', speakerInfo: t.speakerInfo || '',
      description: t.description || '', start: t.start, duration: Number(t.duration) || 60,
      published: !!t.published, ended,
      seats, seatsLeft: seats ? Math.max(0, seats - tr.length) : null,
      registered: !!m && tr.some(r => r.memberId === m._id),
      hasLink: !!t.watchLink,
      recordingLink: ended ? t.recordingLink || '' : '',
      mine
    };
    if (mine) {
      item.registrations = tr.length;
      item.watched = tr.filter(r => r.watchedAt).length;
      item.watchLink = t.watchLink || '';
      item.recordingLinkEdit = t.recordingLink || '';
    }
    return item;
  });
  return { ready: true, loggedIn: !!m, canHost: host.canHost, talks: out };
}

async function getTalk(id) {
  const t = await wixData.get('Talks', String(id), opts).catch(() => null);
  if (!t) throw new Error('That talk was not found.');
  return t;
}

async function register(m, t) {
  const existing = await wixData.query('TalkRegistrations').eq('talkId', t._id).eq('memberId', m._id).limit(1).find(opts);
  if (existing.items.length) return existing.items[0];
  if (!t.published) throw new Error('This talk is not open yet.');
  if (endOf(t) <= Date.now()) throw new Error('This talk has already ended.');
  const seats = Number(t.seats) || 0;
  if (seats) {
    const count = await wixData.query('TalkRegistrations').eq('talkId', t._id).count(opts);
    if (count >= seats) throw new Error('Sorry, this talk is full.');
  }
  const reg = await wixData.insert('TalkRegistrations', {
    title: clean(t.title, 60), talkId: t._id, memberId: m._id, name: await memberName(m),
    ...reminderFlags(t)
  }, opts);
  await sendConfirmation(t, reg);
  return reg;
}

export const listTalks = webMethod(Permissions.Anyone, async () => {
  return listing(await currentMember.getMember());
});

export const registerTalk = webMethod(Permissions.SiteMember, async (id) => {
  const m = await currentMember.getMember();
  if (!m) throw new Error('Please log in to register.');
  await register(m, await getTalk(id));
  return listing(m);
});

export const cancelRegistration = webMethod(Permissions.SiteMember, async (id) => {
  const m = await currentMember.getMember();
  if (!m) throw new Error('Please log in first.');
  const r = await wixData.query('TalkRegistrations').eq('talkId', String(id)).eq('memberId', m._id).find(opts);
  if (r.items.length) await wixData.bulkRemove('TalkRegistrations', r.items.map(x => x._id), opts);
  return listing(m);
});

// Hand out the live link only to registered members, only around talk time (hosts can open it any time)
export const watchTalk = webMethod(Permissions.SiteMember, async (id) => {
  const m = await currentMember.getMember();
  if (!m) throw new Error('Please log in to watch.');
  const t = await getTalk(id);
  const host = await hostInfo(m);
  if (t.createdBy === m._id || host.admin) {
    if (!t.watchLink) throw new Error('Add a watch link to this talk first.');
    return t.watchLink;
  }
  if (!t.published || !t.watchLink) throw new Error('The link for this talk is not ready yet.');
  if (!isOpen(t)) {
    throw new Error(endOf(t) <= Date.now() ? 'This talk has ended.' : 'The link opens ' + EARLY_MIN + ' minutes before the talk starts.');
  }
  const reg = await register(m, t); // walk-ins during the talk are registered on the spot
  if (!reg.watchedAt) {
    try { await wixData.update('TalkRegistrations', { ...reg, watchedAt: new Date() }, opts); } catch (e) { /* best effort */ }
  }
  return t.watchLink;
});

// ---------- Hosting ----------
async function requireHost() {
  const m = await currentMember.getMember();
  if (!m) throw new Error('Please log in first.');
  const host = await hostInfo(m);
  if (!host.canHost) throw new Error('Only mentors can host talks.');
  return { m, host };
}

async function ownTalk(id, m, host) {
  const t = await getTalk(id);
  if (t.createdBy !== m._id && !host.admin) throw new Error('You can only change talks you host.');
  return t;
}

export const saveTalk = webMethod(Permissions.SiteMember, async (t) => {
  const { m, host } = await requireHost();
  t = t || {};

  const title = clean(t.title, 90);
  if (!title) throw new Error('Please give the talk a title.');
  const speaker = clean(t.speaker, 60);
  if (!speaker) throw new Error("Please add the speaker's name.");

  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(t.date || ''));
  const tm = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(t.time || ''));
  if (!dm || !tm) throw new Error('Please pick a date and start time.');
  const start = new Date(Date.UTC(+dm[1], +dm[2] - 1, +dm[3], +tm[1], +tm[2]) - IST_MIN * 60000);

  const duration = Math.round(Number(t.duration));
  if (!(duration >= 15 && duration <= 300)) throw new Error('Length must be between 15 and 300 minutes.');
  const seats = t.seats === '' || t.seats == null ? 0 : Math.round(Number(t.seats));
  if (!(seats >= 0 && seats <= 100000)) throw new Error('Seats must be a number (leave blank for no limit).');

  const record = {
    title, speaker, start, duration, seats,
    speakerInfo: clean(t.speakerInfo, 120),
    description: String(t.description || '').trim().slice(0, 1500),
    watchLink: cleanLink(t.watchLink, true),
    recordingLink: cleanLink(t.recordingLink, false) || null, // URL field: leave empty rather than ''
    published: t.published !== false
  };

  if (t.id) {
    const old = await ownTalk(t.id, m, host);
    if (old.start && new Date(old.start).getTime() !== start.getTime()) {
      // new time: everyone should be reminded again
      const regs = await wixData.query('TalkRegistrations').eq('talkId', old._id).limit(1000).find(opts);
      const flags = reminderFlags({ start });
      if (regs.items.length) await wixData.bulkUpdate('TalkRegistrations', regs.items.map(r => ({ ...r, ...flags })), opts);
    }
    await wixData.update('Talks', { ...old, ...record }, opts);
  } else {
    if (start.getTime() < Date.now()) throw new Error('Please pick a time in the future.');
    await wixData.insert('Talks', { ...record, createdBy: m._id }, opts);
  }
  return listing(m);
});

export const deleteTalk = webMethod(Permissions.SiteMember, async (id) => {
  const { m, host } = await requireHost();
  const t = await ownTalk(id, m, host);
  const regs = await wixData.query('TalkRegistrations').eq('talkId', t._id).limit(1000).find(opts);
  if (regs.items.length) await wixData.bulkRemove('TalkRegistrations', regs.items.map(r => r._id), opts);
  await wixData.remove('Talks', t._id, opts);
  return listing(m);
});
