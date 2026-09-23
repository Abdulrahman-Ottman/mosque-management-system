import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';

import { ServiceWorker } from '@/components/ServiceWorker';

import './globals.css';

/*
 * The Laravel app pulled Cairo from Google Fonts with a <link> on every page.
 * next/font self-hosts it, which removes the render-blocking request and the
 * layout shift, and guarantees the Arabic subset is actually loaded.
 */
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'اقْرَأْ وَارْتَقِ',
    template: '%s | اقْرَأْ وَارْتَقِ',
  },
  description: 'نظام متابعة حفظ القرآن الكريم',
  applicationName: 'اقْرَأْ وَارْتَقِ',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  // iOS ignores the manifest's display mode and needs these to open standalone.
  appleWebApp: {
    capable: true,
    title: 'اقْرَأْ وَارْتَقِ',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  // Tints the Android status bar and the desktop title bar to match the navbar.
  themeColor: '#162F2A',
  width: 'device-width',
  initialScale: 1,
  // Keeps the layout stable behind the notch when installed on iOS.
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="bg-paper text-ink font-sans antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
