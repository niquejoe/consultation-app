import React, { useEffect, useState } from "react";
import { auth, db } from "./firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import Login from "./Login";
import logo from "./assets/img/logo.png";

function App() {
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // Fetch data when logged in
  useEffect(() => {
    if (!user) return;
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "appointments"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAppointments(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [user]);

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
      {/* Header */}
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

      {/* Main */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-xl font-semibold text-gray-800 mb-4">Your Appointments</h1>

        {/* Loading */}
        {loading && (
          <div className="bg-white border rounded-lg p-6 text-gray-600">Loading appointments…</div>
        )}

        {/* Empty state */}
        {!loading && appointments.length === 0 && (
          <div className="bg-white border rounded-lg p-8 text-center">
            <p className="text-gray-700 font-medium">No appointments yet</p>
            <p className="text-gray-500 text-sm mt-1">When consultations are created, they’ll show up here.</p>
          </div>
        )}

        {/* Table */}
        {!loading && appointments.length > 0 && (
          <div className="overflow-x-auto bg-white border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((app) => (
                  <tr key={app.id} className="border-t">
                    <td className="px-4 py-3">{app.subject || "—"}</td>
                    <td className="px-4 py-3">{app.studentName || "—"}</td>
                    <td className="px-4 py-3">
                      {app.date
                        ? new Date(app.date.seconds ? app.date.seconds * 1000 : app.date).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                        bg-orange-100 text-[#f37021]">
                        {app.status || "pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
