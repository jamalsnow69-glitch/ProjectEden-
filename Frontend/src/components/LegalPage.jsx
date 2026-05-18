export default function LegalPage({
  currentTheme,
  appName = "Project Eden",
  companyName = "UCNMVC",
}) {
  const border = currentTheme?.border || "border-white/10";
  const card = currentTheme?.card || "bg-zinc-950";

  return (
    <section className={`eden-page flex-1 overflow-y-auto rounded-3xl border ${border} ${card} p-6`}>
      <div>
        <h2 className="text-2xl font-bold tracking-[0.15em]">
          LEGAL
        </h2>

        <p className="mt-2 text-sm opacity-70">
          Terms, privacy, AI disclaimers, and future compliance information for {appName}.
        </p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Terms of Service</h3>

          <p className="mt-3 text-sm leading-relaxed opacity-75">
            By using {appName}, you agree to use the service responsibly, legally, and safely.
            You are responsible for how you use generated responses, uploaded files, saved chats,
            and connected tools.
          </p>

          <p className="mt-3 text-sm leading-relaxed opacity-75">
            {companyName} may update these terms as the app grows, especially when subscriptions,
            team accounts, school accounts, plugins, or third-party integrations are added.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Privacy Policy</h3>

          <p className="mt-3 text-sm leading-relaxed opacity-75">
            {appName} may store local settings, saved chats, profile preferences, uploaded-file
            metadata, and account information to provide memory and personalization features.
          </p>

          <p className="mt-3 text-sm leading-relaxed opacity-75">
            Current frontend-only features may use browser localStorage. Backend synced features
            should clearly show what is stored, what is deleted, and what is connected to a user ID.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">AI Disclaimer</h3>

          <p className="mt-3 text-sm leading-relaxed opacity-75">
            Eden can make mistakes. Verify important information before relying on it, especially
            for coding, schoolwork, finances, legal topics, health topics, safety topics, or anything
            that could seriously affect someone.
          </p>

          <p className="mt-3 text-sm leading-relaxed opacity-75">
            Eden should be treated as an assistant, not as a guaranteed source of truth.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Uploads & Files</h3>

          <p className="mt-3 text-sm leading-relaxed opacity-75">
            Uploaded files may be processed to analyze text, images, PDFs, code, or other supported
            formats. Future backend versions should show where files are stored, how long they are
            kept, and how users can delete them.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Subscriptions</h3>

          <p className="mt-3 text-sm leading-relaxed opacity-75">
            Subscription plans, usage limits, billing status, refunds, cancellations, and account
            upgrades can be connected here later once billing is active.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Contact & Support</h3>

          <p className="mt-3 text-sm leading-relaxed opacity-75">
            Support links, contact email, abuse reports, school-admin contacts, and enterprise
            support information can be added here in a later batch.
          </p>
        </div>
      </div>
    </section>
  );
}