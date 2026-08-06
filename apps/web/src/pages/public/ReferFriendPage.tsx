import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, SpinnerGap } from '@phosphor-icons/react';
import { vehicleReferralApi } from '@/api/vehicleReferral';

const formSchema = z.object({
  customerName: z.string().trim().min(2, 'Enter your full name'),
  employeeId: z.string().trim().min(1, 'Enter your employee ID'),
  referredName: z.string().trim().min(2, "Enter the referred person's name"),
  referredPhone: z
    .string()
    .trim()
    .min(10, 'Enter a 10-digit mobile number')
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  model: z
    .enum(['glanza', 'hyryder'])
    .optional()
    .refine((v): v is 'glanza' | 'hyryder' => v !== undefined, {
      message: 'Choose Glanza or Hyryder',
    }),
});

type FormValues = {
  customerName: string;
  employeeId: string;
  referredName: string;
  referredPhone: string;
  model?: 'glanza' | 'hyryder';
};

const easeOut = [0.23, 1, 0.32, 1] as const;

function Field({
  label,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  className?: string;
}) {
  const id = props.id ?? props.name;
  const invalid = Boolean(error);

  return (
    <div className={['flex min-w-0 flex-col gap-0.5', className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className="text-xs font-semibold text-[#1b1c1c]">
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={invalid}
        aria-describedby={error ? `${id}-error` : undefined}
        className={[
          'h-10 w-full rounded-lg border bg-white px-3 text-base text-[#1b1c1c]',
          'placeholder:text-[#7a7674]',
          'transition-[border-color,box-shadow] duration-[160ms] ease-out',
          'focus:outline-none focus:border-[#eb0a1e] focus:ring-2 focus:ring-[#eb0a1e]/15',
          invalid ? 'border-[#ba1a1a]' : 'border-[#e4e2e1]',
        ].join(' ')}
      />
      {error ? (
        <p id={`${id}-error`} className="text-[11px] font-medium leading-tight text-[#ba1a1a]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function VehicleOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={[
        'flex h-10 cursor-pointer select-none items-center justify-center',
        'rounded-full border px-3 text-sm font-bold capitalize',
        'transition-[border-color,background-color,transform] duration-[160ms] ease-out',
        'active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
        selected
          ? 'border-[#eb0a1e] bg-[#eb0a1e]/[0.06] text-[#eb0a1e]'
          : 'border-[#e4e2e1] bg-white text-[#1b1c1c]',
      ].join(' ')}
    >
      <input type="radio" checked={selected} onChange={onSelect} className="sr-only" />
      {label}
    </label>
  );
}

function SuccessView({ onReset }: { onReset: () => void }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: easeOut }}
      className="flex flex-col items-center py-4 text-center sm:py-6"
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#eb0a1e]/10" aria-hidden>
        <CheckCircle size={28} weight="fill" className="text-[#eb0a1e]" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-[#1b1c1c] sm:text-2xl">Thank you</h1>
      <p className="mt-1.5 max-w-[32ch] text-sm text-[#5e5a59]">
        Your referral was submitted. Nippon Toyota will follow up shortly.
      </p>
      <button
        type="button"
        onClick={onReset}
        className={[
          'mt-5 inline-flex h-10 w-full items-center justify-center rounded-full',
          'bg-[#eb0a1e] px-6 text-sm font-bold text-white',
          'transition-[background-color,transform] duration-[160ms] ease-out',
          'hover:bg-[#c4081a] active:scale-[0.97]',
          'motion-reduce:transition-none motion-reduce:active:scale-100',
        ].join(' ')}
      >
        Submit another
      </button>
    </motion.div>
  );
}

