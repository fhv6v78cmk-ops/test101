import { createSupabaseServerClient } from "./server";

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication required.");
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("organisation_users")
    .select("organisation_id, role")
    .eq("user_id", user.id)
    .limit(1);

  if (membershipError) throw membershipError;
  const membership = memberships?.[0];
  if (!membership) throw new Error("No organisation membership found for this user.");

  return {
    user,
    organisationId: membership.organisation_id as string,
    role: membership.role as "admin" | "member",
  };
}
