import { env } from 'cloudflare:workers';
import { readSession } from '@/lib/auth';
import { CreatorDuplicateError, createCreatorFromUrl, listAllCreators, listCreators } from '@/lib/streams';

const bad = (error: string, status = 400) => Response.json({ error }, { status });
const requireAdmin = async (request: Request) => (await readSession(request))?.role === 'admin';

export async function GET(request: Request) {
  const homepageOnly = new URL(request.url).searchParams.get('homepage') === 'true';
  if (homepageOnly) return Response.json(await listCreators(false, true));
  return Response.json(await (await requireAdmin(request) ? listAllCreators() : listCreators()));
}

export async function POST(request: Request) {
  if (!await requireAdmin(request)) return bad('Administrator access is required.', 401);
  const { url } = await request.json() as { url?: string };
  try { return Response.json({ id: await createCreatorFromUrl(url ?? '') }, { status: 201 }); }
  catch (error) {
    if (error instanceof CreatorDuplicateError) return bad(error.message, 409);
    return bad(error instanceof Error ? error.message : 'Invalid creator URL.');
  }
}

export async function PATCH(request: Request) {
  if (!await requireAdmin(request)) return bad('Administrator access is required.', 401);
  const body = await request.json() as { id?: number; featured?: boolean; active?: boolean; homepageVisible?: boolean; displayName?: string; teamId?: string; sortOrder?: number };
  if (!Number.isInteger(body.id)) return bad('Invalid creator.');
  const current = await env.DB.prepare('SELECT id FROM creators WHERE id = ?').bind(body.id).first();
  if (!current) return bad('Creator not found.', 404);
  const name = typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 100) : null;
  const team = typeof body.teamId === 'string' ? body.teamId.trim().slice(0, 80) : null;
  const order = Number.isInteger(body.sortOrder) ? Math.max(0, Math.min(10_000, Number(body.sortOrder))) : null;
  await env.DB.prepare(`UPDATE creators SET featured = COALESCE(?, featured), active = COALESCE(?, active), homepage_visible = COALESCE(?, homepage_visible), sort_order = COALESCE(?, sort_order), display_name = COALESCE(?, display_name), team_id = COALESCE(?, team_id), updated_at = ? WHERE id = ?`)
    .bind(typeof body.featured === 'boolean' ? Number(body.featured) : null, typeof body.active === 'boolean' ? Number(body.active) : null, typeof body.homepageVisible === 'boolean' ? Number(body.homepageVisible) : null, order, name || null, team || null, new Date().toISOString(), body.id).run();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!await requireAdmin(request)) return bad('Administrator access is required.', 401);
  const { id } = await request.json() as { id?: number };
  if (!Number.isInteger(id)) return bad('Invalid creator.');
  await env.DB.prepare('DELETE FROM creators WHERE id = ?').bind(id).run();
  return Response.json({ ok: true });
}
