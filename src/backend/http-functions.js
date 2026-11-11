import { response } from 'wix-http-functions';
import { finishJoin, keepSilent, ensureChannels, announce } from 'backend/discord';
import { getSecret } from 'wix-secrets-backend';

// Discord sends members back here after they sign in: https://www.cwhw.in/_functions/discordCallback
export async function get_discordCallback(request) {
  const to = await finishJoin(request.query || {});
  return response({ status: 302, headers: { Location: to } });
}

// Admin test: https://www.cwhw.in/_functions/discordSetup?key=YOUR_ADMIN_KEY
// Runs the study-room setup now and shows what worked. The key is the "adminKey" secret.
export async function get_discordSetup(request) {
  let want = '';
  try { want = await getSecret('adminKey'); } catch (e) { want = ''; }
  const key = (request.query || {}).key || '';
  if (!want || key !== want) return response({ status: 403, headers: { 'Content-Type': 'text/plain' }, body: 'Not allowed' });

  const out = { silentRooms: '', channels: {}, errors: [], timerMessage: '' };
  try { await keepSilent(); out.silentRooms = 'ok'; } catch (e) { out.silentRooms = 'failed'; out.errors.push('Silent rooms: ' + e.message); }
  try { out.channels = await ensureChannels(out.errors); } catch (e) { out.errors.push('Channels: ' + e.message); }
  if (!out.channels['study-timer']) { out.timerMessage = 'skipped (no #study-timer channel)'; }
  else try { await announce('✅ CWHW bot check passed.'); out.timerMessage = 'ok'; }
  catch (e) { out.timerMessage = 'failed'; out.errors.push('Timer message: ' + e.message); }
  return response({ status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(out, null, 2) });
}
