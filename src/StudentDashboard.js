import { useEffect, useState } from "react";
import { db } from "./firebaseConfig";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export default function StudentDashboard({ user }) {
  const [slots, setSlots] = useState([]);  // All available slots from all professors
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
      console.log("Fetching schedules...");
  
      const schedulesRef = collection(db, "schedules");
      const schedulesSnap = await getDocs(schedulesRef);
  
      if (schedulesSnap.empty) {
        console.log("No schedules found.");
        setError("No schedules found for professors.");
        return;
      }
  
      console.log("Schedules found:", schedulesSnap.size);
  
      const allSlots = [];
      const professorDetailsPromises = [];
  
      
      schedulesSnap.forEach(async (doc) => {
        const scheduleData = doc.data();
        const professorId = doc.id;  
        console.log("Fetching details for professor:", professorId);

        const profdataRef = doc(db, "users", professorId);
        const professorDetails = await getDoc(profdataRef);

        professorDetails.forEach((docu) =>{
          const profData = docu.data();
          console.log("Show profData:", profData);
        });

        //const professorDetailsPromise = getDoc(doc(db, "users", professorId));
        //professorDetailsPromises.push(professorDetailsPromise);
  
       
        Object.entries(scheduleData).forEach(([day, times]) => {
          allSlots.push({
            professorId,
            day,
            times,
          });
        });
      });
  
      console.log("Waiting for professor details...");
      // Wait for all professor details using Promise.all
      const professorDetailsSnapshots = await Promise.all(professorDetailsPromises);
      console.log("Professor details fetched:", professorDetailsSnapshots.length);
  
      // Add professor details to the slots
      allSlots.forEach((slot, index) => {
        const professorInfo = professorDetailsSnapshots[index];
        if (professorInfo.exists()) {
          const professorData = professorInfo.data();
          console.log(`Professor Data for ${slot.professorId}:`, professorData);
          slot.professorName = professorData.name;
          slot.professorEmail = professorData.email;
          slot.professorDepartment = professorData.department;
        } else {
          console.log(`No professor data found for ${slot.professorId}`);
          slot.professorName = "Unknown Professor";  // Default value if data is missing
          slot.professorEmail = "N/A";
          slot.professorDepartment = "N/A";
        }
      });
  
      setSlots(allSlots);  // Store all the available slots with professor details
    } catch (e) {
      console.error("Error loading schedules:", e);
      setError("Failed to load schedules.");
    } finally {
      setLoading(false);
    }
  };
  
  

  useEffect(() => {
    load();  // Load the schedules when the component mounts
  }, []);

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
      // Fetch student's full name from users/{uid} (fallback to displayName/email)
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const studentName = userSnap.exists()
        ? (userSnap.data().name || user.displayName || user.email)
        : (user.displayName || user.email);

      // Assuming you want to store the reservation in a different collection or update the schedule
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

      setOk("Reservation sent. Waiting for professor approval.");
      closeModal();
      await load(); // Refresh list after reservation
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
                  <th className="px-4 py-3 text-left">Professor Name</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Day</th>
                  <th className="px-4 py-3 text-left">Time Slots</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => {
                  return (
                    <tr key={`${slot.professorId}-${slot.day}`} className="border-t">
                      <td className="px-4 py-3">{slot.professorName || "—"}</td>
                      <td className="px-4 py-3">{slot.professorDepartment || "—"}</td>
                      <td className="px-4 py-3">{slot.day}</td>
                      <td className="px-4 py-3">{slot.times.join(", ")}</td>
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
