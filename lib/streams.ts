import { env } from 'cloudflare:workers';

export type Platform = 'kick' | 'twitch' | 'youtube';
export type LiveState = 'live' | 'offline' | 'unknown';
export type CreatorRow = {
  id: number; platform: Platform; platformUsername: string; platformChannelId: string | null; originalUrl: string; normalizedUrl: string;
  displayName: string | null; avatarUrl: string | null; subscriberCount: number | null; followerCount: number | null; teamId: string | null;
  featured: number; active: number; homepageVisible: number; sortOrder: number; isLive: number; liveStatus: LiveState;
  currentStreamId: string | null; currentVideoId: string | null; streamTitle: string | null; thumbnailUrl: string | null; viewerCount: number | null;
  category: string | null; streamStartedAt: string | null; lastCheckedAt: string | null; profileCheckedAt: string | null; createdAt: string; updatedAt: string;
};
export type Creator = Omit<CreatorRow, 'featured' | 'active' | 'homepageVisible' | 'isLive'> & { featured: boolean; active: boolean; homepageVisible: boolean; isLive: boolean; slug: string };
export type ParsedCreator = { platform: Platform; username: string; channelId: string | null; originalUrl: string; normalizedUrl: string };
export type LiveStatus = { isLive: boolean; state: LiveState; title?: string | null; thumbnail?: string | null; viewerCount?: number | null; category?: string | null; startedAt?: string | null; videoId?: string | null; streamId?: string | null };
type CreatorMetadata = {
  channelId: string | null;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  subscriberCount: number | null;
  followerCount: number | null;
  videoCount: number | null;
  totalViewCount: number | null;
  resolved: boolean;
};
const liveRefreshMs = 60_000;
const profileRefreshMs = 6 * 60 * 60_000;
const initialSeedKey = 'initial-creators-v1';
export const initialCreatorUrls = [
  'https://youtube.com/@rayanplaysyt',
  'https://youtube.com/@nightly3z',
  'https://kick.com/nightmaresa',
  'https://youtube.com/@tsgaming89',
  'https://youtube.com/@dragooyt75',
] as const;

let lastLiveRefresh = 0;
let refreshingLive: Promise<void> | null = null;
let refreshingProfiles: Promise<void> | null = null;
let seedInProgress: Promise<void> | null = null;
let twitchToken: { token: string; expiresAt: number } | null = null;
let kickToken: { token: string; expiresAt: number } | null = null;

const noLive = (): LiveStatus => ({ isLive: false, state: 'offline' });
const unknown = (): LiveStatus => ({ isLive: false, state: 'unknown' });
const usernamePattern = /^[a-zA-Z0-9_.-]{2,100}$/;
const videoPattern = /^[a-zA-Z0-9_-]{6,40}$/;
const creatorColumns = `id, platform, platform_username AS platformUsername, platform_channel_id AS platformChannelId, original_url AS originalUrl, normalized_url AS normalizedUrl,
  display_name AS displayName, avatar_url AS avatarUrl, subscriber_count AS subscriberCount, follower_count AS followerCount, team_id AS teamId,
  featured, active, homepage_visible AS homepageVisible, sort_order AS sortOrder, is_live AS isLive, live_status AS liveStatus,
  current_stream_id AS currentStreamId, current_video_id AS currentVideoId, stream_title AS streamTitle, thumbnail_url AS thumbnailUrl, viewer_count AS viewerCount,
  category, stream_started_at AS streamStartedAt, last_checked_at AS lastCheckedAt, profile_checked_at AS profileCheckedAt, created_at AS createdAt, updated_at AS updatedAt`;

export class CreatorDuplicateError extends Error {}

