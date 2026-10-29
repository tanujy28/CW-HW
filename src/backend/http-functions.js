import { response } from 'wix-http-functions';
import { finishJoin } from 'backend/discord';

// Discord sends members back here after they sign in: https://www.cwhw.in/_functions/discordCallback
export async function get_discordCallback(request) {
  const to = await finishJoin(request.query || {});
  return response({ status: 302, headers: { Location: to } });
}
