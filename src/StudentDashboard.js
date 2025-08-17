import { useEffect, useState } from "react";
import { db } from "./firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore";

export default function StudentDashboard({ user }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Student's own appointments
  const [myAppointments, setMyAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);

  // Form state
  const [consultationType, setConsultationType] = useState("General Consultation");
  const [thesisTitle, setThesisTitle] = useState("");
  const [bookingType, setBookingType] = useState("individual");
  const [groupSize, setGroupSize] = useState(2);
  const [selectedDay, setSelectedDay] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [saving, setSaving] = useState(false);

  const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };

  // ---- Time expansion helpers ----
  const AM_SLOTS = ["8:00 AM - 9:00 AM","9:00 AM - 10:00 AM","10:00 AM - 11:00 AM","11:00 AM - 12:00 PM"];
  const PM_SLOTS = ["1:00 PM - 2:00 PM","2:00 PM - 3:00 PM","3:00 PM - 4:00 PM","4:00 PM - 5:00 PM","5:00 PM - 6:00 PM","6:00 PM - 7:00 PM"];

  function expandTimes(tokensOrSlots = []) {
    const out = new Set();
    const norm = (s) => String(s).trim().toUpperCase();
    tokensOrSlots.forEach((t) => {
      const n = norm(t);
      if (n === "AM") AM_SLOTS.forEach((s) => out.add(s));
      else if (n === "PM") PM_SLOTS.forEach((s) => out.add(s));
      else if (n === "BOTH" || n === "AM/PM" || n === "AMPM") {
        [...AM_SLOTS, ...PM_SLOTS].forEach((s) => out.add(s));
      } else out.add(t);
    });
    const master = [...AM_SLOTS, ...PM_SLOTS];
    return Array.from(out).sort((a, b) => {
      const ia = master.indexOf(a);
      const ib = master.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

  function to24h(timeLabel) {
    const [startLabel, endLabel] = timeLabel.split(" - ").map((s) => s.trim());
    const to24 = (s) => {
      const d = new Date(`1970-01-01 ${s}`);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    };
    return { start: to24(startLabel), end: to24(endLabel) };
  }

  function getNextDateForDay(dayName) {
    const days = {Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,Thursday: 4, Friday: 5, Saturday: 6};
    const target = days[dayName];
    if (target == null) return null;
    const now = new Date();
    const result = new Date(now);
    const diff = (target + 7 - now.getDay()) % 7;
    result.setDate(now.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function toDateISO(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function buildApptDocId(professorId, dateISO, startHHMM) {
    return `${professorId}_${dateISO.replace(/-/g, "")}_${startHHMM.replace(":", "")}`;
  }

  // -------- Load weekly schedules --------
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const schedulesRef = collection(db, "schedules");
      const schedulesSnap = await getDocs(schedulesRef);
      if (schedulesSnap.empty) {
        setError("No schedules found for professors.");
        setSlots([]);
        return;
      }
      const professorSchedules = {};
      for (const docu of schedulesSnap.docs) {
        const scheduleData = docu.data();
        const professorId = docu.id;
        const usersRef = collection(db, "users");
        const usersSnap = await getDocs(usersRef);
        let profData = null;
        usersSnap.forEach((u) => {
          if (u.id === professorId) profData = u.data();
        });
        if (!profData) continue;
        if (!professorSchedules[professorId]) {
          professorSchedules[professorId] = {
            professorId,
            professorName: profData.name,
            professorDepartment: profData.department,
            status: "available",
            schedules: [],
          };
        }
        Object.entries(scheduleData).forEach(([day, times]) => {
          professorSchedules[professorId].schedules.push({ day, times });
        });
      }
      const allSlots = Object.values(professorSchedules).map((slot) => {
        const sortedSchedules = [...slot.schedules].sort(
          (a, b) => (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99)
        );
        return { ...slot, schedules: sortedSchedules };
      });
      setSlots(allSlots);
    } catch (e) {
      console.error("Error loading schedules:", e);
      setError("Failed to load schedules.");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  // -------- Load student's appointments --------
  const loadMyAppointments = async () => {
    if (!user) return;
    setLoadingAppts(true);
    try {
      const q = query(
        collection(db, "appt"),
        where("requester.uid", "==", user.uid),
        orderBy("dateISO", "asc"),
        orderBy("startTime", "asc")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMyAppointments(list);
    } catch (e) {
      console.error("Error loading appointments:", e);
    } finally {
      setLoadingAppts(false);
    }
  };

  useEffect(() => {
    load();
    loadMyAppointments();
  }, [user]);

  const openReserve = (slot) => {
    setActiveSlot(slot);
    const firstDay = slot?.schedules?.[0]?.day || "";
    setSelectedDay(firstDay);
    setTimeSlot("");
    setConsultationType("General Consultation");
    setThesisTitle("");
    setBookingType("individual");
    setGroupSize(2);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setActiveSlot(null);
  };

  // -------------- Create & save reservation --------------
  const handleSubmitReservation = async (e) => {
    e.preventDefault();
    if (!selectedDay) return alert("Please select a day.");
    if (!timeSlot) return alert("Please select a time slot.");
    if (consultationType === "Thesis/Capstone" && !thesisTitle.trim()) {
      return alert("Please enter your Thesis/Capstone title.");
    }
    if (bookingType === "group" && (!groupSize || Number(groupSize) < 2)) {
      return alert("Group size must be at least 2.");
    }
    const nextDate = getNextDateForDay(selectedDay);
    if (!nextDate) return alert("Invalid day selected.");
    const dateISO = toDateISO(nextDate);
    const { start, end } = to24h(timeSlot);
    const apptId = buildApptDocId(activeSlot.professorId, dateISO, start);
    const payload = {
      professorId: activeSlot.professorId,
      professorName: activeSlot.professorName,
      professorDepartment: activeSlot.professorDepartment,
      dateISO,
      dayOfWeek: selectedDay,
      startTime: start,
      endTime: end,
      timeLabel: timeSlot,
      consultationType,
      thesisTitle: consultationType === "Thesis/Capstone" ? thesisTitle.trim() : "",
      bookingType,
      groupSize: bookingType === "group" ? Number(groupSize) : 1,
      status: "pending",
      requester: user ? { uid: user.uid, email: user.email || null } : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    setSaving(true);
    try {
      const apptRef = doc(db, "appt", apptId);
      const existing = await getDoc(apptRef);
      if (existing.exists()) {
        alert("Sorry, this time slot was just taken. Please choose another.");
        setSaving(false);
        return;
      }
      await setDoc(apptRef, payload, { merge: false });
      alert("Reservation submitted! Waiting for professor approval.");
      closeModal();
      loadMyAppointments(); // refresh student appointments
    } catch (err) {
      console.error(err);
      alert("Failed to submit reservation. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 space-y-10">
      {/* Available slots */}
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-800">Available Consultation Slots</h1>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3">{error}</div>}
        {loading && <div className="bg-white border rounded p-6 text-gray-600">Loading slots…</div>}
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
                  <th className="px-4 py-3 text-left">Professor</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Schedule</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => {
                  const scheduleString = slot.schedules
                    .map((s) => `${s.day}: ${s.times.join(", ")}`)
                    .join(" | ");
                  return (
                    <tr key={slot.professorName} className="border-t">
                      <td className="px-4 py-3">{slot.professorName}</td>
                      <td className="px-4 py-3">{slot.professorDepartment}</td>
                      <td className="px-4 py-3">{slot.status}</td>
                      <td className="px-4 py-3">{scheduleString}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openReserve(slot)}
                          className="rounded-md px-3 py-1.5 text-sm bg-[#f37021] hover:bg-[#d35616] text-white"
                        >
                          Schedule
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

      {/* Student's appointments */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">My Appointments</h2>
        {loadingAppts && (
          <div className="bg-white border rounded p-6 text-gray-600">Loading your appointments…</div>
        )}
        {!loadingAppts && myAppointments.length === 0 && (
          <div className="bg-white border rounded p-8 text-center text-gray-700">
            You have no appointments yet.
          </div>
        )}
        {!loadingAppts && myAppointments.length > 0 && (
          <div className="overflow-x-auto bg-white border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Date & Time</th>
                  <th className="px-4 py-3 text-left">Professor</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Consultation</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {myAppointments.map((appt) => (
                  <tr key={appt.id} className="border-t">
                    <td className="px-4 py-3">{`${appt.dateISO} (${appt.timeLabel || ""})`}</td>
                    <td className="px-4 py-3">{appt.professorName}</td>
                    <td className="px-4 py-3">{appt.professorDepartment || "—"}</td>
                    <td className="px-4 py-3">
                      {appt.consultationType}
                      {appt.consultationType === "Thesis/Capstone" && appt.thesisTitle
                        ? ` — ${appt.thesisTitle}`
                        : ""}
                    </td>
                    <td className="px-4 py-3">
                      {appt.bookingType === "group"
                        ? `Group (${appt.groupSize})`
                        : "Individual"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                          ${appt.status === "confirmed"
                            ? "bg-green-100 text-green-700"
                            : appt.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : appt.status === "completed"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-red-100 text-red-700"}`}
                      >
                        {appt.status === "pending"
                          ? "Waiting for Approval"
                          : appt.status === "confirmed"
                          ? "Approved"
                          : appt.status === "completed"
                          ? "Completed"
                          : "Rejected"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reservation Modal */}
      {showModal && activeSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} aria-hidden="true"></div>
          <div className="relative bg-white w-full max-w-xl mx-4 rounded-xl shadow-xl" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Schedule with {activeSlot.professorName}</h2>
              <button
                onClick={closeModal}
                className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitReservation} className="p-4 space-y-4">
              {/* Professor + Dept */}
              <div className="text-sm text-gray-600">
                <div><span className="font-medium">Department:</span> {activeSlot.professorDepartment || "—"}</div>
                <div className="mt-1"><span className="font-medium">Available Days:</span> {activeSlot.schedules.map((s) => s.day).join(", ")}</div>
              </div>

              {/* Consultation Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Type</label>
                <select
                  className="w-full border rounded p-2"
                  value={consultationType}
                  onChange={(e) => setConsultationType(e.target.value)}
                >
                  <option>Thesis/Capstone</option>
                  <option>Grades Related</option>
                  <option>General Consultation</option>
                </select>
              </div>

              {/* Thesis title (conditional) */}
              {consultationType === "Thesis/Capstone" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thesis/Capstone Title</label>
                  <input
                    type="text"
                    className="w-full border rounded p-2"
                    value={thesisTitle}
                    onChange={(e) => setThesisTitle(e.target.value)}
                    placeholder="Enter your thesis/capstone title"
                  />
                </div>
              )}

              {/* Booking Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Booking Type</label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="bookingType"
                      value="individual"
                      checked={bookingType === "individual"}
                      onChange={(e) => setBookingType(e.target.value)}
                    />
                    <span>Individual</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="bookingType"
                      value="group"
                      checked={bookingType === "group"}
                      onChange={(e) => setBookingType(e.target.value)}
                    />
                    <span>Group</span>
                  </label>
                </div>
              </div>

              {/* Group size (conditional) */}
              {bookingType === "group" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Members</label>
                  <input
                    type="number"
                    min={2}
                    className="w-36 border rounded p-2"
                    value={groupSize}
                    onChange={(e) => setGroupSize(e.target.value)}
                  />
                </div>
              )}

              {/* Day select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Choose Day</label>
                <select
                  className="w-full border rounded p-2"
                  value={selectedDay}
                  onChange={(e) => {
                    setSelectedDay(e.target.value);
                    setTimeSlot("");
                  }}
                >
                  {activeSlot.schedules.map((s) => (
                    <option key={s.day} value={s.day}>{s.day}</option>
                  ))}
                </select>
              </div>

              {/* Time slot */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Choose Time</label>
                {(() => {
                  const dayObj = activeSlot.schedules.find((s) => s.day === selectedDay);
                  const expanded = expandTimes(dayObj?.times || []);
                  return (
                    <select
                      className="w-full border rounded p-2"
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                    >
                      <option value="" disabled>Select a time slot</option>
                      {expanded.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md px-3 py-2 bg-[#f37021] hover:bg-[#d35616] text-white disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Confirm Reservation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
