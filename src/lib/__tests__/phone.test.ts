import { describe, expect, it } from 'vitest';
import { normalizePhone, phoneToEmail } from '../phone';

describe('normalizePhone', () => {
  it('leaves a plain ASCII number untouched', () => {
    expect(normalizePhone('0944879340')).toBe('0944879340');
  });

  it('folds Arabic-Indic digits to ASCII', () => {
    expect(normalizePhone('٠٩٤٤٨٧٩٣٤٠')).toBe('0944879340');
  });

  it('folds Extended Arabic-Indic (Persian) digits to ASCII', () => {
    expect(normalizePhone('۰۹۴۴۸۷۹۳۴۰')).toBe('0944879340');
  });

  it('strips spaces, dashes and parentheses', () => {
    expect(normalizePhone(' 094-487 (9340) ')).toBe('0944879340');
  });

  it('treats a leading 00 international prefix as +', () => {
    expect(normalizePhone('00963944879340')).toBe('963944879340');
    expect(normalizePhone('+963944879340')).toBe('963944879340');
  });

  it('is idempotent', () => {
    const once = normalizePhone('٠٩٤ ٤٨٧-٩٣٤٠');
    expect(normalizePhone(once)).toBe(once);
  });

  it('maps the ASCII and Arabic-Indic forms to the SAME login email', () => {
    // This is the whole point: typing the number either way must reach one account.
    expect(phoneToEmail('٠٩٤٤٨٧٩٣٤٠')).toBe(phoneToEmail('0944879340'));
    expect(phoneToEmail('0944879340')).toBe('0944879340@mosque.invalid');
  });
});
