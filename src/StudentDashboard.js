import { useEffect, useState } from "react";
import { db } from "./firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export default function StudentDashboard({ user }) {
  const [slots, setSlots] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        return;
      }

      console.log("Schedules found:", schedulesSnap.size);

      const professorSchedules = {}; 

      for (const doc of schedulesSnap.docs) {
        const scheduleData = doc.data();
        const professorId = doc.id;
        console.log("Fetching details for professor:", professorId);

        const profdataRef = collection(db, "users");
        const profSnap = await getDocs(profdataRef);

        let profData = null;

        profSnap.forEach((docu) => {
          const data = docu.data();
          const profDataID = docu.id;

          if (profDataID === professorId) {
            profData = data; 
            console.log("Show profData:", profData);
          }
        });

        if (profData) {
          if (!professorSchedules[professorId]) {
            professorSchedules[professorId] = {
              professorName: profData.name,
              professorDepartment: profData.department,
              status: "available", 
              schedules: [],
            };
          }

          Object.entries(scheduleData).forEach(([day, times]) => {
            professorSchedules[professorId].schedules.push({
              day,
              times,
            });
          });
        }
      }

      const allSlots = Object.values(professorSchedules);
      setSlots(allSlots); 
    } catch (e) {
      console.error("Error loading schedules:", e);
      setError("Failed to load schedules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); 
  }, []);

  const openReserve = (slot) => {
    console.log("Open reserve modal for:", slot);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-800">Available Consultation Slots</h1>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3">{error}</div>}

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
                    .map(
                      (schedule) => `${schedule.day}: ${schedule.times.join(", ")}`
                    )
                    .join(" | ");

                  return (
                    <tr key={`${slot.professorName}`} className="border-t">
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
    </main>
  );
}
