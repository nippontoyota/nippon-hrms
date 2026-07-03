import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { referralsApi } from '@/api/endpoints';
import toast from 'react-hot-toast';
import { CaretRight, Briefcase, Paperclip, User, Phone, Envelope, X } from '@phosphor-icons/react';

export default function ReferralPage() {
  const [searchParams] = useSearchParams();
  const empId = searchParams.get('emp_id') || '';

  const [candidateName, setCandidateName] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [role, setRole] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId) {
      toast.error('Invalid referral link. Missing employee ID.');
      return;
    }
    if (!candidateName || !candidatePhone || !role) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('referralCode', empId);
    formData.append('candidateName', candidateName);
    formData.append('candidatePhone', candidatePhone);
    formData.append('candidateEmail', candidateEmail);
    formData.append('role', role);
    if (resume) {
      formData.append('resume', resume);
    }

    try {
      await referralsApi.submit(formData);
      setIsSuccess(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Application Received!</h2>
          <p className="text-slate-600">
            Thank you for applying through the Nippon HR Connect Referral Program. Our HR team will review your application and get back to you shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-br from-blue-600 to-indigo-700 pointer-events-none" />
      <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-10 right-20 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex-1 w-full max-w-lg mx-auto p-4 py-12 relative z-10">
        <div className="text-center mb-8">
          <img src="/nippon-logo.png" alt="Nippon Toyota" className="h-10 mx-auto mb-6 brightness-0 invert" />
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Join Our Team</h1>
          <p className="text-blue-100">Apply via Employee Referral</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {!empId ? (
              <div className="p-6 bg-red-50 border border-red-200 text-red-800 rounded-xl text-center space-y-3 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-500 mb-2">
                  <X className="w-6 h-6" weight="bold" />
                </div>
                <h3 className="font-semibold text-lg">Invalid Referral Link</h3>
                <p className="text-sm">
                  This link is missing a valid employee referral code. You cannot apply through this page without a valid link from a Nippon Toyota employee.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={candidateName}
                    onChange={e => setCandidateName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={candidatePhone}
                    onChange={e => setCandidatePhone(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Envelope className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={candidateEmail}
                    onChange={e => setCandidateEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Role Applied For *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                    placeholder="e.g. Sales Executive, Technician"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Resume (Optional)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,.doc,.docx"
                    onChange={e => setResume(e.target.files?.[0] || null)}
                  />
                  <div className="space-y-1 text-center">
                    <Paperclip className="mx-auto h-8 w-8 text-slate-400" />
                    <div className="flex text-sm text-slate-600 justify-center">
                      <span className="relative rounded-md font-medium text-blue-600 hover:text-blue-500">
                        {resume ? resume.name : 'Upload a file or drag and drop'}
                      </span>
                    </div>
                    {!resume && <p className="text-xs text-slate-500">PDF, DOC up to 5MB</p>}
                  </div>
                </div>
              </div>
            </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-sm shadow-blue-600/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  {!isSubmitting && <CaretRight weight="bold" />}
                </button>
              </>
            )}
          </form>
        </div>
        
        <p className="text-center text-sm text-slate-500 mt-8">
          &copy; {new Date().getFullYear()} Nippon Toyota. All rights reserved.
        </p>
      </div>
    </div>
  );
}
