import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fate War Command',
  description: 'مركز قيادة التحالف وإحصاءات Fate War',
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
