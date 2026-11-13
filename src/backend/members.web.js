import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const opts = { suppressAuth: true };
const CLASSES = ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'College', 'Other'];

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
