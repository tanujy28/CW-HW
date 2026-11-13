import { authentication, currentMember } from 'wix-members-frontend';
import wixLocation from 'wix-location';

// Header: logged-out visitors see our "Log in" button (goes to /login),
// logged-in members see the Wix account bar (notifications + profile menu).
async function showLoginState() {
  let member = null;
  try { member = await currentMember.getMember(); } catch (e) { member = null; }
  const btn = $w('#loginBtn');
  const bar = $w('#accountNavBar1');
  if (member) {
    if (btn.hide) btn.hide();
    if (bar.show) bar.show();
  } else {
    if (bar.hide) bar.hide();
    if (btn.show) btn.show();
  }
}

$w.onReady(function () {
  const btn = $w('#loginBtn');
  if (btn.onClick) {
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
