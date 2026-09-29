import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * A "use server" module may only export async functions.
 *
 * This is not enforced by `tsc`, by ESLint, or by `next build` — the module is only
 * evaluated when an action is first invoked, so an invalid export compiles and
 * deploys perfectly happily and then throws the moment a user submits the form:
 *
 *   Error: A "use server" file can only export async functions, found object.
 *
 * That is exactly what happened: `export { ATTENDANCE_STATUSES }` sat in
 * actions/attendance.ts, the attendance page rendered fine, and every single
 * submission failed with an opaque "server error occurred" page.
 *
 * Type-only exports are erased at compile time and are fine.
 */
const ACTIONS_DIR = join(process.cwd(), 'src', 'actions');

function actionFiles(): string[] {
  return readdirSync(ACTIONS_DIR).filter((f) => f.endsWith('.ts'));
}

describe('"use server" modules', () => {
  const files = actionFiles();

  it('finds the action files', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s exports only async functions', (file) => {
    const source = readFileSync(join(ACTIONS_DIR, file), 'utf8');

    // Only applies to files that actually declare the directive.
    if (!/^['"]use server['"]/m.test(source)) return;

    const offenders: string[] = [];

    for (const line of source.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('export')) continue;

      // Erased at compile time - harmless.
      if (/^export\s+type\b/.test(trimmed)) continue;
      // The only legal runtime export.
      if (/^export\s+async\s+function\b/.test(trimmed)) continue;

      offenders.push(trimmed);
    }

    expect(
      offenders,
      `${file} exports something that is not an async function. A "use server" module ` +
        `may only export async functions, and this throws at runtime the first time an ` +
        `action in the file is called - not at build time. Move it to src/lib/ instead.`,
    ).toEqual([]);
  });
});
