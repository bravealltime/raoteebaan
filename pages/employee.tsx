import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Box, Flex, Heading, Text, Center, Spinner } from "@chakra-ui/react";
import { FaUserFriends } from "react-icons/fa";
import AppHeader from "../components/AppHeader";
import Sidebar from "../components/Sidebar";
import { onAuthStateChanged } from "firebase/auth";
import MainLayout from "../components/MainLayout";
import AddAnnouncementCard from "../components/AddAnnouncementCard";
import AnnouncementsList from "../components/AnnouncementsList";
import { SimpleGrid } from "@chakra-ui/react";

export default function Employee() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      const snap = await getDoc(doc(db, "users", u.uid));
      const userRole = snap.exists() ? snap.data().role : "user";
      const firestoreData = snap.exists() ? snap.data() : {};
      setRole(userRole);
      setCurrentUser({
        uid: u.uid,
        name: firestoreData.name || u.displayName || '',
        email: firestoreData.email || u.email || '',
        role: userRole,
        photoURL: firestoreData.avatar || u.photoURL || undefined,
      });
      if (userRole !== "admin" && userRole !== "employee") {
        if (userRole === "owner") return;
        router.replace("/dashboard");
      }
    });
    return () => unsub();
  }, []);
  if (role === null || !currentUser) return <Center minH="100vh"><Spinner color="blue.400" /></Center>;
  
  return (
    <MainLayout role={role} currentUser={currentUser}>
      <Box p={{ base: 4, md: 6 }}>
        <Heading mb={6}>Employee Dashboard</Heading>
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 4, md: 6 }} alignItems="start">
          <AddAnnouncementCard currentUser={currentUser} />
          <AnnouncementsList currentUser={currentUser} />
        </SimpleGrid>
      </Box>
    </MainLayout>
  );
} 