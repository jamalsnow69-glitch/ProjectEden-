export default function Sidebar({
  currentTheme,
  profilePic = "/logos/UCNMVC-LOGO.png",
  isLoggedIn = false,
  recentChats = [],
  activePage = "chat",
  onNavigate,
  onStartNewChat,
  onLogin,
  onLogout,
}) {
  const border = currentTheme?.border || "border-white/10";
  const card = currentTheme?.card || "bg-zinc-950";

  function goTo(page) {
    if (typeof onNavigate === "function") {
      onNavigate(page);
    }
  }

  function sidebarButtonClass(page) {
    const active = activePage === page;

    return `w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition hover:scale-[1.02] ${
      active
        ? "border-white bg-white text-black"
        : "border-white/10 bg-black/40"
    }`;
  }

  const navItems = [
    { id: "chat", label: "Chat" },
    { id: "saved-chats", label: "Saved Chats" },
    { id: "call", label: "Call Eden" },
    { id: "account", label: "Account Overview" },
    { id: "settings", label: "Settings" },
    { id: "customize", label: "Customize" },
    { id: "legal", label: "Legal" },
    { id: "versions", label: "Versions" },
  ];

  return (
    <aside className={`hidden h-screen w-80 flex-col overflow-y-auto border-r ${border} ${card} p-5 md:flex`}>
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 eden-page">
        <img
          src={profilePic}
          alt="Profile"
          className="h-14 w-14 rounded-2xl object-cover"
        />

        <div>
          <p className="text-xs uppercase tracking-[0.3em] opacity-60">
            Project Eden
          </p>

          <h1 className="text-xl font-bold tracking-[0.15em]">
            EDEN AI
          </h1>
        </div>
      </div>

      <button
        type="button"
        onClick={onStartNewChat}
        className="mb-4 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black transition hover:scale-[1.02]"
      >
        + New Chat
      </button>

      <div className="space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => goTo(item.id)}
            className={sidebarButtonClass(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6 shrink-0 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-[0.25em] opacity-50">
          Saved Chats
        </p>

        <p className="mt-2 text-2xl font-bold">
          {recentChats.length}
        </p>

        <p className="mt-1 text-sm opacity-60">
          Manage conversations on the Saved Chats page.
        </p>

        <button
          type="button"
          onClick={() => goTo("saved-chats")}
          className="mt-4 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold transition hover:scale-[1.02]"
        >
          View Saved Chats
        </button>
      </div>

      <div className="mt-5 shrink-0 border-t border-white/10 pt-5 pb-6">
        {isLoggedIn ? (
          <button
            type="button"
            onClick={onLogout}
            className="w-full rounded-2xl border border-red-400/20 bg-black/30 px-4 py-3 text-sm font-bold text-red-300 transition hover:scale-[1.02]"
          >
            Logout
          </button>
        ) : (
          <button
            type="button"
            onClick={onLogin}
            className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black transition hover:scale-[1.02]"
          >
            Login With Google
          </button>
        )}
      </div>
    </aside>
  );
}