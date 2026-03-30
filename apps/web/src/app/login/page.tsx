import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function Login() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <section className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 text-center">
      <div className="space-y-4">
        <div className="flex items-center justify-center mb-2">
          <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "#8B5CF6" }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl font-bold" style={{ color: "#0F1117" }}>
          Welcome to Amplifier
        </h1>

        <p className="max-w-lg" style={{ color: "#64748B" }}>
          Transform your Substack content into engaging LinkedIn posts with AI.
          Sign in with your Trilogy account to continue.
        </p>
      </div>

      <form action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/dashboard" });
      }}>
        <button
          type="submit"
          className="rounded-lg px-8 py-3 text-base font-semibold text-white transition-colors hover:opacity-90 cursor-pointer"
          style={{ background: "#8B5CF6" }}
        >
          Sign in with Google
        </button>
      </form>

      <p className="text-xs max-w-md" style={{ color: "#94A3B8" }}>
        Access is restricted to @trilogy.com email addresses.
        If you need access with a different email, contact your administrator.
      </p>
    </section>
  );
}
