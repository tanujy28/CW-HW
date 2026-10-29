import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const opts = { suppressAuth: true };
const MAX_TEXT = 1000;
const PER_HOUR = 15; // posts (doubts + replies) a member can make per hour

function clean(s, max) {
  return String(s == null ? '' : s).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}

async function me() {
  const m = await currentMember.getMember({ fieldsets: ['FULL'] });
  if (!m) throw new Error('Please log in first.');
  const p = m.profile || {};
  const c = m.contactDetails || {};
  const name = p.nickname || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Student';
  return { id: m._id, name: String(name).slice(0, 40) };
}

// The member must belong to this class; returns their role
async function requireMember(memberId, spaceId) {
  const r = await wixData.query('SpaceMembers').eq('memberId', memberId).eq('spaceId', spaceId).limit(1).find(opts);
  if (!r.items.length) throw new Error("You're not in this class.");
  return r.items[0].role || 'student';
}

async function checkRate(memberId) {
  const since = new Date(Date.now() - 3600000);
  const [a, b] = await Promise.all([
    wixData.query('ClassDoubts').eq('memberId', memberId).gt('_createdDate', since).count(opts),
    wixData.query('ClassReplies').eq('memberId', memberId).gt('_createdDate', since).count(opts)
  ]);
  if (a + b >= PER_HOUR) throw new Error('You are posting too fast. Please wait a little.');
}

async function board(user, spaceId) {
  const role = await requireMember(user.id, spaceId);
  const space = await wixData.get('Spaces', spaceId, opts);
  let doubts = [];
  let replies = [];
  let ready = true;
  try {
    const d = await wixData.query('ClassDoubts').hasSome('space', [spaceId]).descending('_createdDate').limit(60).find(opts);
    doubts = d.items;
    if (doubts.length) {
      const r = await wixData.query('ClassReplies').hasSome('doubt', doubts.map(x => x._id)).ascending('_createdDate').limit(1000).find(opts);
      replies = r.items;
    }
  } catch (e) {
    ready = false; // collections not set up yet
  }
  const isTeacher = role === 'teacher';
  return {
    spaceId,
    name: space ? space.title : '',
    isTeacher,
    ready,
    doubts: doubts.map(d => ({
      id: d._id,
      text: d.text || '',
      subject: d.subject || '',
      author: d.author || 'Student',
      byTeacher: !!d.byTeacher,
      mine: d.memberId === user.id,
      canEdit: d.memberId === user.id || isTeacher,
      answered: !!d.answered,
      at: d._createdDate,
      replies: replies.filter(r => r.doubt === d._id).map(r => ({
        id: r._id,
        text: r.text || '',
        author: r.author || 'Student',
        teacher: !!r.byTeacher,
        canDelete: r.memberId === user.id || isTeacher,
        at: r._createdDate
      }))
    }))
  };
}

async function doubtIn(spaceId, doubtId) {
  const d = await wixData.get('ClassDoubts', String(doubtId), opts).catch(() => null);
  if (!d || d.space !== spaceId) throw new Error('This doubt was not found. It may have been deleted.');
  return d;
}

// Classes the member is in
export const myDoubtClasses = webMethod(Permissions.SiteMember, async () => {
  const m = await currentMember.getMember();
  if (!m) return [];
  const r = await wixData.query('SpaceMembers').eq('memberId', m._id).find(opts);
  return r.items.map(x => ({ spaceId: x.spaceId, name: x.spaceName }));
});

export const getBoard = webMethod(Permissions.SiteMember, async (spaceId) => {
  const user = await me();
  return board(user, String(spaceId));
});

export const askDoubt = webMethod(Permissions.SiteMember, async (spaceId, q) => {
  const user = await me();
  spaceId = String(spaceId);
  const role = await requireMember(user.id, spaceId);
  q = q || {};
  const text = clean(q.text, MAX_TEXT);
  if (text.length < 5) throw new Error('Please write your doubt in a bit more detail.');
  await checkRate(user.id);
  await wixData.insert('ClassDoubts', {
    title: text.slice(0, 80),
    space: spaceId,
    memberId: user.id,
    author: user.name,
    byTeacher: role === 'teacher',
    text,
    subject: clean(q.subject, 30),
    answered: false
  }, opts);
  return board(user, spaceId);
});

export const replyDoubt = webMethod(Permissions.SiteMember, async (spaceId, doubtId, text) => {
  const user = await me();
  spaceId = String(spaceId);
  const role = await requireMember(user.id, spaceId);
  const d = await doubtIn(spaceId, doubtId);
  text = clean(text, MAX_TEXT);
  if (text.length < 1) throw new Error('Please write a reply.');
  await checkRate(user.id);
  await wixData.insert('ClassReplies', {
    title: text.slice(0, 80),
    doubt: d._id,
    space: spaceId,
    memberId: user.id,
    author: user.name,
    byTeacher: role === 'teacher',
    text
  }, opts);
  // A teacher's reply marks the doubt as answered
  if (role === 'teacher' && !d.answered) await wixData.update('ClassDoubts', { ...d, answered: true }, opts);
  return board(user, spaceId);
});

export const setAnswered = webMethod(Permissions.SiteMember, async (spaceId, doubtId, value) => {
  const user = await me();
  spaceId = String(spaceId);
  const role = await requireMember(user.id, spaceId);
  const d = await doubtIn(spaceId, doubtId);
  if (d.memberId !== user.id && role !== 'teacher') throw new Error('Only the person who asked or the teacher can do this.');
  await wixData.update('ClassDoubts', { ...d, answered: !!value }, opts);
  return board(user, spaceId);
});

export const deleteDoubt = webMethod(Permissions.SiteMember, async (spaceId, doubtId) => {
  const user = await me();
  spaceId = String(spaceId);
  const role = await requireMember(user.id, spaceId);
  const d = await doubtIn(spaceId, doubtId);
  if (d.memberId !== user.id && role !== 'teacher') throw new Error('Only the person who asked or the teacher can delete this.');
  const r = await wixData.query('ClassReplies').hasSome('doubt', [d._id]).limit(1000).find(opts);
  if (r.items.length) await wixData.bulkRemove('ClassReplies', r.items.map(x => x._id), opts);
  await wixData.remove('ClassDoubts', d._id, opts);
  return board(user, spaceId);
});

export const deleteReply = webMethod(Permissions.SiteMember, async (spaceId, replyId) => {
  const user = await me();
  spaceId = String(spaceId);
  const role = await requireMember(user.id, spaceId);
  const r = await wixData.get('ClassReplies', String(replyId), opts).catch(() => null);
  if (!r || r.space !== spaceId) throw new Error('Reply not found.');
  if (r.memberId !== user.id && role !== 'teacher') throw new Error('Only the person who wrote it or the teacher can delete this.');
  await wixData.remove('ClassReplies', r._id, opts);
  return board(user, spaceId);
});
