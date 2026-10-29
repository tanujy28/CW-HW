import { listTalks, registerTalk, cancelRegistration, watchTalk, saveTalk, deleteTalk } from 'backend/talks.web';
import { authentication } from 'wix-members-frontend';

// Page code for the Sessions page. Call it from the page's onReady with the cwhw-talks element.
export async function initSessions(box) {
  let last = null;
  const errText = (e) => (e && e.message ? String(e.message).replace(/^Error:\s*/, '') : 'Something went wrong. Please try again.');
  const send = (extra) => box.setAttribute('data', JSON.stringify({ ...(last || {}), ...extra, t: Date.now() }));

  const load = async () => {
    try { last = await listTalks(); send({}); }
    catch (e) { send({ talks: [], error: 'Could not load talks. Please refresh.' }); }
  };

  const run = async (fn, okMessage, extra = {}) => {
    try { last = await fn(); send({ message: okMessage, ...extra }); }
    catch (e) { send({ error: errText(e) }); }
  };

  await load();
  authentication.onLogin(load);

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
}
