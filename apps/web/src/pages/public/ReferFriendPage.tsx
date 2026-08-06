import { useEffect, useRef, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, Plus, SpinnerGap } from '@phosphor-icons/react';
import { vehicleReferralApi, VehicleReferralError } from '@/api/vehicleReferral';

const MAX_FRIENDS = 50;

const friendSchema = z.object({
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

const formSchema = z.object({
  customerName: z.string().trim().min(2, 'Enter your full name'),
  employeeId: z.string().trim().min(1, 'Enter your employee ID'),
  friends: z.array(friendSchema).min(1).max(MAX_FRIENDS),
});

type FormValues = {
  customerName: string;
  employeeId: string;
  friends: {
    referredName: string;
    referredPhone: string;
    model?: 'glanza' | 'hyryder';
  }[];
};

const easeOut = [0.23, 1, 0.32, 1] as const;

const emptyFriend = (): FormValues['friends'][number] => ({
  referredName: '',
  referredPhone: '',
  model: undefined,
});

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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[#1b1c1c]">
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={invalid}
        aria-describedby={error ? `${id}-error` : undefined}
        className={[
          'min-h-11 w-full rounded-xl border bg-[#fbf9f8] px-4 text-base text-[#1b1c1c]',
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

function ModelSeg({
  value,
  onChange,
  error,
}: {
  value?: 'glanza' | 'hyryder';
  onChange: (v: 'glanza' | 'hyryder') => void;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-[#1b1c1c]">Model they’re interested in</legend>
      <div className="grid grid-cols-2 gap-1 rounded-full border border-[#e4e2e1] bg-[#fbf9f8] p-1">
        {(['glanza', 'hyryder'] as const).map((option) => {
          const selected = value === option;
          return (
            <label
              key={option}
              className={[
                'flex min-h-10 cursor-pointer items-center justify-center rounded-full px-3 text-sm font-semibold capitalize',
                'transition-[background-color,color,box-shadow,transform] duration-[160ms] ease-out',
                'active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
                selected
                  ? 'bg-white text-[#eb0a1e] shadow-sm'
                  : 'text-[#5e5a59] hover:text-[#1b1c1c]',
              ].join(' ')}
            >
              <input
                type="radio"
                checked={selected}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              {option === 'hyryder' ? 'Hyryder' : 'Glanza'}
            </label>
          );
        })}
      </div>
      {error ? (
        <p className="text-xs font-medium text-[#ba1a1a]" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function SuccessView({
  count,
  onReset,
}: {
  count: number;
  onReset: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const friendWord = count === 1 ? 'friend' : 'friends';

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: easeOut }}
      className="flex flex-col p-6 sm:p-8"
    >
      <img
        src="/nippon-logo.png"
        alt="Nippon Toyota"
        className="h-8 w-auto object-contain self-start"
        width={120}
        height={32}
      />
      <div
        className="mt-8 mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#eb0a1e]/10"
        aria-hidden
      >
        <CheckCircle size={28} weight="fill" className="text-[#eb0a1e]" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-[#1b1c1c] sm:text-4xl">Thank you</h1>
      <p className="mt-3 max-w-[38ch] text-sm leading-relaxed text-[#5e5a59] sm:text-base">
        {count === 1
          ? 'Your referral is with us. Our team will follow up with your friend soon.'
          : `${count} referrals are with us. Our team will follow up with your ${friendWord} soon.`}
      </p>
      <button
        type="button"
        onClick={onReset}
        className={[
          'mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full',
          'bg-[#eb0a1e] px-6 text-[15px] font-bold text-white',
          'transition-[background-color,transform] duration-[160ms] ease-out',
          'hover:bg-[#c4081a] active:scale-[0.97]',
          'motion-reduce:transition-none motion-reduce:active:scale-100',
        ].join(' ')}
      >
        Refer another friend
      </button>
    </motion.div>
  );
}

export default function ReferFriendPage() {
  const reduceMotion = useReducedMotion();
  const [success, setSuccess] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(1);
  const [submitError, setSubmitError] = useState('');
  const pendingFocusIndex = useRef<number | null>(null);
  const friendRefs = useRef<Map<number, HTMLDivElement>>(new Map());

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
      friends: [emptyFriend()],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'friends' });

  useEffect(() => {
    const index = pendingFocusIndex.current;
    if (index === null) return;
    pendingFocusIndex.current = null;
    const node = friendRefs.current.get(index);
    node?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    node?.querySelector<HTMLInputElement>('input[name*="referredName"]')?.focus();
  }, [fields.length]);

  async function onSubmit(values: FormValues, e?: React.BaseSyntheticEvent) {
    setSubmitError('');
    const form = e?.target as HTMLFormElement | undefined;
    const honeypot = form ? String(new FormData(form).get('website') ?? '').trim() : '';
    if (honeypot) {
      setSubmittedCount(values.friends.length);
      setSuccess(true);
      return;
    }

    try {
      await vehicleReferralApi.submit({
        customerName: values.customerName,
        employeeId: values.employeeId,
        friends: values.friends.map((f) => ({
          referredName: f.referredName,
          referredPhone: f.referredPhone,
          model: f.model!,
        })),
      });
      setSubmittedCount(values.friends.length);
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
      friends: [emptyFriend()],
    });
    setSuccess(false);
    setSubmitError('');
    setSubmittedCount(1);
  }

  function handleAddFriend() {
    pendingFocusIndex.current = fields.length;
    append(emptyFriend());
  }

  return (
    <main className="flex min-h-dvh items-start justify-center overflow-y-auto bg-[#fbf9f8] px-3 py-4 sm:items-center sm:px-4 sm:py-8">
      <div className="my-auto w-full max-w-[540px]">
        <motion.div
          layout={!reduceMotion}
          className="overflow-hidden rounded-2xl border border-[#e4e2e1] bg-white shadow-[0_24px_48px_-24px_rgba(27,28,28,0.18)] sm:rounded-3xl"
          transition={{ duration: 0.25, ease: easeOut }}
        >
          <AnimatePresence mode="wait">
            {success ? (
              <SuccessView key="success" count={submittedCount} onReset={handleReset} />
            ) : (
              <motion.div
                key="form"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.18, ease: easeOut }}
              >
                <div className="p-6 pb-0 sm:p-8 sm:pb-0">
                  <header className="mb-7">
                    <img
                      src="/nippon-logo.png"
                      alt="Nippon Toyota"
                      className="h-8 w-auto object-contain"
                      width={120}
                      height={32}
                    />
                    <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#1b1c1c] sm:text-[2.5rem] sm:leading-[1.08]">
                      Refer a friend
                    </h1>
                    <p className="mt-2 max-w-[40ch] text-sm leading-relaxed text-[#5e5a59] sm:text-base">
                      Share your details, then add each person and the model they want.
                    </p>
                  </header>

                  <form
                    id="referral-form"
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex flex-col gap-7"
                    noValidate
                  >
                    <div className="absolute left-[-10000px] h-px w-px overflow-hidden" aria-hidden>
                      <label htmlFor="website">Website</label>
                      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                    </div>

                    <section className="flex flex-col gap-4" aria-labelledby="you-heading">
                      <h2 id="you-heading" className="text-base font-semibold text-[#1b1c1c]">
                        Your details
                      </h2>
                      <div className="grid gap-4 sm:grid-cols-2">
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
                      </div>
                    </section>

                    <section className="flex flex-col" aria-labelledby="friends-heading">
                      <div className="mb-2 flex items-end justify-between gap-3">
                        <h2 id="friends-heading" className="text-base font-semibold text-[#1b1c1c]">
                          Who you’re referring
                        </h2>
                        <span className="text-xs font-medium text-[#7a7674]">
                          {fields.length} of {MAX_FRIENDS}
                        </span>
                      </div>

                      {fields.map((field, index) => {
                        const n = index + 1;
                        return (
                          <div
                            key={field.id}
                            ref={(el) => {
                              if (el) friendRefs.current.set(index, el);
                              else friendRefs.current.delete(index);
                            }}
                            className="border-t border-[#e4e2e1] py-6"
                          >
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-[#1b1c1c]">Friend {n}</p>
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

                            <div className="grid gap-4 sm:grid-cols-2">
                              <Field
                                label="Their name"
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
                                placeholder="10-digit mobile"
                                maxLength={10}
                                error={errors.friends?.[index]?.referredPhone?.message}
                                {...register(`friends.${index}.referredPhone`, {
                                  onChange: (e) => {
                                    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                  },
                                })}
                              />
                            </div>

                            <div className="mt-4">
                              <Controller
                                name={`friends.${index}.model`}
                                control={control}
                                render={({ field: modelField }) => (
                                  <ModelSeg
                                    value={modelField.value}
                                    onChange={modelField.onChange}
                                    error={errors.friends?.[index]?.model?.message}
                                  />
                                )}
                              />
                            </div>
                          </div>
                        );
                      })}

                      {fields.length < MAX_FRIENDS ? (
                        <button
                          type="button"
                          onClick={handleAddFriend}
                          className={[
                            'mb-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full',
                            'border border-dashed border-[#e4e2e1] bg-transparent px-5 text-sm font-semibold text-[#1b1c1c]',
                            'transition-[border-color,background-color,transform] duration-[160ms] ease-out',
                            'hover:border-[#cfcbc9] hover:bg-[#fbf9f8] active:scale-[0.98]',
                            'motion-reduce:transition-none motion-reduce:active:scale-100',
                          ].join(' ')}
                        >
                          <Plus size={16} weight="bold" aria-hidden />
                          Add another friend
                        </button>
                      ) : (
                        <p className="mb-2 text-sm text-[#7a7674]">
                          Maximum of {MAX_FRIENDS} friends per submission.
                        </p>
                      )}
                    </section>

                    {submitError ? (
                      <p
                        className="rounded-xl border border-[#ba1a1a]/20 bg-[#ba1a1a]/[0.06] px-4 py-3 text-sm font-medium text-[#ba1a1a]"
                        role="alert"
                      >
                        {submitError}
                      </p>
                    ) : null}
                  </form>
                </div>

                <div className="sticky bottom-0 rounded-b-2xl border-t border-[#e4e2e1] bg-white/92 p-4 backdrop-blur-md sm:rounded-b-3xl sm:p-6">
                  <button
                    type="submit"
                    form="referral-form"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className={[
                      'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full',
                      'bg-[#eb0a1e] px-6 text-[15px] font-bold text-white',
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
                    ) : fields.length > 1 ? (
                      `Submit ${fields.length} referrals`
                    ) : (
                      'Submit referral'
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
}
