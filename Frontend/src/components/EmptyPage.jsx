export default function EmptyState({
  title = "Nothing here yet.",
  description = "Start a new chat or open a saved conversation.",
  actionLabel = "Start New Chat",
  onAction,
  secondaryLabel,
  onSecondaryAction,
  className = "",
}) {
  return (
    <div className={`flex h-full min-h-[260px] items-center justify-center text-center ${className}`}>
      <div className="max-w-md rounded-3xl border border-white/10 bg-black/20 p-8 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
          ✦
        </div>

        <h2 className="mt-5 text-xl font-bold tracking-[0.08em]">
          {title}
        </h2>

        <p className="mt-3 text-sm leading-relaxed opacity-70">
          {description}
        </p>

        {(onAction || onSecondaryAction) && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {onAction && (
              <button
                onClick={onAction}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:scale-[1.02]"
              >
                {actionLabel}
              </button>
            )}

            {onSecondaryAction && secondaryLabel && (
              <button
                onClick={onSecondaryAction}
                className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-sm font-bold transition hover:scale-[1.02]"
              >
                {secondaryLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}