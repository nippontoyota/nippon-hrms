import type {
  AttendancePeriod,
  AttendanceRecord,
  DispatchJob,
  DispatchLogEntry,
  Employee,
  FeedbackResponse,
  Holiday,
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

export const seedHolidays: Holiday[] = [
  { id: 'in-hol-2026-01-26', date: '2026-01-26', name: 'Republic Day', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'in-hol-2026-03-04', date: '2026-03-04', name: 'Holi', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'in-hol-2026-03-21', date: '2026-03-21', name: 'Id-ul-Fitr', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'in-hol-2026-03-26', date: '2026-03-26', name: 'Ram Navami', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'in-hol-2026-04-03', date: '2026-04-03', name: 'Good Friday', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'in-hol-2026-05-01', date: '2026-05-01', name: 'Buddha Purnima', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'in-hol-2026-05-27', date: '2026-05-27', name: 'Id-ul-Zuha (Bakrid)', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'in-hol-2026-08-15', date: '2026-08-15', name: 'Independence Day', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'in-hol-2026-09-04', date: '2026-09-04', name: 'Janmashtami', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'in-hol-2026-10-02', date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'in-hol-2026-10-20', date: '2026-10-20', name: 'Dussehra (Vijay Dashami)', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'in-hol-2026-11-08', date: '2026-11-08', name: 'Diwali (Deepavali)', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'in-hol-2026-12-25', date: '2026-12-25', name: 'Christmas Day', createdAt: '2026-01-01T00:00:00Z' },
];

export const seedAttendancePeriods: AttendancePeriod[] = [
  {
    id: 'att-period-1',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    recordCount: 17,
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
    type: 'casual',
    fromDate: '2026-06-10',
    toDate: '2026-06-11',
    days: 2,
    reason: 'Personal work',
    status: 'approved',
    reviewedBy: 'HR_ADMIN',
    reviewedAt: '2026-06-08T14:30:00Z',
    createdAt: '2026-06-08T10:00:00Z',
  },
  {
    id: 'leave-2',
    employeeId: '7903',
    type: 'sick',
    fromDate: '2026-06-20',
    toDate: '2026-06-20',
    days: 1,
    reason: 'Fever',
    status: 'pending',
    createdAt: '2026-06-19T09:00:00Z',
  },
  {
    id: 'leave-3',
    employeeId: '415',
    type: 'casual',
    fromDate: '2026-07-01',
    toDate: '2026-07-05',
    days: 5,
    reason: 'Family function',
    status: 'rejected',
    reviewedBy: 'HR_ADMIN',
    reviewedAt: '2026-06-16T09:00:00Z',
    createdAt: '2026-06-15T11:00:00Z',
  },
  {
    id: 'leave-4',
    employeeId: '7903',
    type: 'casual',
    fromDate: '2026-06-28',
    toDate: '2026-06-29',
    days: 2,
    reason: 'Personal errands',
    status: 'pending',
    createdAt: '2026-06-24T08:00:00Z',
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
  {
    id: 'dl-3',
    employeeId: '9001',
    employeeName: 'Krishnanand G',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    status: 'Sent',
    whatsappMessageId: 'wamid-003',
    sentAt: '2026-06-02T10:07:00Z',
  },
];

export const seedDispatchJobs: DispatchJob[] = [
  {
    id: 'job-seed-1',
    periodId: 'period-1',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    status: 'COMPLETED',
    total: 17,
    sent: 15,
    failed: 0,
    skipped: 2,
    items: [],
    createdAt: '2026-06-02T10:00:00Z',
  },
];
