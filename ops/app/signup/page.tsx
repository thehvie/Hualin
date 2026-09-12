import Link from "next/link";
import { signup } from "./actions";

export default function SignupPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold text-zinc-900">Create your account</h1>
          <p className="mt-1 text-sm text-zinc-500">Starts with a 14-day free trial</p>
        </div>

        <form action={signup} className="flex flex-col gap-4">
          <Field label="Company name" name="companyName" autoComplete="organization" required />
          <Field label="Your name" name="adminName" autoComplete="name" required />
          <Field label="Email address" name="email" type="email" autoComplete="email" required />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />

          <button
            type="submit"
            className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Continue to payment
          </button>

          <p className="text-center text-xs text-zinc-400">
            You&rsquo;ll be asked for a card to start the trial — you won&rsquo;t be charged for 14 days.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-zinc-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </div>
  );
}
