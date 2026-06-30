export type UserRole = 'SUPER_ADMIN' | 'HR_ADMIN' | 'super_admin' | 'hr_admin';

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
  yearsExperience?: number;
  branch: string;
  designation: string;
  zone?: string;
  basic?: number;
  da?: number;
  revisedBasicDa?: number;
  hra?: number;
  travel?: number;
  hostel?: number;
  children?: number;
  totalSalary?: number;
  mobile?: number;
  conveyance?: number;
  washAllowance?: number;
  branchAllowance?: number;
  specialAllowance?: number;
  training?: number;
  totalAllowances?: number;
  totalSalaryWithAllowances?: number;
  bankName?: string;
  accountNumber?: string;
  bankBranch?: string;
  ifscCode?: string;
  reportingManagerName?: string;
  reportingManagerPhone?: string;
  ctcStructure?: Record<string, number | string | null>;
  bankDetails?: BankDetails;
  status: EmployeeStatus;
  createdAt: string;
}

export interface EpfRecord {
  employeeId: string;
  name: string;
  department: string;
  level: string;
  doj: string;
  yearsSinceDoj: number;
  doa: string;
  yearsSinceDoa: number;
  epfNumber: string;
  uan: string;
  esiNumber: string;
  createdAt?: string;
  updatedAt?: string;
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
  reportingManagerName?: string;
  reportingManagerPhone?: string;
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

export interface PayrollRecord {
  id: string;
  employeeId: string;
  empNameSnapshot: string;
  leaves: number;
  lop: number;
  days: number;
  absents: number;
  basic: number;
  da: number;
  basicDa: number;
  hra: number;
  travel: number;
  childrenHostel: number;
  childrenEducation: number;
  mobile: number;
  conveyance: number;
  branchAllowance: number;
  washAllowance: number;
  specialAllowance: number;
  training: number;
  incentive: number;
  totalEarWithIncen: number;
  grossSalWithoutIncentives: number;
  pf: number;
  pf367: number;
  pf833: number;
  esi075: number;
  esi325: number;
  tds: number;
  salAdv: number;
  additionalDeduction: number;
  loan: number;
  companyStatutoryContribution: number;
  reimbMedical: number;
  reimbLTA: number;
  zetaMealVoucher: number;
  reimbTravel: number;
  totalReimbursement: number;
  netIncentive: number;
  totalDeductions: number;
  actualFinalAmount: number;
  lopDeduction: number;
  epfER: number;
  grossForPT: number;
  advance: number;
  dispatchedAt?: string | null;
}

export type DispatchItemStatus = 'PENDING' | 'RUNNING' | 'SENT' | 'FAILED' | 'SKIPPED';
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
  periodId?: string;
  year: number;
  month: number;
  status: DispatchJobStatus;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  items?: DispatchJobItem[];
  createdAt: string;
  completedAt?: string;
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

export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type LeaveType = 'casual' | 'sick' | 'annual' | 'maternity' | 'paternity';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  employee?: Employee;
}

export interface LeaveBalance {
  employeeId: string;
  month: number;
  year: number;
  totalCasual: number;
  usedCasual: number;
  totalSick: number;
  usedSick: number;
}
