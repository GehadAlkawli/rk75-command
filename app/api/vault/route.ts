import { env } from 'cloudflare:workers';
import { readSession } from '@/lib/auth';

const unauthorized = () => Response.json({ error: 'Unauthorized' }, { status: 401 });
const validCiphertext = (value: unknown) => typeof value === 'string' && value.length > 8 && value.length <= 12000;

async function requireAdmin(request: Request) {
  const session = await readSession(request);
  return session?.role === 'admin';
}

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return unauthorized();
  const [settings, entries] = await Promise.all([
    env.DB.prepare('SELECT salt, verifier FROM admin_vault_settings WHERE id = 1').first<{ salt: string; verifier: string }>(),
    env.DB.prepare('SELECT id, encrypted_payload AS encryptedPayload, created_at AS createdAt, updated_at AS updatedAt FROM admin_vault_entries ORDER BY updated_at DESC, id DESC').all(),
  ]);
  return Response.json({ settings: settings ?? null, entries: entries.results });
}

export async function POST(request: Request) {
  if (!await requireAdmin(request)) return unauthorized();
  const body = await request.json() as { action?: 'setup' | 'entry'; salt?: string; verifier?: string; encryptedPayload?: string };
  const now = new Date().toISOString();
  if (body.action === 'setup') {
    if (!validCiphertext(body.salt) || !validCiphertext(body.verifier)) return Response.json({ error: 'Invalid vault setup.' }, { status: 400 });
    const existing = await env.DB.prepare('SELECT id FROM admin_vault_settings WHERE id = 1').first();
    if (existing) return Response.json({ error: 'Vault is already configured.' }, { status: 409 });
    await env.DB.prepare('INSERT INTO admin_vault_settings (id, salt, verifier, created_at) VALUES (1, ?, ?, ?)').bind(body.salt, body.verifier, now).run();
    return Response.json({ ok: true });
  }
  if (body.action === 'entry' && validCiphertext(body.encryptedPayload)) {
    const result = await env.DB.prepare('INSERT INTO admin_vault_entries (encrypted_payload, created_at, updated_at) VALUES (?, ?, ?)').bind(body.encryptedPayload, now, now).run();
    return Response.json({ id: result.meta.last_row_id, createdAt: now, updatedAt: now });
  }
  return Response.json({ error: 'Invalid vault request.' }, { status: 400 });
}

export async function PATCH(request: Request) {
  if (!await requireAdmin(request)) return unauthorized();
  const body = await request.json() as { id?: number; encryptedPayload?: string };
  if (!Number.isInteger(body.id) || !validCiphertext(body.encryptedPayload)) return Response.json({ error: 'Invalid vault entry.' }, { status: 400 });
  const now = new Date().toISOString();
  await env.DB.prepare('UPDATE admin_vault_entries SET encrypted_payload = ?, updated_at = ? WHERE id = ?').bind(body.encryptedPayload, now, body.id).run();
  return Response.json({ ok: true, updatedAt: now });
}

export async function DELETE(request: Request) {
  if (!await requireAdmin(request)) return unauthorized();
  const body = await request.json() as { id?: number };
  if (!Number.isInteger(body.id)) return Response.json({ error: 'Invalid vault entry.' }, { status: 400 });
  await env.DB.prepare('DELETE FROM admin_vault_entries WHERE id = ?').bind(body.id).run();
  return Response.json({ ok: true });
}
