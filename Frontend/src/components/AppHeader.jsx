export default function AppHeader({
  currentTheme,
  activePage = "chat",
  isLoggedIn = false,
  username = "Guest",
  activeReasoning,
  activeMemory,
  appName = "PROJECT EDEN",
  brandName = "UCNMVC",
  onOpenSettings,
  onOpenAccount,
}) {
  const border = currentTheme?.border || "border-white/10";
  const card = currentTheme?.card || "bg-zinc-950";

  const pageLabel = String(activePage || "chat")
    .replace(/-/g, " ")
    .toUpperCase();

  const reasoningName = activeReasoning?.name || "Balanced";
  const memoryName = activeMemory?.name || "Standard";

  return (
    <header className={`mb-5 rounded-3xl border ${border} ${card} p-5 eden-page`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold tracking-[0.2em]">
            {appName}
          </h1>

          <p className="mt-2 text-sm opacity-60">
            {isLoggedIn ? `Signed in as ${username}` : "Not logged in"} · {pageLabel} · Reasoning: {reasoningName} · Memory: {memoryName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs uppercase tracking-[0.25em] opacity-70 sm:block">
            {brandName}
          </div>

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold transition hover:scale-[1.02]"
            >
              Settings
            </button>
          )}

          {onOpenAccount && (
            <button
              type="button"
              onClick={onOpenAccount}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black transition hover:scale-[1.02]"
            >
              Account
            </button>
          )}
        </div>
      </div>
    </header>
  );
}