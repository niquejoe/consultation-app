import { useEffect, useState } from "react";
import { db } from "./firebaseConfig";
import { setDoc, doc, getDoc } from "firebase/firestore"; // For saving data to Firestore

export default function ProfessorDashboard({ user }) {
  const [availability, setAvailability] = useState({
    Monday: { AM: false, PM: false },
    Tuesday: { AM: false, PM: false },
    Wednesday: { AM: false, PM: false },
    Thursday: { AM: false, PM: false },
    Friday: { AM: false, PM: false },
  });
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [error, setError] = useState(null);

  // Load existing professor's availability
  const loadAvailability = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, "schedules", user.uid);  // Use professor's uid as the document ID
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setAvailability(docSnap.data());
      }
    } catch (e) {
      console.error("Error loading availability: ", e);
      setError("Failed to load availability.");
    }
  };

  useEffect(() => {
    loadAvailability();
  }, [user]);

  // Handle availability toggle (AM/PM)
  const handleTimeChange = (day, time) => {
    setAvailability((prevState) => ({
      ...prevState,
      [day]: {
        ...prevState[day],
        [time]: !prevState[day][time], // Toggle availability (AM/PM)
      },
    }));
  };

  // Save availability to Firestore
  const handleSubmitAvailability = async () => {
    setSavingAvailability(true);
    try {
      const professorRef = doc(db, "schedules", user.uid);
      await setDoc(professorRef, availability, { merge: true }); // Save availability data
      alert("Availability saved successfully!");
    } catch (e) {
      console.error("Error saving availability: ", e);
      setError("Failed to save availability.");
    } finally {
      setSavingAvailability(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-xl font-semibold text-gray-800 mb-4">Your Availability</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-3">
          {error}
        </div>
      )}

      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Set Your Availability</h2>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
          <div key={day} className="p-4 border rounded">
            <h3 className="text-lg font-semibold mb-4">{day}</h3>
            {["AM", "PM"].map((time) => (
              <label key={time} className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={availability[day][time]}
                  onChange={() => handleTimeChange(day, time)}
                  className="rounded"
                />
                {time}
              </label>
            ))}
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
