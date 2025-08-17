import { useEffect, useState } from "react";
import { db } from "./firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";

export default function AdminDashboard({ user }) {
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [editingProf, setEditingProf] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", department: "" });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newProf, setNewProf] = useState({ name: "", email: "", department: "" });

  // Load all professors
  const loadProfessors = async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.role === "professor");
      setProfessors(list);
    } catch (e) {
      console.error(e);
      setError("Failed to load professors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfessors();
  }, []);

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this professor?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      setProfessors((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error(e);
      alert("Delete failed.");
    }
  };

  // Handle edit save
  const handleSave = async () => {
    try {
      await updateDoc(doc(db, "users", editingProf.id), {
        name: form.name,
        email: form.email,
        department: form.department,
      });
      setProfessors((prev) =>
        prev.map((p) => (p.id === editingProf.id ? { ...p, ...form } : p))
      );
      setEditingProf(null);
    } catch (e) {
      console.error(e);
      alert("Update failed.");
    }
  };

  // Handle add professor (just creates Firestore doc; not auth account)
  const handleAdd = async () => {
    try {
      await addDoc(collection(db, "users"), {
        ...newProf,
        role: "professor",
      });
      setShowAddModal(false);
      setNewProf({ name: "", email: "", department: "" });
      loadProfessors();
    } catch (e) {
      console.error(e);
      alert("Failed to add professor.");
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Admin Dashboard — Professors</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          + Add Professor
        </button>
      </div>

      {error && <div className="text-red-600 mb-3">{error}</div>}

      {loading ? (
        <div className="bg-white border rounded p-6 text-gray-600">Loading professors…</div>
      ) : professors.length === 0 ? (
        <div className="bg-white border rounded p-6 text-gray-600">No professors found.</div>
      ) : (
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Department</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {professors.map((prof) => (
              <tr key={prof.id} className="border-t">
                <td className="px-3 py-2">{prof.name}</td>
                <td className="px-3 py-2">{prof.email}</td>
                <td className="px-3 py-2">{prof.department}</td>
                <td className="px-3 py-2 space-x-2">
                  <button
                    onClick={() => {
                      setEditingProf(prof);
                      setForm({
                        name: prof.name || "",
                        email: prof.email || "",
                        department: prof.department || "",
                      });
                    }}
                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(prof.id)}
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Edit Modal */}
      {editingProf && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-lg font-semibold mb-4">Edit Professor</h2>
            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border w-full p-2 mb-2"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border w-full p-2 mb-2"
            />
            <input
              type="text"
              placeholder="Department"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="border w-full p-2 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingProf(null)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 bg-green-500 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-lg font-semibold mb-4">Add Professor</h2>
            <input
              type="text"
              placeholder="Name"
              value={newProf.name}
              onChange={(e) => setNewProf({ ...newProf, name: e.target.value })}
              className="border w-full p-2 mb-2"
            />
            <input
              type="email"
              placeholder="Email"
              value={newProf.email}
              onChange={(e) => setNewProf({ ...newProf, email: e.target.value })}
              className="border w-full p-2 mb-2"
            />
            <input
              type="text"
              placeholder="Department"
              value={newProf.department}
              onChange={(e) => setNewProf({ ...newProf, department: e.target.value })}
              className="border w-full p-2 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="px-3 py-1 bg-blue-500 text-white rounded"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
