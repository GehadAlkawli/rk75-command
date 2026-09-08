import { env } from 'cloudflare:workers';
import { readSession } from '@/lib/auth';

type SubmissionInput = { power?: number; kills?: number; defeat?: number; troops?: number; note?: string };
const unauthorized = () => Response.json({ error: 'Unauthorized' }, { status: 401 });
const asNumber = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;

export async function GET(request: Request) {
  const session = await readSession(request);
  if (!session) {
    const data = await env.DB.prepare(`WITH ranked AS (
      SELECT id, player_id AS playerId, player_name AS playerName, power, kills, defeat, troops, submitted_at AS submittedAt,
        LAG(power) OVER (PARTITION BY player_id ORDER BY submitted_at) AS previousPower,
        LAG(kills) OVER (PARTITION BY player_id ORDER BY submitted_at) AS previousKills,
        LAG(defeat) OVER (PARTITION BY player_id ORDER BY submitted_at) AS previousDefeat,
        LAG(troops) OVER (PARTITION BY player_id ORDER BY submitted_at) AS previousTroops,
        ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY submitted_at DESC) AS position
      FROM submissions WHERE status = 'approved'
    ) SELECT * FROM ranked WHERE position = 1 ORDER BY kills DESC`).all();
    return Response.json(data.results);
  }
  const statement = session.role === 'admin'
    ? env.DB.prepare('SELECT id, player_id as playerId, player_name as playerName, power, kills, defeat, troops, status, submitted_at as submittedAt, reviewed_at as reviewedAt FROM submissions ORDER BY submitted_at DESC')
    : env.DB.prepare('SELECT id, player_id as playerId, player_name as playerName, power, kills, defeat, troops, status, submitted_at as submittedAt, reviewed_at as reviewedAt FROM submissions WHERE player_id = ? ORDER BY submitted_at DESC').bind(session.playerId);
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
  if (!session || session.role !== 'admin') return unauthorized();
  const body = await request.json() as { id?: number; status?: 'approved' | 'rejected' };
  if (!Number.isInteger(body.id) || (body.status !== 'approved' && body.status !== 'rejected')) return Response.json({ error: 'Invalid review request.' }, { status: 400 });
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare('UPDATE submissions SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?').bind(body.status, now, 'admin', body.id),
    env.DB.prepare('INSERT INTO audit_events (actor, action, submission_id, detail, created_at) VALUES (?, ?, ?, ?, ?)').bind('admin', `submission_${body.status}`, body.id, body.status, now),
  ]);
  return Response.json({ ok: true });
}
