import { useState } from "react";

export default function MobileNav({
  currentTheme,
  profilePic = "/logos/UCNMVC-LOGO.png",
  isLoggedIn = false,
  recentChats = [],
  activePage = "chat",
  username = "Guest",
  onNavigate,
  onStartNewChat,
  onLogin,
  onLogout,
}) {
  const [open, setOpen] = useState(false);

  const border = currentTheme?.border || "border-white/10";
  const card = currentTheme?.card || "bg-zinc-950";

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

  function goTo(page) {
    if (typeof onNavigate === "function") {
      onNavigate(page);
    }

    setOpen(false);
  }

  function navButtonClass(page) {
    const active = activePage === page;

    return `w-full rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
      active
        ? "border-white bg-white text-black"
        : "border-white/10 bg-black/40"
    }`;
  }

  return (
    <div className="md:hidden">
      <div className={`fixed left-0 right-0 top-0 z-40 border-b ${border} ${card} px-4 py-3`}>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold"
          >
            Menu
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-bold tracking-[0.2em]">
              EDEN AI
            </p>

            <p className="truncate text-xs opacity-60">
              {isLoggedIn ? username : "Not logged in"}
            </p>
          </div>

          <img
            src={profilePic}
            alt="Profile"
            className="h-11 w-11 rounded-2xl border border-white/10 object-cover"
          />
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm">
          <div className={`h-full w-[86%] max-w-sm overflow-y-auto border-r ${border} ${card} p-5 shadow-2xl`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={profilePic}
                  alt="Profile"
                  className="h-12 w-12 rounded-2xl border border-white/10 object-cover"
                />

                <div>
                  <p className="text-xs uppercase tracking-[0.25em] opacity-60">
                    Project Eden
                  </p>

                  <h2 className="text-lg font-bold tracking-[0.12em]">
                    EDEN AI
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold"
              >
                Close
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (typeof onStartNewChat === "function") {
                  onStartNewChat();
                }
                setOpen(false);
              }}
              className="mt-6 w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black"
            >
              + New Chat
            </button>

            <div className="mt-5 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(item.id)}
                  className={navButtonClass(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.25em] opacity-50">
                Saved Chats
              </p>

              <p className="mt-2 text-2xl font-bold">
                {recentChats.length}
              </p>

              <button
                type="button"
                onClick={() => goTo("saved-chats")}
                className="mt-4 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold"
              >
                View Saved Chats
              </button>
            </div>

            <div className="mt-5 border-t border-white/10 pt-5 pb-8">
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof onLogout === "function") {
                      onLogout();
                    }
                    setOpen(false);
                  }}
                  className="w-full rounded-2xl border border-red-400/20 bg-black/30 px-4 py-3 text-sm font-bold text-red-300"
                >
                  Logout
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof onLogin === "function") {
                      onLogin();
                    }
                    setOpen(false);
                  }}
                  className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black"
                >
                  Login With Google
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}