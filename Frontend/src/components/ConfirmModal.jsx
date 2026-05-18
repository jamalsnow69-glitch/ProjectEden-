export default function ConfirmModal({
  open = false,
  title = "Confirm action",
  description = "Are you sure you want to continue?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  currentTheme,
  onConfirm,
  onCancel,
}) {
  if (!open) {
    return null;
  }

  const border = currentTheme?.border || "border-white/10";
  const card = currentTheme?.card || "bg-zinc-950";

  function handleConfirm() {
    if (typeof onConfirm === "function") {
      onConfirm();
    }
  }

  function handleCancel() {
    if (typeof onCancel === "function") {
      onCancel();
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
      <div className={`eden-page w-full max-w-md rounded-3xl border ${border} ${card} p-6 shadow-2xl`}>
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border ${danger ? "border-red-400/30 bg-red-400/10 text-red-300" : "border-white/10 bg-white/5"}`}>
          {danger ? "!" : "?"}
        </div>

        <div className="mt-5 text-center">
          <h2 className="text-xl font-bold tracking-[0.08em]">
            {title}
          </h2>

          <p className="mt-3 text-sm leading-relaxed opacity-70">
            {description}
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-sm font-bold transition hover:scale-[1.02]"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className={`rounded-2xl px-5 py-3 text-sm font-bold transition hover:scale-[1.02] ${
              danger
                ? "border border-red-400/20 bg-red-500/20 text-red-200"
                : "bg-white text-black"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}