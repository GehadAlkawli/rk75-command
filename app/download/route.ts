import { env } from 'cloudflare:workers';

const APK_BUILDS = {
  arm64: {
    objectKey: 'downloads/RK75-Command-1.0.3-ARM64.apk',
    filename: 'RK75-Command-1.0.3-ARM64.apk',
    architecture: 'arm64',
  },
  arm32: {
    objectKey: 'downloads/RK75-Command-1.0.3-ARM32.apk',
    filename: 'RK75-Command-1.0.3-ARM32.apk',
    architecture: 'arm32',
  },
} as const;

type ApkBuild = (typeof APK_BUILDS)[keyof typeof APK_BUILDS];

type ByteRange = { offset: number; length: number; end: number };

function parseRange(value: string | null, size: number): ByteRange | null | 'invalid' {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(value.trim());
  if (!match) return 'invalid';

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return 'invalid';

  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return 'invalid';
    const length = Math.min(suffixLength, size);
    return { offset: size - length, length, end: size - 1 };
  }

  const offset = Number(rawStart);
  const requestedEnd = rawEnd ? Number(rawEnd) : size - 1;
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(requestedEnd) || offset < 0 || offset >= size || requestedEnd < offset) {
    return 'invalid';
  }

  const end = Math.min(requestedEnd, size - 1);
  return { offset, length: end - offset + 1, end };
}

function downloadHeaders(size: number, range: ByteRange | null, etag: string, build: ApkBuild) {
  const headers = new Headers({
    'Content-Type': 'application/vnd.android.package-archive',
    'Content-Disposition': `attachment; filename="${build.filename}"`,
    'Accept-Ranges': 'bytes',
    // `/download` is the stable "latest version" address, so it must never
    // be cached as an older APK after a release is published.
    'Cache-Control': 'no-store',
    ETag: etag,
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex',
    'X-RK75-APK-Architecture': build.architecture,
  });

  if (range) {
    headers.set('Content-Length', String(range.length));
    headers.set('Content-Range', `bytes ${range.offset}-${range.end}/${size}`);
  } else {
    headers.set('Content-Length', String(size));
  }
  return headers;
}

async function apkResponse(request: Request, method: 'GET' | 'HEAD') {
  const requestedArchitecture = new URL(request.url).searchParams.get('arch')?.toLowerCase();
  const build = requestedArchitecture === 'arm32' ? APK_BUILDS.arm32 : APK_BUILDS.arm64;
  const metadata = await env.FILES.head(build.objectKey);
  if (!metadata) {
    return new Response('RK75 Android download is temporarily unavailable.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
    });
  }

  const range = parseRange(request.headers.get('range'), metadata.size);
  if (range === 'invalid') {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${metadata.size}`, 'Accept-Ranges': 'bytes' },
    });
  }

  const headers = downloadHeaders(metadata.size, range, metadata.httpEtag, build);
  if (method === 'HEAD') return new Response(null, { status: range ? 206 : 200, headers });

  const object = await env.FILES.get(
    build.objectKey,
    range ? { range: { offset: range.offset, length: range.length } } : undefined,
  );
  if (!object) return new Response('RK75 Android download is temporarily unavailable.', { status: 503 });

  return new Response(object.body, { status: range ? 206 : 200, headers });
}

/** A short, branded, resumable Android download address for RK75.
 * Defaults to modern ARM64; `?arch=arm32` supports older Android devices.
 */
export async function GET(request: Request) {
  return apkResponse(request, 'GET');
}

export async function HEAD(request: Request) {
  return apkResponse(request, 'HEAD');
}
