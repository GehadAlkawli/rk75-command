const PUBLIC_DOWNLOAD_ORIGIN = 'https://pub-801821ddd0eb4683800a621ea2b66b8d.r2.dev';

const APK_BUILDS = {
  arm64: 'RK75-Command-1.0.3-ARM64.apk',
  arm32: 'RK75-Command-1.0.3-ARM32.apk',
} as const;

function resolveApkUrl(request: Request) {
  const requestedArchitecture = new URL(request.url).searchParams.get('arch')?.toLowerCase();
  const filename = requestedArchitecture === 'arm32' ? APK_BUILDS.arm32 : APK_BUILDS.arm64;
  return `${PUBLIC_DOWNLOAD_ORIGIN}/${filename}`;
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
