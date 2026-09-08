import { env } from 'cloudflare:workers';

const encoder = new TextEncoder();

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(env.SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: Request) {
  const body = await request.json() as { role?: 'player' | 'admin'; password?: string };
  const expected = body.role === 'admin' ? env.ADMIN_ACCESS_PASSWORD : env.PLAYER_ACCESS_PASSWORD;
  if (!body.role || !body.password || !expected || body.password !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const value = `${body.role}.${Date.now() + 86_400_000}`;
  const token = `${value}.${await sign(value)}`;
  return Response.json({ role: body.role }, { headers: { 'Set-Cookie': `fw_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400` } });
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': 'fw_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0' } });
}
