import { useMemo, useState } from "react";

export default function CommandPalette({
  open = false,
  currentTheme,
  recentChats = [],
  onClose,
  onNavigate,
  onStartNewChat,
  onOpenChat,
  onLogin,
  isLoggedIn = false,
}) {
  const [query, setQuery] = useState("");

  const border = currentTheme?.border || "border-white/10";
  const card = currentTheme?.card || "bg-zinc-950";

  const pageActions = [
    { id: "chat", label: "Open Chat", page: "chat" },
    { id: "saved-chats", label: "Open Saved Chats", page: "saved-chats" },
    { id: "call", label: "Open Call Eden", page: "call" },
    { id: "account", label: "Open Account Overview", page: "account" },
    { id: "settings", label: "Open Settings", page: "settings" },
    { id: "customize", label: "Open Customize", page: "customize" },
    { id: "uploads", label: "Open Uploads", page: "uploads" },
    { id: "legal", label: "Open Legal", page: "legal" },
    { id: "versions", label: "Open Versions", page: "versions" },
  ];

  const visibleActions = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    const actions = [
      {
        type: "action",
        id: "new-chat",
        label: "Start New Chat",
        description: "Create a new Eden conversation.",
        run: onStartNewChat,
      },
      ...pageActions.map((action) => ({
        type: "page",
        id: action.id,
        label: action.label,
        description: `Navigate to ${action.page}.`,
        run: () => onNavigate?.(action.page),
      })),
      ...recentChats.map((chat) => ({
        type: "chat",
        id: chat.id,
        label: chat.title || "Untitled Chat",
        description: `Open saved chat ${chat.id}`,
        run: () => onOpenChat?.(chat),
      })),
    ];

    if (!isLoggedIn) {
      actions.unshift({
        type: "auth",
        id: "login",
        label: "Login With Google",
        description: "Connect your account to Eden.",
        run: onLogin,
      });
    }

    if (!cleanQuery) {
      return actions.slice(0, 12);
    }

    return actions
      .filter((action) => {
        const label = String(action.label || "").toLowerCase();
        const description = String(action.description || "").toLowerCase();
        return label.includes(cleanQuery) || description.includes(cleanQuery);
      })
      .slice(0, 20);
  }, [query, recentChats, isLoggedIn, onStartNewChat, onNavigate, onOpenChat, onLogin]);

  if (!open) {
    return null;
  }

  function runAction(action) {
    if (typeof action.run === "function") {
      action.run();
    }

    setQuery("");

    if (typeof onClose === "function") {
      onClose();
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      onClose?.();
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/70 p-5 pt-20 backdrop-blur-sm">
      <div className={`eden-page w-full max-w-2xl rounded-3xl border ${border} ${card} p-5 shadow-2xl`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-[0.12em]">
              COMMAND PALETTE
            </h2>

            <p className="mt-1 text-sm opacity-70">
              Search pages, actions, and saved chats.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold transition hover:scale-[1.02]"
          >
            Close
          </button>
        </div>

        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search Eden..."
          className="mt-5 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm outline-none"
        />

        <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {visibleActions.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm opacity-70">
              No actions matched your search.
            </div>
          )}

          {visibleActions.map((action) => (
            <button
              key={`${action.type}-${action.id}`}
              type="button"
              onClick={() => runAction(action)}
              className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:scale-[1.01] hover:bg-white hover:text-black"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {action.label}
                  </p>

                  <p className="mt-1 truncate text-xs opacity-70">
                    {action.description}
                  </p>
                </div>

                <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] opacity-70">
                  {action.type}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}