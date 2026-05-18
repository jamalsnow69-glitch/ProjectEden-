export default function AccountOverview({
  currentTheme,
  isLoggedIn = false,
  username = "Guest",
  email = "Not logged in",
  userId = "EDN-UNKNOWN",
  profilePic = "/logos/UCNMVC-LOGO.png",
  recentChats = [],
  uploadedFiles = [],
  onProfilePicChange,
  onLogin,
  onLogout,
}) {
  const border = currentTheme?.border || "border-white/10";
  const card = currentTheme?.card || "bg-zinc-950";

  function handleProfileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof onProfilePicChange === "function") {
        onProfilePicChange(reader.result);
      }
    };

    reader.readAsDataURL(file);
  }

  return (
    <section className={`eden-page flex-1 overflow-y-auto rounded-3xl border ${border} ${card} p-6`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-[0.15em]">
            ACCOUNT OVERVIEW
          </h2>

          <p className="mt-2 text-sm opacity-70">
            Manage your Eden identity, profile image, and local account stats.
          </p>
        </div>

        {isLoggedIn ? (
          <button
            type="button"
            onClick={onLogout}
            className="rounded-2xl border border-red-400/20 bg-black/30 px-5 py-3 text-sm font-bold text-red-300 transition hover:scale-[1.02]"
          >
            Logout
          </button>
        ) : (
          <button
            type="button"
            onClick={onLogin}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:scale-[1.02]"
          >
            Login With Google
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <img
              src={profilePic}
              alt="Profile"
              className="h-28 w-28 rounded-3xl border border-white/10 object-cover"
            />

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-2xl font-bold">
                {isLoggedIn ? username : "Guest"}
              </h3>

              <p className="mt-2 truncate opacity-70">
                {isLoggedIn ? email : "Not logged in"}
              </p>

              <p className="mt-2 text-xs uppercase tracking-[0.25em] opacity-50">
                User ID: {userId}
              </p>

              <label className="mt-5 inline-flex cursor-pointer rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold transition hover:scale-[1.02]">
                Change Profile Picture
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfileChange}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.25em] opacity-50">
              Saved Chats
            </p>

            <p className="mt-2 text-3xl font-bold">
              {recentChats.length}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.25em] opacity-50">
              Uploaded Files
            </p>

            <p className="mt-2 text-3xl font-bold">
              {uploadedFiles.length}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Account Status</h3>
          <p className="mt-2 text-sm opacity-70">
            {isLoggedIn ? "Google login connected." : "Login is required for synced account features."}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Plan</h3>
          <p className="mt-2 text-sm opacity-70">
            Free plan placeholder. Subscription plans can connect here later.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Privacy</h3>
          <p className="mt-2 text-sm opacity-70">
            Local frontend data is stored in this browser until backend sync is enabled.
          </p>
        </div>
      </div>
    </section>
  );
}