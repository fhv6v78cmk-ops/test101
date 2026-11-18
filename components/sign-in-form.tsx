"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignInForm({ configured, callbackError }: {
  configured: boolean;
  callbackError?: string;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(
    callbackError === "link"
      ? "This sign-in link could not be used. Request a new link in this browser."
      : callbackError === "unavailable" ? "Sign-in is temporarily unavailable." : "",
  );
  const [pending, setPending] = useState(false);

  async function signIn() {
    setError("");
    setMessage("");
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      setMessage("Check your email for the sign-in link. Open it in this browser.");
    } catch {
      setError("Sign-in is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md border border-[#d7d0c2] bg-white p-5">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm leading-6 text-[#566158]">
        Use your authorised business email to access BAS processing jobs.
      </p>
      <label className="mt-5 block text-sm font-semibold" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="mt-2 w-full border border-[#bfb7aa] px-3 py-3"
      />
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={!configured || pending || !email.trim()}
        className="mt-4 w-full border border-[#17201b] bg-[#17201b] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Sending..." : "Send sign-in link"}
      </button>
      {message && <p className="mt-4 text-sm font-semibold text-[#0f766e]">{message}</p>}
      {(!configured || error) && (
        <p role="alert" className="mt-4 text-sm font-semibold text-[#8a3a1f]">
          {configured ? error : "Sign-in is unavailable until Supabase is configured."}
        </p>
      )}
    </div>
  );
}
