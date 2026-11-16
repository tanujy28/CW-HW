import { listTalks, registerTalk, cancelRegistration, watchTalk, saveTalk, deleteTalk } from 'backend/talks.web';
import { authentication } from 'wix-members-frontend';
import { session } from 'wix-storage-frontend';

// Last-seen talks for this tab, shown instantly on the next visit (cleared on login/logout in masterPage.js)
const CACHE = 'cwhwCacheTalks';

// Page code for the Sessions page. Call it from the page's onReady with the cwhw-talks element.
export async function initSessions(box) {
  let last = null;
  const errText = (e) => (e && e.message ? String(e.message).replace(/^Error:\s*/, '') : 'Something went wrong. Please try again.');
  const send = (extra) => box.setAttribute('data', JSON.stringify({ ...(last || {}), ...extra, t: Date.now() }));

  const load = async () => {
    try {
      last = await listTalks();
      send({});
      try { session.setItem(CACHE, JSON.stringify(last)); } catch (x) { /* storage full or blocked */ }
    }
    catch (e) { send({ talks: [], error: 'Could not load talks. Please refresh.' }); }
  };

  const run = async (fn, okMessage, extra = {}) => {
    try { last = await fn(); send({ message: okMessage, ...extra }); }
    catch (e) { send({ error: errText(e) }); }
  };

  authentication.onLogin(load);

  try {
    const saved = session.getItem(CACHE);
    if (saved) { last = JSON.parse(saved); send({}); }
  } catch (e) { /* no saved copy */ }

  box.on('login', () => authentication.promptLogin().catch(() => {}));
  box.on('register-talk', (e) => run(() => registerTalk(e.detail.id), "You're registered! We'll email you a reminder."));
  box.on('cancel-registration', (e) => run(() => cancelRegistration(e.detail.id), 'Registration cancelled.'));
  box.on('save-talk', (e) => run(() => saveTalk(e.detail.talk), 'Talk saved.', { saved: true }));
  box.on('delete-talk', (e) => run(() => deleteTalk(e.detail.id), 'Talk deleted.'));
  box.on('watch-talk', async (e) => {
    try {
      const url = await watchTalk(e.detail.id);
      box.setAttribute('link', JSON.stringify({ url, t: Date.now() }));
      load(); // they may have just been registered as a walk-in
    } catch (err) {
      box.setAttribute('link', JSON.stringify({ error: errText(err), t: Date.now() }));
    }
  });

  await load();
}
