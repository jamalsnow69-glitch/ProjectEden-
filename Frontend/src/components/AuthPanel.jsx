import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "";

function getBackendBase() {
  const origin = window.location.origin;

  if (window.location.port === "5173") {
    return origin.replace("5173", "8000");
  }

  if (window.location.hostname.includes("5173")) {
    return origin.replace("-5173", "-8000");
  }

 return API_BASE || origin;
}

const authClient = {
  getToken() {
    return localStorage.getItem("eden_token") || "";
  },

  setToken(token) {
    if (!token) return;
    localStorage.setItem("eden_token", token);
  },

  saveUser(user = {}) {
    if (user.username) localStorage.setItem("eden_user", user.username);
    if (user.email) localStorage.setItem("eden_email", user.email);
    if (user.avatar_url) localStorage.setItem("eden_pfp", user.avatar_url);
  },

  authHeaders(extra = {}) {
    const token = localStorage.getItem("eden_token") || "";

    return {
      ...extra,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  },

  async readJsonResponse(response) {
    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const detail = data?.detail || data?.message || data?.raw || `HTTP ${response.status}`;
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }

    return data || {};
  },

  saveLoginResult(data = {}) {
    if (data.requires_2fa) {
      if (data.pending_token) {
        localStorage.setItem("eden_pending_2fa_token", data.pending_token);
      }

      this.saveUser(data.user || {});

      return {
        requires2FA: true,
        pendingToken: data.pending_token || "",
        user: data.user || null,
      };
    }

    if (data.access_token) {
      this.setToken(data.access_token);
    }

    this.saveUser(data.user || {});
    localStorage.removeItem("eden_pending_2fa_token");

    return {
      requires2FA: false,
      token: data.access_token || "",
      user: data.user || null,
    };
  },

  loginWithGoogle() {
    window.location.href = `${getBackendBase()}/auth/google/login`;
  },

  loginWithGitHub() {
    window.location.href = `${getBackendBase()}/auth/github/login`;
  },

  loginWithDiscord() {
    window.location.href = `${getBackendBase()}/auth/discord/login`;
  },

  async signup({ username, email, password }) {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    return this.saveLoginResult(await this.readJsonResponse(response));
  },

  async login({ emailOrUsername, password }) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_or_username: emailOrUsername, password }),
    });

    return this.saveLoginResult(await this.readJsonResponse(response));
  },

  async verifyLogin2FA({ pendingToken, code }) {
    const response = await fetch(`${API_BASE}/auth/2fa/login-verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pending_token: pendingToken, code }),
    });

    return this.saveLoginResult(await this.readJsonResponse(response));
  },

  async setup2FA() {
    const response = await fetch(`${API_BASE}/auth/2fa/setup`, {
      method: "POST",
      headers: this.authHeaders({ "Content-Type": "application/json" }),
    });

    return this.readJsonResponse(response);
  },

  async verify2FASetup(code) {
    const response = await fetch(`${API_BASE}/auth/2fa/verify-setup`, {
      method: "POST",
      headers: this.authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ code }),
    });

    return this.readJsonResponse(response);
  },

  async disable2FA(code) {
    const response = await fetch(`${API_BASE}/auth/2fa/disable`, {
      method: "POST",
      headers: this.authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ code }),
    });

    return this.readJsonResponse(response);
  },
};

const DEFAULT_FORM = {
  username: "",
  email: "",
  emailOrUsername: "",
  password: "",
  confirmPassword: "",
  twoFactorCode: "",
};

function cleanError(error) {
  if (!error) return "Something went wrong.";
  return error.message || String(error);
}

function Field({ label, value, onChange, type = "text", placeholder = "", autoComplete = "off" }) {
  return (
    <label className="block text-sm font-medium opacity-90">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none transition focus:border-white/40"
      />
    </label>
  );
}

function AuthTabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
        active ? "border-white bg-white text-black" : "border-white/10 bg-black/30 opacity-75 hover:opacity-100"
      }`}
    >
      {children}
    </button>
  );
}

function ProviderButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold transition hover:scale-[1.01] hover:border-white/30"
    >
      {children}
    </button>
  );
}

