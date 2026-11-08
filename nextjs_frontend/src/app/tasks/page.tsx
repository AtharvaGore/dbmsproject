"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  Filter,
  Plus,
  Trash2,
  X,
} from "lucide-react";

interface Task {
  task_id: number;
  title: string;
  category: string;
  priority: string;
  status: string;
  scheduled_date: string | null;
  context_name: string | null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("Active");

  // Add task modal
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    category: "General",
    priority: "P2 - Medium",
    status: "To Do",
    scheduled_date: new Date().toISOString().slice(0, 10),
  });

  const loadTasks = async () => {
    try {
      const data = await apiFetch<Task[]>("/api/tasks");
      setTasks(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiFetch<Task>("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      setTasks([created, ...tasks]);
      setShowModal(false);
      setNewTask({
        title: "",
        category: "General",
        priority: "P2 - Medium",
        status: "To Do",
        scheduled_date: new Date().toISOString().slice(0, 10),
      });
    } catch (err: any) {
      alert(err.message || "Failed to create task");
    }
  };

  const toggleComplete = async (task: Task) => {
    const isDone = task.status === "Done";
    try {
      if (!isDone) {
        await apiFetch(`/api/tasks/${task.task_id}/complete`, { method: "POST" });
        setTasks((prev) =>
          prev.map((t) => (t.task_id === task.task_id ? { ...t, status: "Done" } : t))
        );
      } else {
        await apiFetch(`/api/tasks/${task.task_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "To Do" }),
        });
        setTasks((prev) =>
          prev.map((t) => (t.task_id === task.task_id ? { ...t, status: "To Do" } : t))
        );
      }
    } catch (err: any) {
      alert(err.message || "Failed to toggle status");
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      await apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
    } catch (err: any) {
      alert(err.message || "Failed to delete task");
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
    if (statusFilter === "Active" && t.status === "Done") return false;
    if (statusFilter === "Completed" && t.status !== "Done") return false;
    return true;
  });

  const categories = ["All", "Coursework", "Project", "DSA", "Career", "General"];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E9E9E8] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#37352F] flex items-center gap-2">
            <CheckSquare size={24} className="text-[#2383E2]" />
            Action Center
          </h1>
          <p className="text-sm text-[#787774] mt-1">
            Unified priority inbox across assignments, DSA revisits, job milestones, and tasks.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-1.5 bg-[#2383E2] hover:bg-[#1C6DD0] text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus size={14} /> New Action Item
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Category Pills */}
        <div className="flex items-center gap-1 bg-[#F7F7F5] p-1 rounded-lg border border-[#E9E9E8]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? "bg-white text-[#37352F] shadow-2xs font-semibold"
                  : "text-[#787774] hover:text-[#37352F]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#787774]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium px-2 py-1 bg-white border border-[#E9E9E8] rounded-md text-[#37352F]"
          >
            <option value="Active">Pending & In Progress</option>
            <option value="Completed">Completed</option>
            <option value="All">All Items</option>
          </select>
        </div>
      </div>

      {/* Task Feed */}
      <div className="bg-white border border-[#E9E9E8] rounded-lg divide-y divide-[#E9E9E8] overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#9B9A97]">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#9B9A97] space-y-1">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
            <div className="font-medium text-[#37352F]">No tasks match the filter criteria.</div>
            <div>All clear for this selection!</div>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isDone = task.status === "Done";
            return (
              <div
                key={task.task_id}
                className="p-3.5 flex items-start justify-between gap-4 hover:bg-[#FBFBFA] transition-colors group"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleComplete(task)}
                    className={`mt-0.5 transition-colors ${
                      isDone ? "text-emerald-600" : "text-[#D3D1CB] hover:text-emerald-600"
                    }`}
                  >
                    <CheckCircle2 size={18} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-medium ${
                        isDone ? "line-through text-[#9B9A97]" : "text-[#37352F]"
                      }`}
                    >
                      {task.title}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#787774]">
                      {task.context_name && (
                        <span className="font-semibold text-[#5A5A58] bg-[#F7F7F5] px-1.5 py-0.5 rounded border border-[#E9E9E8]">
                          {task.context_name}
                        </span>
                      )}

                      <span className="px-1.5 py-0.2 rounded bg-[#E3E2E0] text-[11px] font-medium text-[#37352F]">
                        {task.category}
                      </span>

                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                          task.priority === "P0 - Urgent"
                            ? "bg-[#FFE2DD] text-[#5D1715]"
                            : task.priority === "P1 - High"
                            ? "bg-[#FDECC8] text-[#402C1B]"
                            : "bg-[#E3E2E0] text-[#37352F]"
                        }`}
                      >
                        {task.priority}
                      </span>

                      {task.scheduled_date && (
                        <span className="text-[11px] text-[#9B9A97] flex items-center gap-1">
                          <Calendar size={12} />
                          {task.scheduled_date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteTask(task.task_id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[#9B9A97] hover:text-[#D44C47] transition-all"
                  title="Delete task"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-[#E9E9E8] shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9E9E8] pb-3">
              <h3 className="font-semibold text-base text-[#37352F]">Create Action Item</h3>
              <button onClick={() => setShowModal(false)} className="text-[#9B9A97] hover:text-[#37352F]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#5A5A58] mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement Dijkstra's algorithm"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E9E9E8] rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-[#2383E2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5A5A58] mb-1">Category</label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E9E9E8] rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-[#2383E2]"
                  >
                    <option value="Coursework">Coursework</option>
                    <option value="Project">Project</option>
                    <option value="DSA">DSA</option>
                    <option value="Career">Career</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5A5A58] mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E9E9E8] rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-[#2383E2]"
                  >
                    <option value="P0 - Urgent">P0 - Urgent</option>
                    <option value="P1 - High">P1 - High</option>
                    <option value="P2 - Medium">P2 - Medium</option>
                    <option value="P3 - Low">P3 - Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5A5A58] mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={newTask.scheduled_date}
                  onChange={(e) => setNewTask({ ...newTask, scheduled_date: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E9E9E8] rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-[#2383E2]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-[#E9E9E8] text-xs font-medium rounded hover:bg-[#F7F7F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2383E2] text-white text-xs font-medium rounded hover:bg-[#1C6DD0]"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
