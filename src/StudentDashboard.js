import { useEffect, useState } from "react";
import { db } from "./firebaseConfig";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export default function StudentDashboard({ user }) {
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load professors' details (from users and schedules)
  const loadProfessors = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all professors from the 'users' collection
      const professorsSnapshot = await getDocs(collection(db, "users"));
      const professorsList = [];

      for (let docSnapshot of professorsSnapshot.docs) {
        const professorId = docSnapshot.id;
        const professorData = docSnapshot.data();

        // Fetch professor's availability from the 'schedules' collection
        const scheduleSnapshot = await getDoc(doc(db, "schedules", professorId));
        const professorSchedule = scheduleSnapshot.exists() ? scheduleSnapshot.data() : {};

        // Combine professor data and availability
        professorsList.push({
          ...professorData,
          professorId,
          availability: professorSchedule,
        });
      }

      setProfessors(professorsList);
    } catch (e) {
      console.error(e);
      setError("Failed to load professors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfessors();  // Load professors data
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-800">Available Consultation Slots</h1>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3">{error}</div>}

        {loading && (
          <div className="bg-white border rounded p-6 text-gray-600">Loading professors...</div>
        )}

        {!loading && professors.length === 0 && <div className="bg-white border rounded p-8 text-center">No professors available.</div>}

        {!loading && professors.length > 0 && (
          <div className="overflow-x-auto bg-white border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Professor Name</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Availability</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {professors.map((professor) => (
                  <tr key={professor.professorId} className="border-t">
                    <td className="px-4 py-3">{professor.name}</td>
                    <td className="px-4 py-3">{professor.department}</td>
                    <td className="px-4 py-3">
                      {Object.keys(professor.availability).map((day) => (
                        <div key={day}>
                          <strong>{day}:</strong> {professor.availability[day].join(", ")}
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openReserve(professor)}
                        className="rounded-md px-3 py-1.5 text-sm bg-[#f37021] hover:bg-[#d35616] text-white"
                      >
                        Schedule
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