export default function AuthPanel({
  currentTheme,
  mode = "login",
  onModeChange,
  onAuthSuccess,
  onClose,
  onToast,
}) {
  const [activeMode, setActiveMode] = useState(mode);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingToken, setPendingToken] = useState(localStorage.getItem("eden_pending_2fa_token") || "");
  const [setupData, setSetupData] = useState(null);
  const [backupCodes, setBackupCodes] = useState([]);

  const theme = useMemo(
    () =>
      currentTheme || {
        card: "bg-zinc-950",
        border: "border-emerald-400/20",
        accent: "text-emerald-300",
      },
    [currentTheme]
  );

  useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  function notify(type, title, message) {
    if (typeof onToast === "function") {
      onToast(type, title, message);
    }
  }

  function changeMode(nextMode) {
    setError("");
    setActiveMode(nextMode);
    if (typeof onModeChange === "function") onModeChange(nextMode);
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function finishAuth(result) {
    notify("success", "Logged in", "Project Eden authentication completed.");
    if (typeof onAuthSuccess === "function") onAuthSuccess(result);
    if (typeof onClose === "function") onClose();
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await authClient.login({
        emailOrUsername: form.emailOrUsername,
        password: form.password,
      });

      if (result.requires2FA) {
        setPendingToken(result.pendingToken);
        changeMode("2fa-login");
        notify("warning", "2FA required", "Enter your authenticator or backup code.");
        return;
      }

      finishAuth(result);
    } catch (error) {
      setError(cleanError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (form.password !== form.confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const result = await authClient.signup({
        username: form.username,
        email: form.email,
        password: form.password,
      });

      if (result.requires2FA) {
        setPendingToken(result.pendingToken);
        changeMode("2fa-login");
        return;
      }

      finishAuth(result);
    } catch (error) {
      setError(cleanError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyLogin2FA(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = pendingToken || localStorage.getItem("eden_pending_2fa_token") || "";

      if (!token) {
        throw new Error("Missing pending 2FA token. Log in again.");
      }

      const result = await authClient.verifyLogin2FA({
        pendingToken: token,
        code: form.twoFactorCode,
      });

      finishAuth(result);
    } catch (error) {
      setError(cleanError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleStart2FASetup() {
    setLoading(true);
    setError("");
    setBackupCodes([]);

    try {
      const data = await authClient.setup2FA();
      setSetupData(data);
      changeMode("2fa-setup");
      notify("success", "2FA setup started", "Add the secret or otpauth URL to your authenticator app.");
    } catch (error) {
      setError(cleanError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify2FASetup(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await authClient.verify2FASetup(form.twoFactorCode);
      setBackupCodes(data.backup_codes || []);
      notify("success", "2FA enabled", "Save your backup codes now.");
      changeMode("2fa-backup-codes");
    } catch (error) {
      setError(cleanError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable2FA(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await authClient.disable2FA(form.twoFactorCode);
      notify("success", "2FA disabled", "Two-factor authentication is now disabled.");
      setForm(DEFAULT_FORM);
      changeMode("login");
    } catch (error) {
      setError(cleanError(error));
    } finally {
      setLoading(false);
    }
  }

  function copyText(value, label = "Copied") {
    navigator.clipboard?.writeText(value).then(
      () => notify("success", label, "Copied to clipboard."),
      () => notify("warning", "Copy failed", "Select and copy the text manually.")
    );
  }

  return (
    <section className={`eden-page w-full rounded-3xl border ${theme.border} ${theme.card} p-6 shadow-2xl`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] opacity-50">Project Eden</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[0.12em]">Authentication</h2>
          <p className="mt-2 text-sm leading-relaxed opacity-70">
            Sign in with a provider, use email and password, or manage two-factor authentication.
          </p>
        </div>

        {typeof onClose === "function" ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold"
          >
            Close
          </button>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <AuthTabButton active={activeMode === "login"} onClick={() => changeMode("login")}>Login</AuthTabButton>
        <AuthTabButton active={activeMode === "signup"} onClick={() => changeMode("signup")}>Sign Up</AuthTabButton>
        <AuthTabButton active={activeMode === "2fa-manage"} onClick={() => changeMode("2fa-manage")}>2FA</AuthTabButton>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {activeMode === "login" ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
          <form onSubmit={handleLogin} className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <h3 className="text-lg font-bold">Email Login</h3>
            <div className="mt-5 space-y-4">
              <Field
                label="Email or Username"
                value={form.emailOrUsername}
                onChange={(value) => updateForm("emailOrUsername", value)}
                placeholder="you@example.com"
                autoComplete="username"
              />
              <Field
                label="Password"
                type="password"
                value={form.password}
                onChange={(value) => updateForm("password", value)}
                placeholder="Your password"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <h3 className="text-lg font-bold">Provider Login</h3>
            <p className="mt-2 text-sm opacity-70">These redirect through the backend OAuth routes on port 8000.</p>
            <div className="mt-5 grid gap-3">
              <ProviderButton onClick={authClient.loginWithGoogle}>Continue with Google</ProviderButton>
              <ProviderButton onClick={authClient.loginWithGitHub}>Continue with GitHub</ProviderButton>
              <ProviderButton onClick={authClient.loginWithDiscord}>Continue with Discord</ProviderButton>
            </div>
          </div>
        </div>
      ) : null}

      {activeMode === "signup" ? (
        <form onSubmit={handleSignup} className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Create Account</h3>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Field label="Username" value={form.username} onChange={(value) => updateForm("username", value)} placeholder="Sukarue" autoComplete="username" />
            <Field label="Email" type="email" value={form.email} onChange={(value) => updateForm("email", value)} placeholder="you@example.com" autoComplete="email" />
            <Field label="Password" type="password" value={form.password} onChange={(value) => updateForm("password", value)} placeholder="At least 8 characters" autoComplete="new-password" />
            <Field label="Confirm Password" type="password" value={form.confirmPassword} onChange={(value) => updateForm("confirmPassword", value)} placeholder="Repeat password" autoComplete="new-password" />
          </div>
          <button type="submit" disabled={loading} className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black disabled:opacity-50">
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
      ) : null}

      {activeMode === "2fa-login" ? (
        <form onSubmit={handleVerifyLogin2FA} className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Two-Factor Verification</h3>
          <p className="mt-2 text-sm opacity-70">Enter a 6-digit authenticator code or one backup code.</p>
          <div className="mt-5">
            <Field label="2FA Code" value={form.twoFactorCode} onChange={(value) => updateForm("twoFactorCode", value)} placeholder="123456" autoComplete="one-time-code" />
          </div>
          <button type="submit" disabled={loading} className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black disabled:opacity-50">
            {loading ? "Verifying..." : "Verify 2FA"}
          </button>
        </form>
      ) : null}

      {activeMode === "2fa-manage" ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <h3 className="text-lg font-bold">Enable 2FA</h3>
            <p className="mt-2 text-sm leading-relaxed opacity-70">Generates an authenticator-app secret and an otpauth URL.</p>
            <button type="button" disabled={loading} onClick={handleStart2FASetup} className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black disabled:opacity-50">
              {loading ? "Starting..." : "Start 2FA Setup"}
            </button>
          </div>

          <form onSubmit={handleDisable2FA} className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <h3 className="text-lg font-bold">Disable 2FA</h3>
            <p className="mt-2 text-sm leading-relaxed opacity-70">Enter your authenticator code or a backup code.</p>
            <div className="mt-5">
              <Field label="2FA Code" value={form.twoFactorCode} onChange={(value) => updateForm("twoFactorCode", value)} placeholder="123456 or backup code" autoComplete="one-time-code" />
            </div>
            <button type="submit" disabled={loading} className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-200 disabled:opacity-50">
              {loading ? "Disabling..." : "Disable 2FA"}
            </button>
          </form>
        </div>
      ) : null}

      {activeMode === "2fa-setup" ? (
        <form onSubmit={handleVerify2FASetup} className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Authenticator Setup</h3>
          <p className="mt-2 text-sm opacity-70">Add this secret or otpauth URL to your authenticator app, then enter the generated code.</p>

          <div className="mt-5 grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] opacity-50">Secret</p>
              <p className="mt-2 break-all font-mono text-sm">{setupData?.secret || "No secret generated."}</p>
              <button type="button" onClick={() => copyText(setupData?.secret || "", "Secret copied")} className="mt-3 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold">
                Copy Secret
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.2em] opacity-50">otpauth URL</p>
              <p className="mt-2 max-h-28 overflow-y-auto break-all font-mono text-xs opacity-80">{setupData?.otpauth_url || "No otpauth URL generated."}</p>
              <button type="button" onClick={() => copyText(setupData?.otpauth_url || "", "otpauth URL copied")} className="mt-3 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold">
                Copy URL
              </button>
            </div>

            <Field label="Authenticator Code" value={form.twoFactorCode} onChange={(value) => updateForm("twoFactorCode", value)} placeholder="123456" autoComplete="one-time-code" />
          </div>

          <button type="submit" disabled={loading} className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black disabled:opacity-50">
            {loading ? "Verifying..." : "Verify and Enable 2FA"}
          </button>
        </form>
      ) : null}

      {activeMode === "2fa-backup-codes" ? (
        <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Backup Codes</h3>
          <p className="mt-2 text-sm leading-relaxed opacity-70">Save these now. Each code can be used once if you lose your authenticator app.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {backupCodes.map((code) => (
              <code key={code} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm">
                {code}
              </code>
            ))}
          </div>
          <button type="button" onClick={() => copyText(backupCodes.join("\n"), "Backup codes copied")} className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black">
            Copy Backup Codes
          </button>
        </div>
      ) : null}
    </section>
  );
}