export function creatorSlug(creator: Pick<CreatorRow, 'platform' | 'platformUsername'>) {
  return `${creator.platform}-${creator.platformUsername.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
}

export function parseCreatorUrl(raw: string): ParsedCreator {
  if (!raw || raw.length > 500) throw new Error('Paste a valid channel URL.');
  let url: URL;
  try { url = new URL(raw.trim()); } catch { throw new Error('Paste a valid channel URL.'); }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Only HTTP or HTTPS channel links are allowed.');
  if (url.username || url.password) throw new Error('Channel links cannot include login details.');
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const parts = url.pathname.split('/').filter(Boolean);
  const safeName = (name: string) => { if (!usernamePattern.test(name)) throw new Error('This channel username is not supported.'); return name.toLowerCase(); };
  if (host === 'twitch.tv') {
    if (!parts[0] || ['directory', 'videos', 'downloads', 'jobs', 'p', 'search'].includes(parts[0].toLowerCase())) throw new Error('Paste a Twitch channel link, for example twitch.tv/username.');
    const username = safeName(parts[0]);
    return { platform: 'twitch', username, channelId: null, originalUrl: url.toString(), normalizedUrl: `https://www.twitch.tv/${username}` };
  }
  if (host === 'kick.com') {
    if (!parts[0] || ['categories', 'search', 'browse'].includes(parts[0].toLowerCase())) throw new Error('Paste a Kick channel link, for example kick.com/username.');
    const username = safeName(parts[0]);
    return { platform: 'kick', username, channelId: null, originalUrl: url.toString(), normalizedUrl: `https://kick.com/${username}` };
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
    let username = ''; let channelId: string | null = null; let videoId: string | null = null;
    if (host === 'youtu.be') videoId = parts[0] ?? null;
    else if (parts[0]?.startsWith('@')) username = safeName(parts[0].slice(1));
    else if (parts[0] === 'channel' && parts[1]) { channelId = parts[1]; username = parts[1]; }
    else if ((parts[0] === 'watch' || parts[0] === 'live') && (url.searchParams.get('v') || parts[1])) videoId = url.searchParams.get('v') || parts[1];
    else if (parts[0] === 'watch') videoId = url.searchParams.get('v');
    if (videoId) { if (!videoPattern.test(videoId)) throw new Error('This YouTube video link is not supported.'); username = `video-${videoId}`; }
    if (!username || !usernamePattern.test(username)) throw new Error('Paste a YouTube channel, handle, or live video link.');
    const normalizedUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : channelId ? `https://www.youtube.com/channel/${channelId}` : `https://www.youtube.com/@${username}`;
    return { platform: 'youtube', username: username.toLowerCase(), channelId, originalUrl: url.toString(), normalizedUrl };
  }
  throw new Error('Supported platforms: Kick, Twitch, and YouTube.');
}

export function toCreator(row: CreatorRow): Creator {
  return { ...row, featured: Boolean(row.featured), active: Boolean(row.active), homepageVisible: Boolean(row.homepageVisible), isLive: Boolean(row.isLive), slug: creatorSlug(row) };
}

async function getCreatorById(id: number) { return env.DB.prepare(`SELECT ${creatorColumns} FROM creators WHERE id = ?`).bind(id).first<CreatorRow>(); }

async function readCreators(options: { includeInactive?: boolean; homepageOnly?: boolean } = {}) {
  const filters: string[] = [];
  if (!options.includeInactive) filters.push('active = 1');
  if (options.homepageOnly) filters.push('homepage_visible = 1');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const ordering = options.homepageOnly ? 'is_live DESC, featured DESC, sort_order ASC, created_at DESC' : 'featured DESC, is_live DESC, viewer_count DESC, sort_order ASC, created_at DESC';
  const result = await env.DB.prepare(`SELECT ${creatorColumns} FROM creators ${where} ORDER BY ${ordering}`).all<CreatorRow>();
  return result.results ?? [];
}

export async function listCreators(liveOnly = false, homepageOnly = false) {
  await ensureInitialCreators();
  const before = await readCreators({ homepageOnly });
  await maybeRefresh(before);
  const creators = (await readCreators({ homepageOnly })).map(toCreator);
  return liveOnly ? creators.filter((creator) => creator.isLive) : creators;
}

export async function listAllCreators() {
  await ensureInitialCreators();
  const before = await readCreators({ includeInactive: true });
  await maybeRefresh(before.filter((creator) => creator.active));
  return (await readCreators({ includeInactive: true })).map(toCreator);
}

