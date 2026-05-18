export default function VersionHistory({
  currentTheme,
  versions = [],
  currentVersion = "v1.6.6",
  appName = "Project Eden",
}) {
  const border = currentTheme?.border || "border-white/10";
  const card = currentTheme?.card || "bg-zinc-950";

  const fallbackVersions = [
    "v1.6.6 - Frontend components, saved chats tools, and asset systems",
    "v1.6.5 - Startup loading page and animations",
    "v1.6.4 - Voice systems, saved chats, user IDs, and customization rebuild",
    "v1.6.3 - Streaming chat improvements",
    "v1.6.2 - Upload system foundation",
    "v1.6.1 - Saved chats system",
    "v1.6.0 - Project Eden React migration",
  ];

  const visibleVersions = versions.length ? versions : fallbackVersions;

  function parseVersion(versionText) {
    const text = String(versionText || "");
    const splitIndex = text.indexOf(" - ");

    if (splitIndex === -1) {
      return {
        version: text,
        description: "No description added.",
      };
    }

    return {
      version: text.slice(0, splitIndex),
      description: text.slice(splitIndex + 3),
    };
  }

  return (
    <section className={`eden-page flex-1 overflow-y-auto rounded-3xl border ${border} ${card} p-6`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-[0.15em]">
            VERSION HISTORY
          </h2>

          <p className="mt-2 text-sm opacity-70">
            Track app changes, frontend upgrades, backend milestones, and future Eden releases.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
          Current: <span className="font-bold">{currentVersion}</span>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
        <p className="text-xs uppercase tracking-[0.25em] opacity-50">
          Application
        </p>

        <h3 className="mt-2 text-2xl font-bold">
          {appName}
        </h3>

        <p className="mt-2 text-sm opacity-70">
          This page is designed to show every major Eden change as the app grows.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {visibleVersions.map((versionText, index) => {
          const item = parseVersion(versionText);
          const isLatest = index === 0;

          return (
            <div
              key={`${item.version}-${index}`}
              className={`eden-card rounded-3xl border p-5 ${
                isLatest
                  ? "border-white/30 bg-white text-black"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-bold">
                  {item.version}
                </h3>

                {isLatest && (
                  <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                    LATEST
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm opacity-75">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Upcoming</h3>
          <p className="mt-2 text-sm opacity-70">
            Subscriptions, model picker, research mode, and better upload analysis can be listed here later.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Experimental</h3>
          <p className="mt-2 text-sm opacity-70">
            Experimental AI systems like APex, Pandora, ARKAV, and future Eden models can be tracked here.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Release Notes</h3>
          <p className="mt-2 text-sm opacity-70">
            Later, this can pull release notes from a JSON file or backend changelog endpoint
             </p>
        </div>
      </div>
    </section>
  );
}