import { env } from 'cloudflare:workers';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) return new Response('Not found', { status: 404 });
  const asset = await env.DB.prepare('SELECT object_key AS objectKey, content_type AS contentType FROM media_assets WHERE id = ?')
    .bind(id).first<{ objectKey: string; contentType: string }>();
  if (!asset) return new Response('Not found', { status: 404 });
  const object = await env.FILES.get(asset.objectKey);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, { headers: { 'Content-Type': asset.contentType, 'Cache-Control': 'public, max-age=86400' } });
}
