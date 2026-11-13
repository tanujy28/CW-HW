import { initAuthPage } from 'public/auth-page';

$w.onReady(function () {
  initAuthPage($w('#authBox'), 'signup');
});
