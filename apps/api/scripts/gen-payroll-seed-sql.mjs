import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const rows = JSON.parse(fs.readFileSync(path.join(root, 'internal/payroll/seeddata/salary-seed.json'), 'utf8'));
const months = [1, 2, 3, 4, 5];
const year = 2026;

const daysInMonth = (m, y) => (m === 2 ? 28 : [4, 6, 9, 11].includes(m) ? 30 : 31);
const n = (d, ...keys) => {
  for (const k of keys) {
    const v = d[k];
    if (v != null) return Number(v) || 0;
  }
  return 0;
};

const cols =
  'employee_id, month, year, emp_name_snapshot, leaves, lop, days, absents, basic, da, basic_da, hra, travel, children_hostel, children_education, mobile, conveyance, branch_allowance, wash_allowance, special_allowance, training, incentive, total_ear_with_incen, gross_sal_without_incentives, gross_for_pt, pf, pf_3_67, pf_8_33, esi_0_75, esi_3_25, tds, sal_adv, additional_deduction, loan, advance, lop_deduction, company_statutory_contribution, reimb_medical, reimb_lta, zeta_meal_voucher, reimb_travel, total_reimbursement, epf_er, net_incentive, total_deductions, actual_final_amount';

const vals = [];
for (const month of months) {
  const days = daysInMonth(month, year);
  for (const row of rows) {
    const d = row.data;
    const v = [
      `'${String(row.employeeId).replace(/'/g, "''")}'`,
      month,
      year,
      `'${String(row.employeeName).replace(/'/g, "''")}'`,
      n(d, 'Leaves'),
      n(d, 'LOP'),
      days,
      n(d, 'ABSENTS'),
      n(d, 'Basic'),
      n(d, 'DA'),
      n(d, 'Basic+DA'),
      n(d, 'HRA'),
      n(d, 'Travel'),
      n(d, 'Children Hostel'),
      n(d, 'Children Education'),
      n(d, 'Mobile'),
      n(d, 'Convy'),
      n(d, 'Br. Allow'),
      n(d, 'W.A.'),
      n(d, 'Spl All'),
      n(d, 'Training'),
      n(d, 'Incentive'),
      n(d, 'Total Ear with incen'),
      n(d, 'Gross Sal-With out Incentives'),
      n(d, 'Gross for PT'),
      n(d, 'PF'),
      n(d, '3.67'),
      n(d, '8.33'),
      n(d, 'ESI 0.75'),
      n(d, 'ESI 3.25'),
      n(d, 'TDS'),
      n(d, 'Sal Adv'),
      n(d, 'Additional Deduction'),
      n(d, 'Loan'),
      n(d, 'Advance'),
      n(d, 'LOP'),
      n(d, "Company's Statutory contribution"),
      n(d, 'Reimbursement of Medical Expences'),
      n(d, 'Reimbursement of LTA'),
      n(d, 'Zeta Meal Voucher / Gift Card / Sudexo'),
      n(d, 'Reimbursement of Travel Expences'),
      n(d, 'Total Reimbursement'),
      n(d, 'EPF ER'),
      n(d, 'Net Incentive'),
      n(d, 'Total Deductions'),
      n(d, 'Actual Final Amount'),
    ];
    vals.push(`(${v.join(', ')})`);
  }
}

const sql = `-- Sample payroll records for January through May 2026
INSERT INTO payroll_records (${cols})
VALUES
${vals.join(',\n')}
ON CONFLICT (employee_id, month, year) DO UPDATE SET
    emp_name_snapshot = EXCLUDED.emp_name_snapshot,
    leaves = EXCLUDED.leaves,
    lop = EXCLUDED.lop,
    days = EXCLUDED.days,
    absents = EXCLUDED.absents,
    basic = EXCLUDED.basic,
    da = EXCLUDED.da,
    basic_da = EXCLUDED.basic_da,
    hra = EXCLUDED.hra,
    travel = EXCLUDED.travel,
    children_hostel = EXCLUDED.children_hostel,
    children_education = EXCLUDED.children_education,
    mobile = EXCLUDED.mobile,
    conveyance = EXCLUDED.conveyance,
    branch_allowance = EXCLUDED.branch_allowance,
    wash_allowance = EXCLUDED.wash_allowance,
    special_allowance = EXCLUDED.special_allowance,
    training = EXCLUDED.training,
    incentive = EXCLUDED.incentive,
    total_ear_with_incen = EXCLUDED.total_ear_with_incen,
    gross_sal_without_incentives = EXCLUDED.gross_sal_without_incentives,
    gross_for_pt = EXCLUDED.gross_for_pt,
    pf = EXCLUDED.pf,
    pf_3_67 = EXCLUDED.pf_3_67,
    pf_8_33 = EXCLUDED.pf_8_33,
    esi_0_75 = EXCLUDED.esi_0_75,
    esi_3_25 = EXCLUDED.esi_3_25,
    tds = EXCLUDED.tds,
    sal_adv = EXCLUDED.sal_adv,
    additional_deduction = EXCLUDED.additional_deduction,
    loan = EXCLUDED.loan,
    advance = EXCLUDED.advance,
    lop_deduction = EXCLUDED.lop_deduction,
    company_statutory_contribution = EXCLUDED.company_statutory_contribution,
    reimb_medical = EXCLUDED.reimb_medical,
    reimb_lta = EXCLUDED.reimb_lta,
    zeta_meal_voucher = EXCLUDED.zeta_meal_voucher,
    reimb_travel = EXCLUDED.reimb_travel,
    total_reimbursement = EXCLUDED.total_reimbursement,
    epf_er = EXCLUDED.epf_er,
    net_incentive = EXCLUDED.net_incentive,
    total_deductions = EXCLUDED.total_deductions,
    actual_final_amount = EXCLUDED.actual_final_amount;
`;

const out = path.join(root, 'migrations/000010_seed_payroll_jan_may_2026.sql');
fs.writeFileSync(out, sql);
console.log(`wrote ${vals.length} rows to ${out}`);
