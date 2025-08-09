import React, { useEffect } from "react";
import { db } from "./firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

function App() {
  useEffect(() => {
    const testDB = async () => {
      const querySnapshot = await getDocs(collection(db, "test"));
      querySnapshot.forEach((doc) => {
        console.log(`${doc.id} =>`, doc.data());
      });
    };
    testDB();
  }, []);

  return <h1 className="text-2xl font-bold">Consultation System</h1>;
}

export default App;
