"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CheckSquare,
  Code2,
  FolderGit2,
  Home,
  LogOut,
  ShieldCheck,
  Briefcase,
  User as UserIcon,
  Sparkles,
} from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { type ReactNode } from "react";

function NavigationShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

  if (isAuthPage) {
    return <main className="min-h-screen bg-[#FBFBFA] flex items-center justify-center p-4">{children}</main>;
  }

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/tasks", label: "Action Center", icon: CheckSquare },
    { href: "/academics", label: "Academics", icon: BookOpen },
    { href: "/projects", label: "Projects", icon: FolderGit2 },
    { href: "/dsa", label: "DSA Practice", icon: Code2 },
    { href: "/career", label: "Career & OAs", icon: Briefcase },
  ];

  if (user?.role === "Admin") {
    navItems.push({ href: "/admin", label: "Admin Console", icon: ShieldCheck });
  }

  return (
    <div className="flex min-h-screen bg-[#FFFFFF] text-[#37352F]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#E9E9E8] bg-[#F7F7F5] flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* Workspace Title */}
          <div className="px-4 py-4 flex items-center justify-between border-b border-[#E9E9E8]">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-[#2383E2] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                A
              </div>
              <span className="font-semibold text-sm tracking-tight text-[#37352F]">AcademiaOS</span>
            </Link>
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-[#E3E2E0] text-[#5A5A58]">
              v1.0
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-0.5">
            <div className="px-2.5 py-1 text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider">
              Workspace
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#EAEAEA] text-[#2383E2]"
                      : "text-[#5A5A58] hover:bg-[#EFEFEF] hover:text-[#37352F]"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-[#2383E2]" : "text-[#787774]"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-[#E9E9E8]">
          {loading ? (
            <div className="text-xs text-[#9B9A97] px-2 py-1">Loading profile...</div>
          ) : user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[#FFFFFF] border border-[#E9E9E8] shadow-xs">
                <div className="w-7 h-7 rounded-full bg-[#E3E2E0] flex items-center justify-center text-xs font-semibold text-[#5A5A58]">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#37352F] truncate">{user.username}</div>
                  <div className="text-[11px] text-[#787774] truncate flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {user.role}
                  </div>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-[#787774] hover:text-[#D44C47] hover:bg-[#FBEBEB] rounded-md transition-colors"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full py-1.5 px-3 bg-[#2383E2] text-white text-xs font-medium rounded-md hover:bg-[#1C6DD0] transition-colors shadow-xs"
            >
              <UserIcon size={14} />
              Sign In
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-h-screen bg-[#FFFFFF]">
        {children}
      </main>
    </div>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>AcademiaOS</title>
        <meta name="description" content="All-in-one student workspace with coursework, DSA practice, and placement tracking" />
      </head>
      <body>
        <AuthProvider>
          <NavigationShell>{children}</NavigationShell>
        </AuthProvider>
      </body>
    </html>
  );
}
