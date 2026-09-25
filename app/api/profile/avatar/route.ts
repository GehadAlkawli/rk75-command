import { env } from 'cloudflare:workers';
import { readSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await readSession(request);

  if (!session || session.role !== 'player' || !session.playerId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const player = await env.DB.prepare(`SELECT avatar_key AS avatarKey,
    avatar_content_type AS avatarContentType FROM players WHERE player_id = ?`)
    .bind(session.playerId)
    .first<{ avatarKey: string | null; avatarContentType: string | null }>();

  if (!player?.avatarKey) return new Response('Not found', { status: 404 });

  const avatar = await env.FILES.get(player.avatarKey);

  if (!avatar) return new Response('Not found', { status: 404 });

  return new Response(avatar.body, {
    headers: {
      'Content-Type': player.avatarContentType || avatar.httpMetadata?.contentType || 'image/jpeg',
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
