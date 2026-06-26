export type UserRole = 'SUPER_ADMIN' | 'HR_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export type EmployeeStatus = 'Active' | 'Inactive' | 'Notice Period' | 'Probation' | 'Relieved';

export interface BankDetails {
  bank: string;
  accountNo: string;
  bankBranch: string;
  ifscCode: string;
  zone?: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  mobileNo: string;
  level: string;
  doj: string;
  tenureYears?: string;
  branch: string;
  designation: string;
  status: EmployeeStatus;
  reportingManagerName: string;
  reportingManagerPhone: string;
  ctcStructure?: Record<string, number | string | null>;
  bankDetails?: BankDetails;
  createdAt: string;
}

export interface EmployeeInput {
  employeeId: string;
  name: string;
  department: string;
  mobileNo: string;
  level: string;
  doj: string;
  branch: string;
  designation: string;
  status: EmployeeStatus;
  reportingManagerName: string;
  reportingManagerPhone: string;
}

export type PeriodStatus = 'DRAFT' | 'READY' | 'SENT';

export interface SalaryPeriod {
  id: string;
  year: number;
  month: number;
  status: PeriodStatus;
  recordCount: number;
  unmatchedCount: number;
  uploadedAt?: string;
}

export interface SalaryRecord {
  id: string;
  periodId: string;
  employeeId: string;
  employeeName: string;
  data: Record<string, unknown>;
  netPay: number;
  matched: boolean;
}

export type DispatchItemStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
export type DispatchJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface DispatchJobItem {
  id: string;
  employeeId: string;
  employeeName: string;
  status: DispatchItemStatus;
  errorReason?: string;
}

export interface DispatchJob {
  id: string;
  periodId: string;
  year: number;
  month: number;
  status: DispatchJobStatus;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  items: DispatchJobItem[];
  createdAt: string;
}

export interface HolidayFile {
  id: string;
  year: number;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface AttendancePeriod {
  id: string;
  year: number;
  month: number;
  recordCount: number;
  uploadedAt: string;
}

export interface AttendanceRecord {
  id: string;
  periodId: string;
  employeeId: string;
  employeeName: string;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  lateMarks: number;
  weeklyOffs: number;
}

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
  approverPhone: string;
  approverName?: string;
  appliedAt: string;
  decidedAt?: string;
}

export interface FeedbackResponse {
  id: string;
  employeeId: string;
  employeeName: string;
  rating: number;
  comment?: string;
  submittedAt: string;
}

export interface DispatchLogEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  status: 'Sent' | 'Failed' | 'Skipped';
  errorReason?: string;
  whatsappMessageId?: string;
  sentAt: string;
}

export interface DashboardStats {
  employeeCount: number;
  pendingLeaveRequests: number;
  pendingDispatchJobs: number;
  attendancePeriods: number;
  latestPeriod?: SalaryPeriod;
  recentDispatchJobs?: DispatchJobSummary[];
}

export interface ImportPreviewRow {
  row: number;
  data: Record<string, unknown>;
  errors: string[];
  warnings: string[];
}

export interface ImportPreviewResult {
  rows: ImportPreviewRow[];
  successCount: number;
  errorCount: number;
  warningCount: number;
}

export interface ImportResult {
  successCount: number;
  errorCount: number;
  periodId?: string;
  year?: number;
  month?: number;
  errors?: { row: number; message: string }[];
}

export interface DispatchJobSummary {
  id: string;
  periodId: string;
  periodLabel: string;
  status: DispatchJobStatus;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  createdAt: string;
}
