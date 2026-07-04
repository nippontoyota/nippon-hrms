import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { referralApi } from '@/api/referral';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { SpinnerGap, CheckCircle, WarningCircle } from '@phosphor-icons/react';

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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <SpinnerGap className="w-8 h-8 animate-spin text-gray-900 dark:text-gray-100" />
      </div>
    );
  }

  if (isError || !link) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-6">
        <div className="max-w-md w-full">
          <div className="flex items-center space-x-3 text-red-600 dark:text-red-500 mb-4">
            <WarningCircle size={28} weight="fill" />
            <h2 className="text-xl font-semibold">Link Expired</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            This referral link is invalid or has expired. Please contact your referrer to generate a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 selection:bg-gray-900 selection:text-white dark:selection:bg-white dark:selection:text-gray-900 flex flex-col">
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 sm:py-24"
          >
            <div className="mb-12 border-b border-gray-200 dark:border-gray-800 pb-8">
              <h1 className="text-3xl font-medium tracking-tight mb-2">
                Candidate Application
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Referred by <span className="font-medium text-gray-900 dark:text-gray-200">{link.employee?.name}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Full Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('name')}
                    autoFocus
                    id="name"
                    type="text"
                    placeholder="e.g. Rahul Kumar"
                    className={`block w-full px-4 py-3 bg-white dark:bg-slate-950 border ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} rounded-sm text-sm transition-colors outline-none focus:border-gray-900 dark:focus:border-white focus:ring-1 focus:ring-gray-900 dark:focus:ring-white`}
                  />
                  {errors.name && <p className="mt-2 text-sm text-red-500">{errors.name.message}</p>}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('phone')}
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    className={`block w-full px-4 py-3 bg-white dark:bg-slate-950 border ${errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} rounded-sm text-sm transition-colors outline-none focus:border-gray-900 dark:focus:border-white focus:ring-1 focus:ring-gray-900 dark:focus:ring-white`}
                  />
                  {errors.phone && <p className="mt-2 text-sm text-red-500">{errors.phone.message}</p>}
                </div>

                <div>
                  <label htmlFor="resumeUrl" className="block text-sm font-medium mb-2">
                    Resume Link (Drive, Dropbox, LinkedIn) <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('resumeUrl')}
                    id="resumeUrl"
                    type="url"
                    placeholder="https://..."
                    className={`block w-full px-4 py-3 bg-white dark:bg-slate-950 border ${errors.resumeUrl ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} rounded-sm text-sm transition-colors outline-none focus:border-gray-900 dark:focus:border-white focus:ring-1 focus:ring-gray-900 dark:focus:ring-white`}
                  />
                  {errors.resumeUrl && <p className="mt-2 text-sm text-red-500">{errors.resumeUrl.message}</p>}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                <button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="inline-flex items-center justify-center px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 font-medium text-sm rounded-sm transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitMutation.isPending ? (
                    <>
                      <SpinnerGap className="w-5 h-5 animate-spin mr-2" />
                      Processing
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 sm:py-24"
          >
            <div className="mb-12 border-b border-gray-200 dark:border-gray-800 pb-8 flex items-center space-x-3">
              <CheckCircle size={32} weight="fill" className="text-green-600 dark:text-green-500" />
              <h1 className="text-3xl font-medium tracking-tight">
                Application Submitted
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
              Your application has been securely recorded in the Nippon HRMS.
              <br />
              The HR department will review your profile and contact you directly if there is a match.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
