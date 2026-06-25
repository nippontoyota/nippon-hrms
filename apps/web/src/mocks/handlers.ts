import { http, HttpResponse } from 'msw';
import type {
  DispatchJob,
  DispatchJobItem,
  Employee,
  EmployeeInput,
  HolidayFile,
  ImportPreviewResult,
} from '@/api/types';
import {
  seedAttendancePeriods,
  seedDispatchJobs,
  seedDispatchLogs,
  seedEmployees,
  seedFeedback,
  seedHolidays,
  seedLeaveRequests,
  seedPeriods,
  seedRecords,
} from '@/mocks/data/seed';

let employees = [...seedEmployees];
let periods = [...seedPeriods];
let records = [...seedRecords];
let holidays = [...seedHolidays];
let attendancePeriods = [...seedAttendancePeriods];
let leaveRequests = [...seedLeaveRequests];
let feedback = [...seedFeedback];
let dispatchLogs = [...seedDispatchLogs];
let dispatchJobs = [...seedDispatchJobs];

let idCounter = 100;

function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

function advanceDispatchJob(job: DispatchJob) {
  if (job.status === 'COMPLETED' || job.status === 'FAILED') return;

  job.status = 'RUNNING';
  const pending = job.items.filter((i) => i.status === 'PENDING');
  const batch = pending.slice(0, 3);

  for (const item of batch) {
    const emp = employees.find((e) => e.employeeId === item.employeeId);
    if (!emp || emp.status === 'Inactive') {
      item.status = 'SKIPPED';
      item.errorReason = emp?.status === 'Inactive' ? 'inactive' : 'invalid_number';
      job.skipped += 1;
    } else if (Math.random() < 0.1) {
      item.status = 'FAILED';
      item.errorReason = 'WhatsApp delivery failed';
      job.failed += 1;
    } else {
      item.status = 'SENT';
      job.sent += 1;
      dispatchLogs.unshift({
        id: nextId('dl'),
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        month: job.month,
        year: job.year,
        status: 'Sent',
        whatsappMessageId: `wamid-${nextId('msg')}`,
        sentAt: new Date().toISOString(),
      });
    }
  }

  if (job.items.every((i) => i.status !== 'PENDING')) {
    job.status = job.failed > 0 && job.sent === 0 ? 'FAILED' : 'COMPLETED';
    const period = periods.find((p) => p.id === job.periodId);
    if (period && job.sent > 0) period.status = 'SENT';
  }
}

function mockEmployeePreview(): ImportPreviewResult {
  return {
    rows: employees.slice(0, 3).map((e, i) => ({
      row: i + 2,
      data: { 'EMP ID': e.employeeId, Name: e.name, Department: e.department, Status: e.status },
      errors: i === 1 ? ['Duplicate EMP ID'] : [],
      warnings: e.status === 'Active' && !e.reportingManagerName ? ['Missing reporting manager'] : [],
    })),
    successCount: 2,
    errorCount: 1,
    warningCount: 0,
  };
}

