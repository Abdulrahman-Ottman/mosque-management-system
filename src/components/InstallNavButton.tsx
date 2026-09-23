'use client';

import { useEffect, useState } from 'react';

import { InstallIcon } from '@/components/icons/InstallIcon';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * Compact install button for the navbar, so someone who is already signed in can
 * still install without logging out to find the button on the login page.
 *
 * Chromium only: it shows solely when a real install prompt is available. iOS users
 * get the step-by-step instructions on the login page instead, and there is no point
 * repeating them in a navbar with no room for them.
 */
export function InstallNavButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || !deferred) return null;

  return (
    <button
      type="button"
      title="تثبيت التطبيق"
      onClick={async () => {
        await deferred.prompt();
        await deferred.userChoice;
        setDeferred(null);
      }}
      className={[
        'group flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)]',
        'border border-gold/60 bg-gold/15 px-2.5 py-1.5',
        'text-[length:var(--text-xs)] font-bold text-gold',
        'transition-colors duration-150 hover:border-gold hover:bg-gold hover:text-accent-strong',
        'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none',
      ].join(' ')}
    >
      <InstallIcon className="size-5 shrink-0" strokeWidth={2.1} />
      <span className="whitespace-nowrap">تثبيت التطبيق</span>
    </button>
  );
}
