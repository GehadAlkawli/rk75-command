import { env } from 'cloudflare:workers';

const encoder = new TextEncoder();

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string, salt: string) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(`${salt}:${password}`)));
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

export type Session = { role: 'player' | 'admin'; playerId?: string };

export async function createSession(session: Session) {
  const payload = `${session.role}|${session.playerId ?? ''}|${Date.now() + 86_400_000}`;
  return `${payload}|${await sign(payload)}`;
}

export async function readSession(request: Request): Promise<Session | null> {
  const value = request.headers.get('Cookie')?.match(/(?:^|;\s*)fw_session=([^;]+)/)?.[1];
  if (!value) return null;
  const [role, playerId, expiresAt, signature] = value.split('|');
  const payload = [role, playerId, expiresAt].join('|');
  if ((role !== 'player' && role !== 'admin') || !signature || Date.now() > Number(expiresAt) || signature !== await sign(payload)) return null;
  return role === 'admin' ? { role } : { role, playerId };
}

export function sessionHeaders(token: string) {
  return { 'Set-Cookie': `fw_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400` };
}
