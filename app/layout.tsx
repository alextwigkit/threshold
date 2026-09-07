import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Edge — Your personal map',
  description:
    'Turn toward something you have been avoiding. See what you discover.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Edge' },
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#FCF9F4" />
      </head>
      <body>{children}</body>
    </html>
  );
}
