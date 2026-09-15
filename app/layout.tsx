import type { Metadata, Viewport } from 'next';
import './globals.css';
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
  colorScheme: 'dark',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <PwaRegister />
        <NavigationTransition />
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
