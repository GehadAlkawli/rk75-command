import { env } from 'cloudflare:workers';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) return new Response('Not found', { status: 404 });
  const image = await env.DB.prepare(`SELECT i.object_key AS objectKey, i.content_type AS contentType
    FROM account_listing_images i JOIN account_listings l ON l.id = i.listing_id
    WHERE i.id = ? AND l.status = 'published'`).bind(id).first<{ objectKey: string; contentType: string }>();
  if (!image) return new Response('Not found', { status: 404 });
  const object = await env.FILES.get(image.objectKey);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, { headers: { 'Content-Type': image.contentType, 'Cache-Control': 'public, max-age=86400' } });
}
