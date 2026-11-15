// "Complete Profile" pop-up: asks members who joined through Wix's own form or Google
// for their name and class, and records that they agreed to the Community Rules.
// Opened from masterPage.js; never opens on its own.
import wixWindow from 'wix-window';
import { saveSignupExtras } from 'backend/members.web';

const CLASSES = ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'College', 'Other'];

function showError(msg) {
  $w('#cpError').html = `<p style="font-size:13px;color:#B3261E;margin:0">${msg}</p>`;
  $w('#cpError').show();
}

$w.onReady(function () {
  const data = wixWindow.lightbox.getContext() || {};
  const classes = Array.isArray(data.classes) && data.classes.length ? data.classes : CLASSES;

  $w('#cpClass').options = classes.map((c) => ({ label: c, value: c }));
  $w('#cpClass').value = undefined;
  if (data.name) $w('#cpName').value = data.name;
  $w('#cpAgree').checked = false;
  $w('#cpError').hide();
  $w('#cpSave').label = 'Save and continue';

  const clear = () => $w('#cpError').hide();
  $w('#cpName').onInput(clear);
  $w('#cpClass').onChange(clear);
  $w('#cpAgree').onChange(clear);

  $w('#cpSave').onClick(async () => {
    const name = String($w('#cpName').value || '').trim();
    const classLevel = $w('#cpClass').value;
    if (!name) return showError('Enter your name.');
    if (!classLevel) return showError('Choose your class.');
    if (!$w('#cpAgree').checked) return showError('Please tick the box to agree to the Community Rules.');

    $w('#cpSave').disable();
    $w('#cpSave').label = 'Saving…';
    try {
      await saveSignupExtras(name, classLevel);
      wixWindow.lightbox.close({ saved: true });
    } catch (e) {
      $w('#cpSave').enable();
      $w('#cpSave').label = 'Save and continue';
      showError('Something went wrong. Please try again.');
    }
  });
});
