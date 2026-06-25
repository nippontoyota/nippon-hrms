import type {
  AttendancePeriod,
  AttendanceRecord,
  DispatchJob,
  DispatchLogEntry,
  Employee,
  FeedbackResponse,
  HolidayFile,
  LeaveRequest,
  SalaryPeriod,
  SalaryRecord,
} from '@/api/types';
import employeeSeed from './employee-seed.json';
import salarySeed from './salary-seed.json';

export const seedEmployees = employeeSeed as Employee[];

const now = new Date();
export const seedPeriods: SalaryPeriod[] = [
  {
    id: 'period-1',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    status: 'READY',
    recordCount: salarySeed.length,
    unmatchedCount: 0,
    uploadedAt: '2026-06-01T09:00:00Z',
  },
];

export const seedRecords: SalaryRecord[] = (salarySeed as { id: string; employeeId: string; employeeName: string; data: Record<string, unknown>; netPay: number }[]).map(
  (row, i) => ({
    id: row.id || `sal-rec-${i + 1}`,
    periodId: 'period-1',
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    data: row.data,
    netPay: Number(row.netPay) || 0,
    matched: seedEmployees.some((e) => e.employeeId === row.employeeId),
  }),
);

export const seedHolidays: HolidayFile[] = [
  {
    id: 'hol-1',
    year: 2026,
    fileName: 'Nippon_Toyota_Holiday_Calendar_2026.pdf',
    fileUrl: '/templates/holiday_sample.pdf',
    uploadedAt: '2026-01-10T10:00:00Z',
  },
];

export const seedAttendancePeriods: AttendancePeriod[] = [
  {
    id: 'att-period-1',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    recordCount: 16,
    uploadedAt: '2026-06-05T09:00:00Z',
  },
];

export const seedAttendanceRecords: AttendanceRecord[] = seedEmployees.map((emp, i) => {
  const sal = seedRecords.find((r) => r.employeeId === emp.employeeId);
  const leaves = Number(sal?.data?.Leaves ?? 0);
  const absents = Number(sal?.data?.ABSENTS ?? 0);
  const days = Number(sal?.data?.Days ?? 31);
  return {
    id: `att-${i + 1}`,
    periodId: 'att-period-1',
    employeeId: emp.employeeId,
    employeeName: emp.name,
    presentDays: days - leaves - absents,
    absentDays: absents,
    leaveDays: leaves,
    lateMarks: i % 3,
    weeklyOffs: 4,
  };
});

export const seedLeaveRequests: LeaveRequest[] = [
  {
    id: 'leave-1',
    employeeId: '4599',
    employeeName: 'Mony K A',
    leaveType: 'Casual Leave',
    fromDate: '2026-06-10',
    toDate: '2026-06-11',
    reason: 'Personal work',
    status: 'Approved',
    approverPhone: '9876543210',
    approverName: 'Rajesh Kumar',
    appliedAt: '2026-06-08T10:00:00Z',
    decidedAt: '2026-06-08T14:30:00Z',
  },
  {
    id: 'leave-2',
    employeeId: '7903',
    employeeName: 'Sajan S',
    leaveType: 'Sick Leave',
    fromDate: '2026-06-20',
    toDate: '2026-06-20',
    reason: 'Fever',
    status: 'Pending',
    approverPhone: '9876543211',
    approverName: 'Suresh Nair',
    appliedAt: '2026-06-19T09:00:00Z',
  },
  {
    id: 'leave-3',
    employeeId: '415',
    employeeName: 'Kishor Krishnan',
    leaveType: 'Earned Leave',
    fromDate: '2026-07-01',
    toDate: '2026-07-05',
    reason: 'Family function',
    status: 'Rejected',
    approverPhone: '9876543212',
    approverName: 'Anil Thomas',
    appliedAt: '2026-06-15T11:00:00Z',
    decidedAt: '2026-06-16T09:00:00Z',
  },
];

export const seedFeedback: FeedbackResponse[] = [
  { id: 'fb-1', employeeId: '4599', employeeName: 'Mony K A', rating: 4, comment: 'Good support from HR', submittedAt: '2026-06-01T12:00:00Z' },
  { id: 'fb-2', employeeId: '7903', employeeName: 'Sajan S', rating: 5, submittedAt: '2026-06-02T10:00:00Z' },
  { id: 'fb-3', employeeId: '415', employeeName: 'Kishor Krishnan', rating: 3, comment: 'Payslip delivery was delayed', submittedAt: '2026-06-03T15:00:00Z' },
];

export const seedDispatchLogs: DispatchLogEntry[] = [
  {
    id: 'dl-1',
    employeeId: '4599',
    employeeName: 'Mony K A',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    status: 'Sent',
    whatsappMessageId: 'wamid-001',
    sentAt: '2026-06-02T10:05:00Z',
  },
  {
    id: 'dl-2',
    employeeId: '7903',
    employeeName: 'Sajan S',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    status: 'Sent',
    whatsappMessageId: 'wamid-002',
    sentAt: '2026-06-02T10:06:00Z',
  },
];

export const seedDispatchJobs: DispatchJob[] = [
  {
    id: 'job-seed-1',
    periodId: 'period-1',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    status: 'COMPLETED',
    total: 16,
    sent: 14,
    failed: 0,
    skipped: 2,
    items: [],
    createdAt: '2026-06-02T10:00:00Z',
  },
];
