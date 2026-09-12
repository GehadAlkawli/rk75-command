import { env } from 'cloudflare:workers';

export type Platform = 'kick' | 'twitch' | 'youtube';
export type LiveState = 'live' | 'offline' | 'unknown';
export type CreatorRow = {
  id: number; platform: Platform; platformUsername: string; platformChannelId: string | null; originalUrl: string; normalizedUrl: string;
  displayName: string | null; avatarUrl: string | null; teamId: string | null; featured: number; active: number; isLive: number; liveStatus: LiveState;
  currentStreamId: string | null; currentVideoId: string | null; streamTitle: string | null; thumbnailUrl: string | null; viewerCount: number | null; category: string | null; streamStartedAt: string | null; lastCheckedAt: string | null; createdAt: string; updatedAt: string;
};
export type Creator = Omit<CreatorRow, 'featured' | 'active' | 'isLive'> & { featured: boolean; active: boolean; isLive: boolean; slug: string };
export type ParsedCreator = { platform: Platform; username: string; channelId: string | null; originalUrl: string; normalizedUrl: string };
export type LiveStatus = { isLive: boolean; state: LiveState; title?: string | null; thumbnail?: string | null; viewerCount?: number | null; category?: string | null; startedAt?: string | null; videoId?: string | null; streamId?: string | null };

const cacheMs = 60_000;
let lastRefresh = 0;
let refreshing: Promise<void> | null = null;
let twitchToken: { token: string; expiresAt: number } | null = null;
let kickToken: { token: string; expiresAt: number } | null = null;

const noLive = (): LiveStatus => ({ isLive: false, state: 'offline' });
const unknown = (): LiveStatus => ({ isLive: false, state: 'unknown' });
const usernamePattern = /^[a-zA-Z0-9_.-]{2,100}$/;
const videoPattern = /^[a-zA-Z0-9_-]{6,40}$/;

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
  return { ...row, featured: Boolean(row.featured), active: Boolean(row.active), isLive: Boolean(row.isLive), slug: creatorSlug(row) };
}

async function readCreators(includeInactive = false) {
  const result = await env.DB.prepare(`SELECT id, platform, platform_username AS platformUsername, platform_channel_id AS platformChannelId, original_url AS originalUrl, normalized_url AS normalizedUrl,
    display_name AS displayName, avatar_url AS avatarUrl, team_id AS teamId, featured, active, is_live AS isLive, live_status AS liveStatus,
    current_stream_id AS currentStreamId, current_video_id AS currentVideoId, stream_title AS streamTitle, thumbnail_url AS thumbnailUrl, viewer_count AS viewerCount,
    category, stream_started_at AS streamStartedAt, last_checked_at AS lastCheckedAt, created_at AS createdAt, updated_at AS updatedAt
    FROM creators ${includeInactive ? '' : 'WHERE active = 1'} ORDER BY featured DESC, is_live DESC, viewer_count DESC, created_at DESC`).all<CreatorRow>();
  return result.results ?? [];
}

export async function listCreators(liveOnly = false) {
  const before = await readCreators();
  await maybeRefresh(before);
  const creators = (await readCreators()).map(toCreator);
  return liveOnly ? creators.filter((creator) => creator.isLive) : creators;
}

export async function listAllCreators() {
  const before = await readCreators(true);
  await maybeRefresh(before.filter((creator) => creator.active));
  return (await readCreators(true)).map(toCreator);
}

async function maybeRefresh(creators: CreatorRow[]) {
  if (!creators.length || Date.now() - lastRefresh < cacheMs) return;
  const stale = creators.some((creator) => !creator.lastCheckedAt || Date.now() - Date.parse(creator.lastCheckedAt) > cacheMs);
  if (!stale) { lastRefresh = Date.now(); return; }
  if (!refreshing) refreshing = refreshLiveStatuses(creators).finally(() => { lastRefresh = Date.now(); refreshing = null; });
  await refreshing;
}

async function updateCreatorStatus(id: number, status: LiveStatus) {
  const now = new Date().toISOString();
  await env.DB.prepare(`UPDATE creators SET is_live = ?, live_status = ?, current_stream_id = ?, current_video_id = ?, stream_title = ?, thumbnail_url = ?, viewer_count = ?, category = ?, stream_started_at = ?, last_checked_at = ?, updated_at = ? WHERE id = ?`)
    .bind(status.isLive ? 1 : 0, status.state, status.streamId ?? null, status.videoId ?? null, status.title ?? null, status.thumbnail ?? null, status.viewerCount ?? null, status.category ?? null, status.startedAt ?? null, now, now, id).run();
}

