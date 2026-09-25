import type { Metadata, Viewport } from 'next';
import './globals.css';
import './full-glassmorphism.css';
import NavigationTransition from './navigation-transition';
import PwaInstallPrompt from './pwa-install-prompt';
import PwaRegister from './pwa-register';

export const metadata: Metadata = {
  title: 'RK75 Command',
  description: 'RK75 alliance command and Fate War statistics',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/rk75-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/rk75-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/rk75-192.png', sizes: '192x192', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RK75 Command',
  },
};

export const viewport: Viewport = {
  themeColor: '#080b18',
  colorScheme: 'light dark',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "try { document.documentElement.dataset.theme = localStorage.getItem('rk75-theme') === 'dark' ? 'dark' : 'light'; } catch (_) { document.documentElement.dataset.theme = 'light'; }",
          }}
        />
      </head>
      <body>
        <PwaRegister />
        <NavigationTransition />
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
