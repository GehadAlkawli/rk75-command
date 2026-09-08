import type { Metadata } from 'next';
import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}