async function maybeRefresh(creators: CreatorRow[]) {
  if (!creators.length) return;
  const now = Date.now();
  const liveStale = creators.some((creator) => !creator.lastCheckedAt || now - Date.parse(creator.lastCheckedAt) > liveRefreshMs);
  if (liveStale && now - lastLiveRefresh >= liveRefreshMs) {
    if (!refreshingLive) refreshingLive = refreshLiveStatuses(creators).finally(() => { lastLiveRefresh = Date.now(); refreshingLive = null; });
    await refreshingLive;
  }
  const profileStale = creators.filter((creator) => !creator.profileCheckedAt || now - Date.parse(creator.profileCheckedAt) > profileRefreshMs);
  if (profileStale.length && !refreshingProfiles) refreshingProfiles = refreshCreatorProfiles(profileStale).finally(() => { refreshingProfiles = null; });
  if (refreshingProfiles) await refreshingProfiles;
}

async function updateCreatorStatus(id: number, status: LiveStatus) {
  const now = new Date().toISOString();
  await env.DB.prepare(`UPDATE creators SET is_live = ?, live_status = ?, current_stream_id = ?, current_video_id = ?, stream_title = ?, thumbnail_url = ?, viewer_count = ?, category = ?, stream_started_at = ?, last_checked_at = ?, updated_at = ? WHERE id = ?`).bind(status.isLive ? 1 : 0, status.state, status.streamId ?? null, status.videoId ?? null, status.title ?? null, status.thumbnail ?? null, status.viewerCount ?? null, status.category ?? null, status.startedAt ?? null, now, now, id).run();
}
async function markUnknown(creators: CreatorRow[]) { await Promise.all(creators.map((creator) => updateCreatorStatus(creator.id, unknown()))); }

async function getTwitchToken() {
  if (twitchToken && twitchToken.expiresAt > Date.now()) return twitchToken.token;
  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) return null;
  const response = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.TWITCH_CLIENT_ID, client_secret: env.TWITCH_CLIENT_SECRET, grant_type: 'client_credentials' }) });
  if (!response.ok) throw new Error(`Twitch token request failed (${response.status}).`);
  const data = await response.json() as { access_token: string; expires_in: number };
  twitchToken = { token: data.access_token, expiresAt: Date.now() + Math.max(60, data.expires_in - 60) * 1000 };
  return twitchToken.token;
}

