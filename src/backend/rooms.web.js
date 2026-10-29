import { Permissions, webMethod } from 'wix-web-module';

const ROOMS = {
  math: 'https://cwhw.whereby.com/mathbed2b3d6-e053-4055-9e02-0a5839ffc01f',
  science: 'https://cwhw.whereby.com/science9082b5a6-cb8f-411a-b52f-46186a98256a',
  technology: 'https://cwhw.whereby.com/technology94ae46d6-51cf-4acb-ac8e-37afa3841456',
  languages: 'https://cwhw.whereby.com/languages589207df-01c0-4eda-a65f-50cd3dba3fad',
  social: 'https://cwhw.whereby.com/social-sciences46f210be-f9cc-4e31-b40d-1246eda27b40',
  creative: 'https://cwhw.whereby.com/creative90f982c9-2b01-4f04-8f96-f8f80032e493'
};

// Only logged-in members can get a room link
export const getRoomUrl = webMethod(Permissions.SiteMember, async (key) => {
  const url = ROOMS[key];
  if (!url) throw new Error('Unknown room');
  return url + '?audio=off&video=off&logo=off';
});