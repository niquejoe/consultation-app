// src/ProfessorDashboard.jsx
import { useEffect, useState } from "react";
import { db } from "./firebaseConfig";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

export default function ProfessorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "appointments"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAppointments(list);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-xl font-semibold text-gray-800 mb-4">Your Appointments</h1>

      {loading && (
        <div className="bg-white border rounded-lg p-6 text-gray-600">Loading appointments…</div>
      )}

      {!loading && appointments.length === 0 && (
        <div className="bg-white border rounded-lg p-8 text-center">
          <p className="text-gray-700 font-medium">No appointments yet</p>
          <p className="text-gray-500 text-sm mt-1">
            When consultations are created, they’ll show up here.
          </p>
        </div>
      )}

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
                      ? new Date(
                          app.date.seconds ? app.date.seconds * 1000 : app.date
                        ).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-[#f37021]">
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
  );
}