export default function ReferFriendPage() {
  const reduceMotion = useReducedMotion();
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: '',
      employeeId: '',
      referredName: '',
      referredPhone: '',
      model: undefined,
    },
  });

  async function onSubmit(values: FormValues, e?: React.BaseSyntheticEvent) {
    setSubmitError('');
    const form = e?.target as HTMLFormElement | undefined;
    const honeypot = form ? String(new FormData(form).get('website') ?? '').trim() : '';
    if (honeypot) {
      setSuccess(true);
      return;
    }

    try {
      await vehicleReferralApi.submit({
        customerName: values.customerName,
        employeeId: values.employeeId,
        referredName: values.referredName,
        referredPhone: values.referredPhone,
        model: values.model!,
      });
      setSuccess(true);
    } catch {
      setSubmitError('Could not submit. Please check your details and try again.');
    }
  }

  function handleReset() {
    reset();
    setSuccess(false);
    setSubmitError('');
  }

  return (
    <main className="flex min-h-dvh items-start justify-center bg-[#fbf9f8] px-3 py-2 sm:items-center sm:px-4 sm:py-8">
      <div className="w-full max-w-[480px]">
        <motion.div
          layout={!reduceMotion}
          className="rounded-2xl border border-[#e4e2e1] bg-white p-4 shadow-[0_16px_40px_-24px_rgba(27,28,28,0.2)] sm:rounded-3xl sm:p-8"
          transition={{ duration: 0.25, ease: easeOut }}
        >
          <header className="mb-3 flex items-center gap-3 sm:mb-6 sm:flex-col sm:text-center">
            <img
              src="/nippon-logo.png"
              alt="Nippon Toyota"
              className="h-7 w-auto shrink-0 object-contain sm:h-9"
              width={120}
              height={40}
            />
            <div className="min-w-0 sm:w-full">
              <h1 className="text-lg font-bold leading-tight tracking-tight text-[#1b1c1c] sm:text-2xl">
                Refer a friend
              </h1>
              <p className="mt-0.5 hidden text-sm text-[#5e5a59] sm:block">
                Glanza or Hyryder referral. Our team will follow up with your contact.
              </p>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {success ? (
              <SuccessView key="success" onReset={handleReset} />
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit(onSubmit)}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.18, ease: easeOut }}
                className="flex flex-col gap-2.5 sm:gap-4"
                noValidate
              >
                <div className="absolute left-[-10000px] h-px w-px overflow-hidden" aria-hidden>
                  <label htmlFor="website">Website</label>
                  <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <Field
                    label="Your name"
                    autoComplete="name"
                    autoFocus
                    error={errors.customerName?.message}
                    {...register('customerName')}
                  />
                  <Field
                    label="Employee ID"
                    placeholder="9001"
                    autoComplete="off"
                    error={errors.employeeId?.message}
                    {...register('employeeId')}
                  />
                  <Field
                    label="Referral name"
                    autoComplete="name"
                    error={errors.referredName?.message}
                    {...register('referredName')}
                  />
                  <Field
                    label="Referral mobile"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="10-digit"
                    maxLength={10}
                    error={errors.referredPhone?.message}
                    {...register('referredPhone', {
                      onChange: (e) => {
                        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      },
                    })}
                  />
                </div>

                <fieldset className="pt-0.5">
                  <legend className="mb-1.5 text-xs font-semibold text-[#1b1c1c]">Vehicle</legend>
                  <Controller
                    name="model"
                    control={control}
                    render={({ field }) => (
                      <div className="grid grid-cols-2 gap-2">
                        <VehicleOption
                          label="Glanza"
                          selected={field.value === 'glanza'}
                          onSelect={() => field.onChange('glanza')}
                        />
                        <VehicleOption
                          label="Hyryder"
                          selected={field.value === 'hyryder'}
                          onSelect={() => field.onChange('hyryder')}
                        />
                      </div>
                    )}
                  />
                  {errors.model ? (
                    <p className="mt-1 text-[11px] font-medium text-[#ba1a1a]" role="alert">
                      {errors.model.message}
                    </p>
                  ) : null}
                </fieldset>

                {submitError ? (
                  <p
                    className="rounded-lg border border-[#ba1a1a]/20 bg-[#ba1a1a]/[0.06] px-3 py-2 text-xs text-[#ba1a1a]"
                    role="alert"
                  >
                    {submitError}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={[
                    'inline-flex h-10 w-full items-center justify-center gap-2 rounded-full',
                    'bg-[#eb0a1e] px-6 text-sm font-bold text-white',
                    'transition-[background-color,transform,opacity] duration-[160ms] ease-out',
                    'hover:bg-[#c4081a] active:scale-[0.97]',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                    'motion-reduce:transition-none motion-reduce:active:scale-100',
                  ].join(' ')}
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerGap size={16} className="animate-spin" aria-hidden />
                      Submitting…
                    </>
                  ) : (
                    'Submit referral'
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
}
