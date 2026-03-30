export default function Dashboard() {
  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold mb-4" style={{ color: "#0F1117" }}>
        Dashboard
      </h1>

      <div className="p-8 rounded-lg border" style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}>
        <p className="text-lg" style={{ color: "#64748B" }}>
          Dashboard coming soon. This is where you'll manage your content amplification.
        </p>
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
