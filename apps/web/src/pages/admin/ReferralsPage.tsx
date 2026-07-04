import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referralApi } from '@/api/referral';
import toast from 'react-hot-toast';

export default function ReferralsPage() {
  const queryClient = useQueryClient();

  const { data: candidates, isLoading: isLoadingCandidates } = useQuery({
    queryKey: ['candidates'],
    queryFn: referralApi.listCandidates,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => referralApi.updateCandidateStatus(id, status),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Referrals</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="col-span-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Candidates</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">#</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Candidate Details</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Referred By</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-slate-700/50">
                {isLoadingCandidates ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Loading...</td>
                  </tr>
                ) : candidates?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No candidates found</td>
                  </tr>
                ) : (
                  candidates?.map((candidate, index) => (
                    <tr key={candidate.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-400 dark:text-gray-500">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{candidate.name}</div>
                        <a 
                          href={candidate.resumeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center text-xs font-medium text-[#EB0A1E] hover:text-[#c00818] transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View Resume
                        </a>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {candidate.phone}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-200">
                          {candidate.referralLink?.employee?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {candidate.referralLink?.employee?.department || 'Employee'}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="relative inline-block w-36">
                          <select
                            value={candidate.status}
                            onChange={(e) => updateStatusMutation.mutate({ id: candidate.id, status: e.target.value })}
                            className={`block w-full appearance-none rounded-full border py-1.5 pl-3 pr-8 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors cursor-pointer
                              ${candidate.status === 'PENDING' ? 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700' : ''}
                              ${candidate.status === 'REVIEWING' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : ''}
                              ${candidate.status === 'INTERVIEWED' ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' : ''}
                              ${candidate.status === 'HIRED' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' : ''}
                              ${candidate.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' : ''}
                            `}
                          >
                            <option value="PENDING">Pending</option>
                            <option value="REVIEWING">Reviewing</option>
                            <option value="INTERVIEWED">Interviewed</option>
                            <option value="HIRED">Hired</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-50">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
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
    </div>
  );
}
