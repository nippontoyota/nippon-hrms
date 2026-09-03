import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { referralApi } from '@/api/referral';

export default function ReferralsPage() {
  const queryClient = useQueryClient();

  const { data: candidates, isLoading: isLoadingCandidates } = useQuery({
    queryKey: ['candidates'],
    queryFn: referralApi.listCandidates,
  });

  const completionMutation = useMutation({
    mutationFn: ({ id, technicalTestCompleted, backgroundVerificationCompleted }: { id: string; technicalTestCompleted: boolean; backgroundVerificationCompleted: boolean }) =>
      referralApi.updateCandidateCompletion(id, { technicalTestCompleted, backgroundVerificationCompleted }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['candidates'] }),
    onError: () => toast.error('Could not update screening completion.'),
  });
  const sendMutation = useMutation({
    mutationFn: referralApi.sendCandidateToHeadOffice,
    onSuccess: () => {
      toast.success('Application sent to Head Office.');
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
    onError: () => toast.error('Complete both checks before sending to Head Office.'),
  });

  const handleExportCSV = () => {
    if (!candidates || candidates.length === 0) return;
    
    const headers = ['Candidate Name', 'Designation', 'Phone', 'Resume URL', 'Referred By', 'Referrer Dept', 'Technical Test Complete', 'Background Verification Complete', 'Status', 'Date Applied'];
    const rows = candidates.map(c => [
      c.name,
      c.designation || 'General',
      c.phone,
      c.resumeUrl,
      c.referralLink?.employee?.name || 'Unknown',
      c.referralLink?.employee?.department || '',
      c.technicalTestCompleted ? 'Yes' : 'No',
      c.backgroundVerificationCompleted ? 'Yes' : 'No',
      c.status,
      new Date(c.createdAt).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `referrals_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Referrals</h1>
        <button
          onClick={handleExportCSV}
          disabled={!candidates || candidates.length === 0}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="col-span-1 bg-white dark:bg-slate-800 rounded-none shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Candidates</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Candidate Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Designation</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Resume</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Referred By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Applied</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Checks</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Head Office</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-slate-700/50">
                {isLoadingCandidates ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Loading...</td>
                  </tr>
                ) : candidates?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No candidates found</td>
                  </tr>
                ) : (
                  candidates?.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {candidate.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {candidate.designation || 'General Application'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {candidate.phone}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <a 
                          href={candidate.resumeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 px-2.5 py-1.5 rounded-md"
                        >
                          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View Link
                        </a>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-200">
                          {candidate.referralLink?.employee?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {candidate.referralLink?.employee?.department || 'Employee'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(candidate.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={candidate.technicalTestCompleted} disabled={completionMutation.isPending}
                            onChange={(e) => completionMutation.mutate({ id: candidate.id, technicalTestCompleted: e.target.checked, backgroundVerificationCompleted: candidate.backgroundVerificationCompleted })} />
                          Technical test complete
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={candidate.backgroundVerificationCompleted} disabled={completionMutation.isPending}
                            onChange={(e) => completionMutation.mutate({ id: candidate.id, technicalTestCompleted: candidate.technicalTestCompleted, backgroundVerificationCompleted: e.target.checked })} />
                          Background verification complete
                        </label>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {candidate.status === 'SENT_TO_HEAD_OFFICE' ? <span className="text-xs font-medium text-green-700 dark:text-green-400">Sent</span> : <button
                          disabled={!candidate.technicalTestCompleted || !candidate.backgroundVerificationCompleted || sendMutation.isPending}
                          onClick={() => sendMutation.mutate(candidate.id)}
                          title={!candidate.technicalTestCompleted || !candidate.backgroundVerificationCompleted ? 'Complete both checks first' : 'Send to Head Office'}
                          className="px-2.5 py-1.5 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >Send to Head Office</button>}
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
