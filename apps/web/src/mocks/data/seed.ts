import type {
  AuditEntry,
  Employee,
  Holiday,
  MaintenanceTicket,
  PayslipPeriod,
  PayslipRecord,
  SendJob,
} from '@/api/types';

export const seedEmployees: Employee[] = [
  {
    id: 'emp-1',
    employeeCode: 'NT001',
    name: 'Arjun Sharma',
    department: 'Sales',
    designation: 'Executive',
    whatsappPhone: '+919876543210',
    bankAccount: '1234567890',
    bankIfsc: 'HDFC0001234',
    active: true,
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'emp-2',
    employeeCode: 'NT002',
    name: 'Priya Mehta',
    department: 'Service',
    designation: 'Advisor',
    whatsappPhone: '+919876543211',
    bankAccount: '0987654321',
    bankIfsc: 'ICIC0005678',
    active: true,
    createdAt: '2025-02-01T10:00:00Z',
  },
  {
    id: 'emp-3',
    employeeCode: 'NT003',
    name: 'Ravi Kumar',
    department: 'Finance',
    designation: 'Accountant',
    whatsappPhone: '+919876543212',
    active: true,
    createdAt: '2025-03-10T10:00:00Z',
  },
];

export const seedPeriods: PayslipPeriod[] = [
  {
    id: 'period-1',
    year: 2026,
    month: 5,
    status: 'FINALIZED',
    recordCount: 3,
    finalizedAt: '2026-06-01T09:00:00Z',
  },
  {
    id: 'period-2',
    year: 2026,
    month: 6,
    status: 'DRAFT',
    recordCount: 3,
  },
];

export const seedRecords: PayslipRecord[] = [
  {
    id: 'rec-1',
    periodId: 'period-1',
    employeeId: 'emp-1',
    employeeCode: 'NT001',
    employeeName: 'Arjun Sharma',
    earnings: { basic: 25000, hra: 10000, special: 5000 },
    deductions: { pf: 3000, esi: 500, pt: 200 },
    grossPay: 40000,
    netPay: 36300,
  },
  {
    id: 'rec-2',
    periodId: 'period-1',
    employeeId: 'emp-2',
    employeeCode: 'NT002',
    employeeName: 'Priya Mehta',
    earnings: { basic: 22000, hra: 8800, special: 4200 },
    deductions: { pf: 2640, esi: 440, pt: 200 },
    grossPay: 35000,
    netPay: 31720,
  },
  {
    id: 'rec-3',
    periodId: 'period-1',
    employeeId: 'emp-3',
    employeeCode: 'NT003',
    employeeName: 'Ravi Kumar',
    earnings: { basic: 30000, hra: 12000, special: 6000 },
    deductions: { pf: 3600, esi: 600, pt: 200, tds: 1500 },
    grossPay: 48000,
    netPay: 42100,
  },
  {
    id: 'rec-4',
    periodId: 'period-2',
    employeeId: 'emp-1',
    employeeCode: 'NT001',
    employeeName: 'Arjun Sharma',
    earnings: { basic: 25000, hra: 10000, special: 5000 },
    deductions: { pf: 3000, esi: 500, pt: 200 },
    grossPay: 40000,
    netPay: 36300,
  },
  {
    id: 'rec-5',
    periodId: 'period-2',
    employeeId: 'emp-2',
    employeeCode: 'NT002',
    employeeName: 'Priya Mehta',
    earnings: { basic: 22000, hra: 8800, special: 4200 },
    deductions: { pf: 2640, esi: 440, pt: 200 },
    grossPay: 35000,
    netPay: 31720,
  },
  {
    id: 'rec-6',
    periodId: 'period-2',
    employeeId: 'emp-3',
    employeeCode: 'NT003',
    employeeName: 'Ravi Kumar',
    earnings: { basic: 30000, hra: 12000, special: 6000 },
    deductions: { pf: 3600, esi: 600, pt: 200, tds: 1500 },
    grossPay: 48000,
    netPay: 42100,
  },
];

export const seedHolidays: Holiday[] = [
  { id: 'hol-1', name: 'Republic Day', date: '2026-01-26', description: 'National holiday' },
  { id: 'hol-2', name: 'Independence Day', date: '2026-08-15' },
];

export const seedTickets: MaintenanceTicket[] = [
  {
    id: 'tkt-1',
    employeeId: 'emp-1',
    employeeName: 'Arjun Sharma',
    description: 'AC not working in showroom',
    status: 'OPEN',
    createdAt: '2026-06-20T14:30:00Z',
  },
  {
    id: 'tkt-2',
    employeeId: 'emp-2',
    employeeName: 'Priya Mehta',
    description: 'Printer jam in service bay',
    status: 'IN_PROGRESS',
    createdAt: '2026-06-22T09:15:00Z',
  },
];

export const seedAudit: AuditEntry[] = [
  {
    id: 'aud-1',
    timestamp: '2026-06-24T10:00:00Z',
    actor: 'HR Admin',
    action: 'FINALIZE_PERIOD',
    entity: 'period-1',
    details: 'Finalized payslip period May 2026',
  },
  {
    id: 'aud-2',
    timestamp: '2026-06-23T15:30:00Z',
    actor: 'HR Admin',
    action: 'IMPORT_PAYSLIPS',
    entity: 'period-2',
    details: 'Imported 3 payslip records for June 2026',
  },
  {
    id: 'aud-3',
    timestamp: '2026-06-22T11:00:00Z',
    actor: 'HR Admin',
    action: 'CREATE_EMPLOYEE',
    entity: 'emp-3',
    details: 'Added employee Ravi Kumar (NT003)',
  },
];

export const seedSendJobs: SendJob[] = [];
