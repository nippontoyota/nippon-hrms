const MIN_REASON_LENGTH = 10;
const DATE_PATTERN = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/i;

export function validateRejectionReason(reason: string): string | null {
  const trimmed = reason.trim();
  if (trimmed.length < MIN_REASON_LENGTH) {
    return 'Enter at least 10 characters.';
  }
  if (DATE_PATTERN.test(trimmed)) {
    return 'Reason must not be a date.';
  }
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    return 'Enter at least two words.';
  }
  const counts = new Map<string, number>();
  for (const word of words) {
    const next = (counts.get(word) ?? 0) + 1;
    counts.set(word, next);
    if (word.length >= 3 && next >= 3) {
      return 'Reason contains too much repeated text.';
    }
  }
  if (new Set(words).size < 2) {
    return 'Use at least two different words.';
  }
  return null;
}

export function buildLeaveRejectedPreview(
  employeeName: string,
  days: number,
  fromDate: string,
  toDate: string,
  reason: string,
): string {
  const name = employeeName.trim() || 'Employee';
  return [
    `Hi ${name},`,
    `your leave request for ${days} day${days === 1 ? '' : 's'}`,
    `(${fromDate} to ${toDate}) has been rejected by HR.`,
    '',
    `Reason: ${reason.trim()}.`,
    '',
    'Contact HR if you have questions.',
  ].join('\n');
}
