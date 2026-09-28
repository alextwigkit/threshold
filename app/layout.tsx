import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Threshold — Your trail',
  description:
    'Turn toward something you have been avoiding. See what you discover.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Threshold' },
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
};
// Light-only app (`:root { color-scheme: light }` in globals.css, no dark
// styles exist), so one themeColor is correct here, not a per-scheme pair.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: '#FCF9F4',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
