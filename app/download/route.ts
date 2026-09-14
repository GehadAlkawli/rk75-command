const ANDROID_APK_URL =
  'https://github.com/GehadAlkawli/rk75-command/releases/download/mobile-v1.0.0/RK75-Command-1.0.0.apk';

async function apkResponse(request: Request, method: 'GET' | 'HEAD') {
  const upstreamHeaders = new Headers({
    'User-Agent': 'RK75-Command-Download-Service',
  });
  const range = request.headers.get('range');
  if (range) upstreamHeaders.set('range', range);

  // Cloudflare streams the response. Keeping Range intact lets Android resume
  // an interrupted APK download without exposing GitHub's long asset URL.
  const upstream = await fetch(ANDROID_APK_URL, {
    method,
    headers: upstreamHeaders,
    redirect: 'follow',
  });

  if (!upstream.ok) {
    return new Response('RK75 Android download is temporarily unavailable.', {
      status: 502,
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
    });
  }

  const headers = new Headers(upstream.headers);
  headers.set('Content-Disposition', 'attachment; filename="RK75-Command-1.0.0.apk"');
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Robots-Tag', 'noindex');

  return new Response(method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}

/** A short, branded, resumable Android download address for RK75. */
export async function GET(request: Request) {
  return apkResponse(request, 'GET');
}

export async function HEAD(request: Request) {
  return apkResponse(request, 'HEAD');
}
