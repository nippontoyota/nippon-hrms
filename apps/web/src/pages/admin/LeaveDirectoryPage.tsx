import { useState, useMemo } from 'react';
import { useLeaves, useUpdateLeaveStatus, useLeaveBalance } from '@/api/hooks';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  XCircle,
  MagnifyingGlass,
  Clock,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import RejectLeaveModal from '@/components/RejectLeaveModal';
import LeaveRequestDetailModal from '@/components/LeaveRequestDetailModal';
import type { LeaveRequest } from '@/api/types';

function leaveTypeBadgeClass(type: string) {
  switch (type.toLowerCase()) {
    case 'casual':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300';
    case 'sick':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300';
    case 'unpaid':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:border-slate-800 dark:text-slate-300';
  }
}

function BalanceBadge({ employeeId }: { employeeId: string }) {
  const { data: balance, isLoading } = useLeaveBalance(employeeId);

  if (isLoading) return <span className="text-xs text-slate-400">Loading balance...</span>;
  if (!balance) return <span className="text-xs text-slate-400">Balance N/A</span>;

  const remCasual = Math.max(0, balance.totalCasual - balance.usedCasual);
  const remSick = Math.max(0, balance.totalSick - balance.usedSick);

  return (
    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1.5 flex items-center gap-1.5 whitespace-nowrap">
      <span>Bal: <strong>{remCasual}</strong> C</span>
      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
      <span><strong>{remSick}</strong> S</span>
    </div>
  );
}

const shortDate = (dStr?: string) => {
  if (!dStr) return '';
  const parts = dStr.split('T')[0].split('-');
  if (parts.length !== 3) return dStr;
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(parts[1], 10) - 1];
  return `${parts[2]} ${m}`;
};

