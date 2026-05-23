export default function BillingSuccess() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
        <section className="w-full rounded-3xl border border-emerald-400/20 bg-zinc-950 p-6 text-center shadow-2xl">
          <h1 className="text-3xl font-bold tracking-[0.15em]">PAYMENT SUCCESS</h1>
          <p className="mt-4 text-sm opacity-70">
            PayPal approved your subscription. Eden will update your plan after confirmation.
          </p>
          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className="mt-6 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black"
          >
            Return to Eden
          </button>
        </section>
      </div>
    </main>
  );
}
