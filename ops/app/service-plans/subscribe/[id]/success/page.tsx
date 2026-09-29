export default async function ServicePlanSubscribeSuccessPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-zinc-900">You&rsquo;re all set!</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Your subscription is confirmed. You&rsquo;ll receive an invoice each billing cycle.
        </p>
      </div>
    </div>
  );
}
