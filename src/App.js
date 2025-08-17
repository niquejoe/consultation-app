import React, { useEffect, useState } from "react";
import { auth, db } from "./firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Login from "./Login";
import logo from "./assets/img/logo.png";
import StudentDashboard from "./StudentDashboard";
import ProfessorDashboard from "./ProfessorDashboard";
import AdminDashboard from "./AdminDashboard";

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);          // "student" | "professor"
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setRole(null);
        setLoadingRole(false);
        return;
      }
      setLoadingRole(true);
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        setRole(snap.exists() ? snap.data().role : null);
      } catch (e) {
        console.error("Failed to load role:", e);
        setRole(null);
      } finally {
        setLoadingRole(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header (shared) */}
      <header className="bg-white border-b">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="CICT" className="w-9 h-9" />
            <span className="font-semibold text-gray-800">CICT Consultation WebApp</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:inline">Signed in as {user.email}</span>
            <button
              onClick={handleLogout}
              className="rounded-md bg-[#f37021] px-3 py-2 text-white text-sm hover:bg-[#d35616] transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      {loadingRole && (
        <main className="mx-auto max-w-5xl px-4 py-6">
          <div className="bg-white border rounded-lg p-6 text-gray-600">Loading your dashboard…</div>
        </main>
      )}

      {!loadingRole && !role && (
        <main className="mx-auto max-w-5xl px-4 py-6">
          <div className="bg-white border rounded-lg p-6">
            <p className="text-gray-800 font-medium">No role found for your account.</p>
            <p className="text-gray-600 text-sm mt-1">Ask the admin to set your role (student/professor).</p>
          </div>
        </main>
      )}

      {!loadingRole && role === "student" && <StudentDashboard user={user} />}
      {!loadingRole && role === "professor" && <ProfessorDashboard user={user} />}
      {!loadingRole && role === "admin" && <AdminDashboard user={user} />}
    </div>
  );
}

export default App;
