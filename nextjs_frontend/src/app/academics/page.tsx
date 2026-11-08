"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  GraduationCap,
  Plus,
  Trash2,
  X,
} from "lucide-react";

interface Course {
  course_id: number;
  course_code: string;
  course_name: string;
  instructor: string;
  semester: string;
  credits: number;
  total_assignments: number;
  completed_assignments: number;
  graded_assignments: number;
  total_weightage: number;
  graded_weightage: number;
  current_grade_percent: number | null;
}

interface Assignment {
  assignment_id: number;
  course_id: number;
  course_code: string;
  course_name: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  weightage: number;
  grade: number | null;
}

export default function AcademicsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);

  // New course modal
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [newCourse, setNewCourse] = useState({
    course_code: "",
    course_name: "",
    instructor: "",
    semester: "Fall 2026",
    credits: 4,
  });

  // New assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newAssign, setNewAssign] = useState({
    course_id: 0,
    title: "",
    description: "",
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    weightage: 20,
  });

  const loadData = async () => {
    try {
      const [c, a] = await Promise.all([
        apiFetch<Course[]>("/api/academics/courses"),
        apiFetch<Assignment[]>("/api/academics/assignments"),
      ]);
      setCourses(c);
      setAssignments(a);
      if (c.length > 0 && selectedCourse === null) {
        setNewAssign((prev) => ({ ...prev, course_id: c[0].course_id }));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddCourse = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiFetch<Course>("/api/academics/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCourse),
      });
      setCourses([...courses, created]);
      setShowCourseModal(false);
      setNewCourse({
        course_code: "",
        course_name: "",
        instructor: "",
        semester: "Fall 2026",
        credits: 4,
      });
    } catch (err: any) {
      alert(err.message || "Failed to add course");
    }
  };

  const handleAddAssignment = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiFetch<Assignment>("/api/academics/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAssign),
      });
      setAssignments([...assignments, created]);
      setShowAssignModal(false);
      loadData(); // reload courses to reflect new assignment count
    } catch (err: any) {
      alert(err.message || "Failed to add assignment");
    }
  };

  const updateAssignmentStatus = async (assignmentId: number, status: string) => {
    try {
      await apiFetch(`/api/academics/assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const filteredAssignments = selectedCourse
    ? assignments.filter((a) => a.course_id === selectedCourse)
    : assignments;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E9E9E8] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#37352F] flex items-center gap-2">
            <GraduationCap size={24} className="text-[#2383E2]" />
            Academics & Coursework
          </h1>
          <p className="text-sm text-[#787774] mt-1">
            Track registered courses, assignment deliverables, and weighted GPA calculations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCourseModal(true)}
            className="px-3 py-1.5 bg-white border border-[#E9E9E8] hover:bg-[#F7F7F5] rounded-md text-xs font-medium text-[#37352F] flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus size={14} /> Add Course
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-3 py-1.5 bg-[#2383E2] hover:bg-[#1C6DD0] text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus size={14} /> Add Assignment
          </button>
        </div>
      </div>

      {/* Courses Cards Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#9B9A97]">Enrolled Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => {
            const isSelected = selectedCourse === course.course_id;
            return (
              <div
                key={course.course_id}
                onClick={() => setSelectedCourse(isSelected ? null : course.course_id)}
                className={`p-4 rounded-lg border transition-all cursor-pointer shadow-2xs ${
                  isSelected
                    ? "bg-[#FFFFFF] border-[#2383E2] ring-1 ring-[#2383E2]"
                    : "bg-[#FFFFFF] border-[#E9E9E8] hover:border-[#D3D1CB]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-[#E3E2E0] text-[#37352F]">
                      {course.course_code}
                    </span>
                    <h3 className="text-sm font-semibold text-[#37352F] mt-1.5">{course.course_name}</h3>
                    <div className="text-xs text-[#787774]">{course.instructor || "Instructor TBD"}</div>
                  </div>
                  {course.current_grade_percent !== null && (
                    <div className="text-right">
                      <div className="text-xs text-[#787774]">Grade</div>
                      <div className="text-sm font-bold text-emerald-600">{course.current_grade_percent}%</div>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-4 pt-3 border-t border-[#F0F0EF] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#787774]">
                    <span>Assignments</span>
                    <span>
                      {course.completed_assignments} / {course.total_assignments} completed
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#E9E9E8] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2383E2] rounded-full transition-all"
                      style={{
                        width: `${
                          course.total_assignments > 0
                            ? Math.round((course.completed_assignments / course.total_assignments) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assignments Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#9B9A97]">
            {selectedCourse ? "Filtered Assignments" : "All Deliverables"}
          </h2>
          {selectedCourse && (
            <button
              onClick={() => setSelectedCourse(null)}
              className="text-xs text-[#2383E2] hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>

        <div className="bg-[#FFFFFF] border border-[#E9E9E8] rounded-lg overflow-hidden shadow-2xs">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F7F7F5] border-b border-[#E9E9E8] text-xs font-medium text-[#787774]">
              <tr>
                <th className="py-2.5 px-4">Title</th>
                <th className="py-2.5 px-4">Course</th>
                <th className="py-2.5 px-4">Due Date</th>
                <th className="py-2.5 px-4">Weightage</th>
                <th className="py-2.5 px-4">Grade</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9E9E8]">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-[#9B9A97]">
                    No assignments found for this view.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a) => (
                  <tr key={a.assignment_id} className="hover:bg-[#FBFBFA] transition-colors">
                    <td className="py-3 px-4 font-medium text-[#37352F]">{a.title}</td>
                    <td className="py-3 px-4 text-xs text-[#787774]">{a.course_code}</td>
                    <td className="py-3 px-4 text-xs text-[#787774]">
                      {new Date(a.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#787774]">{a.weightage ? `${a.weightage}%` : "-"}</td>
                    <td className="py-3 px-4 text-xs font-semibold text-emerald-600">
                      {a.grade !== null ? `${a.grade}%` : "-"}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={a.status}
                        onChange={(e) => updateAssignmentStatus(a.assignment_id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded border border-transparent focus:outline-hidden ${
                          a.status === "Graded"
                            ? "bg-[#DBEDDB] text-[#1C3829]"
                            : a.status === "Submitted"
                            ? "bg-[#D3E5EF] text-[#183347]"
                            : a.status === "In Progress"
                            ? "bg-[#FDECC8] text-[#402C1B]"
                            : "bg-[#E3E2E0] text-[#32302C]"
                        }`}
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Graded">Graded</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-[#E9E9E8] shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9E9E8] pb-3">
              <h3 className="font-semibold text-base text-[#37352F]">Add Course</h3>
              <button onClick={() => setShowCourseModal(false)} className="text-[#9B9A97] hover:text-[#37352F]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddCourse} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#5A5A58] mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS301"
                  value={newCourse.course_code}
                  onChange={(e) => setNewCourse({ ...newCourse, course_code: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E9E9E8] rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-[#2383E2]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5A5A58] mb-1">Course Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Database Management Systems"
                  value={newCourse.course_name}
                  onChange={(e) => setNewCourse({ ...newCourse, course_name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E9E9E8] rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-[#2383E2]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5A5A58] mb-1">Instructor</label>
                  <input
                    type="text"
                    placeholder="Prof. Name"
                    value={newCourse.instructor}
                    onChange={(e) => setNewCourse({ ...newCourse, instructor: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E9E9E8] rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-[#2383E2]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5A5A58] mb-1">Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newCourse.credits}
                    onChange={(e) => setNewCourse({ ...newCourse, credits: parseInt(e.target.value) || 3 })}
                    className="w-full px-3 py-1.5 border border-[#E9E9E8] rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-[#2383E2]"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-3 py-1.5 border border-[#E9E9E8] text-xs font-medium rounded hover:bg-[#F7F7F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2383E2] text-white text-xs font-medium rounded hover:bg-[#1C6DD0]"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-[#E9E9E8] shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9E9E8] pb-3">
              <h3 className="font-semibold text-base text-[#37352F]">Add Assignment</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-[#9B9A97] hover:text-[#37352F]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddAssignment} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#5A5A58] mb-1">Course</label>
                <select
                  required
                  value={newAssign.course_id}
                  onChange={(e) => setNewAssign({ ...newAssign, course_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-1.5 border border-[#E9E9E8] rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-[#2383E2]"
                >
                  {courses.map((c) => (
                    <option key={c.course_id} value={c.course_id}>
                      {c.course_code}: {c.course_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5A5A58] mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab 2: B-Tree Indexing"
                  value={newAssign.title}
                  onChange={(e) => setNewAssign({ ...newAssign, title: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E9E9E8] rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-[#2383E2]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5A5A58] mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newAssign.due_date}
                    onChange={(e) => setNewAssign({ ...newAssign, due_date: e.target.value })}
                    className="w-full px-3 py-1.5 border border-[#E9E9E8] rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-[#2383E2]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5A5A58] mb-1">Weightage (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newAssign.weightage}
                    onChange={(e) => setNewAssign({ ...newAssign, weightage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-[#E9E9E8] rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-[#2383E2]"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3 py-1.5 border border-[#E9E9E8] text-xs font-medium rounded hover:bg-[#F7F7F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2383E2] text-white text-xs font-medium rounded hover:bg-[#1C6DD0]"
                >
                  Create & Sync Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
