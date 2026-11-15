import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const opts = { suppressAuth: true };
const CLASSES = ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'College', 'Other'];

// Tells the site whether the logged-in member still needs to fill in their name and class
// (people who joined through Wix's own form or Google skip our sign-up page).
// Also returns their name from their account, to pre-fill the form.
export const getProfileStatus = webMethod(Permissions.SiteMember, async () => {
  const m = await currentMember.getMember({ fieldsets: ['FULL'] });
  if (!m) return { complete: true };
  const r = await wixData.query('MemberDetails').eq('memberId', m._id).limit(1).find(opts);
  const d = r.items[0];
  const complete = !!(d && d.title && d.classLevel && d.acceptedTermsAt);
  const c = m.contactDetails || {};
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || (m.profile && m.profile.nickname) || '';
  return { complete, name: (d && d.title) || name, classes: CLASSES };
});

// Saves the extra sign-up details (name and class) to the MemberDetails collection
export const saveSignupExtras = webMethod(Permissions.SiteMember, async (name, classLevel) => {
  const m = await currentMember.getMember();
  if (!m) throw new Error('Please log in first.');
  const record = {
    title: String(name || '').trim().slice(0, 40),
    memberId: m._id,
    classLevel: CLASSES.includes(classLevel) ? classLevel : 'Other',
    acceptedTermsAt: new Date()
  };
  const r = await wixData.query('MemberDetails').eq('memberId', m._id).limit(1).find(opts);
  if (r.items.length) await wixData.update('MemberDetails', { ...r.items[0], ...record }, opts);
  else await wixData.insert('MemberDetails', record, opts);
  return true;
});
