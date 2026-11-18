import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const loginUrl = new URL("/login", request.url);
  if (!url || !anonKey) return NextResponse.redirect(loginUrl);

  let response = NextResponse.next({ request });
  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return response;
  } catch {
    loginUrl.searchParams.set("error", "unavailable");
  }

  const redirect = NextResponse.redirect(loginUrl);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: ["/", "/jobs/:path*"],
};
