import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Dashboard() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: "#0F1117" }}>
            Welcome, {session.user.name || session.user.email}
          </h1>
          <p style={{ color: "#64748B" }}>
            Your content amplification dashboard
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="px-6 py-3 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ background: "#8B5CF6" }}
        >
          Settings
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/dashboard/articles"
          className="block p-8 rounded-lg border hover:shadow-md transition-shadow"
          style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Browse Articles</h2>
              <p className="text-lg" style={{ color: "#64748B" }}>
                Select a Substack article to amplify across platforms
              </p>
            </div>
            <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "#8B5CF6" }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/campaigns"
          className="block p-8 rounded-lg border hover:shadow-md transition-shadow"
          style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Campaigns</h2>
              <p className="text-lg" style={{ color: "#64748B" }}>
                Manage and track your content campaigns
              </p>
            </div>
            <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "#10B981" }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg border" style={{ borderColor: "#E2E8F0" }}>
          <h2 className="text-xl font-semibold mb-3">Recent Posts</h2>
          <p style={{ color: "#64748B" }}>No posts yet</p>
        </div>

        <div className="p-6 rounded-lg border" style={{ borderColor: "#E2E8F0" }}>
          <h2 className="text-xl font-semibold mb-3">Analytics</h2>
          <p style={{ color: "#64748B" }}>Analytics coming soon</p>
        </div>
      </div>
    </div>
  );
}
