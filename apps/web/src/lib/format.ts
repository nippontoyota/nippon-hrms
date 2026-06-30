export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const axiosErr = err as {
    response?: { data?: { error?: { message?: string } } };
    message?: string;
  };
  return axiosErr.response?.data?.error?.message || axiosErr.message || fallback;
}

import { useVaultStore } from '@/stores/vaultStore';

export function formatCurrency(n: number) {
  if (n === 0 && !useVaultStore.getState().isUnlocked()) {
    return '₹ ***';
  }
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
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Download a blob from the API, surfacing JSON error bodies as thrown messages. */
export async function downloadApiBlob(
  fetcher: () => Promise<Blob>,
  filename: string,
  fallbackError = 'Download failed',
) {
  const blob = await fetcher();
  if (blob.type.includes('json') || blob.type.includes('text/plain')) {
    const text = await blob.text();
    try {
      const err = JSON.parse(text) as { error?: { message?: string }; message?: string };
      throw new Error(err.error?.message ?? err.message ?? fallbackError);
    } catch (e) {
      if (e instanceof Error && e.message !== fallbackError) throw e;
      throw new Error(text.trim() || fallbackError);
    }
  }
  downloadBlob(blob, filename);
}

export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv' }), filename);
}
