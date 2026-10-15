import Link from "next/link";

import { peekAuthToken } from "@/lib/auth-tokens";
import { resetPassword } from "./actions";

export const metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const valid = !!(await peekAuthToken("reset", token));

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        {valid ? (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-zinc-900">Choose a new password</h1>
            </div>
            <form action={resetPassword.bind(null, token)} className="flex flex-col gap-4">
              {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium text-zinc-700">
                  New password
                </label>
                <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                <span className="text-xs text-zinc-400">At least 8 characters.</span>
              </div>
              <button type="submit" className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
                Save password
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <h1 className="text-xl font-bold text-zinc-900">This link has expired</h1>
            <p className="mt-2 text-sm text-zinc-500">Reset links work once and for 1 hour. Ask for a new one.</p>
            <Link href="/forgot-password" className="mt-5 inline-block rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
              Send a new link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
