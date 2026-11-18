import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) redirect("/login?error=link");

  let destination: string;
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    destination = error ? "/login?error=link" : "/";
  } catch {
    destination = "/login?error=unavailable";
  }

  redirect(destination);
}
