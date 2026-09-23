'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { InstallIcon } from '@/components/icons/InstallIcon';
import { cx } from '@/components/ui';

/**
 * The Chromium install prompt. Not in TypeScript's DOM lib, because it is not a
 * standard — Safari and Firefox never fire it.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/* -------------------------------------------------------------------------- */
/* Environment facts, read with useSyncExternalStore.                         */
/*                                                                            */
/* These are browser state, not React state. Reading them in an effect and     */
/* calling setState would render once with the wrong answer and then again     */
/* with the right one; this way the server snapshot is simply `false` and the  */
/* client gets the real value on its first paint.                             */
/* -------------------------------------------------------------------------- */

const STANDALONE_QUERY = '(display-mode: standalone)';

function subscribeDisplayMode(onChange: () => void) {
  const mql = window.matchMedia(STANDALONE_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function isStandaloneNow() {
  return (
    window.matchMedia(STANDALONE_QUERY).matches ||
    // iOS Safari predates the standard and exposes its own flag.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Nothing to subscribe to - the user agent does not change. */
function subscribeNever() {
  return () => {};
}

function platformNow(): 'ios' | 'android' | 'desktop' {
  const ua = window.navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

/** Instructions for browsers that never expose an install prompt. */
const MANUAL_STEPS: Record<'ios' | 'android' | 'desktop', string[]> = {
  ios: [
    'اضغط زر المشاركة في شريط سفاري بالأسفل.',
    'مرّر واختر «إضافة إلى الشاشة الرئيسية».',
    'اضغط «إضافة» في الأعلى.',
  ],
  android: [
    'افتح قائمة المتصفح (⋮) في الأعلى.',
    'اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».',
    'أكّد الإضافة.',
  ],
  desktop: [
    'افتح قائمة المتصفح (⋮) في الأعلى.',
    'اختر «تثبيت» أو «Install».',
    'أكّد التثبيت ليفتح التطبيق في نافذة مستقلة.',
  ],
};

/**
 * Install-as-app button.
 *
 * Installation is not standardised, so this covers three paths:
 *  - Chromium (Android, desktop Chrome/Edge) fires `beforeinstallprompt`, which we
 *    stash and replay on click. That is a real one-tap install.
 *  - Everywhere else — iOS Safari, Firefox, or Chrome before it decides the site
 *    qualifies — there is no API, so the button reveals the manual steps for that
 *    platform rather than doing nothing.
 *  - Once installed, it disappears instead of leaving a dead control behind.
 */
export function InstallApp({ className }: { className?: string }) {
  const standalone = useSyncExternalStore(subscribeDisplayMode, isStandaloneNow, () => false);
  const platform = useSyncExternalStore(subscribeNever, platformNow, () => 'desktop' as const);

  // Set only from event handlers, never synchronously inside an effect.
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [justInstalled, setJustInstalled] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // Suppress Chrome's own mini-infobar so this button is the single entry point.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setJustInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (standalone || justInstalled) return null;

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // The prompt can only be used once; Chrome re-fires it if they reconsider.
    setDeferred(null);
    if (outcome === 'accepted') setJustInstalled(true);
  };

  return (
    <div className={className}>
      {/* Gold is reserved for distinctive touches in this design system, which is
          exactly what an install affordance is - present but never competing with
          the primary "دخول" action. Fills gold on hover. */}
      <button
        type="button"
        onClick={deferred ? install : () => setShowSteps((v) => !v)}
        className={cx(
          'group flex w-full cursor-pointer items-center justify-center gap-2.5',
          'rounded-[var(--radius-sm)] border border-gold/45 bg-gold-soft px-4 py-3',
          'text-[length:var(--text-sm)] font-bold text-gold-strong',
          'transition-all duration-150 hover:border-gold hover:bg-gold hover:text-white',
          'focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:outline-none',
        )}
      >
        <InstallIcon className="size-5 shrink-0 transition-transform duration-150 group-hover:translate-y-px" />
        تثبيت التطبيق
      </button>

      {!deferred && showSteps ? (
        <div
          className={cx(
            'mt-2 rounded-[var(--radius-sm)] border border-border bg-paper p-3',
            'text-[length:var(--text-xs)] leading-relaxed text-ink-muted',
          )}
        >
          <p className="mt-0 mb-2 font-bold text-ink">لتثبيت التطبيق:</p>
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
            {MANUAL_STEPS[platform].map((step, i) => (
              <li key={step} className="flex gap-2">
                <span className="font-bold text-accent tabular-nums">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
