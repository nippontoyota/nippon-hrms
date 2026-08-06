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
      <label htmlFor={id} className="text-sm font-medium text-[#141414]">
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={invalid}
        aria-describedby={error ? `${id}-error` : undefined}
        className={[
          'min-h-12 w-full rounded-xl border bg-white px-4 text-base text-[#141414]',
          'placeholder:text-[#5c5857]',
          'transition-[border-color,box-shadow,background-color] duration-[160ms] ease-out',
          'focus:outline-none focus:border-[#eb0a1e]/50 focus:ring-[3px] focus:ring-[#eb0a1e]/12',
          invalid ? 'border-[#b42318]' : 'border-[#d8d4d2]',
        ].join(' ')}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-[#b42318]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ModelChoice({
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
      <legend className="text-sm font-medium text-[#141414]">Interested model</legend>
      <div className="flex flex-col gap-2">
        {(['glanza', 'hyryder'] as const).map((option) => {
          const selected = value === option;
          return (
            <label
              key={option}
              className={[
                'flex min-h-11 cursor-pointer items-center justify-center rounded-full border px-4 text-sm font-semibold',
                'transition-[border-color,background-color,color,transform] duration-[160ms] ease-out',
                'active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100',
                selected
                  ? 'border-[#eb0a1e] bg-[#eb0a1e]/[0.12] text-[#eb0a1e]'
                  : 'border-[#d8d4d2] bg-white text-[#141414]',
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
        <p className="text-xs font-medium text-[#b42318]" role="alert">
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
      initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.26, ease: easeOut }}
      className="flex flex-col p-6 md:p-10"
    >
      <img
        src="/nippon-logo.png"
        alt="Nippon Toyota"
        className="h-8 w-auto object-contain self-start"
        width={120}
        height={32}
      />
      <div
        className="mt-8 mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#c9a227] text-2xl font-semibold text-white"
        aria-hidden
      >
        <CheckCircle size={28} weight="fill" className="text-white" />
      </div>
      <h1 className="text-4xl font-semibold tracking-tight text-[#141414] md:text-5xl">Thank you</h1>
      <p className="mt-3 max-w-[38ch] text-base leading-relaxed text-[#3f3c3b]">
        {count === 1
          ? 'Your referral is with us. Our team will follow up with your friend soon.'
          : `${count} referrals are with us. Our team will follow up with your ${friendWord} soon.`}
      </p>
      <button
        type="button"
        onClick={onReset}
        className={[
          'mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full',
          'bg-[#eb0a1e] px-6 text-[15px] font-semibold text-white',
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
    <main
      className="relative flex min-h-dvh items-start justify-center overflow-y-auto px-4 py-8 md:items-center md:py-14"
      style={{
        background:
          'radial-gradient(900px 480px at 0% 0%, rgb(235 10 30 / 7%), transparent 55%), radial-gradient(700px 420px at 100% 8%, rgb(201 162 39 / 8%), transparent 50%), #f0eeed',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="my-auto w-full max-w-[540px]">
        <motion.div
          layout={!reduceMotion}
          className="overflow-hidden rounded-3xl border border-[#d8d4d2] bg-white shadow-[0_1px_0_rgb(20_20_20/0.03),0_18px_40px_-20px_rgb(20_20_20/0.16)]"
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
                <div className="p-6 pb-0 md:p-10 md:pb-0">
                  <header className="mb-8">
                    <img
                      src="/nippon-logo.png"
                      alt="Nippon Toyota"
                      className="h-8 w-auto object-contain"
                      width={120}
                      height={32}
                    />
                    <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#141414] md:text-[2.75rem] md:leading-[1.08]">
                      Refer a friend
                    </h1>
                    <p className="mt-3 max-w-[40ch] text-base leading-relaxed text-[#3f3c3b]">
                      Share your details, then add each person and the model they want.
                    </p>
                  </header>

                  <form
                    id="referral-form"
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex flex-col gap-8"
                    noValidate
                  >
                    <div className="absolute left-[-10000px] h-px w-px overflow-hidden" aria-hidden>
                      <label htmlFor="website">Website</label>
                      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                    </div>

                    <section className="flex flex-col gap-4" aria-labelledby="you-heading">
                      <h2 id="you-heading" className="text-base font-semibold text-[#141414]">
                        Your details
                      </h2>
                      <div className="flex flex-col gap-4">
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

                    <section className="flex flex-col gap-4" aria-labelledby="friends-heading">
                      <div className="flex items-end justify-between gap-3">
                        <h2 id="friends-heading" className="text-base font-semibold text-[#141414]">
                          Who you’re referring
                        </h2>
                        <span className="text-xs font-medium text-[#5c5857]">
                          {fields.length} of {MAX_FRIENDS}
                        </span>
                      </div>

                      {fields.map((field, index) => {
                        const n = index + 1;
                        return (
                          <motion.div
                            key={field.id}
                            ref={(el) => {
                              if (el) friendRefs.current.set(index, el);
                              else friendRefs.current.delete(index);
                            }}
                            initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.2, ease: easeOut }}
                            className="flex flex-col gap-4 rounded-xl border border-[#d8d4d2] bg-[#f7f5f4] p-4 md:p-5"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-[#141414]">Friend {n}</p>
                              {fields.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="text-sm font-semibold text-[#b42318] transition-opacity hover:opacity-80"
                                >
                                  Remove
                                </button>
                              ) : null}
                            </div>

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

                            <Controller
                              name={`friends.${index}.model`}
                              control={control}
                              render={({ field: modelField }) => (
                                <ModelChoice
                                  value={modelField.value}
                                  onChange={modelField.onChange}
                                  error={errors.friends?.[index]?.model?.message}
                                />
                              )}
                            />
                          </motion.div>
                        );
                      })}

                      {fields.length < MAX_FRIENDS ? (
                        <button
                          type="button"
                          onClick={handleAddFriend}
                          className={[
                            'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl',
                            'border border-dashed border-[#d8d4d2] bg-[#f7f5f4]/40 px-5 text-sm font-semibold text-[#141414]',
                            'transition-[border-color,background-color,transform] duration-[160ms] ease-out',
                            'hover:border-[#3f3c3b] hover:bg-[#f7f5f4] active:scale-[0.97]',
                            'motion-reduce:transition-none motion-reduce:active:scale-100',
                          ].join(' ')}
                        >
                          <Plus size={16} weight="bold" aria-hidden />
                          Add another friend
                        </button>
                      ) : (
                        <p className="text-sm text-[#5c5857]">
                          Maximum of {MAX_FRIENDS} friends per submission.
                        </p>
                      )}
                    </section>

                    {submitError ? (
                      <p
                        className="rounded-xl border border-[#b42318]/25 bg-[#b42318]/[0.08] px-4 py-3 text-sm font-medium text-[#b42318]"
                        role="alert"
                      >
                        {submitError}
                      </p>
                    ) : null}
                  </form>
                </div>

                <div className="sticky bottom-0 rounded-b-3xl border-t border-[#d8d4d2] bg-white/92 p-4 backdrop-blur-md md:p-6">
                  <button
                    type="submit"
                    form="referral-form"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className={[
                      'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full',
                      'bg-[#eb0a1e] px-6 text-[15px] font-semibold text-white',
                      'transition-[background-color,transform,opacity] duration-[160ms] ease-out',
                      'hover:bg-[#c4081a] active:scale-[0.97]',
                      'disabled:pointer-events-none disabled:opacity-55',
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
