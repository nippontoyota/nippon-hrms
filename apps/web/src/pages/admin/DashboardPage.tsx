import { Link } from 'react-router-dom';
import { useDashboard } from '@/api/hooks';
import { Users, Buildings, Medal, Star, ArrowRight } from '@phosphor-icons/react';

function KPI({ label, value, subtext, icon: Icon, colorTheme }: { label: string; value: string | number; subtext: string; icon: any; colorTheme: 'blue' | 'emerald' | 'amber' | 'purple' }) {
  const themes = {
    blue: {
      bg: 'bg-blue-50/30 dark:bg-blue-900/10',
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200/50 dark:border-blue-800/30',
      hover: 'hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700',
    },
    emerald: {
      bg: 'bg-emerald-50/30 dark:bg-emerald-900/10',
      icon: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200/50 dark:border-emerald-800/30',
      hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-700',
    },
    amber: {
      bg: 'bg-amber-50/30 dark:bg-amber-900/10',
      icon: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200/50 dark:border-amber-800/30',
      hover: 'hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:border-amber-300 dark:hover:border-amber-700',
    },
    purple: {
      bg: 'bg-purple-50/30 dark:bg-purple-900/10',
      icon: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200/50 dark:border-purple-800/30',
      hover: 'hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-700',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div 
      className={`p-5 relative overflow-hidden transition-colors duration-200 border rounded-xl cursor-default ${theme.border} ${theme.bg} ${theme.hover}`}
    >
      <div className="flex justify-between items-start mb-3">
        <p className="font-semibold text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400">{label}</p>
        <div className={`${theme.icon}`}>
           <Icon size={24} weight="duotone" />
        </div>
      </div>
      <p className="font-mono text-3xl font-bold text-slate-900 dark:text-white leading-none mb-1">{value}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{subtext}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboard();

  return (
    <div 
      className="flex flex-col min-h-[calc(100vh-6rem)] max-w-7xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white tracking-tight">HR Overview</h1>
        <Link to="/admin/salary" className="btn-primary">
          Process Monthly Payroll Batch <ArrowRight size={16} weight="bold" className="ml-1" />
        </Link>
      </div>

      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex-1">
          <div className="spinner-dashed"></div>
          <p className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-widest">Aggregating telemetry...</p>
        </div>
      ) : (
        <>
          <div 
            className="grid grid-cols-1 md:grid-cols-4 gap-5"
          >
            <KPI 
              label="Dealership Headcount" 
              value={stats?.employeeCount ?? 0} 
              subtext="Active roster"
              icon={Users} 
              colorTheme="blue"
            />
            <KPI 
              label="Active Branches" 
              value={stats?.branchDistribution?.length ?? 0} 
              subtext="Total operating locations"
              icon={Buildings} 
              colorTheme="emerald"
            />
            <KPI 
              label="Newcomers" 
              value={stats?.experienceDistribution?.under1Year ?? 0} 
              subtext="Less than 1 year experience"
              icon={Star} 
              colorTheme="amber"
            />
            <KPI 
              label="Veterans" 
              value={stats?.experienceDistribution?.over10Years ?? 0} 
              subtext="10+ years experience"
              icon={Medal} 
              colorTheme="purple"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 pb-8">
        {/* Branch Distribution */}
        <div className="lg:col-span-2 relative min-h-[400px]">
          <div className="card !p-0 overflow-hidden flex flex-col absolute inset-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Branch Distribution</h2>
            </div>
            <div className="overflow-y-auto flex-1 bg-white dark:bg-slate-900 custom-scrollbar">
              {stats?.branchDistribution && stats.branchDistribution.length > 0 ? (
                <div className="table-wrapper !border-0 !rounded-none !p-0">
                  <table className="table-dense w-full !border-0">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-sm">
                      <tr>
                        <th className="!py-3 !px-4 text-left border-t-0 border-l-0">BRANCH</th>
                        <th className="!py-3 !px-4 text-right border-t-0 border-r-0">HEADCOUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.branchDistribution.map((b) => (
                        <tr key={b.branch} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="!py-3 !px-4 font-medium text-slate-700 dark:text-slate-300 text-sm border-l-0">{b.branch}</td>
                          <td className="!py-3 !px-4 text-right font-bold text-slate-700 dark:text-slate-200 font-mono text-sm border-r-0">{b.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono uppercase tracking-widest p-8">No data available</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-8 lg:col-span-1 h-full">
          {/* Experience Breakdown */}
          <div className="card !p-0 overflow-hidden flex flex-col self-start w-full">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Experience Breakdown</h2>
            </div>
            <div className="bg-white dark:bg-slate-900 custom-scrollbar">
              {stats?.experienceDistribution ? (
                <div className="table-wrapper !border-0 !rounded-none !p-0">
                  <table className="table-dense w-full !border-0">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-sm">
                      <tr>
                        <th className="!py-3 !px-4 text-left border-t-0 border-l-0">EXPERIENCE LEVEL</th>
                        <th className="!py-3 !px-4 text-right border-t-0 border-r-0">HEADCOUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: '< 1 Year', count: stats.experienceDistribution.under1Year },
                        { label: '1 - 3 Years', count: stats.experienceDistribution.oneTo3Years },
                        { label: '3 - 5 Years', count: stats.experienceDistribution.threeTo5Years },
                        { label: '5 - 10 Years', count: stats.experienceDistribution.fiveTo10Years },
                        { label: '10+ Years', count: stats.experienceDistribution.over10Years },
                      ].map((item) => (
                        <tr key={item.label} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="!py-4 !px-4 font-medium text-slate-700 dark:text-slate-300 text-sm border-l-0">{item.label}</td>
                          <td className="!py-4 !px-4 text-right font-bold text-slate-700 dark:text-slate-200 font-mono text-sm border-r-0">{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono uppercase tracking-widest p-8">No data available</div>
              )}
            </div>
          </div>

          {/* Designation Breakdown */}
          <div className="card !p-0 overflow-hidden flex flex-col w-full flex-1 max-h-[400px]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Designation Breakdown</h2>
            </div>
            <div className="overflow-y-auto flex-1 bg-white dark:bg-slate-900 custom-scrollbar">
              {stats?.designationDistribution && stats.designationDistribution.length > 0 ? (
                <div className="table-wrapper !border-0 !rounded-none !p-0">
                  <table className="table-dense w-full !border-0">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-sm">
                      <tr>
                        <th className="!py-3 !px-4 text-left border-t-0 border-l-0">DESIGNATION</th>
                        <th className="!py-3 !px-4 text-right border-t-0 border-r-0">HEADCOUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.designationDistribution.map((d) => (
                        <tr key={d.designation} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="!py-3 !px-4 font-medium text-slate-700 dark:text-slate-300 text-sm border-l-0">{d.designation}</td>
                          <td className="!py-3 !px-4 text-right font-bold text-slate-700 dark:text-slate-200 font-mono text-sm border-r-0">{d.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono uppercase tracking-widest p-8">No data available</div>
              )}
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
