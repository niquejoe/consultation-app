import React, { useEffect, useState } from "react";
import { auth, db } from "./firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Login from "./Login";
import { collection, getDocs } from "firebase/firestore";

import {
  Box,
  Button,
  Heading,
  List,
  ListItem,
  Text,
  VStack,
  Flex,
  Spacer,
} from "@chakra-ui/react";

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
    <Box maxW="lg" mx="auto" mt={10} p={6} borderWidth={1} borderRadius="md" boxShadow="md">
      <Flex mb={4} align="center">
        <Heading size="md">Welcome, {user.email}</Heading>
        <Spacer />
        <Button colorScheme="red" onClick={handleLogout}>
          Logout
        </Button>
      </Flex>

      <Heading size="lg" mb={4}>Your Appointments:</Heading>
      {appointments.length === 0 ? (
        <Text>No appointments found.</Text>
      ) : (
        <List spacing={3}>
          {appointments.map((app) => (
            <ListItem key={app.id} p={3} borderWidth={1} borderRadius="md" boxShadow="sm">
              <Text fontWeight="bold">{app.subject || "No subject"}</Text>
              <Text>{app.date || "No date specified"}</Text>
              <Text fontSize="sm" color="gray.600">{app.remarks || ""}</Text>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

export default App;
