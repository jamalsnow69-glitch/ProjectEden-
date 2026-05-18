const API_BASE = "";

export function getBackendBase() {
  const origin = window.location.origin;

  if (window.location.port === "5173") {
    return origin.replace("5173", "8000");
  }

  if (window.location.hostname.includes("5173")) {
    return origin.replace("-5173", "-8000");
  }

  return origin;
}

export function getToken() {
  return localStorage.getItem("eden_token") || "";
}

export function setToken(token) {
  if (!token) return;
  localStorage.setItem("eden_token", token);
}

export function clearToken() {
  localStorage.removeItem("eden_token");
  localStorage.removeItem("eden_user");
  localStorage.removeItem("eden_email");
  localStorage.removeItem("eden_pfp");
  localStorage.removeItem("eden_pending_2fa_token");
}

export function saveUser(user = {}) {
  if (user.username) localStorage.setItem("eden_user", user.username);
  if (user.email) localStorage.setItem("eden_email", user.email);
  if (user.avatar_url) localStorage.setItem("eden_pfp", user.avatar_url);
  if (user.picture) localStorage.setItem("eden_pfp", user.picture);
}

export function authHeaders(extra = {}) {
  const token = getToken();

  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readJsonResponse(response) {
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
}

export function saveLoginResult(data = {}) {
  if (data.requires_2fa) {
    if (data.pending_token) {
      localStorage.setItem("eden_pending_2fa_token", data.pending_token);
    }

    saveUser(data.user || {});

    return {
      requires2FA: true,
      pendingToken: data.pending_token || "",
      user: data.user || null,
    };
  }

  if (data.access_token) {
    setToken(data.access_token);
  }

  saveUser(data.user || {});
  localStorage.removeItem("eden_pending_2fa_token");

  return {
    requires2FA: false,
    token: data.access_token || "",
    user: data.user || null,
  };
}

export const authClient = {
  getBackendBase,
  getToken,
  setToken,
  clearToken,
  saveUser,
  authHeaders,
  saveLoginResult,

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

    return saveLoginResult(await readJsonResponse(response));
  },

  async login({ emailOrUsername, password }) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_or_username: emailOrUsername, password }),
    });

    return saveLoginResult(await readJsonResponse(response));
  },

  async verifyLogin2FA({ pendingToken, code }) {
    const response = await fetch(`${API_BASE}/auth/2fa/login-verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pending_token: pendingToken, code }),
    });

    return saveLoginResult(await readJsonResponse(response));
  },

  async getMe() {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: authHeaders(),
    });

    const data = await readJsonResponse(response);
    saveUser(data.user || {});
    return data.user || null;
  },

  async setup2FA() {
    const response = await fetch(`${API_BASE}/auth/2fa/setup`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
    });

    return readJsonResponse(response);
  },

  async verify2FASetup(code) {
    const response = await fetch(`${API_BASE}/auth/2fa/verify-setup`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ code }),
    });

    return readJsonResponse(response);
  },

  async disable2FA(code) {
    const response = await fetch(`${API_BASE}/auth/2fa/disable`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ code }),
    });

    return readJsonResponse(response);
  },

  async regenerateBackupCodes(code) {
    const response = await fetch(`${API_BASE}/auth/2fa/backup-codes`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ code }),
    });

    return readJsonResponse(response);
  },

  consumeAuthRedirectParams() {
    const params = new URLSearchParams(window.location.search);

    const token = params.get("token");
    const username = params.get("username");
    const email = params.get("email");
    const picture = params.get("picture");
    const requires2FA = params.get("requires_2fa") === "true";
    const pendingToken = params.get("pending_token") || "";

    const hasAuthParams = Boolean(token || username || email || picture || requires2FA || pendingToken);

    if (token) setToken(token);
    if (username) localStorage.setItem("eden_user", username);
    if (email) localStorage.setItem("eden_email", email);
    if (picture) localStorage.setItem("eden_pfp", picture);
    if (pendingToken) localStorage.setItem("eden_pending_2fa_token", pendingToken);

    if (hasAuthParams) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return {
      hasAuthParams,
      token,
      username,
      email,
      picture,
      requires2FA,
      pendingToken,
    };
  },
};

export default authClient;
