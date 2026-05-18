const SAVED_CHATS_KEY = "eden_saved_chats";
const CHAT_DATABASE_KEY = "eden_chat_database";
const ACTIVE_CHAT_KEY = "eden_active_chat_id";

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function readSavedChats() {
  const chats = safeParse(localStorage.getItem(SAVED_CHATS_KEY), []);
  return Array.isArray(chats) ? chats : [];
}

export function writeSavedChats(chats = []) {
  const clean = Array.isArray(chats) ? chats : [];
  localStorage.setItem(SAVED_CHATS_KEY, JSON.stringify(clean));
  return clean;
}

export function readChatDatabase() {
  const database = safeParse(localStorage.getItem(CHAT_DATABASE_KEY), {});
  return database && typeof database === "object" && !Array.isArray(database) ? database : {};
}

export function writeChatDatabase(database = {}) {
  const clean = database && typeof database === "object" && !Array.isArray(database) ? database : {};
  localStorage.setItem(CHAT_DATABASE_KEY, JSON.stringify(clean));
  return clean;
}

export function getActiveChatId() {
  return localStorage.getItem(ACTIVE_CHAT_KEY) || "";
}

export function setActiveChatId(chatId = "") {
  if (!chatId) {
    localStorage.removeItem(ACTIVE_CHAT_KEY);
    return "";
  }

  localStorage.setItem(ACTIVE_CHAT_KEY, chatId);
  return chatId;
}

export function createChatId() {
  if (crypto?.randomUUID) {
    return `chat-${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  }

  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeMessage(message = {}) {
  const sender = message.sender || message.role || "user";
  const text = message.text || message.content || "";

  return {
    sender: sender === "assistant" ? "eden" : sender,
    text: String(text || ""),
    created_at: message.created_at || Date.now(),
  };
}

export function normalizeChat(chat = {}) {
  const now = Date.now();

  return {
    id: chat.id || createChatId(),
    title: String(chat.title || "New Chat").slice(0, 80),
    createdAt: chat.createdAt || chat.created_at || now,
    updatedAt: chat.updatedAt || chat.updated_at || now,
  };
}

export function getVisibleChats(chats = [], query = "", sortMode = "newest", chatDatabase = {}) {
  const cleanQuery = String(query || "").trim().toLowerCase();

  return [...(Array.isArray(chats) ? chats : [])]
    .map(normalizeChat)
    .filter((chat) => {
      if (!cleanQuery) return true;

      const messages = chatDatabase[chat.id] || [];
      const messageText = Array.isArray(messages)
        ? messages.map((message) => message.text || message.content || "").join(" ").toLowerCase()
        : "";

      return chat.title.toLowerCase().includes(cleanQuery) || messageText.includes(cleanQuery);
    })
    .sort((a, b) => {
      if (sortMode === "oldest") return (a.updatedAt || 0) - (b.updatedAt || 0);
      if (sortMode === "title") return String(a.title || "").localeCompare(String(b.title || ""));
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
}

export function getLastMessagePreview(messages = [], fallback = "No messages saved yet.") {
  if (!Array.isArray(messages) || messages.length === 0) return fallback;

  const last = messages[messages.length - 1];
  const text = last?.text || last?.content || "";
  return String(text || fallback).slice(0, 180);
}

export function saveLocalChat(chat, messages = []) {
  const normalizedChat = normalizeChat(chat);
  const normalizedMessages = Array.isArray(messages) ? messages.map(normalizeMessage) : [];

  const chats = readSavedChats();
  const database = readChatDatabase();

  const nextChats = [
    { ...normalizedChat, updatedAt: Date.now() },
    ...chats.filter((item) => item.id !== normalizedChat.id),
  ];

  const nextDatabase = {
    ...database,
    [normalizedChat.id]: normalizedMessages,
  };

  writeSavedChats(nextChats);
  writeChatDatabase(nextDatabase);
  setActiveChatId(normalizedChat.id);

  return {
    chat: normalizedChat,
    chats: nextChats,
    database: nextDatabase,
  };
}

export function appendLocalMessage(chatId, message) {
  if (!chatId) return null;

  const database = readChatDatabase();
  const messages = Array.isArray(database[chatId]) ? database[chatId] : [];
  const nextMessages = [...messages, normalizeMessage(message)];

  const nextDatabase = {
    ...database,
    [chatId]: nextMessages,
  };

  const chats = readSavedChats().map((chat) =>
    chat.id === chatId ? { ...chat, updatedAt: Date.now() } : chat
  );

  writeChatDatabase(nextDatabase);
  writeSavedChats(chats);

  return {
    messages: nextMessages,
    database: nextDatabase,
    chats,
  };
}

export function renameLocalChat(chatId, title) {
  const cleanTitle = String(title || "New Chat").trim().slice(0, 80) || "New Chat";
  const chats = readSavedChats().map((chat) =>
    chat.id === chatId ? { ...chat, title: cleanTitle, updatedAt: Date.now() } : chat
  );

  writeSavedChats(chats);
  return chats;
}

export function deleteLocalChat(chatId) {
  const chats = readSavedChats().filter((chat) => chat.id !== chatId);
  const database = readChatDatabase();
  delete database[chatId];

  writeSavedChats(chats);
  writeChatDatabase(database);

  if (getActiveChatId() === chatId) {
    setActiveChatId("");
  }

  return {
    chats,
    database,
  };
}

export function clearLocalChats() {
  localStorage.removeItem(SAVED_CHATS_KEY);
  localStorage.removeItem(CHAT_DATABASE_KEY);
  localStorage.removeItem(ACTIVE_CHAT_KEY);

  return {
    chats: [],
    database: {},
  };
}

export default {
  readSavedChats,
  writeSavedChats,
  readChatDatabase,
  writeChatDatabase,
  getActiveChatId,
  setActiveChatId,
  createChatId,
  normalizeMessage,
  normalizeChat,
  getVisibleChats,
  getLastMessagePreview,
  saveLocalChat,
  appendLocalMessage,
  renameLocalChat,
  deleteLocalChat,
  clearLocalChats,
};
