"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import {
  ExternalLink,
  FolderGit2,
  Github,
  Plus,
  Rocket,
  Trash2,
  X,
} from "lucide-react";

interface Project {
  project_id: number;
  title: string;
  description: string;
  status: "Idea" | "In Development" | "Shipped";
  tech_stack: string[];
  github_url: string | null;
  live_url: string | null;
  total_tasks: number;
  open_tasks: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // New project modal
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    status: "Idea",
    tech_stack_str: "PostgreSQL, Flask, Next.js",
    github_url: "",
    live_url: "",
  });

  const loadProjects = async () => {
    try {
      const data = await apiFetch<Project[]>("/api/projects");
      setProjects(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const tech_stack = newProject.tech_stack_str
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const created = await apiFetch<Project>("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newProject.title,
          description: newProject.description,
          status: newProject.status,
          tech_stack,
          github_url: newProject.github_url.trim() || null,
          live_url: newProject.live_url.trim() || null,
        }),
      });

      setProjects([...projects, created]);
      setShowModal(false);
      setNewProject({
        title: "",
        description: "",
        status: "Idea",
        tech_stack_str: "",
        github_url: "",
        live_url: "",
      });
    } catch (err: any) {
      alert(err.message || "Failed to create project");
    }
  };

  const updateStatus = async (projectId: number, newStatus: string) => {
    try {
      await apiFetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setProjects((prev) =>
        prev.map((p) => (p.project_id === projectId ? { ...p, status: newStatus as any } : p))
      );
    } catch (err: any) {
      alert(err.message || "Failed to update project status");
    }
  };

  const deleteProject = async (projectId: number) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await apiFetch(`/api/projects/${projectId}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.project_id !== projectId));
    } catch (err: any) {
      alert(err.message || "Failed to delete project");
    }
  };

  const columns: Array<{ status: Project["status"]; label: string; color: string }> = [
    { status: "Idea", label: "Ideas & Backlog", color: "bg-[#FDECC8] text-[#402C1B]" },
    { status: "In Development", label: "In Development", color: "bg-[#D3E5EF] text-[#183347]" },
    { status: "Shipped", label: "Shipped & Live", color: "bg-[#DBEDDB] text-[#1C3829]" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E9E9E8] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#37352F] flex items-center gap-2">
            <FolderGit2 size={24} className="text-[#2383E2]" />
            Personal Projects
          </h1>
          <p className="text-sm text-[#787774] mt-1">
            Build in public: track system architectures, side projects, and portfolio milestones.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-1.5 bg-[#2383E2] hover:bg-[#1C6DD0] text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus size={14} /> New Project
        </button>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((col) => {
          const colProjects = projects.filter((p) => p.status === col.status);
          return (
            <div key={col.status} className="bg-[#F7F7F5] border border-[#E9E9E8] rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${col.color}`}>
                    {col.label}
                  </span>
                  <span className="text-xs text-[#9B9A97] font-semibold">{colProjects.length}</span>
                </div>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="text-xs text-[#9B9A97] p-4 text-center">Loading...</div>
                ) : colProjects.length === 0 ? (
                  <div className="text-xs text-[#9B9A97] p-6 text-center border border-dashed border-[#E3E2E0] rounded-lg">
                    No projects in this stage.
                  </div>
                ) : (
                  colProjects.map((project) => (
                    <div
                      key={project.project_id}
                      className="bg-white border border-[#E9E9E8] hover:border-[#D3D1CB] rounded-lg p-4 shadow-2xs space-y-3 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm text-[#37352F]">{project.title}</h3>
                        <button
                          onClick={() => deleteProject(project.project_id)}
                          className="text-[#9B9A97] hover:text-[#D44C47] transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {project.description && (
                        <p className="text-xs text-[#787774] line-clamp-3 leading-relaxed">
                          {project.description}
                        </p>
                      )}

                      {/* Tech Stack Badges */}
                      {project.tech_stack && project.tech_stack.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.tech_stack.map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium bg-[#E3E2E080] text-[#32302C] px-1.5 py-0.2 rounded"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer: Links and Stage mover */}
                      <div className="pt-2 border-t border-[#F0F0EF] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          {project.github_url && (
                            <a
                              href={project.github_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#787774] hover:text-[#37352F] flex items-center gap-1"
                              title="GitHub repo"
                            >
                              <Github size={13} />
                            </a>
                          )}
                          {project.live_url && (
                            <a
                              href={project.live_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#2383E2] hover:underline flex items-center gap-0.5"
                              title="Live demo"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>

                        {/* Stage Selector */}
                        <select
                          value={project.status}
                          onChange={(e) => updateStatus(project.project_id, e.target.value)}
                          className="text-[11px] font-medium px-1.5 py-0.5 bg-[#F7F7F5] border border-[#E9E9E8] rounded text-[#5A5A58]"
                        >
                          <option value="Idea">Idea</option>
                          <option value="In Development">Dev</option>
                          <option value="Shipped">Shipped</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-[#E9E9E8] shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9E9E8] pb-3">
              <h3 className="font-semibold text-base text-[#37352F]">Create Personal Project</h3>
              <button onClick={() => setShowModal(false)} className="text-[#9B9A97] hover:text-[#37352F]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#5A5A58] mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Key-Value Store"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E9E9E8] rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-[#2383E2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5A5A58] mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of what this project does..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E9E9E8] rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-[#2383E2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5A5A58] mb-1">Tech Stack (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Go, Raft, gRPC, Protobuf"
                  value={newProject.tech_stack_str}
                  onChange={(e) => setNewProject({ ...newProject, tech_stack_str: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E9E9E8] rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-[#2383E2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5A5A58] mb-1">Stage</label>
                  <select
                    value={newProject.status}
                    onChange={(e) => setNewProject({ ...newProject, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-[#E9E9E8] rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-[#2383E2]"
                  >
                    <option value="Idea">Idea</option>
                    <option value="In Development">In Development</option>
                    <option value="Shipped">Shipped</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5A5A58] mb-1">GitHub URL</label>
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={newProject.github_url}
                    onChange={(e) => setNewProject({ ...newProject, github_url: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E9E9E8] rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-[#2383E2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5A5A58] mb-1">Live Demo URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newProject.live_url}
                  onChange={(e) => setNewProject({ ...newProject, live_url: e.target.value })}
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
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
