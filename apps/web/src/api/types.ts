export type UserRole = 'ADMIN' | 'HR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  department: string;
  designation: string;
  whatsappPhone: string;
  bankAccount?: string;
  bankIfsc?: string;
  active: boolean;
  createdAt: string;
}

export interface EmployeeInput {
  employeeCode: string;
  name: string;
  department: string;
  designation: string;
  whatsappPhone: string;
  bankAccount?: string;
  bankIfsc?: string;
  active: boolean;
}

export type PeriodStatus = 'DRAFT' | 'FINALIZED' | 'SENT';

export interface PayslipPeriod {
  id: string;
  year: number;
  month: number;
  status: PeriodStatus;
  recordCount: number;
  finalizedAt?: string;
}

export interface PayslipRecord {
  id: string;
  periodId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  earnings: Record<string, number>;
  deductions: Record<string, number>;
  grossPay: number;
  netPay: number;
}

export type SendJobItemStatus = 'PENDING' | 'SENT' | 'FAILED';
export type SendJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface SendJobItem {
  id: string;
  employeeCode: string;
  employeeName: string;
  status: SendJobItemStatus;
  error?: string;
}

export interface SendJob {
  id: string;
  periodId: string;
  status: SendJobStatus;
  total: number;
  sent: number;
  failed: number;
  items: SendJobItem[];
  createdAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface MaintenanceTicket {
  id: string;
  employeeId: string;
  employeeName: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  details: string;
}

export interface DashboardStats {
  employeeCount: number;
  openTickets: number;
  pendingSendJobs: number;
  latestPeriod?: PayslipPeriod;
}

export interface ImportResult {
  successCount: number;
  errorCount: number;
  errors?: { row: number; message: string }[];
}
