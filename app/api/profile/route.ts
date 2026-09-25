import { env } from 'cloudflare:workers';
import { readSession } from '@/lib/auth';

const allowedAvatarTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const avatarLimit = 2 * 1024 * 1024;

type PlayerRow = {
  playerId: string;
  displayName: string;
  avatarKey: string | null;
  avatarContentType: string | null;
};

const unauthorized = () => Response.json({ error: 'Sign in is required.' }, { status: 401 });

function profileResponse(profile: PlayerRow) {
  return Response.json({
    role: 'player' as const,
    playerId: profile.playerId,
    displayName: profile.displayName,
    avatarUrl: profile.avatarKey ? '/api/profile/avatar' : null,
  });
}

export async function GET(request: Request) {
  const session = await readSession(request);

  if (!session) return unauthorized();

  if (session.role === 'admin') {
    return Response.json({
      role: 'admin' as const,
      displayName: 'RK75 Administrator',
      avatarUrl: null,
    });
  }

  if (!session.playerId) return unauthorized();

  const player = await env.DB.prepare(`SELECT player_id AS playerId, display_name AS displayName,
    avatar_key AS avatarKey, avatar_content_type AS avatarContentType
    FROM players WHERE player_id = ?`).bind(session.playerId).first<PlayerRow>();

  if (!player) return unauthorized();

  return profileResponse(player);
}

export async function PATCH(request: Request) {
  const session = await readSession(request);

  if (!session || session.role !== 'player' || !session.playerId) return unauthorized();

  const form = await request.formData();
  const rawName = form.get('displayName');
  const requestedName = typeof rawName === 'string' ? rawName.trim() : null;
  const avatar = form.get('avatar');
  const hasAvatar = avatar instanceof File && avatar.size > 0;

  if (requestedName !== null && (requestedName.length < 2 || requestedName.length > 60)) {
    return Response.json({ error: 'Choose a display name between 2 and 60 characters.' }, { status: 400 });
  }

  if (avatar instanceof File && avatar.size > 0 && (!allowedAvatarTypes.has(avatar.type) || avatar.size > avatarLimit)) {
    return Response.json({ error: 'Choose a JPG, PNG, WEBP, or GIF avatar up to 2 MB.' }, { status: 400 });
  }

  if (requestedName === null && !hasAvatar) {
    return Response.json({ error: 'Add a name or a profile image before saving.' }, { status: 400 });
  }

  const current = await env.DB.prepare(`SELECT player_id AS playerId, display_name AS displayName,
    avatar_key AS avatarKey, avatar_content_type AS avatarContentType
    FROM players WHERE player_id = ?`).bind(session.playerId).first<PlayerRow>();

  if (!current) return unauthorized();

  let nextAvatarKey = current.avatarKey;
  let nextAvatarType = current.avatarContentType;

  if (avatar instanceof File && avatar.size > 0) {
    nextAvatarKey = `player-avatars/${session.playerId}/${crypto.randomUUID()}`;
    nextAvatarType = avatar.type;
    await env.FILES.put(nextAvatarKey, avatar.stream(), {
      httpMetadata: { contentType: avatar.type },
    });
  }

  const nextName = requestedName ?? current.displayName;
  await env.DB.prepare(`UPDATE players
    SET display_name = ?, avatar_key = ?, avatar_content_type = ?
    WHERE player_id = ?`).bind(nextName, nextAvatarKey, nextAvatarType, session.playerId).run();

  if (hasAvatar && current.avatarKey && current.avatarKey !== nextAvatarKey) {
    // The new image is already safely referenced by the database.  A failed
    // cleanup should never make a successfully saved profile look like a
    // failed request to the member.
    await env.FILES.delete(current.avatarKey).catch(() => undefined);
  }

  return profileResponse({
    playerId: session.playerId,
    displayName: nextName,
    avatarKey: nextAvatarKey,
    avatarContentType: nextAvatarType,
  });
}
