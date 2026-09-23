// Phone numbers are the login identifier. On an Arabic keyboard they are typed with
// Arabic-Indic digits, which are not valid in an email local part and would otherwise
// create an account that can never be logged into again. Normalise on BOTH the account
// creation path and the login path - never one without the other.

const ARABIC_INDIC_ZERO = 0x0660; // ٠-٩
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0; // ۰-۹

/** Fold Arabic-Indic and Extended Arabic-Indic digits to ASCII and strip formatting. */
export function normalizePhone(input: string): string {
  let out = '';

  for (const char of input) {
    const code = char.codePointAt(0)!;

    if (code >= ARABIC_INDIC_ZERO && code <= ARABIC_INDIC_ZERO + 9) {
      out += String(code - ARABIC_INDIC_ZERO);
    } else if (code >= EXTENDED_ARABIC_INDIC_ZERO && code <= EXTENDED_ARABIC_INDIC_ZERO + 9) {
      out += String(code - EXTENDED_ARABIC_INDIC_ZERO);
    } else if (char >= '0' && char <= '9') {
      out += char;
    }
    // Everything else (spaces, -, (), +, unicode marks) is dropped.
  }

  // A leading international prefix typed as 00 is equivalent to +.
  if (out.startsWith('00')) out = out.slice(2);

  return out;
}

/** Supabase Auth is email-based; the phone maps to a reserved-TLD synthetic address. */
export function phoneToEmail(phone: string): string {
  return `${normalizePhone(phone)}@mosque.invalid`;
}
