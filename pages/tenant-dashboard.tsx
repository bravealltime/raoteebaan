import { Box, Heading, SimpleGrid, useToast, Center, Spinner, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import MainLayout from "../components/MainLayout";
import RoomCard from "../components/RoomCard"; // Assuming RoomCard can display single room info

interface Room {
  id: string;
  status: "occupied" | "vacant";
  tenantName: string;
  area: number;
  latestTotal: number;
  electricity: number;
  water: number;
  rent: number;
  service: number;
  overdueDays: number;
  billStatus: string;
}

export default function TenantDashboard() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userRoom, setUserRoom] = useState<Room | null>(null);
  const toast = useToast();
  const router = useRouter();

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

      if (userRole !== "user") {
        // Redirect non-user roles to their respective dashboards or login
        if (userRole === "admin") {
          router.replace("/dashboard");
        } else if (userRole === "owner") {
          router.replace("/"); // Or a specific owner dashboard
        } else if (userRole === "employee") {
          router.replace("/employee"); // Or a specific employee dashboard
        } else {
          router.replace("/login"); // Fallback
        }
        return;
      }

      // Fetch the room associated with this user
      if (firestoreData.roomId) {
        try {
          const roomSnap = await getDoc(doc(db, "rooms", firestoreData.roomId));
          if (roomSnap.exists()) {
            const d = roomSnap.data();
            setUserRoom({
              id: roomSnap.id,
              status: d.status || "occupied",
              tenantName: d.tenantName || "-",
              area: d.area || 0,
              latestTotal: d.latestTotal || 0,
              electricity: d.electricity || 0,
              water: d.water || 0,
              rent: d.rent || 0,
              service: d.service || 0,
              overdueDays: d.overdueDays || 0,
              billStatus: d.billStatus || "paid",
            });
          } else {
            toast({ title: "ไม่พบข้อมูลห้องพักของคุณ", status: "warning" });
          }
        } catch (e) {
          toast({ title: "โหลดข้อมูลห้องพักล้มเหลว", status: "error" });
        }
      } else {
        toast({ title: "ไม่พบการเชื่อมโยงห้องพักกับบัญชีของคุณ", status: "info" });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router, toast]);

  if (loading || role === null) {
    return <Center minH="100vh"><Spinner color="blue.400" /></Center>;
  }

  if (role !== "user") {
    return null; // Should have been redirected by useEffect
  }

  return (
    <MainLayout role={role} currentUser={currentUser}>
      <Box p={4}>
        <Heading as="h1" size="xl" mb={6}>ข้อมูลห้องพักของคุณ</Heading>
        {userRoom ? (
          <SimpleGrid columns={{ base: 1, md: 1 }} spacing={6}>
            <RoomCard
              room={userRoom}
              onDelete={() => {}} // Tenants cannot delete rooms
              onViewBill={() => router.push(`/bill/${userRoom.id}`)}
              onAddData={() => router.push(`/history/${userRoom.id}`)}
              onUndo={() => {}} // Tenants cannot undo
              onSettings={() => {}} // Tenants cannot edit room settings
              roomBill={null} // Pass actual bill data if available
            />
          </SimpleGrid>
        ) : (
          <Text>ไม่พบข้อมูลห้องพักสำหรับบัญชีของคุณ กรุณาติดต่อผู้ดูแลระบบ</Text>
        )}
      </Box>
    </MainLayout>
  );
}
