export default function ToastStack({
  toasts = [],
  currentTheme,
  onDismiss,
}) {
  const border = currentTheme?.border || "border-white/10";
  const card = currentTheme?.card || "bg-zinc-950";

  function getToastStyle(type) {
    if (type === "success") {
      return "border-emerald-400/30 text-emerald-200";
    }

    if (type === "error") {
      return "border-red-400/30 text-red-200";
    }

    if (type === "warning") {
      return "border-yellow-400/30 text-yellow-100";
    }

    return border;
  }

  if (!Array.isArray(toasts) || toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-5 top-5 z-[1000] flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`eden-page rounded-3xl border ${getToastStyle(toast.type)} ${card} bg-black/80 p-4 shadow-2xl backdrop-blur-md`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold">
                {toast.title || "Project Eden"}
              </p>

              {toast.message && (
                <p className="mt-1 text-sm leading-relaxed opacity-75">
                  {toast.message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onDismiss?.(toast.id)}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold opacity-70 transition hover:opacity-100"
            >
              X
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function createToast({
  type = "info",
  title = "Project Eden",
  message = "",
  duration = 3500,
} = {}) {
  return {
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    message,
    duration,
    createdAt: Date.now(),
  };
}