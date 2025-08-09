import React, { useEffect, useState } from "react";
import { auth, db } from "./firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";  // <-- Added signOut here
import Login from "./Login";
import { collection, getDocs } from "firebase/firestore";

function App() {
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchAppointments = async () => {
      const snapshot = await getDocs(collection(db, "appointments"));
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    fetchAppointments();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!user) return <Login />;

  return (
    <div>
      <h1>Welcome, {user.email}</h1>
      <button onClick={handleLogout}>Logout</button> {/* Added logout button here */}
      <h2>Your Appointments:</h2>
      <ul>
        {appointments.map(app => (
          <li key={app.id}>{app.subject || "No subject"}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;