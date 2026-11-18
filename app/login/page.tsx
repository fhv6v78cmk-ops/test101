import { SignInForm } from "@/components/sign-in-form";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return (
    <main className="min-h-screen bg-[#f6f4ef] px-5 py-12 text-[#17201b]">
      <SignInForm configured={configured} callbackError={error} />
    </main>
  );
}
