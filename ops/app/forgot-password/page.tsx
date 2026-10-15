import Link from "next/link";

import { requestReset } from "./actions";

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-zinc-900">Reset your password</h1>
          <p className="mt-1 text-sm text-zinc-500">We&apos;ll email you a link to choose a new one.</p>
        </div>

        {sent ? (
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">If that email has an account, a reset link is on its way. It works for 1 hour. Check your spam folder too.</p>
        ) : (
          <form action={requestReset} className="flex flex-col gap-4">
            {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-zinc-700">
                Email address
              </label>
              <input id="email" name="email" type="email" autoComplete="email" required className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
            </div>
            <button type="submit" className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
              Send reset link
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/login" className="font-medium text-brand hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
