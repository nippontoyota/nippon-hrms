import { http, HttpResponse } from 'msw';
import type {
  Employee,
  EmployeeInput,
  Holiday,
  SendJob,
  SendJobItem,
  TicketStatus,
} from '@/api/types';
import {
  seedAudit,
  seedEmployees,
  seedHolidays,
  seedPeriods,
  seedRecords,
  seedSendJobs,
  seedTickets,
} from '@/mocks/data/seed';

let employees = [...seedEmployees];
let periods = [...seedPeriods];
let records = [...seedRecords];
let holidays = [...seedHolidays];
let tickets = [...seedTickets];
let audit = [...seedAudit];
let sendJobs = [...seedSendJobs];

let idCounter = 100;

function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function addAudit(action: string, entity: string, details: string) {
  audit.unshift({
    id: nextId('aud'),
    timestamp: new Date().toISOString(),
    actor: 'HR Admin',
    action,
    entity,
    details,
  });
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

function advanceSendJob(job: SendJob) {
  if (job.status === 'COMPLETED' || job.status === 'FAILED') return;

  job.status = 'RUNNING';
  const pending = job.items.filter((i) => i.status === 'PENDING');
  const batch = pending.slice(0, 2);

  for (const item of batch) {
    if (Math.random() < 0.15) {
      item.status = 'FAILED';
      item.error = 'WhatsApp delivery failed';
      job.failed += 1;
    } else {
      item.status = 'SENT';
      job.sent += 1;
    }
  }

  if (job.items.every((i) => i.status !== 'PENDING')) {
    job.status = job.failed > 0 && job.sent === 0 ? 'FAILED' : 'COMPLETED';
    const period = periods.find((p) => p.id === job.periodId);
    if (period && job.sent > 0) period.status = 'SENT';
  }
}

const samplePdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R>>endobj
4 0 obj<</Length 44>>stream
BT /F1 24 Tf 100 700 Td (Payslip Preview) Tj ET
endstream endobj
xref
0 5
trailer<</Size 5/Root 1 0 R>>
startxref
0
%%EOF`;

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === 'admin@nippon.local' && body.password === 'admin123') {
      return HttpResponse.json({
        token: 'mock-jwt-token-admin',
        user: { id: 'user-1', name: 'HR Admin', email: body.email, role: 'ADMIN' },
      });
    }
    if (body.email === 'hr@nippon.local' && body.password === 'hr123') {
      return HttpResponse.json({
        token: 'mock-jwt-token-hr',
        user: { id: 'user-2', name: 'HR Staff', email: body.email, role: 'HR' },
      });
    }
    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }),

  http.get('/api/dashboard', () => {
    const latestPeriod = [...periods].sort((a, b) => b.year - a.year || b.month - a.month)[0];
    return HttpResponse.json({
      employeeCount: employees.filter((e) => e.active).length,
      openTickets: tickets.filter((t) => t.status !== 'RESOLVED').length,
      pendingSendJobs: sendJobs.filter((j) => j.status === 'PENDING' || j.status === 'RUNNING').length,
      latestPeriod,
    });
  }),

  http.get('/api/employees', () => HttpResponse.json(employees)),

  http.get('/api/employees/:id', ({ params }) => {
    const emp = employees.find((e) => e.id === params.id);
    if (!emp) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json(emp);
  }),

  http.post('/api/employees', async ({ request }) => {
    const body = (await request.json()) as EmployeeInput;
    const emp: Employee = {
      id: nextId('emp'),
      ...body,
      createdAt: new Date().toISOString(),
    };
    employees.push(emp);
    addAudit('CREATE_EMPLOYEE', emp.id, `Added employee ${emp.name} (${emp.employeeCode})`);
    return HttpResponse.json(emp, { status: 201 });
  }),

  http.put('/api/employees/:id', async ({ params, request }) => {
    const body = (await request.json()) as EmployeeInput;
    const idx = employees.findIndex((e) => e.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    employees[idx] = { ...employees[idx], ...body };
    addAudit('UPDATE_EMPLOYEE', employees[idx].id, `Updated employee ${employees[idx].name}`);
    return HttpResponse.json(employees[idx]);
  }),

  http.delete('/api/employees/:id', ({ params }) => {
    const idx = employees.findIndex((e) => e.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    const [removed] = employees.splice(idx, 1);
    addAudit('DELETE_EMPLOYEE', removed.id, `Deleted employee ${removed.name}`);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/employees/import', async () => {
    addAudit('IMPORT_EMPLOYEES', 'bulk', 'Imported 1 employee from Excel');
    return HttpResponse.json({ successCount: 1, errorCount: 0 });
  }),

  http.get('/api/employees/import/template', () => {
    const csv = 'employeeCode,name,department,designation,whatsappPhone,bankAccount,bankIfsc,active\n';
    return new HttpResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="employee_template.csv"',
      },
    });
  }),

  http.get('/api/payslips/periods', () => HttpResponse.json(periods)),

  http.get('/api/payslips/periods/:id', ({ params }) => {
    const period = periods.find((p) => p.id === params.id);
    if (!period) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json(period);
  }),

  http.get('/api/payslips/periods/:id/records', ({ params }) => {
    return HttpResponse.json(records.filter((r) => r.periodId === params.id));
  }),

  http.post('/api/payslips/import', async () => {
    addAudit('IMPORT_PAYSLIPS', 'period-2', 'Imported payslip records from Excel');
    return HttpResponse.json({ successCount: 3, errorCount: 0 });
  }),

  http.get('/api/payslips/import/template', () => {
    const csv = 'employeeCode,year,month,basic,hra,special,pf,esi,pt,grossPay,netPay\n';
    return new HttpResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="payslip_template.csv"',
      },
    });
  }),

  http.post('/api/payslips/periods/:id/finalize', ({ params }) => {
    const period = periods.find((p) => p.id === params.id);
    if (!period) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    if (period.status !== 'DRAFT') {
      return HttpResponse.json({ message: 'Period is not in DRAFT status' }, { status: 400 });
    }
    period.status = 'FINALIZED';
    period.finalizedAt = new Date().toISOString();
    addAudit('FINALIZE_PERIOD', period.id, `Finalized payslip period ${monthLabel(period.year, period.month)}`);
    return HttpResponse.json(period);
  }),

  http.get('/api/payslips/periods/:periodId/preview/:employeeId', () => {
    return new HttpResponse(samplePdf, {
      headers: { 'Content-Type': 'application/pdf' },
    });
  }),

  http.post('/api/payslips/periods/:id/send', ({ params }) => {
    const period = periods.find((p) => p.id === params.id);
    if (!period) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    if (period.status !== 'FINALIZED' && period.status !== 'SENT') {
      return HttpResponse.json({ message: 'Period must be finalized' }, { status: 400 });
    }

    const periodRecords = records.filter((r) => r.periodId === period.id);
    const items: SendJobItem[] = periodRecords.map((r) => ({
      id: nextId('item'),
      employeeCode: r.employeeCode,
      employeeName: r.employeeName,
      status: 'PENDING' as const,
    }));

    const job: SendJob = {
      id: nextId('job'),
      periodId: period.id,
      status: 'PENDING',
      total: items.length,
      sent: 0,
      failed: 0,
      items,
      createdAt: new Date().toISOString(),
    };
    sendJobs.unshift(job);
    addAudit('START_SEND_JOB', job.id, `Started bulk send for ${monthLabel(period.year, period.month)}`);
    return HttpResponse.json({ jobId: job.id }, { status: 202 });
  }),

  http.get('/api/send-jobs/:id', ({ params }) => {
    const job = sendJobs.find((j) => j.id === params.id);
    if (!job) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    advanceSendJob(job);
    return HttpResponse.json(job);
  }),

  http.post('/api/send-jobs/:id/retry-failed', ({ params }) => {
    const job = sendJobs.find((j) => j.id === params.id);
    if (!job) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    for (const item of job.items) {
      if (item.status === 'FAILED') {
        item.status = 'PENDING';
        item.error = undefined;
        job.failed -= 1;
      }
    }
    job.status = 'RUNNING';
    addAudit('RETRY_SEND_JOB', job.id, 'Retried failed send items');
    return HttpResponse.json(job);
  }),

  http.get('/api/holidays', () => HttpResponse.json(holidays)),

  http.post('/api/holidays', async ({ request }) => {
    const body = (await request.json()) as Omit<Holiday, 'id'>;
    const holiday: Holiday = { id: nextId('hol'), ...body };
    holidays.push(holiday);
    addAudit('CREATE_HOLIDAY', holiday.id, `Added holiday ${holiday.name}`);
    return HttpResponse.json(holiday, { status: 201 });
  }),

  http.delete('/api/holidays/:id', ({ params }) => {
    const idx = holidays.findIndex((h) => h.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    const [removed] = holidays.splice(idx, 1);
    addAudit('DELETE_HOLIDAY', removed.id, `Deleted holiday ${removed.name}`);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('/api/tickets', () => HttpResponse.json(tickets)),

  http.patch('/api/tickets/:id', async ({ params, request }) => {
    const body = (await request.json()) as { status: TicketStatus };
    const ticket = tickets.find((t) => t.id === params.id);
    if (!ticket) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    ticket.status = body.status;
    addAudit('UPDATE_TICKET', ticket.id, `Ticket status changed to ${body.status}`);
    return HttpResponse.json(ticket);
  }),

  http.get('/api/audit', () => HttpResponse.json(audit)),
];
