import { supabase } from "./supabase";

function makeAccountId() {
  return `EDN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

export async function getOrCreateProfile(user) {
  if (!user) return null;

  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existingProfile) {
    return existingProfile;
  }

  const newProfile = {
    id: user.id,
    account_id: makeAccountId(),
    username:
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "User",
    email: user.email,
    avatar_url:
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      "/logos/UCNMVC-LOGO.png",
    plan: "free",
    subscription_status: "active",
  };

  const { data, error } = await supabase
    .from("profiles")
    .insert(newProfile)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}
