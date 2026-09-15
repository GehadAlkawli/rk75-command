const PUBLIC_DOWNLOAD_ORIGIN = 'https://pub-801821ddd0eb4683800a621ea2b66b8d.r2.dev';

const RELEASES = {
  // This is the member-confirmed, stable release. It is the default and is
  // also kept compatible with the original `?build=1.0.2-release` link.
  '1.0.2-release': {
    origin: 'https://github.com/GehadAlkawli/rk75-command/releases/download/mobile-v1.0.2',
    arm64: 'RK75-Command-1.0.2-ARM64.apk',
    arm32: 'RK75-Command-1.0.2-ARM32.apk',
  },
  // Retained only for controlled testing while 1.0.2 is the public default.
  '1.0.3-release': {
    origin: PUBLIC_DOWNLOAD_ORIGIN,
    arm64: 'RK75-Command-1.0.3-ARM64.apk',
    arm32: 'RK75-Command-1.0.3-ARM32.apk',
  },
} as const;

function resolveApkUrl(request: Request) {
  const url = new URL(request.url);
  const requestedBuild = url.searchParams.get('build')?.toLowerCase();
  const release = requestedBuild === '1.0.3-release'
    ? RELEASES['1.0.3-release']
    : RELEASES['1.0.2-release'];
  const requestedArchitecture = url.searchParams.get('arch')?.toLowerCase();
  const filename = requestedArchitecture === 'arm32' ? release.arm32 : release.arm64;
  return `${release.origin}/${filename}`;
}

/**
 * Stable branded links for RK75 Android downloads.
 *
 * The app files live in their own public R2 bucket, separate from private
 * user uploads. Redirecting to R2 gives Android/Chrome exact length and
 * range headers, so the installer can reliably finish after 100% download.
 */
function redirectToApk(request: Request) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: resolveApkUrl(request),
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}

export function GET(request: Request) {
  return redirectToApk(request);
}

export function HEAD(request: Request) {
  return redirectToApk(request);
}
