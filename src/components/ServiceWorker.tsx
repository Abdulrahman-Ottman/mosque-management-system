'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker, which is what makes the app installable.
 *
 * Registered after `load` so it never competes with the first paint for bandwidth.
 * Failure is non-fatal: without it the app simply works as a normal website.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Blocked by the browser, a private window, or an unsupported context.
        // Nothing to do - the site still works, it just is not installable.
      });
    };

    if (document.readyState === 'complete') register();
    else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
