import wixData from 'wix-data';
import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';
import crypto from 'crypto';

// Discord server for study rooms. IDs are not secret; the bot token and client
// secret live in Secrets Manager as discordBotToken and discordClientSecret.
export const GUILD_ID = '1565442612674961599';
const CLIENT_ID = '1565448158769840148';
const MEMBER_ROLE_ID = '1565443248850210938';
const CATEGORY_ID = '1565443758315667556';
export const ROOM_CHANNELS = {
  math: '1565443842264531084',
  science: '1565443913433481286',
  technology: '1565443951580807198',
  languages: '1565443985638428743',
  social: '1565444028395425923',
  creative: '1565444063870591066'
};

const SITE = 'https://www.cwhw.in';
const ROOMS_PAGE = SITE + '/general-6';
const REDIRECT_URI = SITE + '/_functions/discordCallback';
const API = 'https://discord.com/api/v10';
const opts = { suppressAuth: true };
const STATE_TTL_MS = 2 * 3600000;

// Focus blocks follow Indian time: focus :00–:50, break :50–:00 (rooms stay silent; breaks move to text chat)
export const FOCUS_MIN = 50;
const IST_MIN = 330;

// Permissions CWHW Member has on the Study Rooms category and its rooms
const P = { VIDEO: 1 << 9, VIEW: 1 << 10, SEND: 1 << 11, CONNECT: 1 << 20, SPEAK: 1 << 21 };
const THREADS = 34359738368 + 68719476736; // create public + private threads stay off
const BASE_ALLOW = P.VIEW + P.SEND + P.CONNECT + P.VIDEO;

export function inFocus(now = Date.now()) {
  const min = Math.floor((now + IST_MIN * 60000) / 60000) % 60;
  return min < FOCUS_MIN;
}

