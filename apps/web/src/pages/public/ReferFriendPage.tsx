import { useLayoutEffect, useRef, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, Plus, SpinnerGap } from '@phosphor-icons/react';
import { vehicleReferralApi, VehicleReferralError } from '@/api/vehicleReferral';

const MAX_FRIENDS = 5;

const friendSchema = z.object({
  referredName: z.string().trim().min(2, "Enter the referred person's name"),
  referredPhone: z
    .string()
    .trim()
    .min(10, 'Enter a 10-digit mobile number')
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
});

const formSchema = z.object({
  customerName: z.string().trim().min(2, 'Enter your full name'),
  employeeId: z.string().trim().min(1, 'Enter your employee ID'),
  friends: z.array(friendSchema).min(1).max(MAX_FRIENDS),
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
  friends: { referredName: string; referredPhone: string }[];
  model?: 'glanza' | 'hyryder';
};

const easeOut = [0.23, 1, 0.32, 1] as const;

/** Scale spacing from viewport height so the stacked form fits short phones. */
function useReferFormDensity() {
  const shellRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const apply = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      // 0.82 on ~560px phones → 1.0 around 720px+
      const t = Math.min(1, Math.max(0.82, (h - 480) / 240));

      shell.style.setProperty('--rf-pad', `${12 + t * 20}px`);
      shell.style.setProperty('--rf-header-gap', `${8 + t * 16}px`);
      shell.style.setProperty('--rf-section-gap', `${10 + t * 14}px`);
      shell.style.setProperty('--rf-field-gap', `${6 + t * 6}px`);
      shell.style.setProperty('--rf-input-h', `${38 + t * 6}px`);
      shell.style.setProperty('--rf-btn-h', `${40 + t * 8}px`);
      shell.style.setProperty('--rf-logo-h', `${28 + t * 12}px`);
      shell.style.setProperty('--rf-title', `${1.125 + t * 0.375}rem`);
    };

    apply();
    window.visualViewport?.addEventListener('resize', apply);
    window.addEventListener('resize', apply);
    return () => {
      window.visualViewport?.removeEventListener('resize', apply);
      window.removeEventListener('resize', apply);
    };
  }, []);

  return shellRef;
}

