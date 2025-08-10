import { useEffect, useState } from "react";
import { db } from "./firebaseConfig";
import {
  collection, getDocs, query, where, orderBy,
  doc, updateDoc, getDoc
} from "firebase/firestore";

export default function StudentDashboard({ user }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reservingId, setReservingId] = useState(null);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  // Modal + form state
  const [showModal, setShowModal] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  const [reservationType, setReservationType] = useState("individual"); // "individual" | "group"
  const [groupSize, setGroupSize] = useState(2);
  const [topic, setTopic] = useState("General Consultation");
  const [thesisTitle, setThesisTitle] = useState("");

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

  const openReserve = (slot) => {
    setActiveSlot(slot);
    setReservationType("individual");
    setGroupSize(2);
    setTopic("General Consultation");
    setThesisTitle("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setActiveSlot(null);
  };

  const submitReservation = async (e) => {
    e.preventDefault();
    if (!activeSlot) return;

    if (reservationType === "group" && (!groupSize || Number(groupSize) < 2)) {
      setError("Group size must be at least 2.");
      return;
    }
    if (topic === "Thesis Consultation" && thesisTitle.trim().length < 3) {
      setError("Please enter a thesis title.");
      return;
    }

    setError(null);
    setOk(null);
    setReservingId(activeSlot.id);

    try {
      // fetch student's full name from users/{uid} (fallback to displayName/email)
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const studentName = userSnap.exists()
        ? (userSnap.data().name || user.displayName || user.email)
        : (user.displayName || user.email);

      const ref = doc(db, "appointments", activeSlot.id);
      const payload = {
        status: "pending",
        requester: {
          uid: user.uid,
          email: user.email,
          name: studentName,
        },
        reservationType,
        ...(reservationType === "group" ? { group: { size: Number(groupSize) } } : { group: null }),
        reason: {
          topic,
          ...(topic === "Thesis Consultation" ? { thesisTitle: thesisTitle.trim() } : {}),
        },
      };

      await updateDoc(ref, payload);

      setOk("Reservation sent. Waiting for professor approval.");
      closeModal();
      await load(); // refresh list so this slot disappears
    } catch (e) {
      console.error(e);
      setError(e.code + ": " + (e.message || "Could not reserve this slot."));
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
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Date & Time</th>
                  <th className="px-4 py-3 text-left">Professor</th>
                  <th className="px-4 py-3 text-left">Topic</th>
                  <th className="px-4 py-3 text-left">Mode</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => {
                  const dt = s.date?.seconds ? new Date(s.date.seconds * 1000) : new Date(s.date);
                  const disabled = reservingId === s.id;
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="px-4 py-3">{dt.toLocaleString()}</td>
                      <td className="px-4 py-3">{s.professorName || "—"}</td>
                      <td className="px-4 py-3">{s.topic || "General Consultation"}</td>
                      <td className="px-4 py-3">{s.mode || "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          disabled={disabled}
                          onClick={() => openReserve(s)}
                          className={`rounded-md px-3 py-1.5 text-sm transition
                            ${disabled
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "bg-[#f37021] hover:bg-[#d35616] text-white"}`}
                        >
                          {disabled ? "Opening…" : "Reserve"}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          {/* Dialog */}
          <div className="relative bg-white w-full max-w-md mx-4 rounded-lg shadow-lg border p-5 z-10">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Reserve Slot</h2>

            <form onSubmit={submitReservation} className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="reservationType"
                      value="individual"
                      checked={reservationType === "individual"}
                      onChange={(e) => setReservationType(e.target.value)}
                    />
                    <span>Individual</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="reservationType"
                      value="group"
                      checked={reservationType === "group"}
                      onChange={(e) => setReservationType(e.target.value)}
                    />
                    <span>Group</span>
                  </label>
                </div>
              </div>

              {/* Group size */}
              {reservationType === "group" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of members
                  </label>
                  <input
                    type="number"
                    min={2}
                    value={groupSize}
                    onChange={(e) => setGroupSize(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
                    required
                  />
                </div>
              )}

              {/* Topic */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <select
                  className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  <option>General Consultation</option>
                  <option>Thesis Consultation</option>
                  <option>Grade Related</option>
                  <option>Others</option>
                </select>
              </div>

              {/* Thesis title */}
              {topic === "Thesis Consultation" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thesis Title</label>
                  <input
                    type="text"
                    placeholder="Enter thesis title"
                    value={thesisTitle}
                    onChange={(e) => setThesisTitle(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-[#f37021] px-3 py-2 text-sm text-white hover:bg-[#d35616]"
                >
                  Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}