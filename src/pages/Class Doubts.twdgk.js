import wixLocation from 'wix-location';
import { openDoubts, getBoard, askDoubt, replyDoubt, setAnswered, deleteDoubt, deleteReply } from 'backend/doubts.web';

$w.onReady(async function () {
  const box = $w('#doubtsBox');
  let classes = [];
  let selected = null;
  let last = null;

  const errText = (e) => (e && e.message ? String(e.message).replace(/^Error:\s*/, '') : 'Something went wrong. Please try again.');
  const send = (extra) => box.setAttribute('data', JSON.stringify({ classes, board: last, ...extra, t: Date.now() }));

  const load = async (spaceId, quiet) => {
    selected = spaceId;
    try {
      last = await getBoard(spaceId);
      send({});
    } catch (e) {
      if (!quiet) send({ error: errText(e) });
    }
  };

  const run = async (fn, okMessage, extra = {}) => {
    try {
      last = await fn();
      send({ message: okMessage, ...extra });
    } catch (e) {
      send({ error: errText(e) });
    }
  };

  box.on('select-class', (e) => load(e.detail.spaceId));
  box.on('refresh', () => load(selected, true));
  box.on('ask', (e) => run(() => askDoubt(selected, { text: e.detail.text, subject: e.detail.subject }), 'Doubt posted.', { sent: 'ask' }));
  box.on('reply', (e) => run(() => replyDoubt(selected, e.detail.doubtId, e.detail.text), 'Reply posted.', { sent: 'r-' + e.detail.doubtId }));
  box.on('answered', (e) => run(() => setAnswered(selected, e.detail.doubtId, e.detail.value), e.detail.value ? 'Marked as answered.' : 'Marked as unanswered.'));
  box.on('delete-doubt', (e) => run(() => deleteDoubt(selected, e.detail.doubtId), 'Doubt deleted.'));
  box.on('delete-reply', (e) => run(() => deleteReply(selected, e.detail.replyId), 'Reply deleted.'));

  // Classes and the board (from the link's ?class=..., else the first) arrive together
  try {
    const first = await openDoubts(wixLocation.query.class);
    classes = first.classes || [];
    if (first.board) { last = first.board; selected = first.board.spaceId; }
  } catch (e) { classes = []; }
  send({});
});
