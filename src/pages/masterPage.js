import { authentication, currentMember } from 'wix-members-frontend';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { session } from 'wix-storage-frontend';
import { getProfileStatus } from 'backend/members.web';

// Header: logged-out visitors see our "Join Us" button (goes to /login),
// logged-in members see the Wix account bar (notifications + profile menu).
// Phones have no account bar, so there the same button stays and becomes "My Account".
const isPhone = wixWindow.formFactor === 'Mobile';
let profileUrl = null; // set on phones while logged in

function toggle(id, show) {
  const el = $w(id);
  if (!el || typeof el.show !== 'function') return;
  if (show) el.show(); else el.hide();
}

async function showLoginState() {
  let member = null;
  try { member = await currentMember.getMember(); } catch (e) { member = null; }
  toggle('#accountNavBar1', !!member);
  if (isPhone) {
    const btn = $w('#loginBtn');
    if (btn && typeof btn.show === 'function') {
      const slug = member && member.profile && member.profile.slug;
      profileUrl = member ? (slug ? '/profile/' + slug + '/profile' : '/account/my-account') : null;
      btn.label = member ? 'My Account' : 'Join Us';
      btn.show();
    }
  } else {
    toggle('#loginBtn', !member);
  }
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
      if (profileUrl) { wixLocation.to(profileUrl); return; }
      const here = '/' + wixLocation.path.join('/');
      const back = here === '/login' ? '/' : here;
      wixLocation.to('/login?returnTo=' + encodeURIComponent(back));
    });
  }
  showLoginState();
  authentication.onLogin(() => { clearSavedPages(); showLoginState(); });
  authentication.onLogout(() => { clearSavedPages(); showLoginState(); });
});
