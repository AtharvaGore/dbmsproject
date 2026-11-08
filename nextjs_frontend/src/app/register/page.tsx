"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth, type User } from "@/context/AuthContext";
import { ArrowRight, Lock, Mail, User as UserIcon } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch<{ token: string; user: User }>("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      login(res.token, res.user);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Registration failed.");
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
        <h1 className="text-2xl font-bold tracking-tight text-[#37352F]">Create an Account</h1>
        <p className="text-sm text-[#787774]">Join AcademiaOS as a Student</p>
      </div>

      {error && (
        <div className="p-3 bg-[#FBEBEB] border border-[#F0BEBE] text-[#D44C47] text-xs rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#5A5A58] mb-1">Username</label>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. atharva_g"
              required
              className="w-full px-3 py-2 pl-9 bg-[#F7F7F5] border border-[#E9E9E8] rounded-md text-sm text-[#37352F] placeholder-[#9B9A97] focus:outline-hidden focus:ring-1 focus:ring-[#2383E2] focus:bg-white"
            />
            <UserIcon size={15} className="absolute left-3 top-2.5 text-[#9B9A97]" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#5A5A58] mb-1">Email</label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.edu"
              required
              className="w-full px-3 py-2 pl-9 bg-[#F7F7F5] border border-[#E9E9E8] rounded-md text-sm text-[#37352F] placeholder-[#9B9A97] focus:outline-hidden focus:ring-1 focus:ring-[#2383E2] focus:bg-white"
            />
            <Mail size={15} className="absolute left-3 top-2.5 text-[#9B9A97]" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#5A5A58] mb-1">Password</label>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              className="w-full px-3 py-2 pl-9 bg-[#F7F7F5] border border-[#E9E9E8] rounded-md text-sm text-[#37352F] placeholder-[#9B9A97] focus:outline-hidden focus:ring-1 focus:ring-[#2383E2] focus:bg-white"
            />
            <Lock size={15} className="absolute left-3 top-2.5 text-[#9B9A97]" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#5A5A58] mb-1">Confirm Password</label>
          <div className="relative">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
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
          {loading ? "Creating account..." : "Register"}
          <ArrowRight size={15} />
        </button>
      </form>

      <div className="text-center text-xs text-[#787774]">
        Already have an account?{" "}
        <Link href="/login" className="text-[#2383E2] font-semibold hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