function Field({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  const id = props.id ?? props.name;
  const invalid = Boolean(error);

  return (
    <div className="flex flex-col gap-[var(--rf-field-gap)]">
      <label htmlFor={id} className="text-sm font-semibold text-[#1b1c1c]">
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={invalid}
        aria-describedby={error ? `${id}-error` : undefined}
        className={[
          'h-[var(--rf-input-h)] w-full rounded-xl border bg-white px-4 text-base text-[#1b1c1c]',
          'placeholder:text-[#7a7674]',
          'transition-[border-color,box-shadow] duration-[160ms] ease-out',
          'focus:outline-none focus:border-[#eb0a1e] focus:ring-2 focus:ring-[#eb0a1e]/15',
          invalid ? 'border-[#ba1a1a]' : 'border-[#e4e2e1]',
        ].join(' ')}
      />
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
    <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5e5a59]">{children}</h2>
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
        'flex h-[var(--rf-input-h)] cursor-pointer select-none items-center justify-center',
        'rounded-full border px-4 text-sm font-bold capitalize',
        'transition-[border-color,background-color,transform] duration-[160ms] ease-out',
        'active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
        selected
          ? 'border-[#eb0a1e] bg-[#eb0a1e]/[0.06] text-[#eb0a1e]'
          : 'border-[#e4e2e1] bg-white text-[#1b1c1c] hover:border-[#cfcbc9]',
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
      className="flex flex-col items-center text-center"
    >
      <div
        className="mb-[var(--rf-header-gap)] flex h-12 w-12 items-center justify-center rounded-full bg-[#eb0a1e]/10"
        aria-hidden
      >
        <CheckCircle size={28} weight="fill" className="text-[#eb0a1e]" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-[#1b1c1c]">Thank you</h1>
      <p className="mt-2 max-w-[36ch] text-sm leading-relaxed text-[#5e5a59] sm:text-base">
        Your referral was submitted. Nippon Toyota will follow up shortly.
      </p>
      <button
        type="button"
        onClick={onReset}
        className={[
          'mt-[var(--rf-section-gap)] inline-flex h-[var(--rf-btn-h)] w-full items-center justify-center rounded-full',
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
  const shellRef = useReferFormDensity();
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
      friends: [{ referredName: '', referredPhone: '' }],
      model: undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'friends' });

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
        friends: values.friends,
        model: values.model!,
      });
      setSuccess(true);
    } catch (err) {
      setSubmitError(
        err instanceof VehicleReferralError
          ? err.message
          : 'Could not submit. Please check your details and try again.',
      );
    }
  }

  function handleReset() {
    reset({
      customerName: '',
      employeeId: '',
      friends: [{ referredName: '', referredPhone: '' }],
      model: undefined,
    });
    setSuccess(false);
    setSubmitError('');
  }

  return (
    <main className="flex h-dvh max-h-dvh items-center justify-center overflow-y-auto bg-[#fbf9f8] px-3 py-2 sm:px-4 sm:py-6">
      <div className="my-auto w-full max-w-[480px]">
        <motion.div
          ref={shellRef}
          layout={!reduceMotion}
          className="refer-form-shell rounded-2xl border border-[#e4e2e1] bg-white p-[var(--rf-pad)] shadow-[0_24px_48px_-24px_rgba(27,28,28,0.18)] sm:rounded-3xl"
          style={{
            ['--rf-pad' as string]: '16px',
            ['--rf-header-gap' as string]: '12px',
            ['--rf-section-gap' as string]: '12px',
            ['--rf-field-gap' as string]: '6px',
            ['--rf-input-h' as string]: '40px',
            ['--rf-btn-h' as string]: '44px',
            ['--rf-logo-h' as string]: '32px',
            ['--rf-title' as string]: '1.25rem',
          }}
          transition={{ duration: 0.25, ease: easeOut }}
        >
          <header className="mb-[var(--rf-header-gap)] flex flex-col items-center text-center">
            <img
              src="/nippon-logo.png"
              alt="Nippon Toyota"
              className="w-auto object-contain"
              style={{ height: 'var(--rf-logo-h)' }}
              width={120}
              height={40}
            />
            <h1
              className="mt-2 font-bold leading-tight tracking-tight text-[#1b1c1c]"
              style={{ fontSize: 'var(--rf-title)' }}
            >
              Refer a friend
            </h1>
            <p className="mt-1 max-w-[38ch] text-xs leading-snug text-[#5e5a59] sm:text-sm">
              Glanza or Hyryder referral. Our team will follow up with your contact.
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
                className="flex flex-col gap-[var(--rf-section-gap)]"
                noValidate
              >
                <div className="absolute left-[-10000px] h-px w-px overflow-hidden" aria-hidden>
                  <label htmlFor="website">Website</label>
                  <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                </div>

                <section className="flex flex-col gap-[var(--rf-field-gap)]" aria-label="Your details">
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
                    error={errors.employeeId?.message}
                    {...register('employeeId')}
                  />
                </section>

                <section
                  className="flex flex-col gap-[var(--rf-field-gap)] border-t border-[#f0eeed] pt-[var(--rf-section-gap)]"
                  aria-label="People you are referring"
                >
                  <div className="flex items-end justify-between gap-3">
                    <SectionTitle>Who you’re referring</SectionTitle>
                    <span className="text-[11px] font-medium text-[#7a7674]">
                      {fields.length}/{MAX_FRIENDS}
                    </span>
                  </div>

                  {fields.map((field, index) => {
                    const n = index + 1;
                    return (
                      <div
                        key={field.id}
                        className="flex flex-col gap-[var(--rf-field-gap)] rounded-xl border border-[#e4e2e1] bg-[#fbf9f8] p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[#1b1c1c]">
                            {n}. Person you are referring
                          </p>
                          {fields.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-sm font-semibold text-[#ba1a1a] transition-opacity hover:opacity-80"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                        <Field
                          label="Full name"
                          id={`friends.${index}.referredName`}
                          autoComplete="off"
                          error={errors.friends?.[index]?.referredName?.message}
                          {...register(`friends.${index}.referredName`)}
                        />
                        <Field
                          label="Their mobile"
                          id={`friends.${index}.referredPhone`}
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="10-digit number"
                          maxLength={10}
                          error={errors.friends?.[index]?.referredPhone?.message}
                          {...register(`friends.${index}.referredPhone`, {
                            onChange: (e) => {
                              e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                            },
                          })}
                        />
                      </div>
                    );
                  })}

                  {fields.length < MAX_FRIENDS ? (
                    <button
                      type="button"
                      onClick={() => append({ referredName: '', referredPhone: '' })}
                      className={[
                        'inline-flex h-[var(--rf-btn-h)] w-full items-center justify-center gap-2 rounded-full',
                        'border border-[#e4e2e1] bg-white px-5 text-sm font-bold text-[#1b1c1c]',
                        'transition-[border-color,background-color,transform] duration-[160ms] ease-out',
                        'hover:border-[#cfcbc9] hover:bg-[#fbf9f8] active:scale-[0.98]',
                        'motion-reduce:transition-none motion-reduce:active:scale-100',
                      ].join(' ')}
                    >
                      <Plus size={16} weight="bold" aria-hidden />
                      Add
                    </button>
                  ) : null}
                </section>

                <section className="border-t border-[#f0eeed] pt-[var(--rf-section-gap)]">
                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold text-[#1b1c1c]">Vehicle</legend>
                    <Controller
                      name="model"
                      control={control}
                      render={({ field }) => (
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
                      <p className="mt-1.5 text-xs font-medium text-[#ba1a1a]" role="alert">
                        {errors.model.message}
                      </p>
                    ) : null}
                  </fieldset>
                </section>

                {submitError ? (
                  <p
                    className="rounded-xl border border-[#ba1a1a]/20 bg-[#ba1a1a]/[0.06] px-3 py-2 text-sm text-[#ba1a1a]"
                    role="alert"
                  >
                    {submitError}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={[
                    'inline-flex h-[var(--rf-btn-h)] w-full items-center justify-center gap-2 rounded-full',
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
