import { authentication, currentMember } from 'wix-members-frontend';
import wixLocation from 'wix-location';
import { saveSignupExtras } from 'backend/members.web';

// Links shown in the sign-up tick box. Change these if your pages use other URLs.
const LINKS = { rules: '/about-us', privacy: '/privacy-policy' };
// Show "Continue with Google" (opens Wix's own login window, which has Google)
const GOOGLE = true;

// Only send people back to a page on this site
function target() {
  const t = String(wixLocation.query.returnTo || '');
  return /^\/(?!\/)/.test(t) ? t : '/';
}

function errText(e) {
  const raw = [e && e.message, e && e.details && e.details.applicationError && e.details.applicationError.code, String(e || '')]
    .filter(Boolean).join(' ').toLowerCase();
  if (/already.*(exist|registered|member)|emailalreadyexists|-19995/.test(raw)) return { message: 'An account with this email already exists. Try logging in instead.', switchTo: 'login' };
  if (/pending|approval|awaiting/.test(raw)) return { message: 'Your account is waiting for approval. We’ll email you once it’s approved.' };
  if (/verif/.test(raw)) return { message: 'Please verify your email first. Check your inbox for the link.' };
  if (/block|suspend|ban/.test(raw)) return { message: 'This account has been blocked. Contact CWHW if you think this is a mistake.' };
  if (/resetpassword|reset password/.test(raw)) return { message: 'Please reset your password using “Forgot password?”.' };
  if (/password|credential|not found|no member|invalid|wrong|-19976|-19999/.test(raw)) return { message: 'Wrong email or password. Please try again.' };
  if (/too many|rate|limit|captcha/.test(raw)) return { message: 'Too many attempts. Please wait a few minutes and try again.' };
  return { message: 'Something went wrong. Please try again.' };
}

// Call from the page's onReady: initAuthPage($w('#authBox'), 'login' | 'signup')
export async function initAuthPage(box, mode) {
  const reply = (d) => box.setAttribute('result', JSON.stringify({ ...d, t: Date.now() }));
  const done = (message) => { reply({ ok: true, done: true, message }); setTimeout(() => wixLocation.to(target()), 600); };

  box.setAttribute('config', JSON.stringify({ mode, google: GOOGLE, links: LINKS }));

  // Already logged in: nothing to do here
  try {
    if (await currentMember.getMember()) { wixLocation.to(target()); return; }
  } catch (e) { /* not logged in */ }

  box.on('login', async (e) => {
    try {
      await authentication.login(e.detail.email, e.detail.password);
      done('Logged in! Taking you back…');
    } catch (err) {
      reply(errText(err));
    }
  });

  box.on('signup', async (e) => {
    const d = e.detail;
    const parts = d.name.split(/\s+/);
    try {
      const res = await authentication.register(d.email, d.password, {
        contactInfo: { firstName: parts[0], lastName: parts.slice(1).join(' ') }
      });
      if (res && res.status === 'PENDING') {
        reply({ ok: true, message: 'Account created! It needs approval or email confirmation before you can log in. Check your inbox.', switchTo: 'login' });
        return;
      }
      if (res && res.sessionToken) {
        try { await authentication.applySessionToken(res.sessionToken); } catch (x) { /* already logged in */ }
      }
      try { await saveSignupExtras(d.name, d.classLevel); } catch (x) { /* optional details */ }
      done('Welcome to CWHW! Taking you in…');
    } catch (err) {
      reply(errText(err));
    }
  });

  box.on('forgot', async (e) => {
    try {
      await authentication.sendSetPasswordEmail(e.detail.email, { hideIgnoreMessage: true });
      reply({ ok: true, message: 'If an account exists for that email, we’ve sent a link to reset your password.' });
    } catch (err) {
      // Fall back to Wix's own reset window
      reply({});
      authentication.promptForgotPassword().catch(() => {});
    }
  });

  box.on('google', (e) => {
    reply({});
    authentication.promptLogin({ mode: e.detail.mode === 'signup' ? 'signup' : 'login', modal: true }).catch(() => {});
  });

  authentication.onLogin(() => wixLocation.to(target()));
}
