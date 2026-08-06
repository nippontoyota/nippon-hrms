/** Returns E.164 +91… or null when input is not an Indian mobile number. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  const local =
    digits.length === 12 && digits.startsWith('91')
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith('0')
        ? digits.slice(1)
        : digits;

  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}
