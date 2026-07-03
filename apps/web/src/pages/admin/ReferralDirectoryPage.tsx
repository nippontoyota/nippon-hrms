import { useState } from 'react';
import { useReferrals, useUpdateReferralStatus } from '@/api/hooks';
import { ReferralStatus } from '@/api/types';
import toast from 'react-hot-toast';
import { Check, DotsThree, DownloadSimple, UserCircle } from '@phosphor-icons/react';

export default function ReferralDirectoryPage() {
  const { data: referrals, isLoading } = useReferrals();
  const updateStatus = useUpdateReferralStatus();

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const handleStatusChange = async (id: string, status: ReferralStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success(`Referral status updated to ${status}`);
      setActiveDropdown(null);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status: ReferralStatus) => {
    switch (status) {
      case 'pending': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">Pending</span>;
      case 'reviewed': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Reviewed</span>;
      case 'interviewing': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">Interviewing</span>;
      case 'hired': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Hired</span>;
      case 'rejected': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-800">Rejected</span>;
      default: return null;
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Employee Referrals</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage candidates referred by employees</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
              <tr>
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Role Applied For</th>
                <th className="px-6 py-4">Referred By</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Resume</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Loading referrals...
                  </td>
                </tr>
              ) : referrals?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <UserCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" weight="light" />
                    <p className="text-base font-medium text-slate-700 dark:text-slate-300">No referrals yet</p>
                    <p className="text-sm mt-1">When employees share their link, applications will appear here.</p>
                  </td>
                </tr>
              ) : (
                referrals?.map((ref) => (
                  <tr key={ref.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{ref.candidateName}</div>
                      <div className="text-xs text-slate-500">{ref.candidatePhone}</div>
                      {ref.candidateEmail && <div className="text-xs text-slate-500">{ref.candidateEmail}</div>}
                    </td>
                    <td className="px-6 py-4 font-medium">{ref.role}</td>
                    <td className="px-6 py-4">
                      {ref.employee ? (
                        <>
                          <div className="font-medium text-slate-900 dark:text-slate-100">{ref.employee.name}</div>
                          <div className="text-xs text-slate-500">{ref.employee.department}</div>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {ref.resumeUrl ? (
                        <a 
                          href={import.meta.env.VITE_API_URL + ref.resumeUrl} 
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-md transition-colors"
                        >
                          <DownloadSimple weight="bold" /> View Resume
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Not provided</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(ref.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === ref.id ? null : ref.id)}
                          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none"
                        >
                          <DotsThree weight="bold" size={20} />
                        </button>
                        
                        {activeDropdown === ref.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                            <div className="absolute right-0 z-20 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 border border-slate-100 dark:border-slate-700">
                              <div className="py-1" role="menu" aria-orientation="vertical">
                                <span className="block px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 mb-1">
                                  Update Status
                                </span>
                                {['pending', 'reviewed', 'interviewing', 'hired', 'rejected'].map((status) => (
                                  <button
                                    key={status}
                                    disabled={ref.status === status}
                                    onClick={() => handleStatusChange(ref.id, status as ReferralStatus)}
                                    className={`w-full text-left px-4 py-2 text-sm capitalize flex items-center justify-between ${
                                      ref.status === status 
                                        ? 'bg-slate-50 dark:bg-slate-700/50 text-blue-600 dark:text-blue-400 cursor-default'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    }`}
                                  >
                                    {status}
                                    {ref.status === status && <Check size={16} weight="bold" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
