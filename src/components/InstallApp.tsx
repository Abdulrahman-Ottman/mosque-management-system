'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

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

/**
 * How long to wait for `appinstalled` after the user accepts.
 *
 * On Android, accepting the dialog does not install anything by itself: Chrome
 * uploads the manifest to Google's WebAPK build service and installs the package it
 * returns. Where that service is unreachable the install silently never completes,
 * so we need a deadline rather than waiting forever.
 */
const INSTALL_TIMEOUT_MS = 12_000;

type Status = 'idle' | 'installing' | 'failed';

/** Instructions for browsers that never expose an install prompt. */
const MANUAL_STEPS: Record<'ios' | 'android' | 'desktop', string[]> = {
  ios: [
    'اضغط زر المشاركة في شريط سفاري بالأسفل.',
    'مرّر واختر «إضافة إلى الشاشة الرئيسية».',
    'اضغط «إضافة» في الأعلى.',
  ],
  android: [
    'افتح قائمة المتصفح (⋮) في الأعلى.',
    'اختر «إضافة إلى الشاشة الرئيسية».',
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
 *    stash and replay on click.
 *  - Everywhere else — iOS Safari, Firefox, or Chrome before it decides the site
 *    qualifies — there is no API, so the button reveals the manual steps for that
 *    platform rather than doing nothing.
 *  - Once installed, it disappears instead of leaving a dead control behind.
 */
export function InstallApp({ className }: { className?: string }) {
  const standalone = useSyncExternalStore(subscribeDisplayMode, isStandaloneNow, () => false);
  const platform = useSyncExternalStore(subscribeNever, platformNow, () => 'desktop' as const);

  // Set only from event handlers and timers, never synchronously inside an effect.
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [justInstalled, setJustInstalled] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [showSteps, setShowSteps] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // Suppress Chrome's own mini-infobar so this button is the single entry point.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    // This is the ONLY trustworthy confirmation that the app is really installed.
    const onInstalled = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setJustInstalled(true);
      setDeferred(null);
      setStatus('idle');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (standalone || justInstalled) return null;

  const install = async () => {
    if (!deferred) return;

    setShowSteps(false);
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;

    // The prompt object can only be used once.
    setDeferred(null);

    if (outcome !== 'accepted') {
      setStatus('idle');
      return;
    }

    // IMPORTANT: 'accepted' only means the user tapped Install in the dialog. It is
    // NOT a guarantee that anything was installed - on Android the actual install
    // happens afterwards, once Chrome has fetched a generated package. Treating this
    // as success is what made a failed install look like a successful one: the button
    // vanished and no app appeared. Wait for `appinstalled`, and give up on a
    // deadline.
    setStatus('installing');
    timerRef.current = setTimeout(() => setStatus('failed'), INSTALL_TIMEOUT_MS);
  };

  const busy = status === 'installing';

  return (
    <div className={className}>
      <button
        type="button"
        disabled={busy}
        onClick={deferred ? install : () => setShowSteps((v) => !v)}
        className={cx(
          'group flex w-full cursor-pointer items-center justify-center gap-2.5',
          'rounded-[var(--radius-sm)] border border-gold/45 bg-gold-soft px-4 py-3',
          'text-[length:var(--text-sm)] font-bold text-gold-strong',
          'transition-all duration-150 hover:border-gold hover:bg-gold hover:text-white',
          'focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:outline-none',
          'disabled:cursor-wait disabled:opacity-70 disabled:hover:bg-gold-soft disabled:hover:text-gold-strong',
        )}
      >
        <InstallIcon className="size-5 shrink-0 transition-transform duration-150 group-hover:translate-y-px" />
        {busy ? 'جارٍ التثبيت…' : 'تثبيت التطبيق'}
      </button>

      {status === 'failed' ? (
        <div
          className={cx(
            'mt-2 rounded-[var(--radius-sm)] border border-warning/30 bg-warning-soft p-3',
            'text-[length:var(--text-xs)] leading-relaxed text-ink',
          )}
        >
          <p className="mt-0 mb-1.5 font-bold">لم يكتمل التثبيت</p>
          <p className="mt-0 mb-2 text-ink-muted">
            يعتمد التثبيت التلقائي على خدمة خارجية قد لا تكون متاحة على بعض الشبكات.
            يمكنك إضافة التطبيق يدويًا:
          </p>
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0 text-ink-muted">
            {MANUAL_STEPS[platform].map((step, i) => (
              <li key={step} className="flex gap-2">
                <span className="font-bold text-warning tabular-nums">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-2.5 mb-0 text-ink-muted">
            وفي جميع الأحوال يعمل الموقع كاملًا من المتصفح دون تثبيت.
          </p>
        </div>
      ) : null}

      {status !== 'failed' && !deferred && showSteps ? (
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
