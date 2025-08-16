import { useEffect, useState } from "react";
import { db } from "./firebaseConfig";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  setDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";

export default function ProfessorDashboard({ user }) {
  const [appointments, setAppointments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState(null);
  const [availability, setAvailability] = useState({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
  });
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  // NEW: modal state for completing consultation
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNote, setCompletionNote] = useState("");
  const [selectedAppId, setSelectedAppId] = useState(null);

  // -------- Load active reservations from "appt" --------
  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "appt"),
        where("professorId", "==", user.uid),
        where("status", "in", ["pending", "confirmed", "rejected"]),
        orderBy("dateISO", "desc")
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAppointments(list);
    } catch (e) {
      console.error(e);
      setError("Failed to load appointments.");
    } finally {
      setLoading(false);
    }
  };

  // -------- Load history (completed consultations) --------
  const loadHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, "appt"),
        where("professorId", "==", user.uid),
        where("status", "==", "completed"),
        orderBy("dateISO", "desc")
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setHistory(list);
    } catch (e) {
      console.error("Error loading history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    load();
    loadHistory();
    loadAvailability();
  }, [user]);

  // -------- Load professor availability --------
  const loadAvailability = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, "schedules", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAvailability(docSnap.data());
      }
    } catch (e) {
      console.error("Error loading availability: ", e);
      setError("Failed to load availability.");
    }
  };

  // -------- Update reservation status --------
  const setStatus = async (id, next) => {
    setError(null);
    setActingId(id);
    try {
      await updateDoc(doc(db, "appt", id), { status: next });
      // Refresh active + history after update
      await load();
      await loadHistory();
    } catch (e) {
      console.error(e);
      setError("Action failed. Please try again.");
    } finally {
      setActingId(null);
    }
  };

  // -------- Mark as completed with feedback --------
  const handleComplete = (id) => {
    setSelectedAppId(id);
    setCompletionNote("");
    setShowCompleteModal(true);
  };

  const saveCompletion = async () => {
    if (!selectedAppId) return;
    setActingId(selectedAppId);
    try {
      await updateDoc(doc(db, "appt", selectedAppId), {
        status: "completed",
        feedback: completionNote,
        completedAt: new Date().toISOString(),
      });
      setShowCompleteModal(false);
      setSelectedAppId(null);
      setCompletionNote("");
      await load();
      await loadHistory();
    } catch (e) {
      console.error(e);
      setError("Failed to mark as completed.");
    } finally {
      setActingId(null);
    }
  };

  // -------- Availability editing --------
  const handleAvailabilityChange = (day, time, isChecked) => {
    setAvailability((prev) => {
      const updatedDay = isChecked
        ? [...prev[day], time]
        : prev[day].filter((slot) => slot !== time);
      return { ...prev, [day]: updatedDay };
    });
  };

  const handleSubmitAvailability = async () => {
    setSavingAvailability(true);
    try {
      const professorRef = doc(db, "schedules", user.uid);
      await setDoc(professorRef, availability, { merge: true });
      alert("Availability saved successfully!");
      setShowAvailabilityModal(false);
    } catch (e) {
      console.error("Error saving availability:", e);
      setError("Failed to save availability.");
    } finally {
      setSavingAvailability(false);
    }
  };

  // -------- Render table (shared) --------
  const renderTable = (items, showActions = true) => (
    <table className="min-w-full text-sm">
      <thead className="bg-gray-100 text-gray-700">
        <tr>
          <th className="px-4 py-3 text-left">Date & Time</th>
          <th className="px-4 py-3 text-left">Student</th>
          <th className="px-4 py-3 text-left">Consultation Type</th>
          <th className="px-4 py-3 text-left">Booking</th>
          <th className="px-4 py-3 text-left">Status</th>
          {showActions && <th className="px-4 py-3 text-left">Actions</th>}
        </tr>
      </thead>
      <tbody>
        {items.map((app) => {
          const dtLabel = app.dateISO
            ? `${app.dateISO} (${app.startTime} - ${app.endTime})`
            : "—";
          const studentEmail = app.requester?.email || "—";
          const thesisNote =
            app.consultationType === "Thesis/Capstone" && app.thesisTitle
              ? ` — ${app.thesisTitle}`
              : "";
          const typeLabel =
            app.bookingType === "group"
              ? `Group (${app.groupSize || "?"})`
              : "Individual";
          const isPending = app.status === "pending";
          const isConfirmed = app.status === "confirmed";
          const disabled = actingId === app.id;

          return (
            <tr key={app.id} className="border-t">
              <td className="px-4 py-3">{dtLabel}</td>
              <td className="px-4 py-3">{studentEmail}</td>
              <td className="px-4 py-3">
                <span className="text-gray-800">{app.consultationType}</span>
                {thesisNote && <span className="text-gray-500">{thesisNote}</span>}
              </td>
              <td className="px-4 py-3">{typeLabel}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                    ${app.status === "confirmed"
                      ? "bg-green-100 text-green-700"
                      : app.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : app.status === "completed"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"}`}
                >
                  {app.status}
                </span>
              </td>
              {showActions && (
                <td className="px-4 py-3">
                  {isPending && (
                    <div className="flex gap-2">
                      <button
                        disabled={disabled}
                        onClick={() => setStatus(app.id, "confirmed")}
                        className={`rounded-md px-3 py-1.5 text-sm transition ${
                          disabled
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-[#2e7d32] hover:bg-[#1b5e20] text-white"
                        }`}
                      >
                        {disabled ? "Saving…" : "Approve"}
                      </button>
                      <button
                        disabled={disabled}
                        onClick={() => setStatus(app.id, "rejected")}
                        className={`rounded-md px-3 py-1.5 text-sm border transition ${
                          disabled
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {isConfirmed && (
                    <button
                      disabled={disabled}
                      onClick={() => handleComplete(app.id)}
                      className={`rounded-md px-3 py-1.5 text-sm transition ${
                        disabled
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                    >
                      {disabled ? "Saving…" : "Complete"}
                    </button>
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  // -------- UI --------
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-800">Your Appointments</h1>
        <button
          onClick={() => setShowAvailabilityModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded"
        >
          Set Availability
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-3">
          {error}
        </div>
      )}

      {/* Active Appointments */}
      {loading ? (
        <div className="bg-white border rounded-lg p-6 text-gray-600">Loading appointments…</div>
      ) : appointments.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center">
          <p className="text-gray-700 font-medium">No booked appointments yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border rounded-lg mb-6">
          {renderTable(appointments, true)}
        </div>
      )}

      {/* History Section */}
      <h2 className="text-xl font-semibold text-gray-800 mb-4">History</h2>
      {loadingHistory ? (
        <div className="bg-white border rounded-lg p-6 text-gray-600">Loading history…</div>
      ) : history.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center">
          <p className="text-gray-700 font-medium">No completed consultations yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border rounded-lg mb-6">
          {renderTable(history, false)}
        </div>
      )}

      {/* Complete Consultation Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCompleteModal(false)}
          ></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Complete Consultation</h2>
            <textarea
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="Add your feedback or comments here..."
              className="w-full border rounded p-2 mb-4"
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveCompletion}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                disabled={actingId === selectedAppId}
              >
                {actingId === selectedAppId ? "Saving..." : "Save & Complete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Availability Modal (same as before) */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAvailabilityModal(false)}
          ></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Set Your Availability</h2>
              <button
                onClick={() => setShowAvailabilityModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-5 gap-4 mb-6">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
                <div key={day} className="p-4 border rounded">
                  <h3 className="text-lg font-semibold mb-4">{day}</h3>
                  <div className="flex flex-col gap-2 mb-4">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={availability[day].includes("AM")}
                        onChange={(e) =>
                          handleAvailabilityChange(day, "AM", e.target.checked)
                        }
                        className="form-checkbox"
                      />
                      <span>AM</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={availability[day].includes("PM")}
                        onChange={(e) =>
                          handleAvailabilityChange(day, "PM", e.target.checked)
                        }
                        className="form-checkbox"
                      />
                      <span>PM</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAvailabilityModal(false)}
                className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAvailability}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                disabled={savingAvailability}
              >
                {savingAvailability ? "Saving..." : "Save Availability"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
