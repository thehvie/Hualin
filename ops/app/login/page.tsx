import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string; signedUp?: string }> }) {
  const { reset, signedUp } = await searchParams;
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold text-zinc-900">Ops</h1>
          <p className="mt-1 text-sm text-zinc-500">Sign in to your account</p>
        </div>

        {reset && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Password changed. Sign in with your new password.</p>}
        {signedUp && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Account created. Sign in. We emailed you a link to confirm your address.</p>}

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="mt-4 text-center text-sm">
          <Link href="/forgot-password" className="font-medium text-zinc-500 hover:text-zinc-800 hover:underline">
            Forgot your password?
          </Link>
        </p>

        <p className="mt-6 text-center text-sm text-zinc-500">
          New here?{" "}
          <Link href="/signup" className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
