#!/usr/bin/env node
/**
 * Regenerate employee-seed.json and salary-seed.json from public/templates xlsx files.
 * Requires: npm install xlsx (devDependency)
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const templates = resolve(root, 'public/templates');
const out = resolve(root, 'src/mocks/data');

function serialize(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number' && Number.isFinite(v) && v === Math.floor(v)) return Math.floor(v);
  return v;
}

function parseEmployee() {
  const wb = XLSX.readFile(resolve(templates, 'employee_template.xlsx'));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
  return rows.map((row, i) => {
    const r = row;
    const ctcKeys = ['Basic', 'DA', 'Revised Basic+DA', 'HRA', 'Travel', 'Hostel', 'Children ', 'Children', 'Total Salary', 'Mobile', 'Convy', 'Wash Allo', 'Bran. Allo', 'Spl All', 'Training', 'Total Allowances', 'Total salary With Allowances'];
    const ctcStructure = {};
    for (const k of ctcKeys) {
      if (r[k] !== undefined && r[k] !== null) ctcStructure[k.replace(/ $/, '')] = serialize(r[k]);
    }
    return {
      id: `emp-${i + 1}`,
      employeeId: String(r['EMP ID'] ?? ''),
      name: String(r['Name'] ?? '').trim(),
      department: String(r['Department'] ?? '').trim(),
      mobileNo: String(r['Mobile Number'] ?? ''),
      level: String(r['Level'] ?? r[' Level'] ?? '').trim(),
      doj: serialize(r['DOJ'] ?? ''),
      tenureYears: String(r['No: of Yrs'] ?? ''),
      branch: String(r['Branch'] ?? '').trim(),
      designation: String(r['Designation'] ?? '').trim(),
      status: r['Status'] ?? 'Active',
      reportingManagerName: r['Reporting Manager Name'] ?? '',
      reportingManagerPhone: String(r['Reporting Manager Mobile No.'] ?? ''),
      ctcStructure,
      bankDetails: {
        bank: r['Bank'] ?? '',
        accountNo: String(r['A/c No.'] ?? ''),
        bankBranch: r['Bank Branch'] ?? '',
        ifscCode: r['IFSC Code'] ?? '',
        zone: r['Zone'] ?? '',
      },
      createdAt: new Date().toISOString(),
    };
  });
}

function parseSalary() {
  const wb = XLSX.readFile(resolve(templates, 'salary_template.xlsx'));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const headers = raw[0];
  return raw.slice(1).filter((row) => row[0]).map((row, i) => {
    const data = {};
    headers.forEach((h, j) => {
      const key = h != null ? String(h).trim() : `col_${j}`;
      data[key] = serialize(row[j]);
    });
    return {
      id: `sal-${i + 1}`,
      employeeId: String(data['EMP ID'] ?? ''),
      employeeName: String(data['Name'] ?? '').trim(),
      data,
      netPay: data['Actual Final Amount'] ?? data['Actual Final Amount '] ?? 0,
    };
  });
}

const employees = parseEmployee();
const salary = parseSalary();
writeFileSync(resolve(out, 'employee-seed.json'), JSON.stringify(employees, null, 2));
writeFileSync(resolve(out, 'salary-seed.json'), JSON.stringify(salary, null, 2));
console.log(`Wrote ${employees.length} employees, ${salary.length} salary rows`);
