// src/StudentDashboard.js
import { useEffect, useState } from "react";
import { db } from "./firebaseConfig";
import {
  collection, getDocs, query, where, orderBy, doc, updateDoc
} from "firebase/firestore";

export default function StudentDashboard({ user }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reservingId, setReservingId] = useState(null);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const q = query(
        collection(db, "appointments"),
        where("status", "==", "available"),
        orderBy("date", "asc")
      );
      const snap = await getDocs(q);
      setSlots(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      setError("Failed to load slots.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const reserve = async (slot) => {
    setError(null);
    setOk(null);
    setReservingId(slot.id);
    try {
      const ref = doc(db, "appointments", slot.id);
      await updateDoc(ref, {
        status: "pending",
        attendees: [{ uid: user.uid, email: user.email }]
      });
      setOk("Reservation sent. Waiting for professor approval.");
      await load();
    } catch (e) {
      console.error(e);
      setError("Could not reserve this slot. It may have just been taken.");
    } finally {
      setReservingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-800">Available Consultation Slots</h1>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3">{error}</div>}
        {ok && <div className="bg-green-50 border border-green-200 text-green-700 rounded p-3">{ok}</div>}

        {loading && (
          <div className="bg-white border rounded p-6 text-gray-600">Loading slots…</div>
        )}

        {!loading && slots.length === 0 && (
          <div className="bg-white border rounded p-8 text-center text-gray-700">
            No available slots right now.
          </div>
        )}

        {!loading && slots.length > 0 && (
          <div className="overflow-x-auto bg-white border rounded">
            <table className="w-full text-sm"> {/* w-full is fine; container limits total width */}
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Date & Time</th>
                  <th className="px-4 py-3 text-left">Professor</th>
                  <th className="px-4 py-3 text-left">Topic</th>
                  <th className="px-4 py-3 text-left">Mode</th>
                  <th className="px-4 py-3 text-left">Capacity</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {slots.map(s => {
                  const dt = s.date?.seconds ? new Date(s.date.seconds * 1000) : new Date(s.date);
                  const remaining = typeof s.capacity === "number" && Array.isArray(s.attendees)
                    ? Math.max(0, s.capacity - s.attendees.length)
                    : (s.capacity ?? 1);
                  const disabled = remaining <= 0 || reservingId === s.id;
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="px-4 py-3">{dt.toLocaleString()}</td>
                      <td className="px-4 py-3">{s.professorName || "—"}</td>
                      <td className="px-4 py-3">{s.topic || "General Consultation"}</td>
                      <td className="px-4 py-3">{s.mode || "—"}</td>
                      <td className="px-4 py-3">
                        {typeof s.capacity === "number"
                          ? `${remaining}/${s.capacity} left`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          disabled={disabled}
                          onClick={() => reserve(s)}
                          className={`rounded-md px-3 py-1.5 text-sm transition
                            ${disabled
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "bg-[#f37021] hover:bg-[#d35616] text-white"}`}
                        >
                          {reservingId === s.id ? "Reserving…" : "Reserve"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
