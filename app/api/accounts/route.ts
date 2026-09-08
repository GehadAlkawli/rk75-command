import { env } from 'cloudflare:workers';
import { readSession } from '@/lib/auth';

const unauthorized = () => Response.json({ error: 'Sign in as a player to publish an account.' }, { status: 401 });
const invalid = (message: string) => Response.json({ error: message }, { status: 400 });
const imageLimit = 9;

type ListingRow = {
  id: number; playerId: string; title: string; mainSpec: string; kingdom: string; totalPower: string; killPoints: string;
  vipLevel: string; totalTroops: string; price: string; paymentMethods: string; ownerDiscord: string;
  intermediaryDiscord: string | null; createdAt: string; updatedAt: string;
};

const textValue = (value: FormDataEntryValue | null, max: number) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 && text.length <= max ? text : null;
};

export async function GET() {
  const listings = await env.DB.prepare(`SELECT id, player_id AS playerId, title, main_spec AS mainSpec, kingdom,
    total_power AS totalPower, kill_points AS killPoints, vip_level AS vipLevel, total_troops AS totalTroops,
    price, payment_methods AS paymentMethods, owner_discord AS ownerDiscord,
    intermediary_discord AS intermediaryDiscord, created_at AS createdAt, updated_at AS updatedAt
    FROM account_listings WHERE status = 'published' ORDER BY created_at DESC, id DESC`).all<ListingRow>();
  const rows = listings.results ?? [];
  if (!rows.length) return Response.json([]);
  const ids = rows.map((listing) => listing.id);
  const placeholders = ids.map(() => '?').join(',');
  const images = await env.DB.prepare(`SELECT id, listing_id AS listingId, position FROM account_listing_images
    WHERE listing_id IN (${placeholders}) ORDER BY listing_id, position`).bind(...ids).all<{ id: number; listingId: number; position: number }>();
  const imageMap = new Map<number, { id: number; position: number }[]>();
  for (const image of images.results ?? []) {
    imageMap.set(image.listingId, [...(imageMap.get(image.listingId) ?? []), { id: image.id, position: image.position }]);
  }
  return Response.json(rows.map((listing) => ({
    ...listing,
    paymentMethods: JSON.parse(listing.paymentMethods) as string[],
    images: (imageMap.get(listing.id) ?? []).map((image) => ({ ...image, url: `/api/accounts/images/${image.id}` })),
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
  const images = form.getAll('images').filter((value): value is File => value instanceof File && value.size > 0);
  if (!title || !mainSpec || !kingdom || !totalPower || !killPoints || !vipLevel || !totalTroops || !price || !ownerDiscord || !intermediaryDiscord) {
    return invalid('Complete every account detail and both Discord contact fields.');
  }
  if (!paymentMethods.length) return invalid('Choose at least one payment method.');
  if (images.length > imageLimit) return invalid('You can upload a maximum of 9 images.');
  if (images.some((image) => !image.type.startsWith('image/') || image.size > 5 * 1024 * 1024)) return invalid('Each image must be an image file of 5 MB or less.');

  const now = new Date().toISOString();
  const inserted = await env.DB.prepare(`INSERT INTO account_listings
    (player_id, title, main_spec, kingdom, total_power, kill_points, vip_level, total_troops, price, payment_methods, owner_discord, intermediary_discord, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`)
    .bind(session.playerId, title, mainSpec, kingdom, totalPower, killPoints, vipLevel, totalTroops, price, JSON.stringify(paymentMethods), ownerDiscord, intermediaryDiscord, now, now).run();
  const listingId = Number(inserted.meta.last_row_id);
  const imageRows: D1PreparedStatement[] = [];
  for (const [position, image] of images.entries()) {
    const objectKey = `account-listings/${session.playerId}/${listingId}/${position}-${crypto.randomUUID()}`;
    await env.FILES.put(objectKey, image.stream(), { httpMetadata: { contentType: image.type } });
    imageRows.push(env.DB.prepare('INSERT INTO account_listing_images (listing_id, object_key, content_type, position) VALUES (?, ?, ?, ?)').bind(listingId, objectKey, image.type, position));
  }
  if (imageRows.length) await env.DB.batch(imageRows);
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
