import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Box, Flex, Heading, Text, Center, Spinner } from "@chakra-ui/react";
import { FaInbox } from "react-icons/fa";
import AppHeader from "../components/AppHeader";
import Sidebar from "../components/Sidebar";
import { onAuthStateChanged } from "firebase/auth";

export default function Inbox() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      const snap = await getDoc(doc(db, "users", u.uid));
      const userRole = snap.exists() ? snap.data().role : "user";
      setRole(userRole);
      if (userRole !== "admin" && userRole !== "owner") {
        router.replace("/dashboard");
      }
    });
    return () => unsub();
  }, []);
  if (role === null) return <Center minH="100vh"><Spinner color="blue.400" /></Center>;
  if (role !== "admin" && role !== "owner") return null;
  return (
    <Box minH="100vh" bgGradient="linear(to-br, #e3f2fd, #bbdefb)">
      <AppHeader />
      <Flex minH="100vh" p={0}>
        <Sidebar role={role} />
        <Flex flex={1} align="center" justify="center" p={4}>
          <Box bg="white" borderRadius="2xl" boxShadow="xl" p={[8, 12]} textAlign="center" maxW="sm" w="full">
            <Box as={FaInbox} color="blue.400" fontSize="5xl" mb={4} />
            <Heading fontSize="2xl" color="blue.600" mb={2}>Inbox</Heading>
            <Text color="gray.600" fontSize="lg">Coming soon...</Text>
          </Box>
        </Flex>
      </Flex>
    </Box>
  );
} 