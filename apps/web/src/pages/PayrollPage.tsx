import { Download } from 'lucide-react';

const payroll = [
  { id: 'EMP001', name: 'Arjun Sharma',    dept: 'Engineering', gross: '₹1,20,000', deductions: '₹18,400', net: '₹1,01,600', status: 'Processed' },
  { id: 'EMP002', name: 'Priya Mehta',     dept: 'HR',          gross: '₹75,000',   deductions: '₹11,250', net: '₹63,750',   status: 'Processed' },
  { id: 'EMP003', name: 'Ravi Krishnan',   dept: 'Sales',       gross: '₹95,000',   deductions: '₹14,250', net: '₹80,750',   status: 'Pending'   },
  { id: 'EMP004', name: 'Sunita Patel',    dept: 'Finance',     gross: '₹68,000',   deductions: '₹10,200', net: '₹57,800',   status: 'On Hold'   },
  { id: 'EMP005', name: 'Mohammed Farhan', dept: 'Operations',  gross: '₹82,000',   deductions: '₹12,300', net: '₹69,700',   status: 'Processed' },
];

const statusBadge: Record<string, string> = {
  Processed: 'badge-success',
  Pending:   'badge-warning',
  'On Hold': 'badge-error',
};

export default function PayrollPage() {
  return (
    <div className="fade-up">
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">June 2026 payroll cycle</p>
        </div>
        <button id="btn-export-payroll" className="btn btn-secondary">
          <Download size={15} /> Export
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Gross Pay</th>
              <th>Deductions</th>
              <th>Net Pay</th>
              <th>Status</th>
              <th>Slip</th>
            </tr>
          </thead>
          <tbody>
            {payroll.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.dept}</td>
                <td>{p.gross}</td>
                <td style={{ color: 'var(--error)' }}>{p.deductions}</td>
                <td style={{ color: 'var(--success)', fontWeight: 600 }}>{p.net}</td>
                <td><span className={`badge ${statusBadge[p.status]}`}>{p.status}</span></td>
                <td>
                  {p.status === 'Processed' && (
                    <button className="btn btn-ghost btn-sm" id={`btn-slip-${p.id}`}>
                      <Download size={12} /> Slip
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
