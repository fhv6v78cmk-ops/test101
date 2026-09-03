"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function signIn() {
    setError("");
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage("Check your email for the sign-in link.");
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
        className="mt-4 w-full border border-[#17201b] bg-[#17201b] px-4 py-3 text-sm font-semibold text-white"
      >
        Send sign-in link
      </button>
      {message && <p className="mt-4 text-sm font-semibold text-[#0f766e]">{message}</p>}
      {error && <p className="mt-4 text-sm font-semibold text-[#8a3a1f]">{error}</p>}
    </div>
  );
}
