import { env } from 'cloudflare:workers';
import { readSession } from '@/lib/auth';

type SubmissionInput = { id?: number; name?: string; power?: number; kills?: number; defeat?: number; troops?: number; note?: string; status?: 'approved' | 'rejected' };
const unauthorized = () => Response.json({ error: 'Unauthorized' }, { status: 401 });
const asNumber = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
const validName = (value: unknown) => typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 60 ? value.trim() : null;

export async function GET(request: Request) {
  const session = await readSession(request);
  if (!session || new URL(request.url).searchParams.get('public') === '1') {
    const data = await env.DB.prepare(`WITH scans AS (
      SELECT id, player_id AS playerId, player_name AS playerName, power, kills, defeat, troops, submitted_at AS submittedAt,
        LAG(player_name) OVER (PARTITION BY player_id ORDER BY submitted_at, id) AS beforeName,
        LAG(power) OVER (PARTITION BY player_id ORDER BY submitted_at, id) AS beforePower,
        LAG(kills) OVER (PARTITION BY player_id ORDER BY submitted_at, id) AS beforeKills,
        LAG(defeat) OVER (PARTITION BY player_id ORDER BY submitted_at, id) AS beforeDefeat,
        LAG(troops) OVER (PARTITION BY player_id ORDER BY submitted_at, id) AS beforeTroops,
        ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY submitted_at DESC, id DESC) AS row_number
      FROM submissions WHERE status = 'approved'
    ) SELECT * FROM scans WHERE row_number = 1 ORDER BY kills DESC`).all();
    return Response.json(data.results);
  }
  const statement = session.role === 'admin'
    ? env.DB.prepare('SELECT id, player_id AS playerId, player_name AS playerName, power, kills, defeat, troops, screenshot_key AS screenshotKey, note, status, submitted_at AS submittedAt, reviewed_at AS reviewedAt FROM submissions ORDER BY submitted_at DESC, id DESC')
    : env.DB.prepare('SELECT id, player_id AS playerId, player_name AS playerName, power, kills, defeat, troops, screenshot_key AS screenshotKey, note, status, submitted_at AS submittedAt, reviewed_at AS reviewedAt FROM submissions WHERE player_id = ? ORDER BY submitted_at DESC, id DESC').bind(session.playerId);
  const data = await statement.all();
  return Response.json(data.results);
}

export async function POST(request: Request) {
  const session = await readSession(request);
  if (!session || session.role !== 'player' || !session.playerId) return unauthorized();
  const body = await request.json() as SubmissionInput;
  const values = [asNumber(body.power), asNumber(body.kills), asNumber(body.defeat), asNumber(body.troops)];
  if (values.some((value) => value === null)) return Response.json({ error: 'Stats must be valid non-negative whole numbers.' }, { status: 400 });
  const player = await env.DB.prepare('SELECT display_name FROM players WHERE player_id = ?').bind(session.playerId).first<{ display_name: string }>();
  if (!player) return unauthorized();
  const period = await env.DB.prepare("SELECT id FROM scan_periods WHERE status = 'open' ORDER BY id DESC LIMIT 1").first<{ id: number }>();
  const now = new Date().toISOString();
  const result = await env.DB.prepare('INSERT INTO submissions (player_id, player_name, period_id, power, kills, defeat, troops, note, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(session.playerId, player.display_name, period?.id ?? null, values[0], values[1], values[2], values[3], body.note?.trim().slice(0, 500) || null, 'pending', now).run();
  return Response.json({ id: result.meta.last_row_id, status: 'pending', submittedAt: now });
}

export async function PATCH(request: Request) {
  const session = await readSession(request);
  if (!session) return unauthorized();
  const body = await request.json() as SubmissionInput;
  if (!Number.isInteger(body.id)) return Response.json({ error: 'Invalid member request.' }, { status: 400 });
  const now = new Date().toISOString();
  const values = [asNumber(body.power), asNumber(body.kills), asNumber(body.defeat), asNumber(body.troops)];
  const wantsStats = values.some((value) => value !== null) || body.name !== undefined;
  if (session.role === 'player') {
    if (!wantsStats || values.some((value) => value === null)) return Response.json({ error: 'Every statistic must be a valid whole number.' }, { status: 400 });
    const current = await env.DB.prepare('SELECT player_id, player_name FROM submissions WHERE id = ?').bind(body.id).first<{ player_id: string; player_name: string }>();
    if (!current || current.player_id !== session.playerId) return unauthorized();
    const name = validName(body.name) ?? current.player_name;
    await env.DB.batch([
      env.DB.prepare('UPDATE players SET display_name = ? WHERE player_id = ?').bind(name, session.playerId),
      env.DB.prepare('UPDATE submissions SET player_name = ?, power = ?, kills = ?, defeat = ?, troops = ?, note = ? WHERE id = ?').bind(name, values[0], values[1], values[2], values[3], body.note?.trim().slice(0, 500) || null, body.id),
      env.DB.prepare('INSERT INTO audit_events (actor, action, submission_id, detail, created_at) VALUES (?, ?, ?, ?, ?)').bind(`player:${session.playerId}`, 'player_edited', body.id, 'Player edited own statistics', now),
    ]);
    return Response.json({ ok: true });
  }
  if (wantsStats) {
    if (values.some((value) => value === null)) return Response.json({ error: 'Every statistic must be a valid whole number.' }, { status: 400 });
    const existing = await env.DB.prepare('SELECT player_id, player_name FROM submissions WHERE id = ?').bind(body.id).first<{ player_id: string; player_name: string }>();
    if (!existing) return Response.json({ error: 'Player not found.' }, { status: 404 });
    const name = validName(body.name) ?? existing.player_name;
    await env.DB.batch([
      env.DB.prepare('UPDATE players SET display_name = ? WHERE player_id = ?').bind(name, existing.player_id),
      env.DB.prepare('UPDATE submissions SET player_name = ?, power = ?, kills = ?, defeat = ?, troops = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?').bind(name, values[0], values[1], values[2], values[3], now, 'admin', body.id),
      env.DB.prepare('INSERT INTO audit_events (actor, action, submission_id, detail, created_at) VALUES (?, ?, ?, ?, ?)').bind('admin', 'submission_edited', body.id, 'Admin edited player statistics', now),
    ]);
    return Response.json({ ok: true });
  }
  if (body.status !== 'approved' && body.status !== 'rejected') return Response.json({ error: 'Invalid review request.' }, { status: 400 });
  await env.DB.batch([
    env.DB.prepare('UPDATE submissions SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?').bind(body.status, now, 'admin', body.id),
    env.DB.prepare('INSERT INTO audit_events (actor, action, submission_id, detail, created_at) VALUES (?, ?, ?, ?, ?)').bind('admin', `submission_${body.status}`, body.id, body.status, now),
  ]);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await readSession(request);
  if (!session || session.role !== 'admin') return unauthorized();
  const body = await request.json() as { playerId?: string };
  if (!body.playerId || !/^\d{3,24}$/.test(body.playerId)) return Response.json({ error: 'Invalid player.' }, { status: 400 });
  await env.DB.batch([
    env.DB.prepare('DELETE FROM audit_events WHERE submission_id IN (SELECT id FROM submissions WHERE player_id = ?)').bind(body.playerId),
    env.DB.prepare('DELETE FROM submissions WHERE player_id = ?').bind(body.playerId),
    env.DB.prepare('DELETE FROM players WHERE player_id = ?').bind(body.playerId),
  ]);
  return Response.json({ ok: true });
}
