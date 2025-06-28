import { Box, Heading, Button, SimpleGrid, useToast, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure } from "@chakra-ui/react";
import { useEffect, useState, useRef } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, deleteDoc, doc, setDoc } from "firebase/firestore";
import RoomCard from "../components/RoomCard";
import AddRoomModal from "../components/AddRoomModal";
import { useRouter } from "next/router";

interface Room {
  id: string;
  status: "occupied" | "vacant";
  tenantName: string;
  area: number;
  latestTotal: number;
  electricity: number;
  rent: number;
  service: number;
  overdueDays: number;
}

const mockRooms: Room[] = [
  {
    id: "101",
    status: "occupied",
    tenantName: "สมชาย ใจร้าย",
    area: 30,
    latestTotal: 10201.5,
    electricity: 1552.5,
    rent: 5000,
    service: 3649,
    overdueDays: 179,
  },
  {
    id: "102",
    status: "occupied",
    tenantName: "สมหญิง รักดี",
    area: 35,
    latestTotal: 10339.5,
    electricity: 3051,
    rent: 5038.5,
    service: 250,
    overdueDays: 179,
  },
  {
    id: "103",
    status: "occupied",
    tenantName: "สมศักดิ์ มั่นคง",
    area: 40,
    latestTotal: 11449.5,
    electricity: 4054.5,
    rent: 1395,
    service: 6000,
    overdueDays: 17,
  },
];

export default function Dashboard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef(null);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "rooms"));
        let data: Room[] = querySnapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            status: d.status || "occupied",
            tenantName: d.tenantName || "-",
            area: d.area || 0,
            latestTotal: d.latestTotal || 0,
            electricity: d.electricity || 0,
            rent: d.rent || 0,
            service: d.service || 0,
            overdueDays: d.overdueDays || 0,
          };
        });
        // ถ้า Firestore rooms ว่าง ให้เพิ่ม mockRooms ลง Firestore
        if (data.length === 0) {
          await Promise.all(
            mockRooms.map(async (room) => {
              await setDoc(doc(db, "rooms", room.id), room);
            })
          );
          data = mockRooms;
        }
        setRooms(data);
      } catch (e) {
        toast({ title: "โหลดข้อมูลห้องพักล้มเหลว", status: "error" });
        setRooms(mockRooms);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, [toast]);

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    setIsDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, "rooms", deleteId));
      setRooms(rooms => rooms.filter(r => r.id !== deleteId));
      toast({ title: "ลบห้องสำเร็จ", status: "success" });
    } catch (e) {
      toast({ title: "ลบห้องไม่สำเร็จ", status: "error" });
    } finally {
      setIsDialogOpen(false);
      setDeleteId(null);
    }
  };

  const handleAddRoom = async (room: Room) => {
    try {
      await setDoc(doc(db, "rooms", room.id), room);
      setRooms(prev => [...prev, room]);
      toast({ title: "เพิ่มห้องใหม่สำเร็จ", status: "success" });
    } catch (e) {
      toast({ title: "เพิ่มห้องใหม่ไม่สำเร็จ", status: "error" });
    }
    onClose();
  };

  // ปุ่ม action อื่น ๆ สามารถเพิ่มฟังก์ชันได้ที่นี่
  const handleViewBill = (id: string) => {
    router.push(`/bill/${id}`);
  };
  const handleUndo = (id: string) => {
    toast({ title: `ย้อนกลับห้อง ${id} (mockup)`, status: "info" });
  };
  const handleSettings = (id: string) => {
    toast({ title: `ตั้งค่าห้อง ${id} (mockup)`, status: "info" });
  };

  return (
    <Box minH="100vh" bgGradient="linear(to-br, #232f3e, #2980b9)" p={8}>
      <Heading color="white" textAlign="center" mb={8}>หน้าหลัก</Heading>
      <Box display="flex" justifyContent="center" gap={4} mb={8}>
        <Button colorScheme="blue" onClick={onOpen}>เพิ่มห้องใหม่</Button>
        <Button colorScheme="green">อัปโหลด CSV</Button>
      </Box>
      <SimpleGrid columns={[1, 2, 3]} spacing={6} maxW="1200px" mx="auto">
        {rooms.map(room => (
          <RoomCard
            key={room.id}
            {...room}
            onDelete={() => handleDelete(room.id)}
            onViewBill={() => handleViewBill(room.id)}
            onUndo={() => handleUndo(room.id)}
            onSettings={() => handleSettings(room.id)}
          />
        ))}
      </SimpleGrid>
      <AddRoomModal isOpen={isOpen} onClose={onClose} onAdd={handleAddRoom} />
      <AlertDialog
        isOpen={isDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsDialogOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              ยืนยันการลบห้อง
            </AlertDialogHeader>
            <AlertDialogBody>
              คุณแน่ใจหรือไม่ว่าต้องการลบห้องนี้? การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setIsDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                ลบ
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
} 