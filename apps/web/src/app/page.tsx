import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="max-w-3xl space-y-6">
        <h1
          className="text-6xl font-bold mb-4"
          style={{ color: "#0F1117" }}
        >
          Amplify Your Content
        </h1>

        <p
          className="text-xl mb-8"
          style={{ color: "#64748B" }}
        >
          Transform your Substack articles into engaging LinkedIn posts.
          Reach a wider audience with intelligent content adaptation.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="rounded-lg px-6 py-3 text-base font-semibold text-white transition-colors hover:opacity-90"
            style={{ background: "#2563EB" }}
          >
            Get Started
          </Link>

          <Link
            href="/login"
            className="rounded-lg border px-6 py-3 text-base font-medium transition-colors hover:bg-gray-50"
            style={{ borderColor: "#E2E8F0", color: "#0F172A" }}
          >
            Sign In
          </Link>
        </div>
      </div>

      <div
        className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl"
      >
        <div className="p-6 rounded-lg border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
          <div className="text-3xl mb-3">📝</div>
          <h3 className="text-lg font-semibold mb-2">Import Content</h3>
          <p style={{ color: "#475569" }}>
            Connect your Substack and automatically pull in your latest articles.
          </p>
        </div>

        <div className="p-6 rounded-lg border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
          <div className="text-3xl mb-3">✨</div>
          <h3 className="text-lg font-semibold mb-2">Smart Adaptation</h3>
          <p style={{ color: "#475569" }}>
            AI-powered content transformation optimized for LinkedIn engagement.
          </p>
        </div>

        <div className="p-6 rounded-lg border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
          <div className="text-3xl mb-3">🚀</div>
          <h3 className="text-lg font-semibold mb-2">Amplify Reach</h3>
          <p style={{ color: "#475569" }}>
            Schedule and publish to LinkedIn with analytics and tracking.
          </p>
        </div>
      </div>
    </div>
  );
}
