"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }

    router.push("/login");
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-xl font-semibold">Create account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="mt-1 w-full border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={10}
            autoComplete="new-password"
            className="mt-1 w-full border border-gray-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">At least 10 characters, with a letter and a number.</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-black py-2 text-white disabled:bg-gray-300">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </div>
  );
}
