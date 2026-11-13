// Text for the Community Rules (/community-rules) and Privacy Policy (/privacy-policy) pages.
// Edit the wording here; the pages fill their #legalText box from this file.

export const UPDATED = '13 November 2026';
// Where people can reach CWHW about their data or a rule problem
export const CONTACT = 'support@cwhw.in';

const H1 = (t) => `<h1 style="font-size:34px;line-height:1.2;color:#2F3E4E;margin:0 0 6px">${t}</h1>`;
const H2 = (t) => `<h2 style="font-size:22px;line-height:1.3;color:#2F3E4E;margin:26px 0 6px">${t}</h2>`;
const P = (t) => `<p style="font-size:16px;line-height:1.65;color:#2F3E4E;margin:0 0 10px">${t}</p>`;
const UL = (items) => `<ul style="font-size:16px;line-height:1.65;color:#2F3E4E;margin:0 0 10px">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
const NOTE = (t) => `<p style="font-size:14px;color:#5B6B7B;margin:0 0 18px">${t}</p>`;

export const RULES_HTML = [
  H1('Community Rules'),
  NOTE('Last updated: ' + UPDATED),
  P('CWHW is a free, open community where students study together, ask doubts and learn from mentors. These rules keep it safe and useful for everyone. By creating an account you agree to follow them on the website and in the CWHW Discord server.'),
  H2('1. Be kind and respectful'),
  UL([
    'No bullying, insults, hate speech or harassment of anyone, for any reason.',
    'Disagree with ideas, not people. Mentors and students are all here to learn.',
    'No sexual, violent or disturbing content.'
  ]),
  H2('2. Keep study rooms for studying'),
  UL([
    'Silent study rooms stay silent: mics off, no music or noise.',
    'Cameras are optional. If you turn yours on, keep it appropriate.',
    'Use the text channels (like break-chat and doubts) for talking, and stay on topic.'
  ]),
  H2('3. Protect your privacy and others’'),
  UL([
    'Do not share personal details such as your phone number, home address, school timetable or social media handles.',
    'Do not ask anyone for theirs, and do not move chats to other apps (like Instagram, Snapchat, WhatsApp or Telegram).',
    'Never share someone else’s photo, screenshot or information without their permission.',
    'If an adult or anyone else makes you uncomfortable, stop replying and report it to a moderator straight away.'
  ]),
  H2('4. Honest learning'),
  UL([
    'Ask for help understanding a question, not for answers to copy into graded work or exams.',
    'Do not post leaked papers, pirated books or other content you do not have the right to share.',
    'Give credit when you share someone else’s notes or ideas.'
  ]),
  H2('5. No spam or selling'),
  UL([
    'No advertising, promotions, referral links or repeated messages.',
    'No links to unsafe or unrelated websites.'
  ]),
  H2('6. Accounts'),
  UL([
    'You must be 13 or older to join. If you are under 18, please use CWHW with your parent or guardian’s permission.',
    'Use your real first name or a respectful nickname. One account per person.',
    'Keep your password to yourself. You are responsible for what happens on your account.'
  ]),
  H2('If something goes wrong'),
  P('Moderators may remove posts, mute, or remove accounts that break these rules, depending on how serious it is. To report a problem, message a moderator on Discord or email <a href="mailto:' + CONTACT + '" style="color:#2F3E4E;text-decoration:underline">' + CONTACT + '</a>.'),
  P('We may update these rules as the community grows. The date at the top shows the latest version.')
].join('');

export const PRIVACY_HTML = [
  H1('Privacy Policy'),
  NOTE('Last updated: ' + UPDATED),
  P('This policy explains what information CWHW (cwhw.in) collects, why, and the choices you have. We keep it as simple as we can, because many of our members are students.'),
  H2('What we collect'),
  UL([
    '<strong>Account details:</strong> your name, email address and class (for example Class 10). Passwords are handled by Wix, our website platform; we never see them. If you sign in with Google, Wix receives your name and email from Google.',
    '<strong>When you agreed to our rules:</strong> the date and time you ticked the sign-up box.',
    '<strong>What you post:</strong> doubts, replies, uploads, blog posts and comments.',
    '<strong>Programme activity:</strong> which mentor programmes you join and when you click to join a session, so mentors can see attendance.',
    '<strong>Discord link:</strong> if you connect Discord, your Discord user ID and username, so we can let you into the study server.',
    '<strong>Your Room settings:</strong> choices like timer length, theme and music.',
    '<strong>Basic usage data:</strong> Wix may record pages visited, device and browser type, using cookies, to keep the site working and secure.'
  ]),
  H2('How we use it'),
  UL([
    'To create and run your account and let you log in.',
    'To show the right study rooms, programmes and sessions to you.',
    'To let mentors see who attended their sessions and which doubts need answers.',
    'To keep the community safe and enforce the <a href="/community-rules" style="color:#2F3E4E;text-decoration:underline">Community Rules</a>.',
    'To send you important emails about your account (like a password reset).'
  ]),
  P('We do <strong>not</strong> sell your information, and we do not use it for advertising.'),
  H2('Who else handles it'),
  UL([
    '<strong>Wix</strong> hosts the website and stores account and site data.',
    '<strong>Discord</strong> runs our study server. What you do there is also covered by Discord’s own privacy policy.',
    '<strong>Google, YouTube, Zoom or Microsoft Teams</strong> host live mentor sessions. When you join a session you go to their service.',
    'We may share information if the law requires it, or to protect someone’s safety.'
  ]),
  H2('Who can see what'),
  UL([
    'Your name and what you post in a programme or public area can be seen by other members there.',
    'Mentors of a programme can see its member list and attendance.',
    'Your email address is never shown to other members.'
  ]),
  H2('Students under 18'),
  P('You must be 13 or older to create an account. If you are under 18, please use CWHW with your parent or guardian’s permission. A parent or guardian can contact us at any time to see, correct or delete their child’s information.'),
  H2('How long we keep it'),
  P('We keep your information while your account is open. If you delete your account or ask us to, we delete your personal details within 30 days, except where we must keep something by law. Posts that others replied to may stay with your name removed.'),
  H2('Your choices'),
  UL([
    'See or update your details from your account settings.',
    'Disconnect Discord at any time.',
    'Ask us for a copy of your information, to correct it, or to delete your account, by emailing <a href="mailto:' + CONTACT + '" style="color:#2F3E4E;text-decoration:underline">' + CONTACT + '</a>.'
  ]),
  H2('Keeping it safe'),
  P('Data is stored on Wix’s secure servers and sent over encrypted connections (HTTPS). Only CWHW admins can open member records. No system is perfectly secure, so please use a strong password that you do not use elsewhere.'),
  H2('Changes and contact'),
  P('If we change this policy, we will update the date at the top and, for big changes, tell members by email or on the site. Questions? Email <a href="mailto:' + CONTACT + '" style="color:#2F3E4E;text-decoration:underline">' + CONTACT + '</a>.')
].join('');