function mockSalaryPreview(_month: number, _year: number): ImportPreviewResult {
  const empIds = new Set(employees.map((e) => e.employeeId));
  return {
    rows: records.slice(0, 4).map((r, i) => ({
      row: i + 2,
      data: {
        'EMP ID': r.employeeId,
        Name: r.employeeName,
        'Actual Final Amount': r.netPay,
      },
      errors: !empIds.has(r.employeeId) ? ['Employee ID not in master'] : [],
      warnings: [],
    })),
    successCount: records.length,
    errorCount: 0,
    warningCount: 0,
  };
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
  http.post('/api/admin/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === 'admin@nippon.local' && body.password === 'admin123') {
      return HttpResponse.json({
        token: 'mock-jwt-token-admin',
        user: { id: 'user-1', name: 'Super Admin', email: body.email, role: 'SUPER_ADMIN' },
      });
    }
    if (body.email === 'hr@nippon.local' && body.password === 'hr123') {
      return HttpResponse.json({
        token: 'mock-jwt-token-hr',
        user: { id: 'user-2', name: 'HR Admin', email: body.email, role: 'HR_ADMIN' },
      });
    }
    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }),

  http.get('/api/admin/dashboard', () => {
    const latestPeriod = [...periods].sort((a, b) => b.year - a.year || b.month - a.month)[0];
    const recentDispatchJobs = dispatchJobs.slice(0, 5).map((job) => ({
      id: job.id,
      periodId: job.periodId,
      periodLabel: monthLabel(job.year, job.month),
      status: job.status,
      total: job.total,
      sent: job.sent,
      failed: job.failed,
      skipped: job.skipped,
      createdAt: job.createdAt,
    }));
    return HttpResponse.json({
      employeeCount: employees.filter((e) => e.status === 'Active').length,
      pendingLeaveRequests: leaveRequests.filter((l) => l.status === 'Pending').length,
      pendingDispatchJobs: dispatchJobs.filter((j) => j.status === 'PENDING' || j.status === 'RUNNING').length,
      attendancePeriods: attendancePeriods.length,
      latestPeriod,
      recentDispatchJobs,
    });
  }),

  http.get('/api/admin/employees', () => HttpResponse.json(employees)),

  http.get('/api/admin/employees/:id', ({ params }) => {
    const emp = employees.find((e) => e.id === params.id);
    if (!emp) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json(emp);
  }),

  http.post('/api/admin/employees', async ({ request }) => {
    const body = (await request.json()) as EmployeeInput;
    const emp: Employee = {
      id: nextId('emp'),
      ...body,
      createdAt: new Date().toISOString(),
    };
    employees.push(emp);
    return HttpResponse.json(emp, { status: 201 });
  }),

  http.put('/api/admin/employees/:id', async ({ params, request }) => {
    const body = (await request.json()) as EmployeeInput;
    const idx = employees.findIndex((e) => e.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    employees[idx] = { ...employees[idx], ...body };
    return HttpResponse.json(employees[idx]);
  }),

  http.delete('/api/admin/employees/:id', ({ params }) => {
    const idx = employees.findIndex((e) => e.id === params.id);
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    employees.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/admin/employees/bulk-upload/preview', async () => {
    return HttpResponse.json(mockEmployeePreview());
  }),

  http.post('/api/admin/employees/bulk-upload', async () => {
    return HttpResponse.json({ successCount: 16, errorCount: 0 });
  }),

  http.get('/api/admin/salary/periods', () => HttpResponse.json(periods)),

  http.get('/api/admin/salary/periods/:id', ({ params }) => {
    const period = periods.find((p) => p.id === params.id);
    if (!period) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    return HttpResponse.json(period);
  }),

  http.get('/api/admin/salary/periods/:id/records', ({ params }) => {
    return HttpResponse.json(records.filter((r) => r.periodId === params.id));
  }),

  http.post('/api/admin/salary/bulk-upload/preview', async ({ request }) => {
    const form = await request.formData();
    const month = Number(form.get('month') ?? 6);
    const year = Number(form.get('year') ?? 2026);
    return HttpResponse.json(mockSalaryPreview(month, year));
  }),

  http.post('/api/admin/salary/bulk-upload', async ({ request }) => {
    const form = await request.formData();
    const month = Number(form.get('month') ?? 6);
    const year = Number(form.get('year') ?? 2026);
    let period = periods.find((p) => p.month === month && p.year === year);
    if (!period) {
      period = {
        id: nextId('period'),
        year,
        month,
        status: 'READY',
        recordCount: records.length,
        unmatchedCount: 0,
        uploadedAt: new Date().toISOString(),
      };
      periods.push(period);
    } else {
      period.status = 'READY';
      period.recordCount = records.length;
      period.uploadedAt = new Date().toISOString();
    }
    return HttpResponse.json({
      successCount: records.length,
      errorCount: 0,
      periodId: period.id,
      year,
      month,
    });
  }),

  http.get('/api/admin/salary/periods/:periodId/preview/:employeeId', () => {
    return new HttpResponse(samplePdf, { headers: { 'Content-Type': 'application/pdf' } });
  }),

  http.post('/api/admin/salary/dispatch', async ({ request }) => {
    const body = (await request.json()) as { month: number; year: number };
    const period = periods.find((p) => p.month === body.month && p.year === body.year);
    if (!period) return HttpResponse.json({ message: 'No salary data for period' }, { status: 400 });
    if (period.status === 'DRAFT') {
      return HttpResponse.json({ message: 'Upload and validate salary data first' }, { status: 400 });
    }

    const periodRecords = records.filter((r) => r.periodId === period.id);
    const items: DispatchJobItem[] = periodRecords.map((r) => ({
      id: nextId('item'),
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      status: 'PENDING',
    }));

    const job: DispatchJob = {
      id: nextId('job'),
      periodId: period.id,
      year: body.year,
      month: body.month,
      status: 'PENDING',
      total: items.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      items,
      createdAt: new Date().toISOString(),
    };
    dispatchJobs.unshift(job);
    return HttpResponse.json({ jobId: job.id }, { status: 202 });
  }),

  http.get('/api/admin/salary/dispatch/:jobId', ({ params }) => {
    const job = dispatchJobs.find((j) => j.id === params.jobId);
    if (!job) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    advanceDispatchJob(job);
    return HttpResponse.json(job);
  }),

  http.post('/api/admin/salary/dispatch/:jobId/retry-failed', ({ params }) => {
    const job = dispatchJobs.find((j) => j.id === params.jobId);
    if (!job) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    for (const item of job.items) {
      if (item.status === 'FAILED') {
        item.status = 'PENDING';
        item.errorReason = undefined;
        job.failed -= 1;
      }
    }
    job.status = 'RUNNING';
    return HttpResponse.json(job);
  }),

  http.get('/api/admin/attendance/periods', () => HttpResponse.json(attendancePeriods)),

  http.post('/api/admin/attendance/bulk-upload', async ({ request }) => {
    const form = await request.formData();
    const month = Number(form.get('month'));
    const year = Number(form.get('year'));
    const period = {
      id: nextId('att'),
      year,
      month,
      recordCount: employees.length,
      uploadedAt: new Date().toISOString(),
    };
    attendancePeriods = attendancePeriods.filter((p) => !(p.month === month && p.year === year));
    attendancePeriods.push(period);
    return HttpResponse.json({ successCount: employees.length, errorCount: 0, year, month });
  }),

  http.get('/api/admin/holidays', () => HttpResponse.json(holidays)),

  http.post('/api/admin/holidays/upload', async ({ request }) => {
    const form = await request.formData();
    const year = Number(form.get('year'));
    const file = form.get('file') as File;
    const entry: HolidayFile = {
      id: nextId('hol'),
      year,
      fileName: file?.name ?? `holiday_${year}.pdf`,
      fileUrl: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
    };
    holidays = holidays.filter((h) => h.year !== year);
    holidays.push(entry);
    return HttpResponse.json(entry, { status: 201 });
  }),

  http.get('/api/admin/logs/dispatch', ({ request }) => {
    const url = new URL(request.url);
    const month = url.searchParams.get('month');
    const year = url.searchParams.get('year');
    const status = url.searchParams.get('status');
    let result = [...dispatchLogs];
    if (month) result = result.filter((l) => l.month === Number(month));
    if (year) result = result.filter((l) => l.year === Number(year));
    if (status) result = result.filter((l) => l.status === status);
    return HttpResponse.json(result);
  }),

  http.get('/api/admin/logs/leave', () => HttpResponse.json(leaveRequests)),

  http.get('/api/admin/logs/feedback', () => HttpResponse.json(feedback)),
];