async function markUnknown(creators: CreatorRow[]) {
  await Promise.all(creators.map((creator) => updateCreatorStatus(creator.id, unknown())));
}

async function getTwitchToken() {
  if (twitchToken && twitchToken.expiresAt > Date.now()) return twitchToken.token;
  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) return null;
  const response = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.TWITCH_CLIENT_ID, client_secret: env.TWITCH_CLIENT_SECRET, grant_type: 'client_credentials' }) });
  if (!response.ok) throw new Error(`Twitch token request failed (${response.status}).`);
  const data = await response.json() as { access_token: string; expires_in: number };
  twitchToken = { token: data.access_token, expiresAt: Date.now() + Math.max(60, data.expires_in - 60) * 1000 };
  return twitchToken.token;
}

async function refreshTwitch(creators: CreatorRow[]) {
  const token = await getTwitchToken();
  if (!token || !env.TWITCH_CLIENT_ID) return markUnknown(creators);
  type TwitchStream = { id: string; user_login: string; title: string; game_name: string; viewer_count: number; started_at: string; thumbnail_url: string };
  const streams: TwitchStream[] = [];
  for (let start = 0; start < creators.length; start += 100) {
    const params = new URLSearchParams(); creators.slice(start, start + 100).forEach((creator) => params.append('user_login', creator.platformUsername));
    const response = await fetch(`https://api.twitch.tv/helix/streams?${params}`, { headers: { 'Client-Id': env.TWITCH_CLIENT_ID, Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Twitch live request failed (${response.status}).`);
    const data = await response.json() as { data?: TwitchStream[] };
    streams.push(...(data.data ?? []));
  }
  const byUsername = new Map(streams.map((stream) => [stream.user_login.toLowerCase(), stream]));
  await Promise.all(creators.map((creator) => { const stream = byUsername.get(creator.platformUsername); return updateCreatorStatus(creator.id, stream ? { isLive: true, state: 'live', streamId: stream.id, title: stream.title, category: stream.game_name, viewerCount: stream.viewer_count, startedAt: stream.started_at, thumbnail: stream.thumbnail_url.replace('{width}', '640').replace('{height}', '360') } : noLive()); }));
}

async function getKickToken() {
  if (kickToken && kickToken.expiresAt > Date.now()) return kickToken.token;
  if (!env.KICK_CLIENT_ID || !env.KICK_CLIENT_SECRET) return null;
  const response = await fetch('https://id.kick.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.KICK_CLIENT_ID, client_secret: env.KICK_CLIENT_SECRET, grant_type: 'client_credentials' }) });
  if (!response.ok) throw new Error(`Kick token request failed (${response.status}).`);
  const data = await response.json() as { access_token: string; expires_in: number };
  kickToken = { token: data.access_token, expiresAt: Date.now() + Math.max(60, data.expires_in - 60) * 1000 };
  return kickToken.token;
}

async function refreshKick(creators: CreatorRow[]) {
  const token = await getKickToken();
  if (!token) return markUnknown(creators);
  type KickChannel = { slug?: string; category?: { name?: string }; stream?: { is_live?: boolean; id?: string; title?: string; viewer_count?: number; thumbnail?: string; start_time?: string; category?: { name?: string } } };
  const allChannels: KickChannel[] = [];
  for (let start = 0; start < creators.length; start += 50) {
    const params = new URLSearchParams(); creators.slice(start, start + 50).forEach((creator) => params.append('slug', creator.platformUsername));
    const response = await fetch(`https://api.kick.com/public/v1/channels?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Kick live request failed (${response.status}).`);
    const data = await response.json() as { data?: KickChannel[] };
    allChannels.push(...(data.data ?? []));
  }
  const channels = new Map(allChannels.filter((channel) => channel.slug).map((channel) => [channel.slug!.toLowerCase(), channel]));
  await Promise.all(creators.map((creator) => { const channel = channels.get(creator.platformUsername); const stream = channel?.stream; return updateCreatorStatus(creator.id, stream?.is_live ? { isLive: true, state: 'live', streamId: stream.id, title: stream.title, viewerCount: stream.viewer_count, thumbnail: stream.thumbnail, startedAt: stream.start_time, category: stream.category?.name ?? channel?.category?.name } : noLive()); }));
}

async function getYouTubeStatus(creator: CreatorRow): Promise<LiveStatus> {
  const key = env.YOUTUBE_API_KEY;
  if (!key) return unknown();
  const videoFromUsername = creator.platformUsername.startsWith('video-') ? creator.platformUsername.slice(6) : null;
  if (videoFromUsername) {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${encodeURIComponent(videoFromUsername)}&key=${encodeURIComponent(key)}`);
    if (!response.ok) throw new Error(`YouTube video request failed (${response.status}).`);
    const data = await response.json() as { items?: { id: string; snippet?: { title?: string; thumbnails?: { high?: { url?: string } }; liveBroadcastContent?: string; channelTitle?: string }; liveStreamingDetails?: { concurrentViewers?: string; actualStartTime?: string } }[] };
    const video = data.items?.[0];
    return video?.snippet?.liveBroadcastContent === 'live' ? { isLive: true, state: 'live', videoId: video.id, title: video.snippet.title, thumbnail: video.snippet.thumbnails?.high?.url, viewerCount: Number(video.liveStreamingDetails?.concurrentViewers ?? 0) || null, startedAt: video.liveStreamingDetails?.actualStartTime, category: video.snippet.channelTitle } : noLive();
  }
  let channelId = creator.platformChannelId;
  if (!channelId) {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(`@${creator.platformUsername}`)}&key=${encodeURIComponent(key)}`);
    if (!response.ok) throw new Error(`YouTube channel request failed (${response.status}).`);
    const data = await response.json() as { items?: { id: string }[] };
    channelId = data.items?.[0]?.id ?? null;
    if (channelId) await env.DB.prepare('UPDATE creators SET platform_channel_id = ?, updated_at = ? WHERE id = ?').bind(channelId, new Date().toISOString(), creator.id).run();
  }
  if (!channelId) return noLive();
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&eventType=live&type=video&channelId=${encodeURIComponent(channelId)}&maxResults=1&key=${encodeURIComponent(key)}`);
  if (!response.ok) throw new Error(`YouTube live request failed (${response.status}).`);
  const data = await response.json() as { items?: { id?: { videoId?: string }; snippet?: { title?: string; thumbnails?: { high?: { url?: string } }; channelTitle?: string; publishedAt?: string } }[] };
  const item = data.items?.[0];
  return item?.id?.videoId ? { isLive: true, state: 'live', videoId: item.id.videoId, title: item.snippet?.title, thumbnail: item.snippet?.thumbnails?.high?.url, category: item.snippet?.channelTitle, startedAt: item.snippet?.publishedAt } : noLive();
}

async function refreshYoutube(creators: CreatorRow[]) {
  if (!env.YOUTUBE_API_KEY) return markUnknown(creators);
  const results = await Promise.allSettled(creators.map(async (creator) => ({ creator, status: await getYouTubeStatus(creator) })));
  await Promise.all(results.filter((result): result is PromiseFulfilledResult<{ creator: CreatorRow; status: LiveStatus }> => result.status === 'fulfilled').map(({ value }) => updateCreatorStatus(value.creator.id, value.status)));
}

export async function refreshLiveStatuses(creators?: CreatorRow[]) {
  const activeCreators = creators ?? await readCreators();
  const groups: Record<Platform, CreatorRow[]> = { twitch: [], kick: [], youtube: [] };
  activeCreators.forEach((creator) => groups[creator.platform].push(creator));
  await Promise.allSettled([
    groups.twitch.length ? refreshTwitch(groups.twitch) : Promise.resolve(),
    groups.kick.length ? refreshKick(groups.kick) : Promise.resolve(),
    groups.youtube.length ? refreshYoutube(groups.youtube) : Promise.resolve(),
  ]);
}

export async function resolveCreatorMetadata(parsed: ParsedCreator) {
  if (parsed.platform !== 'youtube' || !env.YOUTUBE_API_KEY || parsed.channelId || parsed.username.startsWith('video-')) return { channelId: parsed.channelId, displayName: parsed.username, avatarUrl: null };
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${encodeURIComponent(`@${parsed.username}`)}&key=${encodeURIComponent(env.YOUTUBE_API_KEY)}`);
    if (!response.ok) return { channelId: null, displayName: parsed.username, avatarUrl: null };
    const data = await response.json() as { items?: { id: string; snippet?: { title?: string; thumbnails?: { default?: { url?: string } } } }[] };
    const channel = data.items?.[0];
    return { channelId: channel?.id ?? null, displayName: channel?.snippet?.title ?? parsed.username, avatarUrl: channel?.snippet?.thumbnails?.default?.url ?? null };
  } catch { return { channelId: null, displayName: parsed.username, avatarUrl: null }; }
}
