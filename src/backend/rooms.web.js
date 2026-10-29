import { Permissions, webMethod } from 'wix-web-module';
import { currentMember } from 'wix-members-backend';
import { ROOM_CHANNELS, authorizeUrl, linkFor, roomLink, inFocus, FOCUS_MIN } from 'backend/discord';

// Study rooms are Discord voice channels. Only logged-in members get the join link.
export const roomInfo = webMethod(Permissions.SiteMember, async (key) => {
  if (!Object.prototype.hasOwnProperty.call(ROOM_CHANNELS, key)) throw new Error('Unknown room');
  const m = await currentMember.getMember();
  if (!m) throw new Error('Please log in first.');
  const link = await linkFor(m._id);
  return {
    ready: !!ROOM_CHANNELS[key],
    linked: !!link,
    discordName: link ? link.discordName || '' : '',
    roomUrl: link ? roomLink(key) : '',
    joinUrl: await authorizeUrl(m._id, key),
    focus: inFocus(),
    focusMin: FOCUS_MIN
  };
});
