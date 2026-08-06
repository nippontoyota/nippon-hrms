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
  hint,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  const id = props.id ?? props.name;
  const invalid = Boolean(error);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-[#1b1c1c]">
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={invalid}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={[
          'min-h-11 w-full rounded-xl border bg-white px-4 py-3 text-base text-[#1b1c1c]',
          'placeholder:text-[#7a7674]',
          'transition-[border-color,box-shadow] duration-[160ms] ease-out',
          'focus:outline-none focus:border-[#eb0a1e] focus:ring-2 focus:ring-[#eb0a1e]/15',
          invalid ? 'border-[#ba1a1a]' : 'border-[#e4e2e1]',
        ].join(' ')}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-[#5e5a59]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-[#ba1a1a]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5e5a59]">
      {children}
    </h2>
  );
}

function VehicleOption({
  value,
  label,
  selected,
  onSelect,
}: {
  value: 'glanza' | 'hyryder';
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={[
        'group relative flex min-h-[52px] cursor-pointer select-none items-center justify-center',
        'rounded-full border px-4 py-3 text-sm font-bold capitalize',
        'transition-[border-color,background-color,transform] duration-[160ms] ease-out',
        'active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
        selected
          ? 'border-[#eb0a1e] bg-[#eb0a1e]/[0.06] text-[#eb0a1e]'
          : 'border-[#e4e2e1] bg-white text-[#1b1c1c] hover:border-[#cfcbc9]',
      ].join(' ')}
    >
      <input
        type="radio"
        name="model"
        value={value}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
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
      className="flex flex-col items-center text-center"
    >
      <div
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#eb0a1e]/10"
        aria-hidden
      >
        <CheckCircle size={32} weight="fill" className="text-[#eb0a1e]" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-[#1b1c1c] md:text-3xl">Thank you</h1>
      <p className="mt-2 max-w-[36ch] text-base leading-relaxed text-[#5e5a59]">
        Your referral was submitted. Nippon Toyota will follow up shortly.
      </p>
      <button
        type="button"
        onClick={onReset}
        className={[
          'mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-full',
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
    <main className="flex min-h-dvh items-center justify-center bg-[#fbf9f8] px-4 py-8 md:py-12">
      <div className="w-full max-w-[480px]">
        <motion.div
          layout={!reduceMotion}
          className="rounded-3xl border border-[#e4e2e1] bg-white p-6 shadow-[0_24px_48px_-24px_rgba(27,28,28,0.18)] md:p-10"
          transition={{ duration: 0.25, ease: easeOut }}
        >
          <header className="mb-8 flex flex-col items-center text-center">
            <img
              src="/nippon-logo.png"
              alt="Nippon Toyota"
              className="h-10 w-auto object-contain"
              width={120}
              height={40}
            />
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-[#eb0a1e]">
              Vehicle referral
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#1b1c1c] md:text-[1.75rem]">
              Refer a friend
            </h1>
            <p className="mt-2 max-w-[38ch] text-sm leading-relaxed text-[#5e5a59]">
              Share details for a Glanza or Hyryder referral. Our team will reach out to your contact.
            </p>
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
                className="flex flex-col gap-8"
                noValidate
              >
                <div className="absolute left-[-10000px] h-px w-px overflow-hidden" aria-hidden>
                  <label htmlFor="website">Website</label>
                  <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                </div>

                <section className="flex flex-col gap-4" aria-label="Your details">
                  <SectionTitle>Your details</SectionTitle>
                  <Field
                    label="Employee name"
                    autoComplete="name"
                    autoFocus
                    error={errors.customerName?.message}
                    {...register('customerName')}
                  />
                  <Field
                    label="Employee ID"
                    placeholder="e.g. 9001"
                    autoComplete="off"
                    hint="Your Nippon Toyota employee number"
                    error={errors.employeeId?.message}
                    {...register('employeeId')}
                  />
                </section>

                <section className="flex flex-col gap-4 border-t border-[#f0eeed] pt-8" aria-label="Person you are referring">
                  <SectionTitle>Person you are referring</SectionTitle>
                  <Field
                    label="Full name"
                    autoComplete="name"
                    error={errors.referredName?.message}
                    {...register('referredName')}
                  />
                  <Field
                    label="Mobile number"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="10-digit number"
                    hint="Indian mobile number without country code"
                    maxLength={10}
                    error={errors.referredPhone?.message}
                    {...register('referredPhone', {
                      onChange: (e) => {
                        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      },
                    })}
                  />
                </section>

                <section className="flex flex-col gap-3 border-t border-[#f0eeed] pt-8">
                  <fieldset>
                    <legend className="mb-3 text-sm font-semibold text-[#1b1c1c]">Vehicle</legend>
                    <Controller
                      name="model"
                      control={control}
                      render={({ field }) => (
                        <div className="grid grid-cols-2 gap-3">
                          <VehicleOption
                            value="glanza"
                            label="Glanza"
                            selected={field.value === 'glanza'}
                            onSelect={() => field.onChange('glanza')}
                          />
                          <VehicleOption
                            value="hyryder"
                            label="Hyryder"
                            selected={field.value === 'hyryder'}
                            onSelect={() => field.onChange('hyryder')}
                          />
                        </div>
                      )}
                    />
                    {errors.model ? (
                      <p className="mt-2 text-xs font-medium text-[#ba1a1a]" role="alert">
                        {errors.model.message}
                      </p>
                    ) : null}
                  </fieldset>
                </section>

                {submitError ? (
                  <p className="rounded-xl border border-[#ba1a1a]/20 bg-[#ba1a1a]/[0.06] px-4 py-3 text-sm text-[#ba1a1a]" role="alert">
                    {submitError}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={[
                    'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full',
                    'bg-[#eb0a1e] px-6 text-sm font-bold text-white',
                    'transition-[background-color,transform,opacity] duration-[160ms] ease-out',
                    'hover:bg-[#c4081a] active:scale-[0.97]',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                    'motion-reduce:transition-none motion-reduce:active:scale-100',
                  ].join(' ')}
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerGap size={18} className="animate-spin" aria-hidden />
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
