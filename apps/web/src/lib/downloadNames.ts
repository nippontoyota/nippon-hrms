const IST = 'Asia/Kolkata';

/** Filesystem-safe export timestamp in India Standard Time (YYYY-MM-DD_HH-mm-ss). */
export function exportTimestampIST(now = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: IST,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}_${parts.hour}-${parts.minute}-${parts.second}`;
}

function salaryPeriod(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}-${year}`;
}

export function employeeExportFilename() {
  return `EmployeeDirectory_Export_${exportTimestampIST()}.xlsx`;
}

export function employeeImportTemplateFilename() {
  return 'EmployeeDirectory_ImportTemplate.csv';
}

export function epfExportFilename() {
  return `EPFDirectory_Export_${exportTimestampIST()}.xlsx`;
}

export function epfImportTemplateFilename() {
  return 'EPFDirectory_ImportTemplate.csv';
}

export function salaryExportFilename(month: number, year: number) {
  return `SalaryDirectory_Export_${salaryPeriod(month, year)}_${exportTimestampIST()}.xlsx`;
}

export function salaryImportTemplateFilename(month: number, year: number) {
  return `SalaryDirectory_ImportTemplate_${salaryPeriod(month, year)}.csv`;
}
