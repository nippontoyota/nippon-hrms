import { useState } from 'react';
import { vehicleReferralApi } from '@/api/vehicleReferral';

type Model = 'glanza' | 'hyryder' | '';

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = props.id ?? props.name;
  return (
    <label className="flex flex-col gap-1.5" htmlFor={id}>
      <span className="text-xs font-bold uppercase tracking-wide text-[#5e5a59]">{label}</span>
      <input
        {...props}
        id={id}
        className="min-h-11 w-full rounded-lg border border-[#e4e2e1] bg-[#f6f3f2] px-4 py-3 text-base text-[#1b1c1c] placeholder:text-[#9a9694] focus:border-[#eb0a1e] focus:outline-none"
      />
    </label>
  );
}

export default function ReferFriendPage() {
  const [model, setModel] = useState<Model>('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formKey, setFormKey] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    if (String(form.get('website') ?? '').trim()) {
      setSuccess(true);
      return;
    }
    if (!model) {
      setError('Please select a model');
      return;
    }

    setPending(true);
    try {
      await vehicleReferralApi.submit({
        customerName: String(form.get('customerName') ?? ''),
        customerPhone: String(form.get('customerPhone') ?? ''),
        referredName: String(form.get('referredName') ?? ''),
        referredPhone: String(form.get('referredPhone') ?? ''),
        model,
      });
      setSuccess(true);
    } catch {
      setError('Could not submit. Please try again.');
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#fbf9f8] px-4 py-8 md:py-16">
        <div className="w-full max-w-[560px] rounded-3xl border border-[#e4e2e1] bg-white p-6 md:rounded-[40px] md:p-12">
          <div
            className="mb-6 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ background: '#d4af37' }}
            aria-hidden
          >
            ✓
          </div>
          <h1 className="text-3xl font-bold text-[#1b1c1c] md:text-5xl">Thank you</h1>
          <p className="mt-3 text-base text-[#5e5a59]">
            Your referral was submitted. Nippon Toyota will follow up with your friend.
          </p>
          <button
            type="button"
            className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#eb0a1e] px-6 text-sm font-bold text-white hover:bg-[#c4081a]"
            onClick={() => {
              setSuccess(false);
              setModel('');
              setFormKey((k) => k + 1);
            }}
          >
            Refer another
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fbf9f8] px-4 py-8 md:py-16">
      <div className="w-full max-w-[560px] rounded-3xl border border-[#e4e2e1] bg-white p-6 md:rounded-[40px] md:p-12">
        <p className="text-xs font-bold uppercase tracking-wide text-[#eb0a1e]">Nippon Toyota</p>
        <h1 className="mt-3 text-3xl font-bold text-[#1b1c1c] md:text-5xl">Refer a friend</h1>
        <p className="mt-3 text-base text-[#5e5a59]">
          Share your details and tell us who is interested in a Glanza or Hyryder.
        </p>

        <form key={formKey} onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
          <div className="absolute left-[-10000px] h-px w-px overflow-hidden" aria-hidden>
            <label htmlFor="website">Website</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <Field label="Your name" name="customerName" required minLength={2} maxLength={100} autoComplete="name" />
          <Field
            label="Your mobile"
            name="customerPhone"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="10-digit Indian mobile"
          />
          <Field
            label="Person you are referring"
            name="referredName"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
          />
          <Field
            label="Their mobile"
            name="referredPhone"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="10-digit Indian mobile"
          />

          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-[#5e5a59]">
              Interested model
            </legend>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {(['glanza', 'hyryder'] as const).map((value) => {
                const selected = model === value;
                return (
                  <label
                    key={value}
                    className={[
                      'flex min-h-11 cursor-pointer items-center justify-center rounded-full border px-4 py-3 text-sm font-bold capitalize',
                      selected
                        ? 'border-[#eb0a1e] text-[#eb0a1e]'
                        : 'border-[#e4e2e1] text-[#1b1c1c]',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="model"
                      value={value}
                      checked={selected}
                      onChange={() => setModel(value)}
                      required
                      className="sr-only"
                    />
                    {value}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error ? (
            <p className="text-sm text-[#ba1a1a]" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending || !model}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#eb0a1e] px-6 text-sm font-bold text-white hover:bg-[#c4081a] disabled:opacity-60"
          >
            {pending ? 'Submitting…' : 'Submit referral'}
          </button>
        </form>
      </div>
    </main>
  );
}
