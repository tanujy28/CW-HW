import { authentication, currentMember } from 'wix-members-frontend';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';

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
  authentication.onLogin(() => showLoginState());
  authentication.onLogout(() => showLoginState());
});
