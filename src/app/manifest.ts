import type { MetadataRoute } from 'next';

/**
 * Web app manifest, served at /manifest.webmanifest.
 *
 * `display: standalone` is what makes the installed app open without browser chrome.
 * `dir`/`lang` keep the install dialog and task-switcher entry right-to-left.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'اقْرَأْ وَارْتَقِ — متابعة حفظ القرآن',
    short_name: 'اقْرَأْ وَارْتَقِ',
    description: 'نظام متابعة حفظ القرآن الكريم: الحضور، الحفظ الجديد، المراجعة والنقاط.',
    lang: 'ar',
    dir: 'rtl',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAFAF9',
    theme_color: '#162F2A',
    categories: ['education'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
