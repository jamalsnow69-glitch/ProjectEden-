import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AuthPanel from "./components/AuthPanel";
import SubscriptionsPage from "./components/Subscriptions";
import CaptchaPage from "./pages/CaptchaPage";
import { shouldShowCaptcha, makeCaptchaPath } from "./utils/captcha";
import { supabase } from "./utils/supabase";
import { getOrCreateProfile } from "./utils/profile";
import {
  loadChats as loadSupabaseChats,
  createChat as createSupabaseChat,
  renameChat as renameSupabaseChat,
  deleteChat as deleteSupabaseChat,
  loadMessages as loadSupabaseMessages,
  saveMessage as saveSupabaseMessage,
} from "./utils/supabaseChats";

const EDEN_ASSETS = {
  logos: {
    ucnmvc: "/logos/UCNMVC-LOGO.png",
    edenIcon: "/logos/UCNMVC-LOGO.png",
  },
  sounds: {
    startup: "/sounds/eden-startup.mp3",
    message: "/sounds/eden-message.mp3",
    notification: "/sounds/eden-notification.mp3",
    callStart: "/sounds/eden-call-start.mp3",
    callEnd: "/sounds/eden-call-end.mp3",
    login: "/sounds/eden-login.mp3",
    logout: "/sounds/eden-logout.mp3",
    error: "/sounds/eden-error.mp3",
    success: "/sounds/eden-success.mp3",
    warning: "/sounds/eden-warning.mp3",
    thinking: "/sounds/eden-thinking.mp3",
    send: "/sounds/eden-send.mp3",
    uploadStart: "/sounds/eden-upload-start.mp3",
    uploadComplete: "/sounds/eden-upload-complete.mp3",
    openChat: "/sounds/eden-open-chat.mp3",
    deleteChat: "/sounds/eden-delete-chat.mp3",
    renameChat: "/sounds/eden-rename-chat.mp3",
    themeSwitch: "/sounds/eden-theme-switch.mp3",
    settingsToggle: "/sounds/eden-settings-toggle.mp3",
    panelOpen: "/sounds/eden-panel-open.mp3",
    panelClose: "/sounds/eden-panel-close.mp3",
  },
  placeholders: {
    profile: "/logos/UCNMVC-LOGO.png",
    upload: "/placeholders/upload-placeholder.png",
  },
};

const THEME_PRESETS = [
  { id: "emerald", name: "Emerald", bg: "bg-[#050505]", card: "bg-zinc-950", accent: "text-emerald-300", border: "border-emerald-400/20" },
  { id: "crimson", name: "Crimson", bg: "bg-[#120303]", card: "bg-[#1b0505]", accent: "text-red-300", border: "border-red-400/20" },
  { id: "violet", name: "Violet", bg: "bg-[#14051f]", card: "bg-[#1c0b2c]", accent: "text-violet-300", border: "border-violet-400/20" },
  { id: "cyber", name: "Cyber Blue", bg: "bg-[#020617]", card: "bg-[#07111f]", accent: "text-cyan-300", border: "border-cyan-400/20" },
  { id: "matrix", name: "Matrix", bg: "bg-black", card: "bg-[#020202]", accent: "text-green-400", border: "border-green-400/20" },
  { id: "gold", name: "Gold", bg: "bg-[#181205]", card: "bg-[#241b08]", accent: "text-yellow-300", border: "border-yellow-400/20" },
  { id: "ocean", name: "Ocean", bg: "bg-[#03131b]", card: "bg-[#071e28]", accent: "text-sky-200", border: "border-sky-400/20" },
  { id: "mono", name: "Mono", bg: "bg-[#090909]", card: "bg-[#121212]", accent: "text-zinc-200", border: "border-zinc-400/20" },
  { id: "rose", name: "Rose", bg: "bg-[#19060b]", card: "bg-[#240b11]", accent: "text-rose-300", border: "border-rose-400/20" },
  { id: "midnight", name: "Midnight", bg: "bg-[#070b16]", card: "bg-[#0d1320]", accent: "text-blue-200", border: "border-blue-400/20" },
  { id: "lava", name: "Lava", bg: "bg-[#1a0803]", card: "bg-[#2a1008]", accent: "text-orange-300", border: "border-orange-400/20" },
  { id: "ice", name: "Ice", bg: "bg-[#04141c]", card: "bg-[#0a2029]", accent: "text-cyan-100", border: "border-cyan-200/20" },
  { id: "purpur", name: "Purpur", bg: "bg-[#ff00ff]", card: "bg-[#c800ff]", accent: "text-purple-300", border: "border-purple-400/20" },
];

const VERSION_HISTORY = [
  "v1.1.8 - Rebuilt UI to fix Database auth sync, account ID fallbacks, chat persistence, captcha routing, and backend request safety",
  "v1.1.7 - Added stable account ID fallback system with EDN-No User logout state and Database profile ID sync",
  "v1.1.6 - Fxed Database auth,Database saved chats, captcha routing, and fixed hook/order issues",
  "v1.1.5 - Added backend account ID loading, sidebar AI online status, subscription wiring, and logout profile reset",
  "v1.1.4 - Hotfixes: Fixed AI not Responding, instead replying with (Streaming Error 404 ...), fixed Bug where you cannot login with Discord Oauth. ",
  "v1.1.3 - Added Subscriptions page with plan cards, FAQ, billing notice, and manage/cancel controls",
  "v1.1.2 - Added AuthPanel wired into the App with login, signup, OAuth, and 2FA modal (not done)",
  "v1.1.1 - Fixed EDEN_ASSETS syntax in Console, and stabilized MP3-first audio",
  "v1.1.0 - MP3-first sound system with fallback tones disabled by default",
  "v1.0.8 - Hotfixes: Fixed App not Showing up after Loading, Fixed Lag causing ai to take 10 minutes to function",
  "v1.0.7 - Dev Info Fixes: Component wiring, command palette, toasts, uploads page, and sound settings",
  "v1.0.6 - Dev Info Fixes: Saved chats wiring, empty chat state, reasoning and memory controls",
  "v1.0.5 -  Added Startup loading page and animations",
  "v1.0.4 - Added Voice systems, saved chats, user IDs, and customization rebuild",
  "v1.0.3 - Improvements: Streaming chat improvements",
  "v1.0.2 - Added Upload system foundation",
  "v1.0.1 - Added Saved chats system",
  "v1.0.0 - Added Project Eden React migration",
];

const REASONING_LEVELS = [
  { id: "fast", name: "Fast", description: "Quick replies with lower latency." },
  { id: "balanced", name: "Balanced", description: "Default speed and quality mix." },
  { id: "deep", name: "Deep", description: "More careful responses for complex tasks." },
  { id: "maximum", name: "Maximum", description: "Best effort reasoning for hard tasks." },
];

const MEMORY_DEPTHS = [
  { id: "light", name: "Light", description: "Short context window." },
  { id: "standard", name: "Standard", description: "Normal chat memory." },
  { id: "extended", name: "Extended", description: "Uses more previous context." },
  { id: "full", name: "Full", description: "Maximum available memory depth." },
];

const FALLBACK_TONES = {
  startup: [196, 294, 392],
  message: [784],
  notification: [659, 880],
  callStart: [392, 523],
  callEnd: [523, 392],
  login: [440, 660, 880],
  logout: [440, 330],
  error: [140, 110],
  success: [523, 659, 784],
  thinking: [220],
  send: [700],
  uploadStart: [330, 440],
  uploadComplete: [440, 660],
  openChat: [360, 540],
  deleteChat: [180, 120],
  renameChat: [500, 620],
  themeSwitch: [330, 495, 660],
  warning: [220, 180],
  panelOpen: [330, 440, 550],
  panelClose: [550, 440, 330],
};

const EDEN_SOUNDS = EDEN_ASSETS.sounds;
const STARTUP_LOADING_MS = 4200;
const API_BASE = import.meta.env.VITE_API_BASE || "";
const APP_VERSION = "EdenV1.1.8";
const NO_USER_ID = "EDN-No User";

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function clampVolume(value) {
  const clean = Number(value);
  if (Number.isNaN(clean)) return 0.45;
  return Math.max(0, Math.min(1, clean));
}

function makeToast(type, title, message) {
  return {
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    message,
  };
}

function makeFallbackId() {
  return Math.random().toString(36).slice(2, 12).toUpperCase();
}

function makeFrontendAccountId() {
  const randomPart = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase() : makeFallbackId();
  return `EDN-${randomPart}`;
}

function createUserId() {
  const existing = localStorage.getItem("eden_user_id");
  if (existing) return existing;
  const next = makeFrontendAccountId();
  localStorage.setItem("eden_user_id", next);
  return next;
}

async function ensureProfileAccountId(user, profile) {
  if (!user || !profile) return NO_USER_ID;
  if (profile.account_id) return profile.account_id;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const nextAccountId = makeFrontendAccountId();
    const { data, error } = await supabase.from("profiles").update({ account_id: nextAccountId }).eq("id", user.id).select("account_id").single();

    if (!error && data?.account_id) return data.account_id;

    const message = String(error?.message || "").toLowerCase();
    const code = String(error?.code || "");
    if (!message.includes("duplicate") && code !== "23505") break;
  }

  return NO_USER_ID;
}

function safeFileName(value, fallback = "eden-chat") {
  const clean = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return clean || fallback;
}

