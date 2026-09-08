import { env } from 'cloudflare:workers';
import { createSession, hashPassword, readSession, sessionHeaders } from '@/lib/auth';

type RequestBody = {
  action?: 'register' | 'login';
  role?: 'player' | 'admin';
  playerId?: string;
  name?: string;
  password?: string;
};

const bad = (message: string, status = 400) => Response.json({ error: message }, { status });

export async function GET(request: Request) {
  const session = await readSession(request);
  return session ? Response.json(session) : bad('Unauthorized', 401);
}

export async function POST(request: Request) {
  const body = await request.json() as RequestBody;
  if (body.role === 'admin') {
    if (body.password !== env.ADMIN_ACCESS_PASSWORD) return bad('Unauthorized', 401);
    return Response.json({ role: 'admin' }, { headers: sessionHeaders(await createSession({ role: 'admin' })) });
  }
  if (body.role !== 'player' || !body.action) return bad('Invalid request');
  const playerId = body.playerId?.trim();
  const password = body.password ?? '';
  if (!playerId || !/^\d{3,24}$/.test(playerId) || password.length < 6) return bad('Enter a valid Player ID and a password of at least 6 characters.');
  if (body.action === 'register') {
    const name = body.name?.trim();
    if (!name || name.length < 2) return bad('Enter your in-game name.');
    const existing = await env.DB.prepare('SELECT player_id FROM players WHERE player_id = ?').bind(playerId).first();
    if (existing) return bad('This Player ID is already registered.', 409);
    const salt = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO players (player_id, display_name, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)').bind(playerId, name, await hashPassword(password, salt), salt, new Date().toISOString()).run();
  } else {
    const player = await env.DB.prepare('SELECT password_hash, password_salt FROM players WHERE player_id = ?').bind(playerId).first<{ password_hash: string; password_salt: string }>();
    if (!player || await hashPassword(password, player.password_salt) !== player.password_hash) return bad('Unauthorized', 401);
  }
  return Response.json({ role: 'player', playerId }, { headers: sessionHeaders(await createSession({ role: 'player', playerId })) });
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': 'fw_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' } });
}
