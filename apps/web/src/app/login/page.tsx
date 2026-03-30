export default function Login() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md p-8 rounded-lg border" style={{ borderColor: "#E2E8F0" }}>
        <h1 className="text-3xl font-bold mb-2 text-center" style={{ color: "#0F1117" }}>
          Sign In
        </h1>

        <p className="text-center mb-8" style={{ color: "#64748B" }}>
          Authentication coming soon
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#1E293B" }}>
              Email
            </label>
            <input
              type="email"
              disabled
              placeholder="your@email.com"
              className="w-full px-4 py-2 rounded border"
              style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#1E293B" }}>
              Password
            </label>
            <input
              type="password"
              disabled
              placeholder="••••••••"
              className="w-full px-4 py-2 rounded border"
              style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}
            />
          </div>

          <button
            disabled
            className="w-full rounded-lg px-6 py-3 text-base font-semibold text-white transition-colors opacity-50 cursor-not-allowed"
            style={{ background: "#8B5CF6" }}
          >
            Sign In (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  );
}
