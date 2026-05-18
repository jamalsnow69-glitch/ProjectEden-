import { useMemo, useState } from "react";

function EmptyState({
  title = "Nothing here yet.",
  description = "Start a new chat or open a saved conversation.",
  actionLabel = "Start New Chat",
  onAction,
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

        {onAction && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={onAction}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:scale-[1.02]"
            >
              {actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
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

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages.map((message, index) => ({
    index,
    sender: message?.sender || message?.role || "unknown",
    text: String(message?.text || message?.content || ""),
    createdAt: message?.createdAt || message?.created_at || null,
  }));
}

function buildChatExportPayload({ chat, messages, appVersion = "EdenV1.6.6" }) {
  return {
    app: "Project Eden",
    version: appVersion,
    exportedAt: new Date().toISOString(),
    chat: {
      id: chat?.id || "unsaved-chat",
      title: chat?.title || "Unsaved Chat",
      createdAt: chat?.createdAt || chat?.created_at || null,
      updatedAt: chat?.updatedAt || chat?.updated_at || null,
    },
    messages: normalizeMessages(messages),
  };
}

function chatToMarkdown(payload) {
  const lines = [];

  lines.push(`# ${payload.chat.title}`);
  lines.push("");
  lines.push(`Project: ${payload.app}`);
  lines.push(`Version: ${payload.version}`);
  lines.push(`Chat ID: ${payload.chat.id}`);
  lines.push(`Exported: ${payload.exportedAt}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  if (!payload.messages.length) {
    lines.push("_No messages in this chat._");
    return lines.join("\n");
  }

  for (const message of payload.messages) {
    const sender = message.sender === "eden" || message.sender === "assistant" ? "Eden" : "User";
    lines.push(`## ${sender}`);
    lines.push("");
    lines.push(message.text || "_");
    lines.push("");
  }

  return lines.join("\n");
}

function chatToText(payload) {
  const lines = [];

  lines.push(payload.chat.title);
  lines.push("Project Eden Chat Export");
  lines.push(`Version: ${payload.version}`);
  lines.push(`Chat ID: ${payload.chat.id}`);
  lines.push(`Exported: ${payload.exportedAt}`);
  lines.push("=".repeat(48));
  lines.push("");

  if (!payload.messages.length) {
    lines.push("No messages in this chat.");
    return lines.join("\n");
  }

  for (const message of payload.messages) {
    const sender = message.sender === "eden" || message.sender === "assistant" ? "Eden" : "User";
    lines.push(`${sender}:`);
    lines.push(message.text || "_");
    lines.push("");
  }

  return lines.join("\n");
}

function exportChat({ format, chat, messages, appVersion }) {
  const payload = buildChatExportPayload({ chat, messages, appVersion });
  const baseName = safeFileName(payload.chat.title);

  if (format === "json") {
    downloadTextFile(`${baseName}.json`, JSON.stringify(payload, null, 2), "application/json");
    return;
  }

  if (format === "markdown" || format === "md") {
    downloadTextFile(`${baseName}.md`, chatToMarkdown(payload), "text/markdown");
    return;
  }

  downloadTextFile(`${baseName}.txt`, chatToText(payload), "text/plain");
}

function getLastMessagePreview(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "No messages saved yet.";
  }

  const lastMessage = messages[messages.length - 1];
  const text = String(lastMessage?.text || lastMessage?.content || "").trim();

  return text || "No message preview available.";
}

function searchChats(chats, database, query) {
  const list = Array.isArray(chats) ? chats : [];
  const cleanQuery = String(query || "").trim().toLowerCase();

  if (!cleanQuery) return list;

  return list.filter((chat) => {
    const title = String(chat.title || "").toLowerCase();
    const messages = database?.[chat.id] || [];
    const messageText = messages
      .map((message) => String(message.text || message.content || ""))
      .join(" ")
      .toLowerCase();

    return title.includes(cleanQuery) || messageText.includes(cleanQuery);
  });
}

function sortChats(chats, sortMode = "newest") {
  const list = [...(Array.isArray(chats) ? chats : [])];

  if (sortMode === "oldest") {
    return list.sort((a, b) => (a.updatedAt || a.createdAt || a.created_at || 0) - (b.updatedAt || b.createdAt || b.created_at || 0));
  }

  if (sortMode === "title") {
    return list.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  }

  return list.sort((a, b) => (b.updatedAt || b.createdAt || b.created_at || 0) - (a.updatedAt || a.createdAt || a.created_at || 0));
}

function getVisibleChats(chats, database, query, sortMode) {
  return sortChats(searchChats(chats, database, query), sortMode);
}

export default function SavedChatsPage({
  chats = [],
  chatDatabase = {},
  currentTheme,
  onStartNewChat,
  onOpenChat,
  onRenameChat,
  onDeleteChat,
  appVersion = "EdenV1.6.6",
}) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState("newest");

  const visibleChats = useMemo(() => {
    return getVisibleChats(chats, chatDatabase, query, sortMode);
  }, [chats, chatDatabase, query, sortMode]);

  const pageBorder = currentTheme?.border || "border-white/10";
  const pageCard = currentTheme?.card || "bg-zinc-950";

  function getChatMessages(chatId) {
    return chatDatabase?.[chatId] || [];
  }

  function handleExport(chat, format) {
    exportChat({
      format,
      chat,
      messages: getChatMessages(chat.id),
      appVersion,
    });
  }

  return (
    <section className={`eden-page flex-1 overflow-y-auto rounded-3xl border ${pageBorder} ${pageCard} p-6`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-[0.15em]">
            SAVED CHATS
          </h2>

          <p className="mt-2 text-sm opacity-70">
            Open, rename, delete, search, sort, or export saved conversations.
          </p>
        </div>

        <button
          onClick={onStartNewChat}
          className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:scale-[1.02]"
        >
          + New Chat
        </button>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search saved chats..."
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
        />

        <select
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value)}
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A-Z</option>
        </select>
      </div>

      {chats.length === 0 && (
        <EmptyState
          title="No saved chats yet."
          description="Start a new chat and Eden will save it here."
          actionLabel="Start New Chat"
          onAction={onStartNewChat}
          className="mt-8"
        />
      )}

      {chats.length > 0 && visibleChats.length === 0 && (
        <EmptyState
          title="No chats matched your search."
          description="Try a different search term or switch the sort mode."
          actionLabel="Clear Search"
          onAction={() => setQuery("")}
          className="mt-8"
        />
      )}

      {visibleChats.length > 0 && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {visibleChats.map((chat) => {
            const savedMessages = getChatMessages(chat.id);
            const lastMessage = getLastMessagePreview(savedMessages);
            const messageCount = savedMessages.length;

            return (
              <div
                key={chat.id}
                className="eden-card rounded-3xl border border-white/10 bg-black/20 p-5"
              >
                <button
                  onClick={() => onOpenChat?.(chat)}
                  className="w-full text-left"
                >
                  <p className="truncate text-lg font-bold">
                    {chat.title || "Untitled Chat"}
                  </p>

                  <p className="mt-1 truncate text-xs uppercase tracking-[0.2em] opacity-50">
                    {chat.id}
                  </p>

                  <p className="mt-3 text-xs opacity-50">
                    {messageCount} {messageCount === 1 ? "message" : "messages"}
                  </p>

                  <p className="mt-4 line-clamp-3 text-sm opacity-70">
                    {lastMessage}
                  </p>
                </button>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={() => onOpenChat?.(chat)}
                    className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-black"
                  >
                    Open
                  </button>

                  <button
                    onClick={() => onRenameChat?.(chat.id)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs"
                  >
                    Rename
                  </button>

                  <button
                    onClick={() => onDeleteChat?.(chat.id)}
                    className="rounded-xl border border-red-400/20 px-4 py-2 text-xs text-red-300"
                  >
                    Delete
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                  <button
                    onClick={() => handleExport(chat, "json")}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs opacity-80 transition hover:opacity-100"
                  >
                    JSON
                  </button>

                  <button
                    onClick={() => handleExport(chat, "markdown")}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs opacity-80 transition hover:opacity-100"
                  >
                    MD
                  </button>

                  <button
                    onClick={() => handleExport(chat, "txt")}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs opacity-80 transition hover:opacity-100"
                  >
                    TXT
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}