async function bot(path, init = {}) {
  const token = await getSecret('discordBotToken');
  const res = await fetch(API + path, {
    ...init,
    headers: { Authorization: 'Bot ' + token, 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
  if (!res.ok) throw new Error('Discord ' + (init.method || 'GET') + ' ' + path + ' failed: ' + res.status + ' ' + (await res.text()));
  return res;
}

// Study rooms are always silent: members can join, use camera and screen share, but not speak.
// Channels get the same overwrite as the category so they stay "synced" in Discord's settings.
const P_HISTORY = 1 << 16;
export async function keepSilent() {
  const body = JSON.stringify({ type: 0, allow: String(BASE_ALLOW), deny: String(THREADS + P.SPEAK) });
  const ids = [CATEGORY_ID, ...Object.values(ROOM_CHANNELS).filter(Boolean)];
  for (const id of ids) {
    await bot('/channels/' + id + '/permissions/' + MEMBER_ROLE_ID, { method: 'PUT', body });
  }
}

// Text channels (and a mentor Stage) members use instead of talking in the rooms.
// Created once if missing; only CWHW Members can see them.
const EXTRA = [
  { name: 'study-timer', type: 0, topic: 'Focus block and break announcements. Read only.', readOnly: true },
  { name: 'break-chat', type: 0, topic: 'Chat during breaks. Be kind, no links, no personal info.', slow: 5 },
  { name: 'doubts', type: 0, topic: 'Ask study doubts here. One doubt per message, reply to help others.', slow: 10 },
  { name: 'Mentor Stage', type: 13, topic: 'Live doubt sessions and talks. Only the mentor speaks; raise your hand to ask.' }
];

export async function ensureChannels(errors = []) {
  const list = await (await bot('/guilds/' + GUILD_ID + '/channels')).json();
  const byName = {};
  list.forEach(c => { byName[String(c.name).toLowerCase() + ':' + c.type] = c; });
  const out = {};
  for (const ch of EXTRA) {
    const found = byName[ch.name.toLowerCase() + ':' + ch.type];
    if (found) { out[ch.name] = found.id; continue; }
    const member = ch.readOnly
      ? { allow: P.VIEW + P_HISTORY, deny: P.SEND + THREADS }
      : ch.type === 13 ? { allow: P.VIEW + P.CONNECT, deny: P.SPEAK } : { allow: P.VIEW + P.SEND + P_HISTORY, deny: THREADS };
    const body = {
      name: ch.name, type: ch.type, parent_id: CATEGORY_ID, topic: ch.topic,
      rate_limit_per_user: ch.slow || 0,
      permission_overwrites: [
        { id: GUILD_ID, type: 0, allow: '0', deny: String(P.VIEW) },
        { id: MEMBER_ROLE_ID, type: 0, allow: String(member.allow), deny: String(member.deny) },
        { id: CLIENT_ID, type: 1, allow: String(P.VIEW + P.SEND + P_HISTORY), deny: '0' }
      ]
    };
    try {
      const made = await (await bot('/guilds/' + GUILD_ID + '/channels', { method: 'POST', body: JSON.stringify(body) })).json();
      out[ch.name] = made.id;
    } catch (e) {
      // Stage channels need Community turned on in the server
      console.error('Could not create channel ' + ch.name, e.message);
      errors.push(ch.name + ': ' + e.message);
    }
  }
  return out;
}

function istClock(addMin) {
  const d = new Date(Date.now() + (IST_MIN + addMin) * 60000);
  let h = d.getUTCHours(); const m = String(d.getUTCMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
  return h + ':' + m + ' ' + ap;
}

export async function announce(text) {
  const ids = await ensureChannels();
  if (!ids['study-timer']) return;
  await bot('/channels/' + ids['study-timer'] + '/messages', {
    method: 'POST', body: JSON.stringify({ content: text, allowed_mentions: { parse: [] } })
  });
}

// Scheduled in jobs.config (times are IST)
export async function startFocusBlock() {
  await keepSilent();
  await announce('🎯 **Focus block started** – ' + FOCUS_MIN + ' minutes of silent study. Camera or screen share is optional. Break at ' + istClock(FOCUS_MIN) + '.');
}
export async function startBreak() {
  await announce('☕ **' + (60 - FOCUS_MIN) + '-minute break.** Chat in #break-chat, ask questions in #doubts. Next focus block at ' + istClock(60 - FOCUS_MIN) + '.');
}

// ---------- Joining the server with a CWHW account ----------
async function sign(text) {
  return crypto.createHmac('sha256', await getSecret('discordClientSecret')).update(text).digest('hex');
}

// The callback can't see who is logged in to CWHW, so the member id travels in a signed state
export async function authorizeUrl(memberId, room) {
  const payload = [memberId, ROOM_CHANNELS[room] ? room : '', Date.now() + STATE_TTL_MS].join('.');
  const state = payload + '.' + (await sign(payload));
  return 'https://discord.com/oauth2/authorize?' + [
    'client_id=' + CLIENT_ID, 'response_type=code', 'scope=identify%20guilds.join',
    'redirect_uri=' + encodeURIComponent(REDIRECT_URI), 'state=' + encodeURIComponent(state)
  ].join('&');
}

async function readState(state) {
  const parts = String(state || '').split('.');
  if (parts.length !== 4) return null;
  const payload = parts.slice(0, 3).join('.');
  const want = Buffer.from(await sign(payload));
  const got = Buffer.from(parts[3]);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  return { memberId: parts[0], room: parts[1], expired: Number(parts[2]) < Date.now() };
}

export function roomLink(room) {
  const ch = ROOM_CHANNELS[room];
  return 'https://discord.com/channels/' + GUILD_ID + (ch ? '/' + ch : '');
}

export async function linkFor(memberId) {
  try {
    const r = await wixData.query('DiscordLinks').eq('memberId', memberId).limit(1).find(opts);
    return r.items[0] || null;
  } catch (e) { return null; } // DiscordLinks not set up yet
}

// Handles Discord's redirect back to CWHW; returns where to send the browser next
export async function finishJoin(query) {
  const fail = (room, why, code = 'failed') => {
    console.error('Discord join failed', why);
    if (!Object.prototype.hasOwnProperty.call(ROOM_CHANNELS, room)) room = '';
    return ROOMS_PAGE + '?' + (room ? 'room=' + room + '&' : '') + 'discord=' + code;
  };
  const st = await readState(query.state);
  // the room is only used to reopen the right panel, so it's fine to read it from an unverified state
  if (!st) return fail(String(query.state || '').split('.')[1] || '', 'bad state signature');
  if (st.expired) return fail(st.room, 'expired state', 'expired');
  if (!query.code) return fail(st.room, 'cancelled: ' + (query.error || 'no code'), 'cancelled');

  try {
    const tokenRes = await fetch(API + '/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: [
        'grant_type=authorization_code', 'code=' + encodeURIComponent(query.code),
        'redirect_uri=' + encodeURIComponent(REDIRECT_URI), 'client_id=' + CLIENT_ID,
        'client_secret=' + encodeURIComponent(await getSecret('discordClientSecret'))
      ].join('&')
    });
    if (!tokenRes.ok) return fail(st.room, 'token ' + tokenRes.status + ' ' + (await tokenRes.text()), 'token');
    const accessToken = (await tokenRes.json()).access_token;

    const meRes = await fetch(API + '/users/@me', { headers: { Authorization: 'Bearer ' + accessToken } });
    if (!meRes.ok) return fail(st.room, 'users/@me ' + meRes.status, 'profile');
    const me = await meRes.json();

    // Adds them with the role, or (204) they were already in the server, so just give the role
    try {
      const add = await bot('/guilds/' + GUILD_ID + '/members/' + me.id, {
        method: 'PUT', body: JSON.stringify({ access_token: accessToken, roles: [MEMBER_ROLE_ID] })
      });
      if (add.status === 204) await bot('/guilds/' + GUILD_ID + '/members/' + me.id + '/roles/' + MEMBER_ROLE_ID, { method: 'PUT' });
    } catch (e) {
      return fail(st.room, e.message, 'bot');
    }

    const old = await linkFor(st.memberId);
    if (old && old.discordId !== me.id) {
      // one CWHW account, one Discord account: take the role off the old one
      try { await bot('/guilds/' + GUILD_ID + '/members/' + old.discordId + '/roles/' + MEMBER_ROLE_ID, { method: 'DELETE' }); } catch (e) { /* they may have left */ }
    }
    const record = { memberId: st.memberId, discordId: me.id, discordName: String(me.global_name || me.username || '').slice(0, 40) };
    if (old) await wixData.update('DiscordLinks', { ...old, ...record }, opts);
    else await wixData.insert('DiscordLinks', record, opts);
  } catch (e) {
    return fail(st.room, e.message, 'save');
  }
  return roomLink(st.room);
}
