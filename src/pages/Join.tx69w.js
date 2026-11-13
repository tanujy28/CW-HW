import { initAuthPage } from 'public/auth-page';

// The /login page: CWHW log in and sign-up box (element #authBox)
$w.onReady(function () {
  initAuthPage($w('#authBox'));
});
