import { useEffect, useState } from "react";
import { db } from "./firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export default function StudentDashboard({ user }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);

  // Form state
  const [consultationType, setConsultationType] = useState("General Consultation"); // Thesis/Capstone | Grades Related | General Consultation
  const [thesisTitle, setThesisTitle] = useState("");
  const [bookingType, setBookingType] = useState("individual"); // individual | group
  const [groupSize, setGroupSize] = useState(2);

  const [selectedDay, setSelectedDay] = useState("");
  const [timePeriod, setTimePeriod] = useState("AM"); // AM | PM | Both
  const [timeSlot, setTimeSlot] = useState("");

  const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };

  const buildTimeSlots = (period) => {
    const am = [
      "8:00 AM - 9:00 AM",
      "9:00 AM - 10:00 AM",
      "10:00 AM - 11:00 AM",
      "11:00 AM - 12:00 PM",
    ];
    const pm = [
      "1:00 PM - 2:00 PM",
      "2:00 PM - 3:00 PM",
      "3:00 PM - 4:00 PM",
      "4:00 PM - 5:00 PM",
      "5:00 PM - 6:00 PM",
      "6:00 PM - 7:00 PM",
    ];
    if (period === "AM") return am;
    if (period === "PM") return pm;
    return [...am, ...pm];
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching schedules...");

      const schedulesRef = collection(db, "schedules");
      const schedulesSnap = await getDocs(schedulesRef);

      if (schedulesSnap.empty) {
        console.log("No schedules found.");
        setError("No schedules found for professors.");
        setSlots([]);
        return;
      }

      console.log("Schedules found:", schedulesSnap.size);

      const professorSchedules = {};

      for (const docu of schedulesSnap.docs) {
        const scheduleData = docu.data();
        const professorId = docu.id;
        console.log("Fetching details for professor:", professorId);

        // get all users then match id (kept as in your code)
        const profdataRef = collection(db, "users");
        const profSnap = await getDocs(profdataRef);

        let profData = null;
        profSnap.forEach((u) => {
          const data = u.data();
          const profDataID = u.id;
          if (profDataID === professorId) {
            profData = data;
          }
        });

        if (profData) {
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
      }

      const allSlots = Object.values(professorSchedules).map((slot) => {
        const sortedSchedules = [...slot.schedules].sort(
          (a, b) => dayOrder[a.day] - dayOrder[b.day]
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

  useEffect(() => {
    load();
  }, []);

  const openReserve = (slot) => {
    setActiveSlot(slot);
    // default day = first available day of this professor
    const firstDay = slot?.schedules?.[0]?.day || "";
    setSelectedDay(firstDay);
    // reset form bits
    setConsultationType("General Consultation");
    setThesisTitle("");
    setBookingType("individual");
    setGroupSize(2);
    setTimePeriod("AM");
    setTimeSlot("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setActiveSlot(null);
  };

  const handleSubmitReservation = (e) => {
    e.preventDefault();

    // Basic validation
    if (!selectedDay) {
      alert("Please select a day.");
      return;
    }
    if (!timeSlot) {
      alert("Please select a time slot.");
      return;
    }
    if (consultationType === "Thesis/Capstone" && !thesisTitle.trim()) {
      alert("Please enter your Thesis/Capstone title.");
      return;
    }
    if (bookingType === "group" && (!groupSize || Number(groupSize) < 2)) {
      alert("Group size must be at least 2.");
      return;
    }

    const payload = {
      professorId: activeSlot?.professorId,
      professorName: activeSlot?.professorName,
      professorDepartment: activeSlot?.professorDepartment,
      consultationType,
      thesisTitle: consultationType === "Thesis/Capstone" ? thesisTitle.trim() : "",
      bookingType,
      groupSize: bookingType === "group" ? Number(groupSize) : 1,
      selectedDay,
      timePeriod,
      timeSlot,
      requester: user ? { uid: user.uid, email: user.email } : null,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    console.log("Reservation payload:", payload);

    // TODO: Save to Firestore (appointments) if desired
    // await addDoc(collection(db, "appointments"), payload)

    alert("Reservation details captured. (Check console)"); // replace with real success UI
    closeModal();
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-800">Available Consultation Slots</h1>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3">
            {error}
          </div>
        )}

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

      {/* Modal */}
      {showModal && activeSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeModal}
            aria-hidden="true"
          ></div>

          {/* Dialog */}
          <div
            className="relative bg-white w-full max-w-xl mx-4 rounded-xl shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                Schedule with {activeSlot.professorName}
              </h2>
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
                <div>
                  <span className="font-medium">Department:</span>{" "}
                  {activeSlot.professorDepartment || "—"}
                </div>
                <div className="mt-1">
                  <span className="font-medium">Available Days:</span>{" "}
                  {activeSlot.schedules.map((s) => s.day).join(", ")}
                </div>
              </div>

              {/* Consultation Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consultation Type
                </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thesis/Capstone Title
                  </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Booking Type
                </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Members
                  </label>
                  <input
                    type="number"
                    min={2}
                    className="w-36 border rounded p-2"
                    value={groupSize}
                    onChange={(e) => setGroupSize(e.target.value)}
                  />
                </div>
              )}

              {/* Day select (from this professor’s schedules) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Choose Day
                </label>
                <select
                  className="w-full border rounded p-2"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                >
                  {activeSlot.schedules.map((s) => (
                    <option key={s.day} value={s.day}>
                      {s.day}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Period
                </label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="timePeriod"
                      value="AM"
                      checked={timePeriod === "AM"}
                      onChange={(e) => {
                        setTimePeriod(e.target.value);
                        setTimeSlot("");
                      }}
                    />
                    <span>AM</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="timePeriod"
                      value="PM"
                      checked={timePeriod === "PM"}
                      onChange={(e) => {
                        setTimePeriod(e.target.value);
                        setTimeSlot("");
                      }}
                    />
                    <span>PM</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="timePeriod"
                      value="Both"
                      checked={timePeriod === "Both"}
                      onChange={(e) => {
                        setTimePeriod(e.target.value);
                        setTimeSlot("");
                      }}
                    />
                    <span>Both</span>
                  </label>
                </div>
              </div>

              {/* Time slot list */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Choose Time
                </label>
                <select
                  className="w-full border rounded p-2"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                >
                  <option value="" disabled>
                    Select a time slot
                  </option>
                  {buildTimeSlots(timePeriod).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  AM: 8:00–12:00 · PM: 1:00–7:00
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md px-3 py-2 bg-[#f37021] hover:bg-[#d35616] text-white"
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
