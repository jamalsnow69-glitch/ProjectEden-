function safeFileName(value = "Project-Eden-Chat") {
  return String(value)
    .replace(/[^a-z0-9-_ ]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function normalizeMessage(message = {}) {
  return {
    sender: message.sender || message.role || "user",
    text: message.text || message.content || "",
    created_at: message.created_at || Date.now(),
  };
}

function formatTimestamp(timestamp) {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return "Unknown Time";
  }
}

function createDownload(blob, filename) {
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export function exportChatAsJSON(chat = {}, messages = []) {
  const payload = {
    chat: {
      id: chat.id || "unknown-chat",
      title: chat.title || "Project Eden Chat",
      createdAt: chat.createdAt || Date.now(),
      updatedAt: chat.updatedAt || Date.now(),
    },
    messages: Array.isArray(messages)
      ? messages.map(normalizeMessage)
      : [],
    exported_at: new Date().toISOString(),
    exported_by: "Project Eden",
  };

  const blob = new Blob([
    JSON.stringify(payload, null, 2),
  ], {
    type: "application/json",
  });

  createDownload(
    blob,
    `${safeFileName(chat.title || "Project-Eden-Chat")}.json`
  );

  return payload;
}

export function exportChatAsTXT(chat = {}, messages = []) {
  const normalizedMessages = Array.isArray(messages)
    ? messages.map(normalizeMessage)
    : [];

  const lines = [
    "PROJECT EDEN CHAT EXPORT",
    "==========================",
    `Title: ${chat.title || "Project Eden Chat"}`,
    `Chat ID: ${chat.id || "unknown-chat"}`,
    `Exported: ${new Date().toLocaleString()}`,
    "",
  ];

  normalizedMessages.forEach((message, index) => {
    lines.push(`[${index + 1}] ${String(message.sender || "user").toUpperCase()}`);
    lines.push(`Time: ${formatTimestamp(message.created_at)}`);
    lines.push("");
    lines.push(String(message.text || ""));
    lines.push("");
    lines.push("----------------------------------------");
    lines.push("");
  });

  const content = lines.join("\n");

  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  });

  createDownload(
    blob,
    `${safeFileName(chat.title || "Project-Eden-Chat")}.txt`
  );

  return content;
}

export function exportChatAsMarkdown(chat = {}, messages = []) {
  const normalizedMessages = Array.isArray(messages)
    ? messages.map(normalizeMessage)
    : [];

  const markdown = [
    `# ${chat.title || "Project Eden Chat"}`,
    "",
    `- Chat ID: ${chat.id || "unknown-chat"}`,
    `- Exported: ${new Date().toLocaleString()}`,
    "",
    "---",
    "",
  ];

  normalizedMessages.forEach((message) => {
    markdown.push(`## ${String(message.sender || "user").toUpperCase()}`);
    markdown.push("");
    markdown.push(`> ${formatTimestamp(message.created_at)}`);
    markdown.push("");
    markdown.push(String(message.text || ""));
    markdown.push("");
  });

  const content = markdown.join("\n");

  const blob = new Blob([content], {
    type: "text/markdown;charset=utf-8",
  });

  createDownload(
    blob,
    `${safeFileName(chat.title || "Project-Eden-Chat")}.md`
  );

  return content;
}

export function exportChat(chat = {}, messages = [], format = "json") {
  const normalizedFormat = String(format || "json").toLowerCase();

  if (normalizedFormat === "txt") {
    return exportChatAsTXT(chat, messages);
  }

  if (normalizedFormat === "md" || normalizedFormat === "markdown") {
    return exportChatAsMarkdown(chat, messages);
  }

  return exportChatAsJSON(chat, messages);
}

export default {
  exportChat,
  exportChatAsJSON,
  exportChatAsTXT,
  exportChatAsMarkdown,
};
