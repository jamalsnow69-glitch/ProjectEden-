export default function CustomizePage({
  currentTheme,
  themePreset = "emerald",
  themePresets = [],
  onThemeChange,
}) {
  const border = currentTheme?.border || "border-white/10";
  const card = currentTheme?.card || "bg-zinc-950";

  return (
    <section className={`eden-page flex-1 overflow-y-auto rounded-3xl border ${border} ${card} p-6`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-[0.15em]">
            CUSTOMIZE
          </h2>

          <p className="mt-2 text-sm opacity-70">
            Choose a Project Eden interface preset. More visual controls can be added here later.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm opacity-80">
          Active Theme: <span className="font-bold">{themePreset}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {themePresets.map((theme) => {
          const isActive = themePreset === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onThemeChange?.(theme.id)}
              className={`eden-card rounded-3xl border p-5 text-left transition ${
                isActive
                  ? "border-white bg-white text-black"
                  : `${theme.border} ${theme.card}`
              }`}
            >
              <div className={`h-24 rounded-2xl border ${theme.border} ${theme.bg}`} />

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-lg font-bold">
                  {theme.name}
                </p>

                {isActive && (
                  <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                    ACTIVE
                  </span>
                )}
              </div>

              <p className="mt-2 text-xs opacity-70">
                Eden preset theme
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Backgrounds</h3>
          <p className="mt-2 text-sm opacity-70">
            Image backgrounds and animated gradients can connect here later.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Accent Effects</h3>
          <p className="mt-2 text-sm opacity-70">
            Glow strength, blur, borders, particles, and transitions can be added in a future batch.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Interface Presets</h3>
          <p className="mt-2 text-sm opacity-70">
            User cannot manually pick colors; they choose from curated Eden presets.
          </p>
        </div>
      </div>
    </section>
  );
}