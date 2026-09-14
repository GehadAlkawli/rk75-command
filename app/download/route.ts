const ANDROID_APK_URL =
  'https://github.com/GehadAlkawli/rk75-command/releases/download/mobile-v1.0.0/RK75-Command-1.0.0.apk';

/**
 * A short, RK75-branded download address that can be shared without exposing
 * GitHub's temporary asset URL. The APK remains published as a public,
 * versioned GitHub Release.
 */
export function GET() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: ANDROID_APK_URL,
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex',
    },
  });
}
