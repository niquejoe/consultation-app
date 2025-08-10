import { useEffect, useState } from "react";
import { db } from "./firebaseConfig";
import { collection, getDocs, query, where, orderBy, doc, setDoc, updateDoc } from "firebase/firestore"; // <-- added updateDoc here

export default function ProfessorDashboard({ user }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Load professor's appointments
  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "appointments"),
        where("professorId", "==", user.uid),
        where("status", "in", ["pending", "confirmed", "rejected"]),
        orderBy("date", "desc")
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

  useEffect(() => {
    load();
    loadAvailability();  // Load availability data when the component is mounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load professor's availability from Firestore
  const loadAvailability = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, "schedules", user.uid); // Use professor's uid as the document ID
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAvailability(docSnap.data());
      }
    } catch (e) {
      console.error("Error loading availability: ", e);
      setError("Failed to load availability.");
    }
  };

  // Handle time slot changes for each day
  const handleTimeChange = (day, index, field, value) => {
    const updatedDay = [...availability[day]];
    updatedDay[index] = { ...updatedDay[index], [field]: value };
    setAvailability((prevState) => ({ ...prevState, [day]: updatedDay }));
  };

  // Add a time slot for availability
  const addTimeSlot = (day) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: [
        ...prev[day],
        { startTime: "", endTime: "", consultationType: "in-person" },
      ],
    }));
  };

  // Save availability to Firestore
  const handleSubmitAvailability = async () => {
    setSavingAvailability(true);
    try {
      const professorRef = doc(db, "schedules", user.uid);
      await setDoc(professorRef, availability, { merge: true }); // Save or update availability data
      alert("Availability saved successfully!");
    } catch (e) {
      console.error("Error saving availability: ", e);
      setError("Failed to save availability.");
    } finally {
      setSavingAvailability(false);
    }
  };

  // Set the status of appointments (approve or reject)
  const setStatus = async (id, next) => {
    setError(null);
    setActingId(id);
    try {
      await updateDoc(doc(db, "appointments", id), { status: next });
      // Optimistic local update
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: next } : a))
      );
    } catch (e) {
      console.error(e);
      setError("Action failed. Please try again.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-xl font-semibold text-gray-800 mb-4">Your Appointments</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-3">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white border rounded-lg p-6 text-gray-600">Loading appointments…</div>
      )}

      {!loading && appointments.length === 0 && (
        <div className="bg-white border rounded-lg p-8 text-center">
          <p className="text-gray-700 font-medium">No booked appointments yet</p>
          <p className="text-gray-500 text-sm mt-1">Pending or confirmed bookings will appear here.</p>
        </div>
      )}

      {!loading && appointments.length > 0 && (
        <div className="overflow-x-auto bg-white border rounded-lg mb-6">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">Date & Time</th>
                <th className="px-4 py-3 text-left">Student</th>
                <th className="px-4 py-3 text-left">Topic</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((app) => {
                const dt = app.date ? new Date(app.date) : null;
                const studentName = app.requester?.name || app.requester?.email || "—";
                const topicMain = app.reason?.topic || app.topic || "—";
                const thesisNote =
                  app.reason?.thesisTitle && topicMain === "Thesis Consultation"
                    ? ` — ${app.reason.thesisTitle}`
                    : "";
                const typeLabel =
                  app.reservationType === "group"
                    ? `Group${app.group?.size ? ` (${app.group.size})` : ""}${app.group?.name ? ` — ${app.group.name}` : ""}`
                    : "Individual";

                return (
                  <tr key={app.id} className="border-t">
                    <td className="px-4 py-3">{dt ? dt.toLocaleString() : "—"}</td>
                    <td className="px-4 py-3">{studentName}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-800">{topicMain}</span>
                      {thesisNote && <span className="text-gray-500"> {thesisNote}</span>}
                    </td>
                    <td className="px-4 py-3">{typeLabel}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                          ${app.status === "confirmed" ? "bg-green-100 text-green-700" : app.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"}`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {app.status === "pending" && (
                          <>
                            <button
                              onClick={() => setStatus(app.id, "confirmed")}
                              className="rounded-md px-3 py-1.5 text-sm bg-green-500 text-white"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setStatus(app.id, "rejected")}
                              className="rounded-md px-3 py-1.5 text-sm border border-gray-300"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Set Your Availability</h2>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
          <div key={day} className="p-4 border rounded">
            <h3 className="text-lg font-semibold mb-4">{day}</h3>
            {availability[day].map((slot, index) => (
              <div key={index} className="flex flex-col gap-2 mb-4">
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => handleTimeChange(day, index, "startTime", e.target.value)}
                  className="border p-2 rounded"
                />
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => handleTimeChange(day, index, "endTime", e.target.value)}
                  className="border p-2 rounded"
                />
                <select
                  value={slot.consultationType}
                  onChange={(e) => handleTimeChange(day, index, "consultationType", e.target.value)}
                  className="border p-2 rounded"
                >
                  <option value="in-person">In-person</option>
                  <option value="online">Online</option>
                </select>
              </div>
            ))}
            <button
              onClick={() => addTimeSlot(day)}
              className="bg-blue-500 text-white p-2 rounded"
            >
              + Add Time Slot
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmitAvailability}
        className="bg-green-500 text-white p-3 rounded mt-4"
        disabled={savingAvailability}
      >
        {savingAvailability ? "Saving..." : "Save Availability"}
      </button>
    </main>
  );
}
