import { env } from 'cloudflare:workers';
import { readSession } from '@/lib/auth';

const mediaLimit = 6;
const allowedVideoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const bad = (error: string, status = 400) => Response.json({ error }, { status });

type PostRow = { id: number; kind: 'short' | 'article' | 'idea'; title: string; body: string | null; createdAt: string };
type AssetRow = { id: number; postId: number; position: number; contentType: string; mediaType: 'image' | 'video' };

export async function GET() {
  const posts = await env.DB.prepare(`SELECT id, kind, title, body, created_at AS createdAt
    FROM media_posts ORDER BY created_at DESC, id DESC`).all<PostRow>();
  const rows = posts.results ?? [];
  if (!rows.length) return Response.json([]);
  const ids = rows.map((post) => post.id);
  const placeholders = ids.map(() => '?').join(',');
  const assets = await env.DB.prepare(`SELECT id, post_id AS postId, position, content_type AS contentType, media_type AS mediaType
    FROM media_assets WHERE post_id IN (${placeholders}) ORDER BY post_id, position`).bind(...ids).all<AssetRow>();
  const byPost = new Map<number, AssetRow[]>();
  for (const asset of assets.results ?? []) byPost.set(asset.postId, [...(byPost.get(asset.postId) ?? []), asset]);
  return Response.json(rows.map((post) => ({ ...post, assets: (byPost.get(post.id) ?? []).map((asset) => ({ ...asset, url: `/api/media/assets/${asset.id}` })) })));
}

export async function POST(request: Request) {
  const session = await readSession(request);
  if (!session || session.role !== 'admin') return bad('Administrator access is required.', 401);
  const form = await request.formData();
  const kind = form.get('kind');
  const rawTitle = form.get('title');
  const rawBody = form.get('body');
  const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
  const body = typeof rawBody === 'string' ? rawBody.trim() : '';
  const assets = form.getAll('assets').filter((value): value is File => value instanceof File && value.size > 0);
  if (kind !== 'short' && kind !== 'article' && kind !== 'idea') return bad('Choose a valid content type.');
  if (title.length > 120 || body.length > 5000 || (!title && !body && !assets.length)) return bad('Add a title, message, or media item.');
  if (assets.length > mediaLimit) return bad('You can upload a maximum of 6 media files.');
  if (assets.some((file) => !file.type.startsWith('image/') && !allowedVideoTypes.has(file.type))) return bad('Only images or MP4, WebM, and MOV videos are allowed.');
  if (assets.some((file) => file.type.startsWith('image/') && file.size > 6 * 1024 * 1024)) return bad('Each image must be 6 MB or less.');
  if (assets.some((file) => allowedVideoTypes.has(file.type) && file.size > 25 * 1024 * 1024)) return bad('Each video must be 25 MB or less.');
  const now = new Date().toISOString();
  const result = await env.DB.prepare('INSERT INTO media_posts (kind, title, body, created_by, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(kind, title || 'RK75 Media', body || null, 'admin', now).run();
  const postId = Number(result.meta.last_row_id);
  const statements: D1PreparedStatement[] = [];
  for (const [position, file] of assets.entries()) {
    const objectKey = `rk-media/${postId}/${position}-${crypto.randomUUID()}`;
    await env.FILES.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
    statements.push(env.DB.prepare('INSERT INTO media_assets (post_id, object_key, content_type, media_type, position) VALUES (?, ?, ?, ?, ?)')
      .bind(postId, objectKey, file.type, file.type.startsWith('image/') ? 'image' : 'video', position));
  }
  if (statements.length) await env.DB.batch(statements);
  return Response.json({ id: postId }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await readSession(request);
  if (!session || session.role !== 'admin') return bad('Administrator access is required.', 401);
  const { id } = await request.json() as { id?: number };
  if (!Number.isInteger(id)) return bad('Invalid post.');
  const assets = await env.DB.prepare('SELECT object_key AS objectKey FROM media_assets WHERE post_id = ?').bind(id).all<{ objectKey: string }>();
  await env.DB.prepare('DELETE FROM media_posts WHERE id = ?').bind(id).run();
  await Promise.all((assets.results ?? []).map((asset) => env.FILES.delete(asset.objectKey)));
  return Response.json({ ok: true });
}
