import { supabase } from "./supabase";

export async function getSupabaseUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  return data?.user || null;
}

export async function loadChats() {
  const user = await getSupabaseUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createChat(title = "New Chat") {
  const user = await getSupabaseUser();
  if (!user) throw new Error("Not logged in.");

  const { data, error } = await supabase
    .from("chats")
    .insert({
      user_id: user.id,
      title,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function renameChat(chatId, title) {
  const { data, error } = await supabase
    .from("chats")
    .update({
      title,
      updated_at: new Date().toISOString(),
    })
    .eq("id", chatId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteChat(chatId) {
  const { error } = await supabase
    .from("chats")
    .delete()
    .eq("id", chatId);

  if (error) throw error;
}

export async function loadMessages(chatId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((msg) => ({
    sender: msg.role === "assistant" ? "eden" : "user",
    text: msg.content,
  }));
}

export async function saveMessage(chatId, role, content) {
  const user = await getSupabaseUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      chat_id: chatId,
      user_id: user.id,
      role,
      content,
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabase
    .from("chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chatId);

  return data;
}
