import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referralApi } from '@/api/referral';
import toast from 'react-hot-toast';

export default function ReferralsPage() {
  const queryClient = useQueryClient();
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  const { data: candidates, isLoading: isLoadingCandidates } = useQuery({
    queryKey: ['candidates'],
    queryFn: referralApi.listCandidates,
  });

  const generateMutation = useMutation({
    mutationFn: () => referralApi.generateLink(employeeIdInput),
    onSuccess: (data) => {
      setGeneratedLink(`${window.location.origin}/referrals/${data.code}`);
      toast.success('Referral link generated');
    },
    onError: () => toast.error('Failed to generate link'),
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generate Link</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employee ID (UUID)</label>
              <input
                type="text"
                value={employeeIdInput}
                onChange={(e) => setEmployeeIdInput(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-slate-700 dark:text-white"
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </div>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={!employeeIdInput || generateMutation.isPending}
              className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate Link'}
            </button>
            {generatedLink && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-900 rounded-md break-all text-sm font-mono text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700">
                {generatedLink}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Candidates</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Candidate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Referred By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {isLoadingCandidates ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Loading...</td>
                  </tr>
                ) : candidates?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No candidates found</td>
                  </tr>
                ) : (
                  candidates?.map((candidate) => (
                    <tr key={candidate.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{candidate.name}</div>
                        <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View Resume</a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {candidate.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {candidate.referralLink?.employee?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <select
                          value={candidate.status}
                          onChange={(e) => updateStatusMutation.mutate({ id: candidate.id, status: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 py-1.5 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="REVIEWING">Reviewing</option>
                          <option value="INTERVIEWED">Interviewed</option>
                          <option value="HIRED">Hired</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
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
