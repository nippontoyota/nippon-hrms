export function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function monthLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

export function formatBreakdown(obj: Record<string, unknown>) {
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .sort(([a], [b]) => a.localeCompare(b));
}

export function periodStatusBadge(status: 'DRAFT' | 'READY' | 'SENT') {
  if (status === 'DRAFT') return 'badge-warning';
  if (status === 'READY') return 'badge-info';
  return 'badge-success';
}

export function employeeStatusBadge(status: 'Active' | 'Inactive') {
  return status === 'Active' ? 'badge-success' : 'badge-muted';
}

export function leaveStatusBadge(status: string) {
  if (status === 'Approved') return 'badge-success';
  if (status === 'Rejected') return 'badge-error';
  return 'badge-warning';
}

export function dispatchItemBadge(status: string) {
  if (status === 'SENT' || status === 'Sent') return 'badge-success';
  if (status === 'FAILED' || status === 'Failed') return 'badge-error';
  if (status === 'SKIPPED' || status === 'Skipped') return 'badge-muted';
  return 'badge-info';
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv' }), filename);
}
