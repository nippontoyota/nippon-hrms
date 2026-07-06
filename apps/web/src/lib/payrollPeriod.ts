export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function getPreviousMonthYear(from = new Date()) {
  const currentMonth = from.getMonth() + 1;
  const currentYear = from.getFullYear();
  let month = currentMonth - 1;
  let year = currentYear;
  if (month === 0) {
    month = 12;
    year--;
  }
  return { month, year };
}

export function comparePeriods(a: { month: number; year: number }, b: { month: number; year: number }) {
  if (a.year !== b.year) return b.year - a.year;
  return b.month - a.month;
}