function downloadTextFile(filename, content, mimeType = "text/plain") {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportChat({ format, chat, messages, appVersion = APP_VERSION }) {
  const payload = {
    app: "Project Eden",
    version: appVersion,
    exportedAt: new Date().toISOString(),
    chat: {
      id: chat?.id || "unsaved-chat",
      title: chat?.title || "Unsaved Chat",
    },
    messages: Array.isArray(messages)
      ? messages.map((message, index) => ({
          index,
          sender: message.sender || message.role || "unknown",
          text: message.text || message.content || "",
        }))
      : [],
  };

  const base = safeFileName(payload.chat.title);

  if (format === "json") {
    downloadTextFile(`${base}.json`, JSON.stringify(payload, null, 2), "application/json");
    return;
  }

  if (format === "markdown" || format === "md") {
    const lines = [
      `# ${payload.chat.title}`,
      "",
      `Project: ${payload.app}`,
      `Version: ${payload.version}`,
      `Chat ID: ${payload.chat.id}`,
      `Exported: ${payload.exportedAt}`,
      "",
      "---",
      "",
    ];

    payload.messages.forEach((message) => {
      lines.push(`## ${message.sender === "eden" || message.sender === "assistant" ? "Eden" : "User"}`);
      lines.push("");
      lines.push(message.text || "_");
      lines.push("");
    });

    downloadTextFile(`${base}.md`, lines.join("\n"), "text/markdown");
    return;
  }

  const lines = [payload.chat.title, "Project Eden Chat Export", `Version: ${payload.version}`, `Chat ID: ${payload.chat.id}`, `Exported: ${payload.exportedAt}`, "================================================", ""];

  payload.messages.forEach((message) => {
    lines.push(`${message.sender === "eden" || message.sender === "assistant" ? "Eden" : "User"}:`);
    lines.push(message.text || "_");
    lines.push("");
  });

  downloadTextFile(`${base}.txt`, lines.join("\n"), "text/plain");
}

function ToastStack({ toasts, currentTheme, onDismiss }) {
  if (!toasts.length) return null;

  function toastClass(type) {
    if (type === "success") return "border-emerald-400/30 text-emerald-200";
    if (type === "error") return "border-red-400/30 text-red-200";
    if (type === "warning") return "border-yellow-400/30 text-yellow-100";
    return "border-white/10";
  }

  return (
    <div className="fixed right-5 top-5 z-[1000] flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div key={toast.id} className={`eden-page rounded-3xl border ${toastClass(toast.type)} ${currentTheme.card} bg-black/80 p-4 shadow-2xl backdrop-blur-md`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold">{toast.title}</p>
              {toast.message ? <p className="mt-1 text-sm leading-relaxed opacity-75">{toast.message}</p> : null}
            </div>
            <button type="button" onClick={() => onDismiss(toast.id)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold opacity-70">
              X
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConfirmModal({ open, title, description, confirmLabel, danger, currentTheme, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
      <div className={`eden-page w-full max-w-md rounded-3xl border ${currentTheme.border} ${currentTheme.card} p-6 shadow-2xl`}>
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border ${danger ? "border-red-400/30 bg-red-400/10 text-red-300" : "border-white/10 bg-white/5"}`}>{danger ? "!" : "?"}</div>
        <div className="mt-5 text-center">
          <h2 className="text-xl font-bold tracking-[0.08em]">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed opacity-70">{description}</p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={onCancel} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-sm font-bold">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={`rounded-2xl px-5 py-3 text-sm font-bold ${danger ? "border border-red-400/20 bg-red-500/20 text-red-200" : "bg-white text-black"}`}>
            {confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppHeader({ currentTheme, activePage, isLoggedIn, username, activeReasoning, activeMemory, onOpenSettings, onOpenAccount, onOpenCommand }) {
  const pageLabel = String(activePage || "chat").replace(/-/g, " ").toUpperCase();

  return (
    <header className={`mb-5 rounded-3xl border ${currentTheme.border} ${currentTheme.card} p-5 eden-page`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold tracking-[0.2em]">PROJECT EDEN</h1>
          <p className="mt-2 text-sm opacity-60">
            {isLoggedIn ? `Signed in as ${username}` : "Not logged in"} · {pageLabel} · Reasoning: {activeReasoning.name} · Memory: {activeMemory.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={onOpenCommand} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold">Command</button>
          <button type="button" onClick={onOpenSettings} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold">Settings</button>
          <button type="button" onClick={onOpenAccount} className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black">Account</button>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ currentTheme, profilePic, isLoggedIn, recentChats, activePage, backendOnline, onNavigate, onStartNewChat, onLogin, onLogout }) {
  const navItems = [
    { id: "chat", label: "Chat" },
    { id: "saved-chats", label: "Saved Chats" },
    { id: "uploads", label: "Uploads" },
    { id: "call", label: "Call Eden" },
    { id: "account", label: "Account Overview" },
    { id: "settings", label: "Settings" },
    { id: "customize", label: "Customize" },
    { id: "subscriptions", label: "Subscriptions" },
    { id: "legal", label: "Legal" },
    { id: "versions", label: "Versions" },
  ];

  function buttonClass(page) {
    return `w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition hover:scale-[1.02] ${activePage === page ? "border-white bg-white text-black" : "border-white/10 bg-black/40"}`;
  }

  return (
    <aside className={`hidden h-screen w-80 flex-col overflow-y-auto border-r ${currentTheme.border} ${currentTheme.card} p-5 md:flex`}>
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 eden-page">
        <img src={profilePic} alt="Profile" className="h-14 w-14 rounded-2xl object-cover" />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] opacity-60">Project Eden</p>
          <h1 className="text-xl font-bold tracking-[0.15em]">EDEN AI</h1>
        </div>
      </div>
      <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-bold ${backendOnline ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200" : "border-red-400/20 bg-red-500/10 text-red-200"}`}>{backendOnline ? "AI Online" : "AI Offline"}</div>
      <button type="button" onClick={onStartNewChat} className="mb-4 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black">+ New Chat</button>
      <div className="space-y-2">
        {navItems.map((item) => (
          <button key={item.id} type="button" onClick={() => onNavigate(item.id)} className={buttonClass(item.id)}>{item.label}</button>
        ))}
      </div>
      <div className="mt-6 shrink-0 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-[0.25em] opacity-50">Saved Chats</p>
        <p className="mt-2 text-2xl font-bold">{recentChats.length}</p>
        <p className="mt-1 text-sm opacity-60">Manage conversations on the Saved Chats page.</p>
        <button type="button" onClick={() => onNavigate("saved-chats")} className="mt-4 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold">View Saved Chats</button>
      </div>
      <div className="mt-5 shrink-0 border-t border-white/10 pb-6 pt-5">
        {isLoggedIn ? (
          <button type="button" onClick={onLogout} className="w-full rounded-2xl border border-red-400/20 bg-black/30 px-4 py-3 text-sm font-bold text-red-300">Logout</button>
        ) : (
          <button type="button" onClick={onLogin} className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black">Login / Sign Up</button>
        )}
      </div>
    </aside>
  );
}

function MobileNav({ currentTheme, profilePic, isLoggedIn, recentChats, activePage, username, onNavigate, onStartNewChat, onLogin, onLogout }) {
  const [open, setOpen] = useState(false);
  const navItems = ["chat", "saved-chats", "uploads", "call", "account", "settings", "customize", "subscriptions", "legal", "versions"];

  function go(page) {
    onNavigate(page);
    setOpen(false);
  }

  return (
    <div className="md:hidden">
      <div className={`fixed left-0 right-0 top-0 z-40 border-b ${currentTheme.border} ${currentTheme.card} px-4 py-3`}>
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setOpen(true)} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold">Menu</button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-bold tracking-[0.2em]">EDEN AI</p>
            <p className="truncate text-xs opacity-60">{isLoggedIn ? username : "Not logged in"}</p>
          </div>
          <img src={profilePic} alt="Profile" className="h-11 w-11 rounded-2xl border border-white/10 object-cover" />
        </div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm">
          <div className={`h-full w-[86%] max-w-sm overflow-y-auto border-r ${currentTheme.border} ${currentTheme.card} p-5 shadow-2xl`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold tracking-[0.12em]">EDEN AI</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold">Close</button>
            </div>
            <button type="button" onClick={() => { onStartNewChat(); setOpen(false); }} className="mt-6 w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black">+ New Chat</button>
            <div className="mt-5 space-y-2">
              {navItems.map((id) => (
                <button key={id} type="button" onClick={() => go(id)} className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-bold ${activePage === id ? "border-white bg-white text-black" : "border-white/10 bg-black/40"}`}>{id.replace(/-/g, " ")}</button>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.25em] opacity-50">Saved Chats</p>
              <p className="mt-2 text-2xl font-bold">{recentChats.length}</p>
            </div>
            <div className="mt-5 border-t border-white/10 pb-8 pt-5">
              {isLoggedIn ? (
                <button type="button" onClick={() => { onLogout(); setOpen(false); }} className="w-full rounded-2xl border border-red-400/20 bg-black/30 px-4 py-3 text-sm font-bold text-red-300">Logout</button>
              ) : (
                <button type="button" onClick={() => { onLogin(); setOpen(false); }} className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black">Login / Sign Up</button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChatShell({ currentTheme, messages, input, isLoggedIn, isSending, isUploading, isListening, chatEndRef, onInputChange, onSendMessage, onUploadFile, onVoiceInput, onStartNewChat }) {
  return (
    <section className={`eden-page flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border ${currentTheme.border} ${currentTheme.card}`}>
      <div className="flex-1 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[260px] items-center justify-center text-center">
            <div className="max-w-md rounded-3xl border border-white/10 bg-black/20 p-8 shadow-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">*</div>
              <h2 className="mt-5 text-xl font-bold tracking-[0.08em]">No messages in this chat.</h2>
              <p className="mt-3 text-sm leading-relaxed opacity-70">Send a message, start a new chat, or open a saved conversation.</p>
              <button type="button" onClick={onStartNewChat} className="mt-6 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black">Start New Chat</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isUser = message.sender === "user" || message.role === "user";
              const text = message.text || message.content || "";
              return (
                <div key={`${message.sender || message.role || "message"}-${index}`} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "rounded-br-sm bg-white text-black" : "rounded-bl-sm border border-white/10 bg-black/30"}`}>{text || (!isUser && isSending ? "Eden is thinking..." : "")}</div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="border-t border-white/10 p-4">
        <div className="flex gap-3">
          <textarea value={input} onChange={(event) => onInputChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSendMessage(); } }} placeholder={isLoggedIn ? "Message Eden..." : "Log in to message Eden..."} rows={1} className="min-h-12 flex-1 resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none" />
          <input type="file" id="eden-upload" className="hidden" onChange={onUploadFile} />
          <label htmlFor="eden-upload" className="cursor-pointer rounded-2xl border border-white/10 bg-black/30 px-4 py-3">{isUploading ? "..." : "+"}</label>
          <button type="button" onClick={onVoiceInput} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">{isListening ? "Listening" : "Mic"}</button>
          <button type="button" onClick={onSendMessage} disabled={isSending} className="rounded-2xl bg-white px-6 py-3 font-bold text-black disabled:opacity-50">{isSending ? "Wait" : "Send"}</button>
        </div>
      </div>
    </section>
  );
}

function lastPreview(messages) {
  if (!messages || messages.length === 0) return "No messages saved yet.";
  const last = messages[messages.length - 1];
  return last.text || last.content || "No message preview available.";
}

function SavedChatsPage({ chats, chatDatabase, currentTheme, onStartNewChat, onOpenChat, onRenameChat, onDeleteChat, appVersion }) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState("newest");
  const visibleChats = [...(chats || [])]
    .filter((chat) => {
      const clean = query.toLowerCase().trim();
      if (!clean) return true;
      const messages = chatDatabase[chat.id] || [];
      const messageText = messages.map((message) => message.text || message.content || "").join(" ").toLowerCase();
      return String(chat.title || "").toLowerCase().includes(clean) || messageText.includes(clean);
    })
    .sort((a, b) => {
      if (sortMode === "oldest") return (a.updatedAt || a.createdAt || 0) - (b.updatedAt || b.createdAt || 0);
      if (sortMode === "title") return String(a.title || "").localeCompare(String(b.title || ""));
      return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
    });

  return (
    <section className={`eden-page flex-1 overflow-y-auto rounded-3xl border ${currentTheme.border} ${currentTheme.card} p-6`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-[0.15em]">SAVED CHATS</h2>
          <p className="mt-2 text-sm opacity-70">Open, rename, delete, search, sort, or export saved conversations.</p>
        </div>
        <button type="button" onClick={onStartNewChat} className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black">+ New Chat</button>
      </div>
      <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved chats..." className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A-Z</option>
        </select>
      </div>
      {visibleChats.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-white/10 bg-black/20 p-8 text-center">
          <p className="text-xl font-bold">No saved chats found.</p>
          <p className="mt-2 text-sm opacity-70">Start a new chat or clear your search.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {visibleChats.map((chat) => {
            const savedMessages = chatDatabase[chat.id] || [];
            return (
              <div key={chat.id} className="eden-card rounded-3xl border border-white/10 bg-black/20 p-5">
                <button type="button" onClick={() => onOpenChat(chat)} className="w-full text-left">
                  <p className="truncate text-lg font-bold">{chat.title || "Untitled Chat"}</p>
                  <p className="mt-1 truncate text-xs uppercase tracking-[0.2em] opacity-50">{chat.id}</p>
                  <p className="mt-3 text-xs opacity-50">{savedMessages.length} messages</p>
                  <p className="mt-4 line-clamp-3 text-sm opacity-70">{lastPreview(savedMessages)}</p>
                </button>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" onClick={() => onOpenChat(chat)} className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-black">Open</button>
                  <button type="button" onClick={() => onRenameChat(chat.id)} className="rounded-xl border border-white/10 px-4 py-2 text-xs">Rename</button>
                  <button type="button" onClick={() => onDeleteChat(chat.id)} className="rounded-xl border border-red-400/20 px-4 py-2 text-xs text-red-300">Delete</button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                  <button type="button" onClick={() => exportChat({ format: "json", chat, messages: savedMessages, appVersion })} className="rounded-xl border border-white/10 px-3 py-2 text-xs">JSON</button>
                  <button type="button" onClick={() => exportChat({ format: "markdown", chat, messages: savedMessages, appVersion })} className="rounded-xl border border-white/10 px-3 py-2 text-xs">MD</button>
                  <button type="button" onClick={() => exportChat({ format: "txt", chat, messages: savedMessages, appVersion })} className="rounded-xl border border-white/10 px-3 py-2 text-xs">TXT</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CustomizePage({ currentTheme, themePreset, themePresets, onThemeChange }) {
  return (
    <section className={`eden-page flex-1 overflow-y-auto rounded-3xl border ${currentTheme.border} ${currentTheme.card} p-6`}>
      <h2 className="text-2xl font-bold tracking-[0.15em]">CUSTOMIZE</h2>
      <p className="mt-3 text-sm opacity-70">Choose a Project Eden interface preset.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {themePresets.map((theme) => (
          <button key={theme.id} type="button" onClick={() => onThemeChange(theme.id)} className={`eden-card rounded-3xl border p-5 text-left transition ${themePreset === theme.id ? "border-white bg-white text-black" : `${theme.border} ${theme.card}`}`}>
            <div className={`h-24 rounded-2xl ${theme.bg}`} />
            <p className="mt-4 text-lg font-bold">{theme.name}</p>
            {themePreset === theme.id ? <p className="mt-2 text-xs font-bold">ACTIVE</p> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function SettingsPage({ currentTheme, voiceEnabled, autoReadResponses, reasoningLevel, memoryDepth, soundEnabled, startupSoundEnabled, thinkingSoundEnabled, soundVolume, audioUnlocked, useFallbackSounds, reasoningLevels, memoryDepths, sounds, onVoiceEnabledChange, onAutoReadResponsesChange, onReasoningLevelChange, onMemoryDepthChange, onSoundEnabledChange, onStartupSoundEnabledChange, onThinkingSoundEnabledChange, onSoundVolumeChange, onFallbackSoundsChange, onUnlockAudio, onPlaySound }) {
  const activeReasoning = reasoningLevels.find((item) => item.id === reasoningLevel) || reasoningLevels[1];
  const activeMemory = memoryDepths.find((item) => item.id === memoryDepth) || memoryDepths[1];
  const toggleClass = (active) => `rounded-2xl border px-4 py-3 text-sm font-bold ${active ? "border-white bg-white text-black" : "border-white/10 bg-black/30 opacity-70"}`;

  return (
    <section className={`eden-page flex-1 overflow-y-auto rounded-3xl border ${currentTheme.border} ${currentTheme.card} p-6`}>
      <h2 className="text-2xl font-bold tracking-[0.15em]">SETTINGS</h2>
      <p className="mt-2 text-sm opacity-70">Control Eden voice, AI behavior, memory depth, interface sounds, and future app preferences.</p>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Voice Settings</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => onVoiceEnabledChange(!voiceEnabled)} className={toggleClass(voiceEnabled)}>Voice: {voiceEnabled ? "Enabled" : "Disabled"}</button>
            <button type="button" onClick={() => onAutoReadResponsesChange(!autoReadResponses)} className={toggleClass(autoReadResponses)}>Auto Read: {autoReadResponses ? "On" : "Off"}</button>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">AI Settings</h3>
          <div className="mt-4 space-y-4">
            <label className="block text-sm opacity-80">Reasoning
              <select value={reasoningLevel} onChange={(event) => onReasoningLevelChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none">
                {reasoningLevels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
              </select>
            </label>
            <p className="text-xs opacity-60">{activeReasoning.description}</p>
            <label className="block text-sm opacity-80">Memory Depth
              <select value={memoryDepth} onChange={(event) => onMemoryDepthChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none">
                {memoryDepths.map((depth) => <option key={depth.id} value={depth.id}>{depth.name}</option>)}
              </select>
            </label>
            <p className="text-xs opacity-60">{activeMemory.description}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold">Sound Settings</h3>
            <p className="mt-1 text-sm opacity-70">Unlock audio once. MP3 files are primary. Fallback tones stay off unless enabled.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onUnlockAudio} className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black">{audioUnlocked ? "Audio Unlocked" : "Enable Sounds"}</button>
            <button type="button" onClick={() => onPlaySound("success", { force: true })} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold">Test Sound</button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <button type="button" onClick={() => onSoundEnabledChange(!soundEnabled)} className={toggleClass(soundEnabled)}>Sounds: {soundEnabled ? "On" : "Off"}</button>
          <button type="button" onClick={() => onStartupSoundEnabledChange(!startupSoundEnabled)} className={toggleClass(startupSoundEnabled)}>Startup: {startupSoundEnabled ? "On" : "Off"}</button>
          <button type="button" onClick={() => onThinkingSoundEnabledChange(!thinkingSoundEnabled)} className={toggleClass(thinkingSoundEnabled)}>Thinking Loop: {thinkingSoundEnabled ? "On" : "Off"}</button>
          <button type="button" onClick={() => onFallbackSoundsChange(!useFallbackSounds)} className={toggleClass(useFallbackSounds)}>Fallback: {useFallbackSounds ? "On" : "Off"}</button>
        </div>
        <label className="mt-5 block text-sm font-bold opacity-80">Volume: {Math.round(Number(soundVolume) * 100)}%
          <input type="range" min="0" max="1" step="0.01" value={soundVolume} onChange={(event) => onSoundVolumeChange(Number(event.target.value))} className="mt-3 w-full accent-white" />
        </label>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Object.keys(sounds).map((name) => (
            <button key={name} type="button" onClick={() => onPlaySound(name, { force: true })} className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-left text-xs opacity-80">{name}</button>
          ))}
        </div>
      </div>
    </section>
  );
}

function AccountOverview({ currentTheme, isLoggedIn, username, email, userId, profilePic, recentChats, uploadedFiles, onProfilePicChange, onLogin, onLogout, onOpen2FA }) {
  function handleProfile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onProfilePicChange(reader.result);
    reader.readAsDataURL(file);
  }

  return (
    <section className={`eden-page flex-1 overflow-y-auto rounded-3xl border ${currentTheme.border} ${currentTheme.card} p-6`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-[0.15em]">ACCOUNT OVERVIEW</h2>
          <p className="mt-2 text-sm opacity-70">Manage your Eden identity, profile image, auth methods, and account stats.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onOpen2FA} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-3 text-sm font-bold">2FA Setup</button>
          {isLoggedIn ? <button type="button" onClick={onLogout} className="rounded-2xl border border-red-400/20 bg-black/30 px-5 py-3 text-sm font-bold text-red-300">Logout</button> : <button type="button" onClick={onLogin} className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black">Login / Sign Up</button>}
        </div>
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <img src={profilePic} alt="Profile" className="h-28 w-28 rounded-3xl border border-white/10 object-cover" />
            <div>
              <h3 className="text-2xl font-bold">{isLoggedIn ? username : "Guest"}</h3>
              <p className="mt-2 opacity-70">{isLoggedIn ? email : "Not logged in"}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.25em] opacity-50">User ID: {userId}</p>
              <label className="mt-5 inline-flex cursor-pointer rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold">Change Profile Picture<input type="file" accept="image/*" className="hidden" onChange={handleProfile} /></label>
            </div>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.25em] opacity-50">Saved Chats</p>
            <p className="mt-2 text-3xl font-bold">{recentChats.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.25em] opacity-50">Uploaded Files</p>
            <p className="mt-2 text-3xl font-bold">{uploadedFiles.length}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LegalPage({ currentTheme }) {
  const sections = [
    { title: "Terms of Service", text: "Use Project Eden responsibly, legally, and safely. Future production terms should be reviewed before launch." },
    { title: "Privacy Policy", text: "Frontend settings, saved chats, uploaded file names, profile pictures, and account data may be stored locally or synced after backend features are enabled." },
    { title: "AI Disclaimer", text: "Eden can make mistakes. Verify important information before relying on it for coding, school, safety, medical, legal, or financial decisions." },
    { title: "Uploads & Files", text: "Uploaded files may be processed for analysis. Future backend versions should provide deletion controls and storage details." },
    { title: "Subscriptions", text: "Plan limits, billing, cancellation, and subscription details can be connected here later." },
    { title: "Contact & Support", text: "Support links, abuse reports, admin contacts, and company details can be added in a later batch." },
  ];

  return (
    <section className={`eden-page flex-1 overflow-y-auto rounded-3xl border ${currentTheme.border} ${currentTheme.card} p-6`}>
      <h2 className="text-2xl font-bold tracking-[0.15em]">LEGAL</h2>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {sections.map((item) => <div key={item.title} className="rounded-3xl border border-white/10 bg-black/20 p-5"><h3 className="text-lg font-bold">{item.title}</h3><p className="mt-3 text-sm leading-relaxed opacity-75">{item.text}</p></div>)}
      </div>
    </section>
  );
}

function VersionHistory({ currentTheme, versions, currentVersion }) {
  return (
    <section className={`eden-page flex-1 overflow-y-auto rounded-3xl border ${currentTheme.border} ${currentTheme.card} p-6`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-[0.15em]">VERSION HISTORY</h2>
          <p className="mt-2 text-sm opacity-70">Track app changes and future Eden releases.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">Current: <span className="font-bold">{currentVersion}</span></div>
      </div>
      <div className="mt-6 space-y-3">
        {versions.map((version, index) => <div key={`${version}-${index}`} className={`eden-card rounded-3xl border p-5 ${index === 0 ? "border-white/30 bg-white text-black" : "border-white/10 bg-black/20"}`}><p className="font-bold">{version}</p>{index === 0 ? <p className="mt-2 text-xs font-bold">LATEST</p> : null}</div>)}
      </div>
    </section>
  );
}

function CallPage({ currentTheme, isLoggedIn, voiceEnabled, isListening, autoReadResponses, onVoiceInput, onVoiceEnabledChange, onAutoReadResponsesChange, onLogin }) {
  const toggleClass = (active) => `rounded-2xl border px-5 py-3 text-sm font-bold ${active ? "border-white bg-white text-black" : "border-white/10 bg-black/30 opacity-80"}`;

  return (
    <section className={`eden-page flex flex-1 items-center justify-center overflow-y-auto rounded-3xl border ${currentTheme.border} ${currentTheme.card} p-6`}>
      <div className="w-full max-w-3xl text-center">
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/10 bg-black/30 shadow-2xl"><div className={`h-12 w-12 rounded-full ${isListening ? "animate-pulse bg-white" : "bg-white/30"}`} /></div>
        <p className="mt-8 text-xs uppercase tracking-[0.35em] opacity-60">Voice Interface</p>
        <h2 className="mt-3 text-4xl font-bold tracking-[0.2em]">CALL EDEN</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed opacity-70">Use speech input and voice response settings for a more natural Eden session.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {isLoggedIn ? <button type="button" onClick={onVoiceInput} className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-black">{isListening ? "Listening..." : "Start Talking"}</button> : <button type="button" onClick={onLogin} className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-black">Login / Sign Up</button>}
          <button type="button" onClick={() => onVoiceEnabledChange(!voiceEnabled)} className={toggleClass(voiceEnabled)}>Voice: {voiceEnabled ? "On" : "Off"}</button>
          <button type="button" onClick={() => onAutoReadResponsesChange(!autoReadResponses)} className={toggleClass(autoReadResponses)}>Auto Read: {autoReadResponses ? "On" : "Off"}</button>
        </div>
      </div>
    </section>
  );
}

function UploadsPage({ currentTheme, uploadedFiles, isLoggedIn, isUploading, onUploadFile, onClearUploads, onLogin }) {
  return (
    <section className={`eden-page flex-1 overflow-y-auto rounded-3xl border ${currentTheme.border} ${currentTheme.card} p-6`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-[0.15em]">UPLOADS</h2>
          <p className="mt-2 text-sm opacity-70">Manage uploaded images, PDFs, text files, code files, and future multimodal inputs.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isLoggedIn ? <label className="cursor-pointer rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black">{isUploading ? "Uploading..." : "+ Upload File"}<input type="file" className="hidden" onChange={onUploadFile} /></label> : <button type="button" onClick={onLogin} className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black">Login To Upload</button>}
          {uploadedFiles.length > 0 ? <button type="button" onClick={onClearUploads} className="rounded-2xl border border-red-400/20 bg-black/30 px-5 py-3 text-sm font-bold text-red-300">Clear List</button> : null}
        </div>
      </div>
      <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5"><p className="text-xs uppercase tracking-[0.25em] opacity-50">Uploaded Files</p><p className="mt-2 text-3xl font-bold">{uploadedFiles.length}</p></div>
      {uploadedFiles.length === 0 ? <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-8 text-center"><h3 className="text-xl font-bold">No uploads yet.</h3><p className="mt-3 text-sm opacity-70">Upload files from chat or this page. Eden will show them here.</p></div> : <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{uploadedFiles.map((file, index) => <div key={`${file?.name || file}-${index}`} className="eden-card rounded-3xl border border-white/10 bg-black/20 p-5"><p className="truncate text-lg font-bold">{typeof file === "string" ? file : file?.name || "Unknown file"}</p><p className="mt-2 text-xs uppercase tracking-[0.2em] opacity-50">File #{index + 1}</p></div>)}</div>}
    </section>
  );
}

function CommandPalette({ open, currentTheme, recentChats, onClose, onNavigate, onStartNewChat, onOpenChat, onLogin, isLoggedIn }) {
  const [query, setQuery] = useState("");
  if (!open) return null;

  const pages = ["chat", "saved-chats", "uploads", "call", "account", "settings", "customize", "subscriptions", "legal", "versions"];
  const actions = [
    { type: "action", id: "new-chat", label: "Start New Chat", run: onStartNewChat },
    ...pages.map((page) => ({ type: "page", id: page, label: `Open ${page.replace(/-/g, " ")}`, run: () => onNavigate(page) })),
    ...(!isLoggedIn ? [{ type: "auth", id: "login", label: "Login / Sign Up", run: onLogin }] : []),
    ...(recentChats || []).map((chat) => ({ type: "chat", id: chat.id, label: chat.title || "Untitled Chat", run: () => onOpenChat(chat) })),
  ].filter((action) => action.label.toLowerCase().includes(query.toLowerCase()));

  function run(action) {
    action.run();
    setQuery("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/70 p-5 pt-20 backdrop-blur-sm">
      <div className={`eden-page w-full max-w-2xl rounded-3xl border ${currentTheme.border} ${currentTheme.card} p-5 shadow-2xl`}>
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold tracking-[0.12em]">COMMAND PALETTE</h2><button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold">Close</button></div>
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }} placeholder="Search Eden..." className="mt-5 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm outline-none" />
        <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto pr-1">{actions.slice(0, 20).map((action) => <button key={`${action.type}-${action.id}`} type="button" onClick={() => run(action)} className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left"><p className="text-sm font-bold">{action.label}</p><p className="mt-1 text-xs opacity-70">{action.type}</p></button>)}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [activePage, setActivePage] = useState("chat");
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState([{ sender: "eden", text: "I am Eden. Log in to message me and save chats." }]);
  const [recentChats, setRecentChats] = useState(() => readJson("eden_saved_chats", []));
  const [chatDatabase, setChatDatabase] = useState(() => readJson("eden_chat_database", {}));
  const [uploadedFiles, setUploadedFiles] = useState(() => readJson("eden_uploaded_files", []));
  const [themePreset, setThemePreset] = useState(localStorage.getItem("eden_theme") || "emerald");
  const [voiceEnabled, setVoiceEnabled] = useState(localStorage.getItem("eden_voice_enabled") === "true");
  const [autoReadResponses, setAutoReadResponses] = useState(localStorage.getItem("eden_auto_read") === "true");
  const [reasoningLevel, setReasoningLevel] = useState(localStorage.getItem("eden_reasoning_level") || "balanced");
  const [memoryDepth, setMemoryDepth] = useState(localStorage.getItem("eden_memory_depth") || "standard");
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem("eden_sound_enabled") !== "false");
  const [startupSoundEnabled, setStartupSoundEnabled] = useState(localStorage.getItem("eden_startup_sound_enabled") !== "false");
  const [thinkingSoundEnabled, setThinkingSoundEnabled] = useState(localStorage.getItem("eden_thinking_sound_enabled") !== "false");
  const [soundVolume, setSoundVolume] = useState(clampVolume(localStorage.getItem("eden_sound_volume") || 0.45));
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [useFallbackSounds, setUseFallbackSounds] = useState(localStorage.getItem("eden_use_fallback_sounds") === "true");
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [authToken, setAuthToken] = useState(localStorage.getItem("eden_token") || "");
  const [supabaseSession, setSupabaseSession] = useState(null);
  const [username, setUsername] = useState(localStorage.getItem("eden_user") || "Guest");
  const [email, setEmail] = useState(localStorage.getItem("eden_email") || "No email connected");
  const [userId] = useState(createUserId);
  const [profilePic, setProfilePic] = useState(localStorage.getItem("eden_pfp") || EDEN_ASSETS.placeholders.profile);
  const [accountId, setAccountId] = useState(NO_USER_ID);
  const [currentPlan, setCurrentPlan] = useState("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState("active");
  const [backendOnline, setBackendOnline] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [authPanelMode, setAuthPanelMode] = useState("login");
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState({ open: false, title: "", description: "", confirmLabel: "Confirm", danger: false, onConfirm: null });
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const thinkingAudioRef = useRef(null);
  const audioCacheRef = useRef({});
  const audioContextRef = useRef(null);

  const currentTheme = useMemo(() => THEME_PRESETS.find((theme) => theme.id === themePreset) || THEME_PRESETS[0], [themePreset]);
  const isLoggedIn = Boolean(authToken || supabaseSession?.access_token);
  const activeReasoning = REASONING_LEVELS.find((item) => item.id === reasoningLevel) || REASONING_LEVELS[1];
  const activeMemory = MEMORY_DEPTHS.find((item) => item.id === memoryDepth) || MEMORY_DEPTHS[1];
  const isCaptchaPage = window.location.pathname.includes("/anti-bot/captcha");

  function pushToast(type, title, message) {
    const toast = makeToast(type, title, message);
    setToasts((current) => [toast, ...current].slice(0, 5));
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 3500);
  }

  function dismissToast(id) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function getAudioContext() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
      return audioContextRef.current;
    } catch {
      return null;
    }
  }

  // FIX: useCallback so playSound is stable across renders — safe to put in useEffect deps
  const playFallbackTone = useCallback((name = "success", options = {}) => {
    if (options.allowFallback === false) return null;
    if (!useFallbackSounds && !options.forceFallback) return null;
    const context = getAudioContext();
    if (!context) return null;
    if (context.state === "suspended") context.resume().catch(() => {});
    const sequence = FALLBACK_TONES[name] || FALLBACK_TONES.success;
    const gain = context.createGain();
    const volume = clampVolume(options.volume ?? soundVolume) * 0.18;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12 + sequence.length * 0.045);
    gain.connect(context.destination);
    sequence.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = name === "error" || name === "warning" ? "sawtooth" : "sine";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.055);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.055);
      oscillator.stop(context.currentTime + index * 0.055 + 0.11);
    });
    return true;
  }, [soundVolume, useFallbackSounds]);

  function preloadSounds() {
    Object.entries(EDEN_SOUNDS).forEach(([name, src]) => {
      if (!src || audioCacheRef.current[name]) return;
      try {
        const audio = new Audio(src);
        audio.preload = "auto";
        audioCacheRef.current[name] = audio;
      } catch {}
    });
  }

  // FIX: useCallback so it's stable — can be safely listed in useEffect deps
  const playSound = useCallback((name, options = {}) => {
    if (!soundEnabled && !options.force) return null;
    if (!audioUnlocked && !options.force) return null;
    const src = EDEN_SOUNDS[name];
    const allowFallback = options.allowFallback !== false;
    if (!src) {
      if (allowFallback) playFallbackTone(name, options);
      return null;
    }
    try {
      const cached = audioCacheRef.current[name];
      const audio = cached ? cached.cloneNode(true) : new Audio(src);
      audio.volume = clampVolume(options.volume ?? soundVolume);
      audio.loop = Boolean(options.loop);
      audio.currentTime = 0;
      audio.play().catch(() => {
        if (allowFallback) playFallbackTone(name, options);
      });
      return audio;
    } catch {
      if (allowFallback) playFallbackTone(name, options);
      return null;
    }
  }, [soundEnabled, audioUnlocked, soundVolume, playFallbackTone]);

  function unlockAudio(options = {}) {
    preloadSounds();
    const context = getAudioContext();
    if (context && context.state === "suspended") context.resume().catch(() => {});
    setAudioUnlocked(true);
    localStorage.setItem("eden_audio_unlocked", "true");
    window.setTimeout(() => playSound(options.soundName || "success", { force: true, allowFallback: false }), 60);
    if (options.showToast !== false) pushToast("success", "Sounds enabled", "Eden audio is unlocked. MP3 files are primary.");
  }

  function stopThinkingSound() {
    if (!thinkingAudioRef.current) return;
    try {
      thinkingAudioRef.current.pause();
      thinkingAudioRef.current.currentTime = 0;
    } catch {}
    thinkingAudioRef.current = null;
  }

  function startThinkingSound() {
    if (!thinkingSoundEnabled || !soundEnabled) return;
    stopThinkingSound();
    thinkingAudioRef.current = playSound("thinking", { loop: true, volume: Math.min(soundVolume, 0.35) });
  }

  function openConfirm(options) {
    setConfirmState({ open: true, title: options.title || "Confirm action", description: options.description || "Are you sure?", confirmLabel: options.confirmLabel || "Confirm", danger: Boolean(options.danger), onConfirm: options.onConfirm || null });
  }

  function closeConfirm() {
    setConfirmState({ open: false, title: "", description: "", confirmLabel: "Confirm", danger: false, onConfirm: null });
  }

  function openAuthPanel(mode = "login") {
    setAuthPanelMode(mode);
    setAuthPanelOpen(true);
    playSound("panelOpen", { force: true });
  }

  function closeAuthPanel() {
    setAuthPanelOpen(false);
    playSound("panelClose", { force: true });
  }

  function getAuthHeaders(extra = {}) {
    const token = authToken || supabaseSession?.access_token || "";
    return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
  }

  // FIX: useCallback so stable reference can be used in useEffect deps
  const checkBackendOnline = useCallback(async () => {
    if (!API_BASE) {
      setBackendOnline(false);
      return;
    }
    try {
      let response = await fetch(`${API_BASE}/health`, { cache: "no-store" });
      if (!response.ok) response = await fetch(`${API_BASE}/`, { cache: "no-store" });
      setBackendOnline(response.ok);
    } catch {
      setBackendOnline(false);
    }
  }, []);

  // FIX: useCallback so stable reference can be used in useEffect deps
  const loadAccount = useCallback(async (token) => {
    const activeToken = token || authToken || supabaseSession?.access_token;
    if (!activeToken || !API_BASE) return;
    try {
      const response = await fetch(`${API_BASE}/account/me`, { headers: { Authorization: `Bearer ${activeToken}` } });
      if (!response.ok) return;
      const data = await response.json();
      const account = data.account || {};
      const subscription = data.subscription || {};
      setAccountId(account.account_id || account.id || NO_USER_ID);
      setUsername(account.username || "User");
      setEmail(account.email || "No email connected");
      setProfilePic(account.profile_picture_url || EDEN_ASSETS.placeholders.profile);
      setCurrentPlan(subscription.plan || "free");
      setSubscriptionStatus(subscription.status || "active");
    } catch {}
  }, [authToken, supabaseSession?.access_token]);

  // FIX: useCallback so stable reference can be used in useEffect deps
  const loadBackendChats = useCallback(async () => {
    try {
      const chats = await loadSupabaseChats();
      setRecentChats(chats.map((chat) => ({ id: chat.id, title: chat.title || "New Chat", createdAt: new Date(chat.created_at || Date.now()).getTime(), updatedAt: new Date(chat.updated_at || chat.created_at || Date.now()).getTime() })));
    } catch {}
  }, []);

  async function saveBackendMessage(chatId, message) {
    if (!chatId || !message?.text) return;
    try {
      const role = message.sender === "eden" ? "assistant" : "user";
      await saveSupabaseMessage(chatId, role, message.text);
    } catch {}
  }

  function handleAuthSuccess(result = {}) {
    const user = result.user || {};
    const nextToken = result.token || localStorage.getItem("eden_token") || "";
    const nextUsername = user.username || localStorage.getItem("eden_user") || "User";
    const nextEmail = user.email || localStorage.getItem("eden_email") || "No email connected";
    const nextPicture = user.avatar_url || localStorage.getItem("eden_pfp") || profilePic;
    if (nextToken) {
      localStorage.setItem("eden_token", nextToken);
      setAuthToken(nextToken);
      loadAccount(nextToken);
      loadBackendChats();
    }
    setUsername(nextUsername);
    setEmail(nextEmail);
    setProfilePic(nextPicture);
    setActivePage("chat");
    playSound("login", { force: true });
    pushToast("success", "Logged in", `Welcome, ${nextUsername}.`);
  }

  function changeTheme(themeId) {
    localStorage.setItem("eden_theme", themeId);
    setThemePreset(themeId);
    playSound("themeSwitch", { force: true });
    pushToast("success", "Theme changed", `Theme switched to ${themeId}.`);
  }

  async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) pushToast("error", "Login failed", error.message);
  }

  async function logout() {
    await supabase.auth.signOut().catch(() => {});
    localStorage.removeItem("eden_token");
    localStorage.removeItem("eden_user");
    localStorage.removeItem("eden_email");
    localStorage.removeItem("eden_pfp");
    localStorage.removeItem("eden_pending_2fa_token");
    setAuthToken("");
    setSupabaseSession(null);
    setUsername("Guest");
    setEmail("No email connected");
    setAccountId(NO_USER_ID);
    setCurrentPlan("free");
    setSubscriptionStatus("active");
    setProfilePic(EDEN_ASSETS.placeholders.profile);
    setSessionId("");
    setMessages([{ sender: "eden", text: "Logged out. Log in to message Eden." }]);
    setActivePage("chat");
    window.speechSynthesis?.cancel();
    stopThinkingSound();
    playSound("logout", { force: true });
    pushToast("info", "Logged out", "You have been signed out of Eden.");
  }

  function confirmLogout() {
    openConfirm({ title: "Logout?", description: "You can log back in whenever you want.", confirmLabel: "Logout", danger: true, onConfirm: logout });
  }

  function saveChatMessages(chatId, nextMessages) {
    setChatDatabase((current) => ({ ...current, [chatId]: nextMessages }));
  }

  function createLocalChat(title, starterMessages = []) {
    const newId = `chat-${Date.now()}`;
    const now = Date.now();
    const newChat = { id: newId, title: title || `New Chat ${recentChats.length + 1}`, createdAt: now, updatedAt: now };
    setRecentChats((current) => [newChat, ...current]);
    setChatDatabase((current) => ({ ...current, [newId]: starterMessages }));
    setSessionId(newId);
    return newId;
  }

  async function createBackendChat(title, starterMessages = []) {
    try {
      const chat = await createSupabaseChat(title || `New Chat ${recentChats.length + 1}`);
      const newChat = { id: chat.id, title: chat.title || title || `New Chat ${recentChats.length + 1}`, createdAt: new Date(chat.created_at || Date.now()).getTime(), updatedAt: new Date(chat.updated_at || chat.created_at || Date.now()).getTime() };
      setRecentChats((current) => [newChat, ...current.filter((item) => item.id !== newChat.id)]);
      setChatDatabase((current) => ({ ...current, [newChat.id]: starterMessages }));
      setSessionId(newChat.id);
      for (const message of starterMessages) await saveBackendMessage(newChat.id, message);
      return newChat.id;
    } catch {
      return createLocalChat(title, starterMessages);
    }
  }

  async function startNewChat() {
    if (!isLoggedIn) {
      playSound("warning", { force: true });
      pushToast("warning", "Login required", "Log in before creating saved chats.");
      await loginWithGoogle();
      return;
    }
    const starterMessages = [{ sender: "eden", text: "New chat initialized." }];
    const newId = await createBackendChat(`New Chat ${recentChats.length + 1}`, starterMessages);
    setSessionId(newId);
    setMessages(starterMessages);
    setActivePage("chat");
    playSound("success", { force: true });
  }

  async function openChat(chat) {
    try {
      const savedMessages = await loadSupabaseMessages(chat.id);
      const cleanMessages = savedMessages.length ? savedMessages : chatDatabase[chat.id] || [];
      setSessionId(chat.id);
      setMessages(cleanMessages);
      setChatDatabase((current) => ({ ...current, [chat.id]: cleanMessages }));
      setActivePage("chat");
      playSound("openChat", { force: true });
    } catch (error) {
      const localMessages = chatDatabase[chat.id] || [];
      if (localMessages.length) {
        setSessionId(chat.id);
        setMessages(localMessages);
        setActivePage("chat");
        playSound("openChat", { force: true });
        return;
      }
      pushToast("error", "Could not open chat", error.message);
    }
  }

  async function renameChat(chatId) {
    const chat = recentChats.find((item) => item.id === chatId);
    const nextTitle = window.prompt("Rename chat:", chat?.title || "New Chat");
    if (!nextTitle || !nextTitle.trim()) return;
    const cleanTitle = nextTitle.trim();
    try {
      const updated = await renameSupabaseChat(chatId, cleanTitle);
      setRecentChats((current) => current.map((item) => item.id === chatId ? { ...item, title: updated.title || cleanTitle, updatedAt: new Date(updated.updated_at || Date.now()).getTime() } : item));
      pushToast("success", "Chat renamed", "Saved to Supabase.");
    } catch (error) {
      setRecentChats((current) => current.map((item) => item.id === chatId ? { ...item, title: cleanTitle, updatedAt: Date.now() } : item));
      pushToast("warning", "Renamed locally", error.message);
    }
    playSound("renameChat", { force: true });
  }

  async function deleteChat(chatId) {
    await deleteSupabaseChat(chatId).catch(() => {});
    setRecentChats((current) => current.filter((chat) => chat.id !== chatId));
    setChatDatabase((current) => {
      const copy = { ...current };
      delete copy[chatId];
      return copy;
    });
    if (sessionId === chatId) {
      setSessionId("");
      setMessages([]);
    }
    playSound("deleteChat", { force: true });
    pushToast("success", "Chat deleted", "The chat was removed.");
  }

  function confirmDeleteChat(chatId) {
    const chat = recentChats.find((item) => item.id === chatId);
    openConfirm({ title: "Delete chat?", description: `This will delete ${chat?.title || "this chat"} from your saved chats.`, confirmLabel: "Delete", danger: true, onConfirm: () => deleteChat(chatId) });
  }

  async function sendMessage() {
    if (isSending) return;
    const userMessage = input.trim();
    if (!userMessage) return;
    if (!isLoggedIn) {
      setMessages((current) => [...current, { sender: "eden", text: "Please log in before messaging Eden." }]);
      playSound("warning", { force: true });
      pushToast("warning", "Login required", "Log in before messaging Eden.");
      await loginWithGoogle();
      return;
    }
    if (!API_BASE) {
      pushToast("error", "Backend missing", "VITE_API_BASE is not configured.");
      return;
    }
    let activeSessionId = sessionId;
    if (!activeSessionId) activeSessionId = await createBackendChat(userMessage.slice(0, 36) || `New Chat ${recentChats.length + 1}`, []);
    setInput("");
    setIsSending(true);
    playSound("send", { force: true });
    startThinkingSound();
    const baseMessages = chatDatabase[activeSessionId] || messages;
    const userEntry = { sender: "user", text: userMessage };
    const edenEntry = { sender: "eden", text: "" };
    const pendingMessages = [...baseMessages, userEntry, edenEntry];
    setMessages(pendingMessages);
    saveChatMessages(activeSessionId, pendingMessages);
    await saveBackendMessage(activeSessionId, userEntry);
    let fullResponse = "";
    try {
      const response = await fetch(`${API_BASE}/chat`, { method: "POST", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ message: userMessage, session_id: activeSessionId, reasoning_level: reasoningLevel, memory_depth: memoryDepth }) });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      const contentType = response.headers.get("content-type") || "";
      if (response.body && contentType.includes("text/event-stream")) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            const payload = part.replace("data: ", "").trim();
            if (!payload || payload === "[DONE]") continue;
            const parsed = JSON.parse(payload);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.chunk) {
              fullResponse += parsed.chunk;
              // FIX: capture updated messages outside setState, then call saveChatMessages separately
              // — no side effects inside the setState callback
              const capturedResponse = fullResponse;
              let updatedMessages = [];
              setMessages((current) => {
                const updated = [...current];
                const lastIndex = updated.length - 1;
                if (updated[lastIndex]?.sender === "eden") updated[lastIndex] = { ...updated[lastIndex], text: capturedResponse };
                updatedMessages = updated;
                return updated;
              });
              // saveChatMessages runs after setState, using the local snapshot
              saveChatMessages(activeSessionId, updatedMessages.length ? updatedMessages : [...pendingMessages.slice(0, -1), { sender: "eden", text: capturedResponse }]);
            }
          }
        }
      } else {
        const rawText = await response.text();
        try {
          const data = JSON.parse(rawText);
          fullResponse = data.response || data.message || "Eden returned no response.";
        } catch {
          fullResponse = rawText || "Eden returned no response.";
        }
        // FIX: same pattern — capture outside, then save separately
        const capturedResponse = fullResponse;
        let updatedMessages = [];
        setMessages((current) => {
          const updated = [...current];
          const lastIndex = updated.length - 1;
          if (updated[lastIndex]?.sender === "eden") updated[lastIndex] = { ...updated[lastIndex], text: capturedResponse };
          updatedMessages = updated;
          return updated;
        });
        saveChatMessages(activeSessionId, updatedMessages.length ? updatedMessages : [...pendingMessages.slice(0, -1), { sender: "eden", text: capturedResponse }]);
      }
      await saveBackendMessage(activeSessionId, { sender: "eden", text: fullResponse || "Eden processed the message but returned no response." });
      if (voiceEnabled && autoReadResponses && fullResponse) window.speechSynthesis.speak(new SpeechSynthesisUtterance(fullResponse));
      playSound("message", { force: true });
    } catch (error) {
      playSound("error", { force: true });
      pushToast("error", "Streaming error", error.message);
      setMessages((current) => {
        const updated = [...current];
        const lastIndex = updated.length - 1;
        if (updated[lastIndex]?.sender === "eden") updated[lastIndex] = { sender: "eden", text: `Streaming error: ${error.message}` };
        else updated.push({ sender: "eden", text: `Streaming error: ${error.message}` });
        saveChatMessages(activeSessionId, updated);
        return updated;
      });
    } finally {
      stopThinkingSound();
      setIsSending(false);
    }
  }

  function handleVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      playSound("warning", { force: true });
      alert("Speech Recognition is not supported in this browser, Change Your Browser, or Device to use Speech Recognition.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => { setIsListening(true); playSound("callStart", { force: true }); };
    recognition.onend = () => { setIsListening(false); playSound("callEnd", { force: true }); };
    recognition.onerror = () => { setIsListening(false); playSound("error", { force: true }); };
    recognition.onresult = (event) => setInput(event.results?.[0]?.[0]?.transcript || "");
    recognitionRef.current = recognition;
    recognition.start();
  }

  async function uploadFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isLoggedIn) {
      pushToast("warning", "Login required", "Log in before uploading files.");
      await loginWithGoogle();
      event.target.value = "";
      return;
    }
    setIsUploading(true);
    playSound("uploadStart", { force: true });
    const nextFile = { name: file.name, size: file.size, type: file.type, uploadedAt: Date.now() };
    setUploadedFiles((current) => [nextFile, ...current]);
    try {
      if (API_BASE && (authToken || supabaseSession?.access_token)) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`${API_BASE}/upload/analyze`, { method: "POST", headers: getAuthHeaders(), body: formData });
        if (response.ok) {
          const data = await response.json();
          const text = data.summary || data.response || `Uploaded ${file.name}.`;
          setMessages((current) => [...current, { sender: "eden", text }]);
        }
      } else {
        setMessages((current) => [...current, { sender: "eden", text: `Uploaded ${file.name}. Backend upload analysis is not connected yet.` }]);
      }
      playSound("uploadComplete", { force: true });
      pushToast("success", "Upload complete", file.name);
    } catch (error) {
      playSound("error", { force: true });
      pushToast("error", "Upload failed", error.message);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function clearUploads() {
    openConfirm({ title: "Clear uploads?", description: "This clears the local upload list from the interface.", confirmLabel: "Clear", danger: true, onConfirm: () => { setUploadedFiles([]); pushToast("success", "Uploads cleared", "Upload list cleared."); } });
  }

  async function handleProfilePicChange(value) {
    setProfilePic(value);
    localStorage.setItem("eden_pfp", value);
    try {
      const userIdForProfile = supabaseSession?.user?.id;
      if (userIdForProfile) await supabase.from("profiles").update({ avatar_url: value }).eq("id", userIdForProfile);
      if (authToken && API_BASE) {
        const response = await fetch(`${API_BASE}/account/me`, { method: "PATCH", headers: getAuthHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ profile_picture_url: value }) });
        if (response.ok) await loadAccount(authToken);
      }
      pushToast("success", "Profile updated", "Profile picture updated.");
    } catch {
      pushToast("warning", "Profile saved locally", "Profile picture changed locally.");
    }
  }

  useEffect(() => {
    if (!isCaptchaPage && shouldShowCaptcha()) window.location.href = makeCaptchaPath();
  }, [isCaptchaPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsBooting(false), STARTUP_LOADING_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    preloadSounds();
  }, []);

  // FIX: checkBackendOnline is now stable via useCallback — safe to add to deps
  useEffect(() => {
    checkBackendOnline();
    const timer = window.setInterval(checkBackendOnline, 30000);
    return () => window.clearInterval(timer);
  }, [checkBackendOnline]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const usernameParam = params.get("username");
    const emailParam = params.get("email");
    const pictureParam = params.get("picture");
    const requires2FA = params.get("requires_2fa") === "true";
    const pendingToken = params.get("pending_token") || "";
    if (token) {
      localStorage.setItem("eden_token", token);
      setAuthToken(token);
      loadBackendChats();
      loadAccount(token);
      playSound("login", { force: true });
      pushToast("success", "Logged in", "Authentication connected to Eden.");
    }
    if (usernameParam) {
      localStorage.setItem("eden_user", usernameParam);
      setUsername(usernameParam);
    }
    if (emailParam) {
      localStorage.setItem("eden_email", emailParam);
      setEmail(emailParam);
    }
    if (pictureParam) {
      localStorage.setItem("eden_pfp", pictureParam);
      setProfilePic(pictureParam);
    }
    if (requires2FA && pendingToken) {
      localStorage.setItem("eden_pending_2fa_token", pendingToken);
      setAuthPanelMode("2fa-login");
      setAuthPanelOpen(true);
      pushToast("warning", "2FA required", "Enter your authenticator or backup code.");
    }
    if (token || usernameParam || emailParam || pictureParam || requires2FA || pendingToken) window.history.replaceState({}, document.title, window.location.pathname);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount only — reads URL params

  // FIX: loadBackendChats and loadAccount are now stable via useCallback — safe in deps
  useEffect(() => {
    if (authToken) {
      loadBackendChats();
      loadAccount(authToken);
    }
  }, [authToken, loadBackendChats, loadAccount]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => { writeJson("eden_saved_chats", recentChats); }, [recentChats]);
  useEffect(() => { writeJson("eden_chat_database", chatDatabase); }, [chatDatabase]);
  useEffect(() => { writeJson("eden_uploaded_files", uploadedFiles); }, [uploadedFiles]);
  useEffect(() => { localStorage.setItem("eden_voice_enabled", String(voiceEnabled)); }, [voiceEnabled]);
  useEffect(() => { localStorage.setItem("eden_auto_read", String(autoReadResponses)); }, [autoReadResponses]);
  useEffect(() => { localStorage.setItem("eden_reasoning_level", reasoningLevel); }, [reasoningLevel]);
  useEffect(() => { localStorage.setItem("eden_memory_depth", memoryDepth); }, [memoryDepth]);
  useEffect(() => { localStorage.setItem("eden_sound_enabled", String(soundEnabled)); }, [soundEnabled]);
  useEffect(() => { localStorage.setItem("eden_startup_sound_enabled", String(startupSoundEnabled)); }, [startupSoundEnabled]);
  useEffect(() => { localStorage.setItem("eden_thinking_sound_enabled", String(thinkingSoundEnabled)); }, [thinkingSoundEnabled]);
  useEffect(() => { localStorage.setItem("eden_sound_volume", String(clampVolume(soundVolume))); }, [soundVolume]);
  useEffect(() => { localStorage.setItem("eden_use_fallback_sounds", String(useFallbackSounds)); }, [useFallbackSounds]);

  // FIX: playSound is now stable via useCallback — safe to add to deps
  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
        playSound("panelOpen", { force: true });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playSound]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      window.speechSynthesis?.cancel();
      stopThinkingSound();
      try {
        audioContextRef.current?.close?.();
      } catch {}
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function syncSupabaseProfile(user) {
      if (!user) return;
      try {
        const profile = await getOrCreateProfile(user);
        if (!active || !profile) return;
        const nextAccountId = await ensureProfileAccountId(user, profile);
        setAccountId(nextAccountId);
        setUsername(profile.username || user.user_metadata?.name || user.email?.split("@")[0] || "User");
        setEmail(profile.email || user.email || "No email connected");
        setProfilePic(profile.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || EDEN_ASSETS.placeholders.profile);
        setCurrentPlan(profile.plan || "free");
        setSubscriptionStatus(profile.subscription_status || "active");
      } catch (err) {
        if (import.meta.env.DEV) console.error("[Eden] syncSupabaseProfile failed:", err);
      }
    }

    async function loadSupabaseSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error || !active) return;
      const session = data?.session || null;
      setSupabaseSession(session);
      if (session?.access_token) setAuthToken((current) => current || session.access_token);
      if (session?.user) {
        await syncSupabaseProfile(session.user);
        await loadBackendChats();
      }
    }

    loadSupabaseSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      setSupabaseSession(session || null);
      if (session?.access_token) setAuthToken(session.access_token);
      if (!session?.user) {
        setAccountId(NO_USER_ID);
        setCurrentPlan("free");
        setSubscriptionStatus("active");
        return;
      }
      await syncSupabaseProfile(session.user);
      await loadBackendChats();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadBackendChats]);

  const appStyles = `
    @keyframes edenFadeIn { from { opacity: 0; transform: translateY(10px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes edenBootPulse { 0%, 100% { opacity: 0.35; transform: scale(0.96); } 50% { opacity: 1; transform: scale(1); } }
    .eden-page { animation: edenFadeIn 220ms ease-out both; }
    .eden-card { transition: transform 180ms ease, border-color 180ms ease, background 180ms ease; }
    .eden-card:hover { transform: translateY(-2px) scale(1.01); }
    .eden-boot-dot { animation: edenBootPulse 900ms ease-in-out infinite; }
  `;

  function renderPage() {
    if (activePage === "chat") return <ChatShell currentTheme={currentTheme} messages={messages} input={input} isLoggedIn={isLoggedIn} isSending={isSending} isUploading={isUploading} isListening={isListening} chatEndRef={chatEndRef} onInputChange={setInput} onSendMessage={sendMessage} onUploadFile={uploadFile} onVoiceInput={handleVoiceInput} onStartNewChat={startNewChat} />;
    if (activePage === "saved-chats") return <SavedChatsPage chats={recentChats} chatDatabase={chatDatabase} currentTheme={currentTheme} onStartNewChat={startNewChat} onOpenChat={openChat} onRenameChat={renameChat} onDeleteChat={confirmDeleteChat} appVersion={APP_VERSION} />;
    if (activePage === "customize") return <CustomizePage currentTheme={currentTheme} themePreset={themePreset} themePresets={THEME_PRESETS} onThemeChange={changeTheme} />;
    if (activePage === "settings") return <SettingsPage currentTheme={currentTheme} voiceEnabled={voiceEnabled} autoReadResponses={autoReadResponses} reasoningLevel={reasoningLevel} memoryDepth={memoryDepth} soundEnabled={soundEnabled} startupSoundEnabled={startupSoundEnabled} thinkingSoundEnabled={thinkingSoundEnabled} soundVolume={soundVolume} audioUnlocked={audioUnlocked} useFallbackSounds={useFallbackSounds} reasoningLevels={REASONING_LEVELS} memoryDepths={MEMORY_DEPTHS} sounds={EDEN_SOUNDS} onVoiceEnabledChange={setVoiceEnabled} onAutoReadResponsesChange={setAutoReadResponses} onReasoningLevelChange={setReasoningLevel} onMemoryDepthChange={setMemoryDepth} onSoundEnabledChange={setSoundEnabled} onStartupSoundEnabledChange={setStartupSoundEnabled} onThinkingSoundEnabledChange={setThinkingSoundEnabled} onSoundVolumeChange={setSoundVolume} onFallbackSoundsChange={setUseFallbackSounds} onUnlockAudio={unlockAudio} onPlaySound={playSound} />;
    if (activePage === "account") return <AccountOverview currentTheme={currentTheme} isLoggedIn={isLoggedIn} username={username} email={email} userId={isLoggedIn ? accountId || userId : NO_USER_ID} profilePic={profilePic} recentChats={recentChats} uploadedFiles={uploadedFiles} onProfilePicChange={handleProfilePicChange} onLogin={loginWithGoogle} onLogout={confirmLogout} onOpen2FA={() => openAuthPanel("2fa-manage")} />;
    if (activePage === "legal") return <LegalPage currentTheme={currentTheme} />;
    if (activePage === "versions") return <VersionHistory currentTheme={currentTheme} versions={VERSION_HISTORY} currentVersion={APP_VERSION} />;
    if (activePage === "call") return <CallPage currentTheme={currentTheme} isLoggedIn={isLoggedIn} voiceEnabled={voiceEnabled} isListening={isListening} autoReadResponses={autoReadResponses} onVoiceInput={handleVoiceInput} onVoiceEnabledChange={setVoiceEnabled} onAutoReadResponsesChange={setAutoReadResponses} onLogin={loginWithGoogle} />;
    if (activePage === "uploads") return <UploadsPage currentTheme={currentTheme} uploadedFiles={uploadedFiles} isLoggedIn={isLoggedIn} isUploading={isUploading} onUploadFile={uploadFile} onClearUploads={clearUploads} onLogin={loginWithGoogle} />;
    if (activePage === "subscriptions") return <SubscriptionsPage currentTheme={currentTheme} isLoggedIn={isLoggedIn} username={username} accountId={isLoggedIn ? accountId || userId : NO_USER_ID} currentPlan={currentPlan} subscriptionStatus={subscriptionStatus} backendOnline={backendOnline} authToken={authToken || supabaseSession?.access_token || ""} getAuthHeaders={getAuthHeaders} onPlanChanged={(plan, status) => { setCurrentPlan(plan || "free"); setSubscriptionStatus(status || "active"); }} onLogin={loginWithGoogle} />;
    return null;
  }

  if (isCaptchaPage) return <CaptchaPage />;

  if (isBooting) {
    return (
      <main className={`h-screen overflow-hidden ${currentTheme.bg} ${currentTheme.accent}`}>
        <style>{appStyles}</style>
        <div className="flex h-screen items-center justify-center p-6">
          <div className={`w-full max-w-xl rounded-3xl border ${currentTheme.border} ${currentTheme.card} p-8 text-center shadow-2xl eden-page`}>
            <img src={EDEN_ASSETS.logos.ucnmvc} alt="Project Eden" className="mx-auto h-20 w-20 rounded-3xl object-contain" />
            <p className="mt-6 text-xs uppercase tracking-[0.35em] opacity-60">UCNMVC</p>
            <h1 className="mt-3 text-4xl font-bold tracking-[0.2em]">PROJECT EDEN</h1>
            <p className="mt-4 text-sm opacity-70">Loading private AI interface...</p>
            <div className="mt-6 flex justify-center gap-2"><span className="eden-boot-dot h-3 w-3 rounded-full bg-white" /><span className="eden-boot-dot h-3 w-3 rounded-full bg-white [animation-delay:120ms]" /><span className="eden-boot-dot h-3 w-3 rounded-full bg-white [animation-delay:240ms]" /></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`h-screen overflow-hidden transition-all duration-500 ${currentTheme.bg} ${currentTheme.accent}`}>
      <style>{appStyles}</style>
      {!audioUnlocked ? <button type="button" onClick={unlockAudio} className="fixed bottom-5 right-5 z-[1001] rounded-2xl border border-white/10 bg-white px-5 py-3 text-sm font-bold text-black shadow-2xl transition hover:scale-[1.02]">Enable Sounds</button> : null}
      <MobileNav currentTheme={currentTheme} profilePic={profilePic} isLoggedIn={isLoggedIn} recentChats={recentChats} activePage={activePage} username={username} onNavigate={setActivePage} onStartNewChat={startNewChat} onLogin={loginWithGoogle} onLogout={confirmLogout} />
      <div className="flex h-screen overflow-hidden pt-[72px] md:pt-0">
        <Sidebar currentTheme={currentTheme} profilePic={profilePic} isLoggedIn={isLoggedIn} recentChats={recentChats} activePage={activePage} backendOnline={backendOnline} onNavigate={setActivePage} onStartNewChat={startNewChat} onLogin={loginWithGoogle} onLogout={confirmLogout} />
        <section className="flex flex-1 flex-col overflow-hidden p-5">
          <AppHeader currentTheme={currentTheme} activePage={activePage} isLoggedIn={isLoggedIn} username={username} activeReasoning={activeReasoning} activeMemory={activeMemory} onOpenSettings={() => setActivePage("settings")} onOpenAccount={() => setActivePage("account")} onOpenCommand={() => setCommandOpen(true)} />
          {renderPage()}
        </section>
      </div>
      {authPanelOpen ? <div className="fixed inset-0 z-[1002] overflow-y-auto bg-black/75 p-5 backdrop-blur-sm"><div className="mx-auto mt-8 w-full max-w-5xl"><AuthPanel currentTheme={currentTheme} mode={authPanelMode} onModeChange={setAuthPanelMode} onAuthSuccess={handleAuthSuccess} onClose={closeAuthPanel} onToast={pushToast} /></div></div> : null}
      <CommandPalette open={commandOpen} currentTheme={currentTheme} recentChats={recentChats} isLoggedIn={isLoggedIn} onClose={() => { setCommandOpen(false); playSound("panelClose", { force: true }); }} onNavigate={setActivePage} onStartNewChat={startNewChat} onOpenChat={openChat} onLogin={loginWithGoogle} />
      <ConfirmModal open={confirmState.open} currentTheme={currentTheme} title={confirmState.title} description={confirmState.description} confirmLabel={confirmState.confirmLabel} danger={confirmState.danger} onCancel={closeConfirm} onConfirm={async () => { const action = confirmState.onConfirm; closeConfirm(); if (typeof action === "function") await action(); }} />
      <ToastStack toasts={toasts} currentTheme={currentTheme} onDismiss={dismissToast} />
    </main>
  );
}
