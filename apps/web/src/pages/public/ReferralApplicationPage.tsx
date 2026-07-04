import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { referralApi } from '@/api/referral';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Link as LinkIcon, CheckCircle, XCircle, SpinnerGap } from '@phosphor-icons/react';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number (e.g., +919876543210)'),
  resumeUrl: z.string().url('Please enter a valid URL (e.g., https://linkedin.com/...)'),
});

type FormData = z.infer<typeof formSchema>;

export default function ReferralApplicationPage() {
  const { code } = useParams<{ code: string }>();
  const [submitted, setSubmitted] = useState(false);

  const { data: link, isLoading, isError } = useQuery({
    queryKey: ['referralLink', code],
    queryFn: () => referralApi.getLinkDetails(code!),
    enabled: !!code,
    retry: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', phone: '', resumeUrl: '' },
  });

  const submitMutation = useMutation({
    mutationFn: (data: FormData) => referralApi.submitCandidate(code!, data),
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Application submitted successfully!', { position: 'top-center' });
    },
    onError: (error: any) => {
      if (error.response?.status === 409) {
        toast.error('An application with this phone number already exists.');
      } else {
        toast.error('Failed to submit application. Please try again.');
      }
    },
  });

  const onSubmit = (data: FormData) => {
    submitMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <SpinnerGap className="w-10 h-10 animate-spin text-[#EB0A1E]" />
      </div>
    );
  }

  if (isError || !link) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl text-center border border-gray-100 dark:border-slate-700"
        >
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" weight="fill" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid or Expired Link</h2>
          <p className="text-gray-500 dark:text-gray-400">This referral link is no longer active. Please contact the person who referred you for a new link.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 dark:from-slate-900 dark:to-slate-800 py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#EB0A1E] selection:text-white">
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="max-w-md w-full bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 relative overflow-hidden"
          >
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#EB0A1E]" />
            
            <div className="text-center mb-10">
              <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase mb-2">
                Join Our Team
              </h1>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                You've been specially referred by
              </p>
              <div className="inline-flex items-center justify-center mt-2 px-4 py-1.5 bg-gray-100 dark:bg-slate-800 rounded-full">
                <span className="font-semibold text-gray-900 dark:text-white">{link.employee?.name}</span>
                <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">• {link.employee?.department || 'Employee'}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-5">
                {/* Name Input */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#EB0A1E] transition-colors">
                      <User size={18} weight="bold" />
                    </div>
                    <input
                      {...register('name')}
                      autoFocus
                      id="name"
                      type="text"
                      placeholder="e.g. John Doe"
                      className={`block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border ${errors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 dark:border-slate-700 focus:ring-[#EB0A1E] focus:border-[#EB0A1E]'} rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 transition-all outline-none focus:ring-2 focus:bg-white dark:focus:bg-slate-900`}
                    />
                  </div>
                  {errors.name && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.name.message}</p>}
                </div>

                {/* Phone Input */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#EB0A1E] transition-colors">
                      <Phone size={18} weight="bold" />
                    </div>
                    <input
                      {...register('phone')}
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      className={`block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border ${errors.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 dark:border-slate-700 focus:ring-[#EB0A1E] focus:border-[#EB0A1E]'} rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 transition-all outline-none focus:ring-2 focus:bg-white dark:focus:bg-slate-900`}
                    />
                  </div>
                  {errors.phone && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.phone.message}</p>}
                </div>

                {/* Resume URL Input */}
                <div>
                  <label htmlFor="resumeUrl" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Resume / Portfolio URL <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#EB0A1E] transition-colors">
                      <LinkIcon size={18} weight="bold" />
                    </div>
                    <input
                      {...register('resumeUrl')}
                      id="resumeUrl"
                      type="url"
                      placeholder="https://linkedin.com/in/..."
                      className={`block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border ${errors.resumeUrl ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 dark:border-slate-700 focus:ring-[#EB0A1E] focus:border-[#EB0A1E]'} rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 transition-all outline-none focus:ring-2 focus:bg-white dark:focus:bg-slate-900`}
                    />
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    Paste a link to your LinkedIn profile, Google Drive resume, or personal portfolio.
                  </p>
                  {errors.resumeUrl && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.resumeUrl.message}</p>}
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="relative w-full flex items-center justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-[#EB0A1E] hover:bg-[#c00818] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#EB0A1E] disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/30 overflow-hidden active:scale-[0.98]"
                >
                  {submitMutation.isPending ? (
                    <>
                      <SpinnerGap className="w-5 h-5 animate-spin mr-2" weight="bold" />
                      Processing...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500" />
            
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-20 h-20 bg-green-50 dark:bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle size={40} weight="fill" />
            </motion.div>
            
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Application Received</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              Thank you for applying to Nippon Toyota. Your application has been securely submitted and linked to <span className="font-semibold">{link.employee?.name}</span>'s referral. Our HR team will review it shortly.
            </p>
            
            <button 
              onClick={() => window.close()}
              className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              You can safely close this window
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
