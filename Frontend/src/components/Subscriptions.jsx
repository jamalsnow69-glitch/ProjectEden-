const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    badge: null,
    description: "Basic Eden access. Good for exploring.",
    features: [
      "250 messages / day",
      "Standard reasoning",
      "Light memory depth",
      "No file uploads",
      "Community support",
      "Voice Use",
    ],
    cta: "Current Plan",
    ctaDisabled: true,
    highlight: false,
  },
  {
    id: "go",
    name: "Eden Go",
    price: "$4.99",
    period: "/ month",
    badge: "A Small Upgrade",
    description: "Eden Go.",
    features: [
      "500 messages / day",
      "Deep reasoning",
      "Extended memory",
      "5 File uploads (50 MB) / day",
      "Priority support",
  
    ],
    cta: "COMING SOON",
    ctaDisabled: false,
    highlight: true,
  },
  {
    id: "plus",
    name: "Eden plus",
    price: "$9.99",
    period: "/ month",
    badge: "COMING SOON",
    description: "Cool Eden — Tons of limits.",
    features: [
      "1250 messages / day",
      "Deep reasoning",
      "Extended memory depth",
      "15 File uploads (500 MB) / day",
      "Dedicated support",
    ],
    cta: "COMING SOON",
    ctaDisabled: true,
    highlight: false,
  },
  {
    id: "pro",
    name: "Eden Pro",
    price: "$17.99",
    period: "/ month",
    badge: "COMING SOON",
    description: "Nonchalant Eden — Some limits.",
    features: [
      "5000 messages / day",
      "Deep reasoning",
      "Extended memory depth",
      "25 File uploads (650 MB) / day",
      "Dedicated support",
    ],
    cta: "Upgrade to Pro",
    ctaDisabled: true,
    highlight: false,
  },
  {
    id: "premium",
    name: "Eden Premium",
    price: "$24.99",
    period: "/ month",
    badge: "COMING SOON",
    description: "Maximum Eden — no limits.",
    features: [
      "Infinite messages / day",
      "Max reasoning",
      "Full memory depth",
      " 25 File uploads (750 MB)",
      "Dedicated support",
    ],
    cta: "Upgrade to Premium",
    ctaDisabled: true,
    highlight: false,
  },
  {
    id: "family",
    name: "Eden Family",
    price: "$59.99",
    period: "/ month",
    badge: "COMING SOON",
    description: "Maximum Eden — no limits.",
    features: [
      "Infinite messages / day",
      "Max reasoning",
      "Full memory depth",
      " 35 File uploads (805 MB)",
      "Dedicated support",
      "8 User Slots",
      "Family Admin Has 12 Tools For Management",
    ],
    cta: "Start Eden Family Plan",
    ctaDisabled: true,
    highlight: false,
  },
    {
    id: "enterprise",
    name: "Enterprise",
    price: "$ (May Vary)",
    period: "/ month (May Vary)",
    badge: "COMING SOON",
    description: "Maximum Eden — no limits.",
    features: [
      "Infinite messages / day",
      "Max reasoning",
      "Full memory depth",
      " Fill Uploads May Vary",
      "Dedicated support",
      "(May Vary) User Slots",
      "Enterprise Admin Has 22 Tools For Management",
    ],
    cta: "Inquire About Enterprise!",
    ctaDisabled: true,
    highlight: false,
  }
];

const FAQS = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from this page or Account Overview. Your plan stays active until the end of the billing cycle.",
  },
  {
    q: "What payment methods are accepted?",
    a: "Stripe-powered checkout — Visa, Mastercard, Amex, Apple Pay, and Google Pay.",
  },
  {
    q: "Is there a free trial?",
    a: "Eden Go includes a 7-day free trial for new subscribers. Plus, or Higher does not currently have a trial.",
  },
  {
    q: "Do unused messages roll over?",
    a: "No. Message limits reset daily at midnight UTC.",
  },
];

export default function SubscriptionsPage({ currentTheme, isLoggedIn, username, onLogin }) {
  const theme = currentTheme || { border: "border-white/10", card: "bg-zinc-950", accent: "text-cyan-300" };

  return (
    <section
      className={`eden-page flex-1 overflow-y-auto rounded-3xl border ${theme.border} ${theme.card} p-6`}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-[0.15em]">SUBSCRIPTIONS</h2>
          <p className="mt-2 text-sm opacity-70">
            Choose a plan that fits how you use Eden.{" "}
            {isLoggedIn ? (
              <span className="opacity-90">
                Signed in as <span className="font-bold">{username}</span>.
              </span>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                className="underline opacity-90 hover:opacity-100"
              >
                Log in to manage your plan.
              </button>
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
          Current Plan: <span className="font-bold">Free</span>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`eden-card relative flex flex-col rounded-3xl border p-6 transition ${
              plan.highlight
                ? "border-white/40 bg-white text-black"
                : "border-white/10 bg-black/20"
            }`}
          >
            {plan.badge ? (
              <span
                className={`absolute -top-3 left-5 rounded-xl px-3 py-1 text-xs font-bold tracking-[0.2em] ${
                  plan.highlight ? "bg-black text-white" : "bg-white text-black"
                }`}
              >
                {plan.badge}
              </span>
            ) : null}

            <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-60">{plan.name}</p>
            <div className="mt-3 flex items-end gap-1">
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className="mb-1 text-sm opacity-60">{plan.period}</span>
            </div>
            <p className={`mt-3 text-sm leading-relaxed ${plan.highlight ? "opacity-70" : "opacity-60"}`}>
              {plan.description}
            </p>

            <ul className="mt-5 flex-1 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      plan.highlight ? "bg-black text-white" : "bg-white/10 text-white"
                    }`}
                  >
                    ✓
                  </span>
                  <span className={plan.highlight ? "opacity-80" : "opacity-75"}>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled={plan.ctaDisabled}
              className={`mt-6 w-full rounded-2xl px-4 py-3 text-sm font-bold transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 ${
                plan.highlight
                  ? "bg-black text-white"
                  : "border border-white/10 bg-black/30"
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Billing Notice */}
      <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
        <p className="text-sm leading-relaxed opacity-60">
          All plans billed in CAD. Payments processed securely via Stripe. Cancellations take effect
          at the end of the current billing period. Plan limits are enforced per account, not per device. (COMING SOON)
        </p>
      </div>

      {/* FAQ */}
      <div className="mt-8">
        <h3 className="text-lg font-bold tracking-[0.1em]">FAQ</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {FAQS.map((item) => (
            <div key={item.q} className="eden-card rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="font-bold">{item.q}</p>
              <p className="mt-2 text-sm leading-relaxed opacity-65">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Manage / Cancel */}
      <div className="mt-6 flex flex-wrap gap-3">
        {isLoggedIn ? (
          <>
            <button
              type="button"
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-sm font-bold"
            >
              Manage Billing
            </button>
            <button
              type="button"
              className="rounded-2xl border border-red-400/20 bg-black/30 px-5 py-3 text-sm font-bold text-red-300"
            >
              Cancel Subscription
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onLogin}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black"
          >
            Login / Sign Up to Subscribe
          </button>
        )}
      </div>
    </section>
  );
}
