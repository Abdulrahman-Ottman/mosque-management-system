import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The proxy must never answer a non-GET request with a redirect.
 *
 * Server Actions are POSTs to the current URL and pass through the proxy. Answering
 * one with a redirect means the action never executes: the submission is discarded,
 * the browser follows the redirect, and the user gets no error and no saved data.
 *
 * This is how attendance silently failed - a single flaky getUser() on the POST
 * threw away a whole class's attendance, with nothing in the UI to explain it.
 *
 * The guard is a source check because the real behaviour needs a Next server, an
 * edge runtime and a live Supabase to exercise; this at least fails loudly if the
 * early return is ever removed.
 */
const SOURCE = readFileSync(
  join(process.cwd(), 'src', 'lib', 'supabase', 'middleware.ts'),
  'utf8',
);

describe('proxy request handling', () => {
  it('returns early for non-GET requests', () => {
    expect(SOURCE).toMatch(/if\s*\(\s*request\.method\s*!==\s*'GET'\s*\)/);
  });

  it('does that guard BEFORE any redirect', () => {
    const guardAt = SOURCE.search(/if\s*\(\s*request\.method\s*!==\s*'GET'\s*\)/);
    const firstRedirectAt = SOURCE.search(/redirectPreservingCookies\(/);

    expect(guardAt).toBeGreaterThan(-1);
    expect(firstRedirectAt).toBeGreaterThan(-1);
    expect(
      guardAt,
      'the non-GET guard must come before the first redirect, otherwise a Server ' +
        'Action POST can still be redirected and silently discarded',
    ).toBeLessThan(firstRedirectAt);
  });
});