async function getKickToken() {
  if (kickToken && kickToken.expiresAt > Date.now()) return kickToken.token;
  if (!env.KICK_CLIENT_ID || !env.KICK_CLIENT_SECRET) return null;
  const response = await fetch('https://id.kick.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.KICK_CLIENT_ID, client_secret: env.KICK_CLIENT_SECRET, grant_type: 'client_credentials', scope: 'channel:read' }) });
  if (!response.ok) throw new Error(`Kick token request failed (${response.status}).`);
  const data = await response.json() as { access_token: string; expires_in: number };
  kickToken = { token: data.access_token, expiresAt: Date.now() + Math.max(60, data.expires_in - 60) * 1000 };
  return kickToken.token;
}

async function refreshTwitch(creators: CreatorRow[]) {
  const token = await getTwitchToken();
  if (!token || !env.TWITCH_CLIENT_ID) return markUnknown(creators);
  type TwitchStream = { id: string; user_login: string; title: string; game_name: string; viewer_count: number; started_at: string; thumbnail_url: string };
  const streams: TwitchStream[] = [];
  for (let start = 0; start < creators.length; start += 100) { const params = new URLSearchParams(); creators.slice(start, start + 100).forEach((creator) => params.append('user_login', creator.platformUsername)); const response = await fetch(`https://api.twitch.tv/helix/streams?${params}`, { headers: { 'Client-Id': env.TWITCH_CLIENT_ID, Authorization: `Bearer ${token}` } }); if (!response.ok) throw new Error(`Twitch live request failed (${response.status}).`); const data = await response.json() as { data?: TwitchStream[] }; streams.push(...(data.data ?? [])); }
  const byUsername = new Map(streams.map((stream) => [stream.user_login.toLowerCase(), stream]));
  await Promise.all(creators.map((creator) => { const stream = byUsername.get(creator.platformUsername); return updateCreatorStatus(creator.id, stream ? { isLive: true, state: 'live', streamId: stream.id, title: stream.title, category: stream.game_name, viewerCount: stream.viewer_count, startedAt: stream.started_at, thumbnail: stream.thumbnail_url.replace('{width}', '640').replace('{height}', '360') } : noLive()); }));
}

type KickChannel = { slug?: string; category?: { name?: string }; user?: { username?: string; profile_pic?: string }; follower_count?: number | string; followers_count?: number | string; stream?: { is_live?: boolean; id?: string; title?: string; viewer_count?: number; thumbnail?: string; start_time?: string; category?: { name?: string } } };
async function getKickChannels(creators: CreatorRow[], token: string) {
  const all: KickChannel[] = [];
  for (let start = 0; start < creators.length; start += 50) { const params = new URLSearchParams(); creators.slice(start, start + 50).forEach((creator) => params.append('slug', creator.platformUsername)); const response = await fetch(`https://api.kick.com/public/v1/channels?${params}`, { headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) throw new Error(`Kick channel request failed (${response.status}).`); const data = await response.json() as { data?: KickChannel[] }; all.push(...(data.data ?? [])); }
  return new Map(all.filter((channel) => channel.slug).map((channel) => [channel.slug!.toLowerCase(), channel]));
}

async function refreshKick(creators: CreatorRow[]) {
  const token = await getKickToken(); if (!token) return markUnknown(creators);
  const channels = await getKickChannels(creators, token);
  await Promise.all(creators.map((creator) => { const channel = channels.get(creator.platformUsername); const stream = channel?.stream; return updateCreatorStatus(creator.id, stream?.is_live ? { isLive: true, state: 'live', streamId: stream.id, title: stream.title, viewerCount: stream.viewer_count, thumbnail: stream.thumbnail, startedAt: stream.start_time, category: stream.category?.name ?? channel?.category?.name } : noLive()); }));
}

async function getYouTubeStatus(creator: CreatorRow): Promise<LiveStatus> {
  const key = env.YOUTUBE_API_KEY; if (!key) return unknown();
  const videoFromUsername = creator.platformUsername.startsWith('video-') ? creator.platformUsername.slice(6) : null;
  if (videoFromUsername) {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${encodeURIComponent(videoFromUsername)}&key=${encodeURIComponent(key)}`); if (!response.ok) throw new Error(`YouTube video request failed (${response.status}).`);
    const data = await response.json() as { items?: { id: string; snippet?: { title?: string; thumbnails?: { high?: { url?: string } }; liveBroadcastContent?: string; channelTitle?: string }; liveStreamingDetails?: { concurrentViewers?: string; actualStartTime?: string } }[] }; const video = data.items?.[0];
    return video?.snippet?.liveBroadcastContent === 'live' ? { isLive: true, state: 'live', videoId: video.id, title: video.snippet.title, thumbnail: video.snippet.thumbnails?.high?.url, viewerCount: Number(video.liveStreamingDetails?.concurrentViewers ?? 0) || null, startedAt: video.liveStreamingDetails?.actualStartTime, category: video.snippet.channelTitle } : noLive();
  }
  let channelId = creator.platformChannelId;
  if (!channelId) { const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(`@${creator.platformUsername}`)}&key=${encodeURIComponent(key)}`); if (!response.ok) throw new Error(`YouTube channel request failed (${response.status}).`); const data = await response.json() as { items?: { id: string }[] }; channelId = data.items?.[0]?.id ?? null; if (channelId) await env.DB.prepare('UPDATE creators SET platform_channel_id = ?, updated_at = ? WHERE id = ?').bind(channelId, new Date().toISOString(), creator.id).run(); }
  if (!channelId) return noLive();
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&eventType=live&type=video&channelId=${encodeURIComponent(channelId)}&maxResults=1&key=${encodeURIComponent(key)}`); if (!response.ok) throw new Error(`YouTube live request failed (${response.status}).`);
  const data = await response.json() as { items?: { id?: { videoId?: string }; snippet?: { title?: string; thumbnails?: { high?: { url?: string } }; channelTitle?: string; publishedAt?: string } }[] }; const item = data.items?.[0];
  return item?.id?.videoId ? { isLive: true, state: 'live', videoId: item.id.videoId, title: item.snippet?.title, thumbnail: item.snippet?.thumbnails?.high?.url, category: item.snippet?.channelTitle, startedAt: item.snippet?.publishedAt } : noLive();
}

async function refreshYoutube(creators: CreatorRow[]) {
  if (!env.YOUTUBE_API_KEY) return markUnknown(creators);
  const results = await Promise.allSettled(creators.map(async (creator) => ({ creator, status: await getYouTubeStatus(creator) })));
  await Promise.all(results.filter((result): result is PromiseFulfilledResult<{ creator: CreatorRow; status: LiveStatus }> => result.status === 'fulfilled').map(({ value }) => updateCreatorStatus(value.creator.id, value.status)));
}

export async function refreshLiveStatuses(creators?: CreatorRow[]) {
  const activeCreators = creators ?? await readCreators(); const groups: Record<Platform, CreatorRow[]> = { twitch: [], kick: [], youtube: [] }; activeCreators.forEach((creator) => groups[creator.platform].push(creator));
  await Promise.allSettled([groups.twitch.length ? refreshTwitch(groups.twitch) : Promise.resolve(), groups.kick.length ? refreshKick(groups.kick) : Promise.resolve(), groups.youtube.length ? refreshYoutube(groups.youtube) : Promise.resolve()]);
}

const fallbackMetadata = (parsed: ParsedCreator): CreatorMetadata => ({
  channelId: parsed.channelId,
  displayName: parsed.username,
  avatarUrl: null,
  bannerUrl: null,
  description: null,
  subscriberCount: null,
  followerCount: null,
  videoCount: null,
  totalViewCount: null,
  resolved: false
});
const numberOrNull = (value: unknown) => { const number = typeof value === 'number' ? value : Number(value); return Number.isFinite(number) && number > 0 ? Math.floor(number) : null; };

async function resolveYouTubeMetadata(parsed: ParsedCreator): Promise<CreatorMetadata> {
  if (!env.YOUTUBE_API_KEY || parsed.username.startsWith('video-')) return fallbackMetadata(parsed);

  const lookup = parsed.channelId
    ? `id=${encodeURIComponent(parsed.channelId)}`
    : `forHandle=${encodeURIComponent(`@${parsed.username}`)}`;

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&${lookup}&key=${encodeURIComponent(env.YOUTUBE_API_KEY)}`
  );

  if (!response.ok) return fallbackMetadata(parsed);

  const data = await response.json() as {
    items?: {
      id?: string;
      snippet?: {
        title?: string;
        description?: string;
        thumbnails?: {
          high?: { url?: string };
          medium?: { url?: string };
          default?: { url?: string };
        };
      };
      statistics?: {
        subscriberCount?: string;
        hiddenSubscriberCount?: boolean;
        videoCount?: string;
        viewCount?: string;
      };
      brandingSettings?: {
        image?: {
          bannerExternalUrl?: string;
        };
      };
    }[];
  };

  const channel = data.items?.[0];

  if (!channel) {
    return { ...fallbackMetadata(parsed), resolved: true };
  }

  return {
    channelId: channel.id ?? parsed.channelId,
    displayName: channel.snippet?.title || parsed.username,
    avatarUrl:
      channel.snippet?.thumbnails?.high?.url ??
      channel.snippet?.thumbnails?.medium?.url ??
      channel.snippet?.thumbnails?.default?.url ??
      null,
    bannerUrl: channel.brandingSettings?.image?.bannerExternalUrl ?? null,
    description: channel.snippet?.description ?? null,
    subscriberCount: channel.statistics?.hiddenSubscriberCount
      ? null
      : numberOrNull(channel.statistics?.subscriberCount),
    followerCount: null,
    videoCount: numberOrNull(channel.statistics?.videoCount),
    totalViewCount: numberOrNull(channel.statistics?.viewCount),
    resolved: true,
  };
}

