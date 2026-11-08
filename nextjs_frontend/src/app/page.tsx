"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  CheckSquare,
  Clock,
  Code2,
  FolderGit2,
  Sparkles,
  TrendingUp,
} from "lucide-react";

interface ActionItem {
  task_id: number;
  title: string;
  category: string;
  priority: string;
  status: string;
  scheduled_date: string;
  urgency: string;
  context_type: string;
  context_title: string;
}

interface ActionSummary {
  total_pending: number;
  overdue_count: number;
  due_today_count: number;
  due_week_count: number;
  high_priority_count: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<ActionItem[]>([]);
  const [summary, setSummary] = useState<ActionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await apiFetch<{ feed: ActionItem[]; summary: ActionSummary }>("/api/tasks/action-center");
      setFeed(res.feed);
      setSummary(res.summary);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const completeTask = async (taskId: number) => {
    try {
      await apiFetch(`/api/tasks/${taskId}/complete`, { method: "POST" });
      setFeed((prev) => prev.filter((item) => item.task_id !== taskId));
      if (summary) {
        setSummary({ ...summary, total_pending: Math.max(0, summary.total_pending - 1) });
      }
    } catch (err: any) {
      alert(err.message || "Failed to complete task");
    }
  };

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E9E9E8] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider font-semibold text-[#9B9A97] mb-1">
            {todayStr}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#37352F]">
            Good day, {user ? user.username : "Student"}
          </h1>
          <p className="text-sm text-[#787774] mt-1">
            Here is your daily snapshot across coursework, DSA practice, and placement pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/tasks"
            className="px-3 py-1.5 bg-[#F7F7F5] hover:bg-[#EFEFEF] border border-[#E9E9E8] rounded-md text-xs font-medium text-[#37352F] flex items-center gap-1.5 transition-colors"
          >
            <CheckSquare size={14} className="text-[#2383E2]" />
            Action Center
          </Link>
          <Link
            href="/dsa"
            className="px-3 py-1.5 bg-[#2383E2] hover:bg-[#1C6DD0] text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Code2 size={14} />
            Practice DSA
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#E9E9E8] rounded-lg p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#787774]">
            <span>Pending Tasks</span>
            <Clock size={16} className="text-[#2383E2]" />
          </div>
          <div className="text-2xl font-bold text-[#37352F]">
            {summary ? summary.total_pending : "-"}
          </div>
          <div className="text-[11px] text-[#9B9A97]">Items awaiting completion</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E9E9E8] rounded-lg p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#787774]">
            <span>Due Today / Overdue</span>
            <AlertCircle size={16} className="text-[#D44C47]" />
          </div>
          <div className="text-2xl font-bold text-[#D44C47]">
            {summary ? summary.overdue_count + summary.due_today_count : "-"}
          </div>
          <div className="text-[11px] text-[#9B9A97]">High attention items</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E9E9E8] rounded-lg p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#787774]">
            <span>High Priority</span>
            <TrendingUp size={16} className="text-[#CC782F]" />
          </div>
          <div className="text-2xl font-bold text-[#37352F]">
            {summary ? summary.high_priority_count : "-"}
          </div>
          <div className="text-[11px] text-[#9B9A97]">P0 & P1 ranked items</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E9E9E8] rounded-lg p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#787774]">
            <span>Due This Week</span>
            <Sparkles size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-[#37352F]">
            {summary ? summary.due_week_count : "-"}
          </div>
          <div className="text-[11px] text-[#9B9A97]">Next 7 days timeline</div>
        </div>
      </div>

      {/* Main Grid: Action Center Feed & Workspace Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Priority Action Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#37352F] flex items-center gap-2">
              <CheckSquare size={17} className="text-[#2383E2]" />
              Priority Action Items
            </h2>
            <Link href="/tasks" className="text-xs text-[#2383E2] hover:underline flex items-center gap-0.5">
              View all tasks <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E9E9E8] rounded-lg divide-y divide-[#E9E9E8]">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#9B9A97]">Loading action items...</div>
            ) : feed.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#9B9A97]">
                🎉 All caught up! No pending tasks right now.
              </div>
            ) : (
              feed.slice(0, 7).map((item) => (
                <div key={item.task_id} className="p-3.5 flex items-start gap-3 hover:bg-[#FBFBFA] transition-colors group">
                  <button
                    onClick={() => completeTask(item.task_id)}
                    className="mt-0.5 text-[#9B9A97] hover:text-emerald-600 transition-colors"
                    title="Mark Done"
                  >
                    <CheckCircle2 size={18} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#37352F]">{item.title}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[#787774]">
                      <span className="font-medium text-[#5A5A58]">{item.context_title}</span>
                      <span>•</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                          item.urgency === "Overdue"
                            ? "bg-[#FFE2DD] text-[#5D1715]"
                            : item.urgency === "Today"
                            ? "bg-[#FDECC8] text-[#402C1B]"
                            : "bg-[#E3E2E0] text-[#32302C]"
                        }`}
                      >
                        {item.urgency}
                      </span>
                      <span className="text-[11px] text-[#9B9A97]">{item.priority}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Workspace Launchpad Cards */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-[#37352F]">Workspaces</h2>

          <div className="space-y-3">
            <Link
              href="/dsa"
              className="block p-4 bg-[#FFFFFF] border border-[#E9E9E8] hover:border-[#2383E2] rounded-lg transition-all shadow-2xs group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-[#E8DEEE] text-[#412454] flex items-center justify-center">
                    <Code2 size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#37352F] group-hover:text-[#2383E2]">
                      DSA Practice
                    </div>
                    <div className="text-xs text-[#787774]">Semantic search & revision tracker</div>
                  </div>
                </div>
                <ArrowUpRight size={15} className="text-[#9B9A97] group-hover:text-[#2383E2]" />
              </div>
            </Link>

            <Link
              href="/career"
              className="block p-4 bg-[#FFFFFF] border border-[#E9E9E8] hover:border-[#2383E2] rounded-lg transition-all shadow-2xs group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-[#D3E5EF] text-[#183347] flex items-center justify-center">
                    <Briefcase size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#37352F] group-hover:text-[#2383E2]">
                      Career & OAs
                    </div>
                    <div className="text-xs text-[#787774]">Application funnel & interview prep</div>
                  </div>
                </div>
                <ArrowUpRight size={15} className="text-[#9B9A97] group-hover:text-[#2383E2]" />
              </div>
            </Link>

            <Link
              href="/academics"
              className="block p-4 bg-[#FFFFFF] border border-[#E9E9E8] hover:border-[#2383E2] rounded-lg transition-all shadow-2xs group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-[#DBEDDB] text-[#1C3829] flex items-center justify-center">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#37352F] group-hover:text-[#2383E2]">
                      Academics
                    </div>
                    <div className="text-xs text-[#787774]">Course progress & weighted grades</div>
                  </div>
                </div>
                <ArrowUpRight size={15} className="text-[#9B9A97] group-hover:text-[#2383E2]" />
              </div>
            </Link>

            <Link
              href="/projects"
              className="block p-4 bg-[#FFFFFF] border border-[#E9E9E8] hover:border-[#2383E2] rounded-lg transition-all shadow-2xs group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-[#FDECC8] text-[#402C1B] flex items-center justify-center">
                    <FolderGit2 size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#37352F] group-hover:text-[#2383E2]">
                      Personal Projects
                    </div>
                    <div className="text-xs text-[#787774]">Side projects & development pipeline</div>
                  </div>
                </div>
                <ArrowUpRight size={15} className="text-[#9B9A97] group-hover:text-[#2383E2]" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
