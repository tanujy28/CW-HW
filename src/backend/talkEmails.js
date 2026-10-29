import wixData from 'wix-data';
import { triggeredEmails } from 'wix-crm-backend';

// Triggered Email IDs from Dashboard → Developer Tools → Triggered Emails.
// Leave blank to switch that email off. Both templates get these variables:
// name, talkTitle, speaker, when, link
export const CONFIRM_EMAIL_ID = '';
export const REMINDER_EMAIL_ID = '';
export const TALKS_PAGE_URL = 'https://www.cwhw.in/sessions';

const opts = { suppressAuth: true };
const IST = 330 * 60000; // talk times are shown in Indian time (IST) in emails
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_BEFORE_MS = 24 * 3600000;
const SOON_MS = 75 * 60000; // the job runs hourly, so "starting soon" goes out 15–75 minutes before

// "Sat, 2 Nov · 6:00 pm IST"
export function istText(date) {
  const d = new Date(new Date(date).getTime() + IST);
  let h = d.getUTCHours(); const m = String(d.getUTCMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
  return WEEK[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' · ' + h + ':' + m + ' ' + ap + ' IST';
}

async function send(templateId, memberId, talk, name, when) {
  if (!templateId) return false;
  await triggeredEmails.emailMember(templateId, memberId, {
    variables: {
      name: String(name || 'there'),
      talkTitle: String(talk.title || 'Mentor talk'),
      speaker: String(talk.speaker || 'a CWHW mentor'),
      when: String(when),
      link: TALKS_PAGE_URL
    }
  });
  return true;
}

export async function sendConfirmation(talk, reg) {
  try { await send(CONFIRM_EMAIL_ID, reg.memberId, talk, reg.name, istText(talk.start)); }
  catch (e) { console.error('Talk confirmation email failed', e); }
}

// Flags to save on a new registration so people who sign up late don't get a reminder they no longer need
export function reminderFlags(talk, now = Date.now()) {
  const ms = new Date(talk.start).getTime() - now;
  return { reminded24: ms <= DAY_BEFORE_MS, reminded1: ms <= SOON_MS };
}

// Runs every hour from jobs.config: a day-before reminder and a starting-soon reminder
export async function sendTalkReminders() {
  if (!REMINDER_EMAIL_ID) return;
  const now = Date.now();
  const talks = await wixData.query('Talks').eq('published', true)
    .gt('start', new Date(now)).le('start', new Date(now + DAY_BEFORE_MS)).limit(50).find(opts);

  for (const talk of talks.items) {
    const ms = new Date(talk.start).getTime() - now;
    const soon = ms <= SOON_MS;
    const flag = soon ? 'reminded1' : 'reminded24';
    const when = soon ? 'in ' + Math.max(1, Math.round(ms / 60000)) + ' minutes (' + istText(talk.start) + ')' : istText(talk.start);

    const regs = await wixData.query('TalkRegistrations').eq('talkId', talk._id).ne(flag, true).limit(500).find(opts);
    const done = [];
    for (const r of regs.items) {
      try {
        await send(REMINDER_EMAIL_ID, r.memberId, talk, r.name, when);
        // a starting-soon reminder also covers the day-before one
        done.push(soon ? { ...r, reminded1: true, reminded24: true } : { ...r, reminded24: true });
      } catch (e) { console.error('Talk reminder failed', r._id, e); }
    }
    if (done.length) await wixData.bulkUpdate('TalkRegistrations', done, opts);
  }
}
