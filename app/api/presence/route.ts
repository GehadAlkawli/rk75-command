import { env } from 'cloudflare:workers';

async function totals() {
  const [members, online] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) AS count FROM players'),
    env.DB.prepare("SELECT COUNT(*) AS count FROM presence WHERE last_seen_at >= datetime('now', '-2 minutes')"),
  ]);
  return {
    members: Number((members.results[0] as { count: number } | undefined)?.count ?? 0),
    online: Number((online.results[0] as { count: number } | undefined)?.count ?? 0),
  };
}

export async function GET() {
  return Response.json(await totals());
}

export async function POST(request: Request) {
  const { visitorKey } = await request.json() as { visitorKey?: string };
  if (!visitorKey || !/^[a-zA-Z0-9-]{16,80}$/.test(visitorKey)) return Response.json({ error: 'Invalid presence key' }, { status: 400 });
  await env.DB.prepare('INSERT INTO presence (visitor_key, last_seen_at) VALUES (?, ?) ON CONFLICT(visitor_key) DO UPDATE SET last_seen_at = excluded.last_seen_at').bind(visitorKey, new Date().toISOString()).run();
  return Response.json(await totals());
}
