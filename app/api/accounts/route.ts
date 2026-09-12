import { env } from 'cloudflare:workers';
import { readSession } from '@/lib/auth';

const unauthorized = () => Response.json({ error: 'Sign in as a player to publish an account.' }, { status: 401 });
const invalid = (message: string) => Response.json({ error: message }, { status: 400 });
const mediaLimit = 9;
const allowedVideoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

type ListingRow = {
  id: number; playerId: string; title: string; mainSpec: string; kingdom: string; totalPower: string; killPoints: string;
  vipLevel: string; totalTroops: string; price: string; paymentMethods: string; ownerDiscord: string;
  intermediaryDiscord: string | null; status: 'published' | 'sold'; createdAt: string; updatedAt: string;
};

const textValue = (value: FormDataEntryValue | null, max: number) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 && text.length <= max ? text : null;
};

export async function GET() {
  const listings = await env.DB.prepare(`SELECT id, player_id AS playerId, title, main_spec AS mainSpec, kingdom,
    total_power AS totalPower, kill_points AS killPoints, vip_level AS vipLevel, total_troops AS totalTroops,
    price, payment_methods AS paymentMethods, owner_discord AS ownerDiscord,
    intermediary_discord AS intermediaryDiscord, status, created_at AS createdAt, updated_at AS updatedAt
    FROM account_listings WHERE status IN ('published', 'sold') ORDER BY created_at DESC, id DESC`).all<ListingRow>();
  const rows = listings.results ?? [];
  if (!rows.length) return Response.json([]);
  const ids = rows.map((listing) => listing.id);
  const placeholders = ids.map(() => '?').join(',');
  const mediaRows = await env.DB.prepare(`SELECT id, listing_id AS listingId, content_type AS contentType, media_type AS mediaType, position FROM account_listing_images
    WHERE listing_id IN (${placeholders}) ORDER BY listing_id, position`).bind(...ids).all<{ id: number; listingId: number; position: number }>();
  const mediaMap = new Map<number, { id: number; position: number; contentType: string; mediaType: 'image' | 'video' }[]>();
  for (const media of mediaRows.results ?? []) {
    const item = media as { id: number; listingId: number; position: number; contentType: string; mediaType: 'image' | 'video' };
    mediaMap.set(item.listingId, [...(mediaMap.get(item.listingId) ?? []), item]);
  }
  return Response.json(rows.map((listing) => ({
    ...listing,
    paymentMethods: JSON.parse(listing.paymentMethods) as string[],
    media: (mediaMap.get(listing.id) ?? []).map((media) => ({ ...media, url: `/api/accounts/images/${media.id}` })),
    // Retained for clients from the previous version while they upgrade.
    images: (mediaMap.get(listing.id) ?? []).map((media) => ({ ...media, url: `/api/accounts/images/${media.id}` })),
  })));
}

export async function POST(request: Request) {
  const session = await readSession(request);
  if (!session || session.role !== 'player' || !session.playerId) return unauthorized();
  const form = await request.formData();
  const title = textValue(form.get('title'), 80);
  const mainSpec = textValue(form.get('mainSpec'), 700);
  const kingdom = textValue(form.get('kingdom'), 80);
  const totalPower = textValue(form.get('totalPower'), 40);
  const killPoints = textValue(form.get('killPoints'), 40);
  const vipLevel = textValue(form.get('vipLevel'), 30);
  const totalTroops = textValue(form.get('totalTroops'), 40);
  const price = textValue(form.get('price'), 80);
  const ownerDiscord = textValue(form.get('ownerDiscord'), 80);
  const intermediaryDiscord = textValue(form.get('intermediaryDiscord'), 80);
  const paymentMethods = form.getAll('paymentMethods').filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim()).filter(Boolean).slice(0, 8);
  const uploadedMedia = [...form.getAll('media'), ...form.getAll('images')]
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (!title || !mainSpec || !kingdom || !totalPower || !killPoints || !vipLevel || !totalTroops || !price || !ownerDiscord || !intermediaryDiscord) {
    return invalid('Complete every account detail and both Discord contact fields.');
  }
  if (!paymentMethods.length) return invalid('Choose at least one payment method.');
  if (uploadedMedia.length > mediaLimit) return invalid('You can upload a maximum of 9 photos or videos.');
  if (uploadedMedia.some((file) => !file.type.startsWith('image/') && !allowedVideoTypes.has(file.type))) return invalid('Only image files or MP4, WebM, and MOV videos are allowed.');
  if (uploadedMedia.some((file) => file.type.startsWith('image/') && file.size > 6 * 1024 * 1024)) return invalid('Each image must be 6 MB or less.');
  if (uploadedMedia.some((file) => allowedVideoTypes.has(file.type) && file.size > 25 * 1024 * 1024)) return invalid('Each video must be 25 MB or less.');

  const now = new Date().toISOString();
  const inserted = await env.DB.prepare(`INSERT INTO account_listings
    (player_id, title, main_spec, kingdom, total_power, kill_points, vip_level, total_troops, price, payment_methods, owner_discord, intermediary_discord, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`)
    .bind(session.playerId, title, mainSpec, kingdom, totalPower, killPoints, vipLevel, totalTroops, price, JSON.stringify(paymentMethods), ownerDiscord, intermediaryDiscord, now, now).run();
  const listingId = Number(inserted.meta.last_row_id);
  const mediaStatements: D1PreparedStatement[] = [];
  for (const [position, file] of uploadedMedia.entries()) {
    const objectKey = `account-listings/${session.playerId}/${listingId}/${position}-${crypto.randomUUID()}`;
    await env.FILES.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
    const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
    mediaStatements.push(env.DB.prepare('INSERT INTO account_listing_images (listing_id, object_key, content_type, media_type, position) VALUES (?, ?, ?, ?, ?)').bind(listingId, objectKey, file.type, mediaType, position));
  }
  if (mediaStatements.length) await env.DB.batch(mediaStatements);
  return Response.json({ id: listingId, status: 'published' });
}

export async function DELETE(request: Request) {
  const session = await readSession(request);
  if (!session) return unauthorized();
  const { id } = await request.json() as { id?: number };
  if (!Number.isInteger(id)) return invalid('Invalid listing.');
  const listing = await env.DB.prepare('SELECT player_id AS playerId FROM account_listings WHERE id = ?').bind(id).first<{ playerId: string }>();
  if (!listing || (session.role !== 'admin' && listing.playerId !== session.playerId)) return unauthorized();
  const images = await env.DB.prepare('SELECT object_key AS objectKey FROM account_listing_images WHERE listing_id = ?').bind(id).all<{ objectKey: string }>();
  await env.DB.prepare('DELETE FROM account_listings WHERE id = ?').bind(id).run();
  await Promise.all((images.results ?? []).map((image) => env.FILES.delete(image.objectKey)));
  return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
  const session = await readSession(request);
  if (!session) return unauthorized();
  const { id, status } = await request.json() as { id?: number; status?: 'published' | 'sold' };
  if (!Number.isInteger(id) || (status !== 'published' && status !== 'sold')) return invalid('Invalid listing status.');
  const listing = await env.DB.prepare('SELECT player_id AS playerId FROM account_listings WHERE id = ?').bind(id).first<{ playerId: string }>();
  if (!listing || (session.role !== 'admin' && listing.playerId !== session.playerId)) return unauthorized();
  await env.DB.prepare('UPDATE account_listings SET status = ?, updated_at = ? WHERE id = ?').bind(status, new Date().toISOString(), id).run();
  return Response.json({ ok: true, status });
}
