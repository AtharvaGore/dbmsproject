"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth, type User } from "@/context/AuthContext";
import { ArrowRight, Lock, User as UserIcon, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Please fill in both fields.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch<{ token: string; user: User }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      login(res.token, res.user);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (username: string) => {
    setIdentifier(username);
    setPassword("Demo@123");
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch<{ token: string; user: User }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: username, password: "Demo@123" }),
      });
      login(res.token, res.user);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Quick login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-[#E9E9E8] rounded-xl shadow-sm p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-[#2383E2] text-white rounded-xl mx-auto flex items-center justify-center font-bold text-xl shadow-sm">
          A
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#37352F]">Welcome to AcademiaOS</h1>
        <p className="text-sm text-[#787774]">Student workspace for academics, DSA, and career</p>
      </div>

      {/* Demo 1-Click Quick Logins */}
      <div className="bg-[#F7F7F5] border border-[#E9E9E8] rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5A5A58]">
          <Sparkles size={13} className="text-[#2383E2]" />
          <span>Demo 1-Click Sign In (password: Demo@123)</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => quickLogin("atharva")}
            disabled={loading}
            className="py-1.5 px-2 bg-white hover:bg-[#EFEFEF] border border-[#E3E2E0] text-xs font-medium rounded text-[#37352F] transition-colors"
          >
            Atharva
          </button>
          <button
            type="button"
            onClick={() => quickLogin("bhooshan")}
            disabled={loading}
            className="py-1.5 px-2 bg-white hover:bg-[#EFEFEF] border border-[#E3E2E0] text-xs font-medium rounded text-[#37352F] transition-colors"
          >
            Bhooshan
          </button>
          <button
            type="button"
            onClick={() => quickLogin("admin")}
            disabled={loading}
            className="py-1.5 px-2 bg-white hover:bg-[#EFEFEF] border border-[#E3E2E0] text-xs font-medium rounded text-[#37352F] transition-colors"
          >
            Admin
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FBEBEB] border border-[#F0BEBE] text-[#D44C47] text-xs rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#5A5A58] mb-1">Username or Email</label>
          <div className="relative">
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. atharva or student@college.edu"
              required
              className="w-full px-3 py-2 pl-9 bg-[#F7F7F5] border border-[#E9E9E8] rounded-md text-sm text-[#37352F] placeholder-[#9B9A97] focus:outline-hidden focus:ring-1 focus:ring-[#2383E2] focus:bg-white"
            />
            <UserIcon size={15} className="absolute left-3 top-2.5 text-[#9B9A97]" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#5A5A58] mb-1">Password</label>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 pl-9 bg-[#F7F7F5] border border-[#E9E9E8] rounded-md text-sm text-[#37352F] placeholder-[#9B9A97] focus:outline-hidden focus:ring-1 focus:ring-[#2383E2] focus:bg-white"
            />
            <Lock size={15} className="absolute left-3 top-2.5 text-[#9B9A97]" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-[#2383E2] hover:bg-[#1C6DD0] text-white font-medium text-sm rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
          <ArrowRight size={15} />
        </button>
      </form>

      <div className="text-center text-xs text-[#787774]">
        Don't have an account?{" "}
        <Link href="/register" className="text-[#2383E2] font-semibold hover:underline">
          Register now
        </Link>
      </div>
    </div>
  );
}