export default function LeaveDirectoryPage() {
  const { data: leaves = [], isLoading } = useLeaves();
  const updateStatus = useUpdateLeaveStatus();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);

  const filteredLeaves = useMemo(() => {
    return (leaves || []).filter((l) => {
      const matchSearch = l.employee?.name?.toLowerCase().includes(search.toLowerCase()) || 
                          l.employee?.employeeId?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || l.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [leaves, search, filterStatus]);

  const handleLeaveRowClick = (leave: LeaveRequest, e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a, select, textarea, label')) return;
    setSelectedLeave(leave);
  };

  const handleApprove = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    toast.promise(
      updateStatus.mutateAsync({ id, status: 'approved' }),
      {
        loading: 'Updating status...',
        success: 'Leave approved — employee notified!',
        error: 'Failed to update leave status',
      }
    ).then(() => setSelectedLeave(null));
  };

  const handleRejectClick = (id: string) => {
    const leave = leaves.find((l) => l.id === id) ?? selectedLeave;
    if (!leave) return;
    setSelectedLeave(null);
    setRejectTarget(leave);
  };

  const handleRejectConfirm = (reason: string) => {
    if (!rejectTarget) return;
    toast.promise(
      updateStatus.mutateAsync({ id: rejectTarget.id, status: 'rejected', rejectionReason: reason }),
      {
        loading: 'Updating status...',
        success: 'Leave rejected — employee notified!',
        error: 'Failed to update leave status',
      }
    ).finally(() => {
      setRejectTarget(null);
      setSelectedLeave(null);
    });
  };

  return (
    <div className="space-y-6 max-w-full pb-10">
      
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide">Leave Requests</h2>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {filteredLeaves.length} records
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative w-full max-w-[400px]">
            <MagnifyingGlass className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              className="w-full bg-white dark:bg-slate-800 rounded-md pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 focus:outline-none focus:border-[#eb0a1e]"
              placeholder="Search by Employee Name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-md border border-slate-200 dark:border-slate-700">
            {[
              { id: 'all', label: 'All Statuses' },
              { id: 'pending', label: 'Pending' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
            ].map((tab) => {
              let activeTextColor = 'text-slate-800 dark:text-white';
              let activeBgRing = 'ring-slate-200 dark:ring-slate-600 bg-white dark:bg-slate-700';
              
              if (tab.id === 'pending') {
                activeTextColor = 'text-amber-800 dark:text-amber-300';
                activeBgRing = 'ring-amber-200 dark:ring-amber-900 bg-amber-50 dark:bg-amber-900/30';
              } else if (tab.id === 'approved') {
                activeTextColor = 'text-green-800 dark:text-green-300';
                activeBgRing = 'ring-green-200 dark:ring-green-900 bg-green-50 dark:bg-green-900/30';
              } else if (tab.id === 'rejected') {
                activeTextColor = 'text-red-800 dark:text-red-300';
                activeBgRing = 'ring-red-200 dark:ring-red-900 bg-red-50 dark:bg-red-900/30';
              }

              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`relative px-4 py-1.5 text-xs font-semibold rounded transition-colors ${
                    filterStatus === tab.id
                      ? activeTextColor
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-700/30'
                  }`}
                >
                  {filterStatus === tab.id && (
                    <motion.div
                      layoutId="status-pill"
                      className={`absolute inset-0 shadow-sm ring-1 rounded ${activeBgRing}`}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Employee</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Leave Type & Balance</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Duration</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Reason</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  <tr key="loading">
                    <td colSpan={6} className="py-8 text-center text-slate-500">Loading leave requests...</td>
                  </tr>
                ) : filteredLeaves.length === 0 ? (
                  <tr key="empty">
                    <td colSpan={6} className="py-8 text-center text-slate-500">No leave requests found.</td>
                  </tr>
                ) : (
                  filteredLeaves.map((l) => (
                    <tr
                      key={l.id}
                      className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${selectedLeave?.id === l.id ? 'row-selected' : ''}`}
                      onClick={(ev) => handleLeaveRowClick(l, ev)}
                    >
                      <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{l.employee?.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{l.employee?.employeeId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="mb-1">
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border ${leaveTypeBadgeClass(l.type)}`}>
                          {l.type}
                        </span>
                      </div>
                      {l.type.toLowerCase() !== 'unpaid' && <BalanceBadge employeeId={l.employeeId} />}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[13px] text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap">
                        {shortDate(l.fromDate)} <span className="text-slate-400 font-normal px-1">-</span> {shortDate(l.toDate)}
                        <span className="text-slate-500 font-normal ml-2 text-[11px]">({l.days} {l.days === 1 ? 'day' : 'days'})</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-[13px] text-slate-800 dark:text-slate-200 font-medium max-w-[220px] line-clamp-2 leading-relaxed">
                        {l.reason}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      {l.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded shadow-sm text-[10px] uppercase tracking-widest font-bold bg-amber-100/50 text-amber-800 border border-amber-200/60 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50">
                          <Clock size={12} weight="bold" /> Pending
                        </span>
                      )}
                      {l.status === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded shadow-sm text-[10px] uppercase tracking-widest font-bold bg-emerald-100/50 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50">
                          <CheckCircle size={12} weight="bold" /> Approved
                        </span>
                      )}
                      {l.status === 'rejected' && (
                        <div className="space-y-1.5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded shadow-sm text-[10px] uppercase tracking-widest font-bold bg-rose-100/50 text-rose-800 border border-rose-200/60 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/50">
                            <XCircle size={12} weight="bold" /> Rejected
                          </span>
                          {l.rejectionReason && (
                            <p className="text-[11px] text-rose-700 dark:text-rose-300 max-w-[200px] leading-snug" title={l.rejectionReason}>
                              HR: {l.rejectionReason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {l.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => handleApprove(l.id, e)}
                            disabled={updateStatus.isPending}
                            className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-bold rounded shadow-sm flex items-center gap-1.5 transition-all bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600 disabled:opacity-50"
                          >
                            <CheckCircle size={14} weight="bold" /> Approve
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRejectTarget(l);
                            }}
                            disabled={updateStatus.isPending}
                            className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-bold rounded shadow-sm flex items-center gap-1.5 transition-all bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-rose-900 dark:text-rose-400 disabled:opacity-50"
                          >
                            <XCircle size={14} weight="bold" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Action Completed
                        </span>
                      )}
                    </td>
                    </tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <LeaveRequestDetailModal
        leave={selectedLeave}
        onClose={() => setSelectedLeave(null)}
        onApprove={handleApprove}
        onReject={handleRejectClick}
        isUpdating={updateStatus.isPending}
      />

      <RejectLeaveModal
        open={rejectTarget !== null}
        employeeName={rejectTarget?.employee?.name}
        leaveDays={rejectTarget?.days}
        leaveFromDate={rejectTarget?.fromDate}
        leaveToDate={rejectTarget?.toDate}
        onCancel={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        isSubmitting={updateStatus.isPending}
      />
    </div>
  );
}
