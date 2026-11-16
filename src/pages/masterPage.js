import { authentication, currentMember } from 'wix-members-frontend';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { session } from 'wix-storage-frontend';
import { getProfileStatus } from 'backend/members.web';

// Header: logged-out visitors see our "Log in" button (goes to /login),
// logged-in members see the Wix account bar (notifications + profile menu).
// On phones the Log in button sits where "+ Upload" is, so Upload shows only when logged in.
const isPhone = wixWindow.formFactor === 'Mobile';

function toggle(id, show) {
  const el = $w(id);
  if (!el || typeof el.show !== 'function') return;
  if (show) el.show(); else el.hide();
}

async function showLoginState() {
  let member = null;
  try { member = await currentMember.getMember(); } catch (e) { member = null; }
  toggle('#loginBtn', !member);
  toggle('#accountNavBar1', !!member);
  if (isPhone) toggle('#button3', !!member);
  if (member) askForMissingDetails();
}

// Members who joined through Wix's own form or Google never gave their name and class.
// Ask once per visit with the "Complete Profile" pop-up until they fill it in.
async function askForMissingDetails() {
  if (wixLocation.path[0] === 'login') return;
  try {
    if (session.getItem('cwhwProfileAsked')) return;
    const status = await getProfileStatus();
    if (status.complete) return;
    session.setItem('cwhwProfileAsked', '1');
    await wixWindow.openLightbox('Complete Profile', status);
  } catch (e) { /* never block the page over this */ }
}

// Pages keep a copy of what they last showed (Sessions, Programmes) so repeat visits are instant.
// A different person logging in or out on this tab must never see that copy.
function clearSavedPages() {
  try { ['cwhwCacheTalks', 'cwhwCacheProgrammes'].forEach((k) => session.removeItem(k)); } catch (e) { /* ignore */ }
}

$w.onReady(function () {
  const btn = $w('#loginBtn');
  if (btn && typeof btn.onClick === 'function') {
    btn.onClick(() => {
      const here = '/' + wixLocation.path.join('/');
      const back = here === '/login' ? '/' : here;
      wixLocation.to('/login?returnTo=' + encodeURIComponent(back));
    });
  }
  showLoginState();
  authentication.onLogin(() => { clearSavedPages(); showLoginState(); });
  authentication.onLogout(() => { clearSavedPages(); showLoginState(); });
});
