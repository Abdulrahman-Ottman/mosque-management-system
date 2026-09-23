import Image from 'next/image';
import type { Metadata } from 'next';

import { InstallApp } from '@/components/InstallApp';
import { LoginForm } from '@/components/LoginForm';

export const metadata: Metadata = { title: 'تسجيل الدخول' };

/**
 * Login page - port of resources/views/login.blade.php.
 *
 * The gradient and the logo lockup are carried over from the original; the two
 * fields are unchanged. Supabase Auth sits underneath, but the user still only ever
 * types a phone number and a password.
 */
export default function LoginPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        background: `
          radial-gradient(circle at 18% 15%, rgba(188, 171, 123, .10) 0%, transparent 45%),
          radial-gradient(circle at 85% 90%, rgba(188, 171, 123, .08) 0%, transparent 40%),
          linear-gradient(160deg, #1c3c34 0%, var(--color-accent-strong) 55%, #0d211c 100%)
        `,
      }}
    >
      <div className="w-full max-w-[380px]">
        <div className="mb-6 text-center">
          <Image
            src="/images/logo-full.png"
            alt="شعار المعهد"
            width={148}
            height={148}
            priority
            className="mx-auto h-auto w-[148px]"
          />
        </div>

        <div className="rounded-[var(--radius-lg)] border border-white/10 bg-surface p-6 shadow-[0_18px_40px_rgba(0,0,0,.28)]">
          <h1 className="mt-0 mb-1 text-center text-[length:var(--text-xl)] font-extrabold text-ink">
            تسجيل الدخول
          </h1>
          <p className="mt-0 mb-5 text-center text-[length:var(--text-sm)] text-ink-muted">
            أدخل رقم هاتفك وكلمة المرور للمتابعة
          </p>

          <LoginForm />

          {/* Renders nothing when already installed, or where installation is not
              offered by the browser. */}
          <InstallApp className="mt-5 border-t border-border pt-5" />
        </div>

        <p className="mt-5 text-center text-[length:var(--text-xs)] text-white/50">
          اقْرَأْ وَارْتَقِ
        </p>
      </div>
    </main>
  );
}
