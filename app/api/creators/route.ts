import { env } from 'cloudflare:workers';
import { readSession } from '@/lib/auth';
import { CreatorRow, listAllCreators, listCreators, parseCreatorUrl, refreshLiveStatuses, resolveCreatorMetadata } from '@/lib/streams';

const bad = (error: string, status = 400) => Response.json({ error }, { status });
const requireAdmin = async (request: Request) => { const session = await readSession(request); return session?.role === 'admin'; };

export async function GET(request: Request) { return Response.json(await (await requireAdmin(request) ? listAllCreators() : listCreators())); }

export async function POST(request: Request) {
  if (!await requireAdmin(request)) return bad('Administrator access is required.', 401);
  const { url } = await request.json() as { url?: string };
  let parsed;
  try { parsed = parseCreatorUrl(url ?? ''); } catch (error) { return bad(error instanceof Error ? error.message : 'Invalid creator URL.'); }
  const existing = await env.DB.prepare('SELECT id FROM creators WHERE platform = ? AND platform_username = ?').bind(parsed.platform, parsed.username).first();
  if (existing) return bad('This channel has already been added.', 409);
  const metadata = await resolveCreatorMetadata(parsed);
  const now = new Date().toISOString();
  const inserted = await env.DB.prepare(`INSERT INTO creators (platform, platform_username, platform_channel_id, original_url, normalized_url, display_name, avatar_url, featured, active, is_live, live_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, 0, 'unknown', ?, ?)`)
    .bind(parsed.platform, parsed.username, metadata.channelId, parsed.originalUrl, parsed.normalizedUrl, metadata.displayName, metadata.avatarUrl, now, now).run();
  const id = Number(inserted.meta.last_row_id);
  const creator = await env.DB.prepare(`SELECT id, platform, platform_username AS platformUsername, platform_channel_id AS platformChannelId, original_url AS originalUrl, normalized_url AS normalizedUrl,
    display_name AS displayName, avatar_url AS avatarUrl, team_id AS teamId, featured, active, is_live AS isLive, live_status AS liveStatus, current_stream_id AS currentStreamId, current_video_id AS currentVideoId,
    stream_title AS streamTitle, thumbnail_url AS thumbnailUrl, viewer_count AS viewerCount, category, stream_started_at AS streamStartedAt, last_checked_at AS lastCheckedAt, created_at AS createdAt, updated_at AS updatedAt FROM creators WHERE id = ?`).bind(id).first();
  if (creator) await refreshLiveStatuses([creator as CreatorRow]);
  return Response.json({ id }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!await requireAdmin(request)) return bad('Administrator access is required.', 401);
  const { id, featured, active, displayName, teamId } = await request.json() as { id?: number; featured?: boolean; active?: boolean; displayName?: string; teamId?: string };
  if (!Number.isInteger(id)) return bad('Invalid creator.');
  const current = await env.DB.prepare('SELECT id FROM creators WHERE id = ?').bind(id).first();
  if (!current) return bad('Creator not found.', 404);
  const name = typeof displayName === 'string' ? displayName.trim().slice(0, 100) : null;
  const team = typeof teamId === 'string' ? teamId.trim().slice(0, 80) : null;
  await env.DB.prepare(`UPDATE creators SET featured = COALESCE(?, featured), active = COALESCE(?, active), display_name = COALESCE(?, display_name), team_id = COALESCE(?, team_id), updated_at = ? WHERE id = ?`)
    .bind(typeof featured === 'boolean' ? Number(featured) : null, typeof active === 'boolean' ? Number(active) : null, name || null, team || null, new Date().toISOString(), id).run();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!await requireAdmin(request)) return bad('Administrator access is required.', 401);
  const { id } = await request.json() as { id?: number };
  if (!Number.isInteger(id)) return bad('Invalid creator.');
  await env.DB.prepare('DELETE FROM creators WHERE id = ?').bind(id).run();
  return Response.json({ ok: true });
}