async function resolveKickMetadata(parsed: ParsedCreator): Promise<CreatorMetadata> {
  const token = await getKickToken(); if (!token) return fallbackMetadata(parsed);
  const channel = (await getKickChannels([{ platformUsername: parsed.username } as CreatorRow], token)).get(parsed.username);
  if (!channel) return { ...fallbackMetadata(parsed), resolved: true };
  return { channelId: null, displayName: channel.user?.username || channel.slug || parsed.username, avatarUrl: channel.user?.profile_pic ?? null, subscriberCount: null, followerCount: numberOrNull(channel.follower_count ?? channel.followers_count), resolved: true };
}

async function resolveTwitchMetadata(parsed: ParsedCreator): Promise<CreatorMetadata> {
  const token = await getTwitchToken(); if (!token || !env.TWITCH_CLIENT_ID) return fallbackMetadata(parsed);
  const response = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(parsed.username)}`, { headers: { 'Client-Id': env.TWITCH_CLIENT_ID, Authorization: `Bearer ${token}` } }); if (!response.ok) return fallbackMetadata(parsed);
  const data = await response.json() as { data?: { display_name?: string; profile_image_url?: string }[] }; const user = data.data?.[0];
  return user ? { channelId: null, displayName: user.display_name || parsed.username, avatarUrl: user.profile_image_url ?? null, subscriberCount: null, followerCount: null, resolved: true } : { ...fallbackMetadata(parsed), resolved: true };
}

export async function resolveCreatorMetadata(parsed: ParsedCreator): Promise<CreatorMetadata> {
  try { if (parsed.platform === 'youtube') return await resolveYouTubeMetadata(parsed); if (parsed.platform === 'kick') return await resolveKickMetadata(parsed); return await resolveTwitchMetadata(parsed); } catch { return fallbackMetadata(parsed); }
}

async function applyCreatorMetadata(id: number, parsed: ParsedCreator, metadata: CreatorMetadata) {
  const now = new Date().toISOString();
  await env.DB.prepare(`UPDATE creators SET platform_channel_id = COALESCE(?, platform_channel_id), display_name = CASE WHEN ? = 1 THEN COALESCE(?, display_name) ELSE display_name END, avatar_url = CASE WHEN ? = 1 THEN COALESCE(?, avatar_url) ELSE avatar_url END, subscriber_count = CASE WHEN ? = 1 THEN ? ELSE subscriber_count END, follower_count = CASE WHEN ? = 1 THEN ? ELSE follower_count END, profile_checked_at = ?, updated_at = ? WHERE id = ?`).bind(metadata.channelId ?? parsed.channelId, Number(metadata.resolved), metadata.displayName || null, Number(metadata.resolved), metadata.avatarUrl, Number(metadata.resolved), metadata.subscriberCount, Number(metadata.resolved), metadata.followerCount, now, now, id).run();
}

async function refreshCreatorProfiles(creators: CreatorRow[]) {
  await Promise.allSettled(creators.map(async (creator) => { const parsed: ParsedCreator = { platform: creator.platform, username: creator.platformUsername, channelId: creator.platformChannelId, originalUrl: creator.originalUrl, normalizedUrl: creator.normalizedUrl }; const metadata = await resolveCreatorMetadata(parsed); await applyCreatorMetadata(creator.id, parsed, metadata); }));
}

export async function createCreatorFromUrl(rawUrl: string) {
  const parsed = parseCreatorUrl(rawUrl); const existing = await env.DB.prepare('SELECT id FROM creators WHERE platform = ? AND platform_username = ?').bind(parsed.platform, parsed.username).first();
  if (existing) throw new CreatorDuplicateError('This channel has already been added.');
  const metadata = await resolveCreatorMetadata(parsed); const now = new Date().toISOString();
  const inserted = await env.DB.prepare(`INSERT INTO creators (platform, platform_username, platform_channel_id, original_url, normalized_url, display_name, avatar_url, subscriber_count, follower_count, featured, active, homepage_visible, sort_order, is_live, live_status, profile_checked_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 1, 0, 0, 'unknown', ?, ?, ?)`)
    .bind(parsed.platform, parsed.username, metadata.channelId, parsed.originalUrl, parsed.normalizedUrl, metadata.displayName, metadata.avatarUrl, metadata.subscriberCount, metadata.followerCount, now, now, now).run();
  const id = Number(inserted.meta.last_row_id); const creator = await getCreatorById(id); if (creator) await refreshLiveStatuses([creator]); return id;
}

export async function ensureInitialCreators() {
  if (seedInProgress) return seedInProgress;
  seedInProgress = (async () => { const seeded = await env.DB.prepare('SELECT seed_key FROM creator_seed_state WHERE seed_key = ?').bind(initialSeedKey).first(); if (seeded) return; for (const url of initialCreatorUrls) { try { await createCreatorFromUrl(url); } catch (error) { if (!(error instanceof CreatorDuplicateError)) throw error; } } await env.DB.prepare('INSERT OR IGNORE INTO creator_seed_state (seed_key, completed_at) VALUES (?, ?)').bind(initialSeedKey, new Date().toISOString()).run(); })().finally(() => { seedInProgress = null; });
  return seedInProgress;
}
