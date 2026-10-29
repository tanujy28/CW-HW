import { joinSpace, mySpaces } from 'backend/spaces.web';

$w.onReady(async function () {
  const box = $w('#joinBox');
  const send = (data) => box.setAttribute('result', JSON.stringify({ ...data, t: Date.now() }));

  try {
    const spaces = await mySpaces();
    send({ classes: spaces.map(s => s.spaceName) });
  } catch (e) {}

  box.on('join', async (e) => {
    try {
      const res = await joinSpace(e.detail.code);
      const spaces = await mySpaces();
      send({ ok: res.ok, joined: res.ok, role: res.role, message: res.message, classes: spaces.map(s => s.spaceName) });
    } catch (err) {
      send({ ok: false, message: 'Something went wrong. Please try again.' });
    }
  });
});
