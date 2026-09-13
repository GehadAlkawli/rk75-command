import type { Metadata } from 'next';
import './globals.css';
import NavigationTransition from './navigation-transition';

export const metadata: Metadata = {
  title: 'RK75 Command',
  description: 'RK75 alliance command and Fate War statistics',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body><NavigationTransition/>{children}</body>
    </html>
  );
}
