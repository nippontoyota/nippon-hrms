import { Link } from 'react-router-dom';
import { useDashboard } from '@/api/hooks';
import { Users, ArrowsClockwise, Envelope, Warning, ArrowRight } from '@phosphor-icons/react';

function KPI({ label, value, subtext, icon: Icon }: { label: string; value: string | number; subtext: string; icon: any }) {
  return (
    <div className="card !p-4">
      <div className="flex justify-between items-start mb-2">
        <p className="font-semibold text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
        <Icon size={20} weight="duotone" className="text-slate-400" />
      </div>
      <p className="font-mono text-3xl font-bold text-slate-900 leading-none mb-1">{value}</p>
      <p className="text-[11px] text-slate-500 font-medium">{subtext}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboard();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-headline font-bold text-slate-900 tracking-tight">HR Overview</h1>
        <Link to="/admin/salary" className="btn-primary">
          Process Monthly Payroll Batch <ArrowRight size={16} weight="bold" className="ml-1" />
        </Link>
      </div>

      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-4 bg-white border border-slate-300">
          <div className="spinner-dashed"></div>
          <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">Aggregating telemetry...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPI 
            label="Dealership Headcount" 
            value={stats?.employeeCount ?? 0} 
            subtext="Active roster"
            icon={Users} 
          />
          <KPI 
            label="Current Batch" 
            value={stats?.pendingDispatchJobs ?? 0} 
            subtext="Latest run"
            icon={ArrowsClockwise} 
          />
          <KPI 
            label="Whatsapp Sent" 
            value={0} 
            subtext="Secure deliveries"
            icon={Envelope} 
          />
          <KPI 
            label="Failed Deliveries" 
            value={0} 
            subtext="Requires attention"
            icon={Warning} 
          />
        </div>
      )}

      <div className="mt-8">
        <div className="flex justify-between items-center p-3 bg-slate-100 border-t border-l border-r border-slate-300">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Recent Payroll Batches</h2>
          <button className="text-[10px] font-bold text-[#eb0a1e] uppercase tracking-wider hover:underline">View all</button>
        </div>
        <div className="table-wrapper">
          <table className="table-dense">
            <thead>
              <tr>
                <th>BATCH ID</th>
                <th>MONTH</th>
                <th>STATUS</th>
                <th>COMPLETED</th>
                <th>FAILED</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="text-center p-4 text-slate-500 font-mono">NO RECORDS FOUND</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
