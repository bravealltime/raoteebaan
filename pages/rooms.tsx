import { Box, Heading, Button, SimpleGrid, useToast, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure, Input, IconButton, Flex, Text, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
import { useEffect, useState, useRef, DragEvent } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, deleteDoc, doc, setDoc, query, where, orderBy, limit } from "firebase/firestore";
import RoomCard from "../components/RoomCard";
import AddRoomModal from "../components/AddRoomModal";
import { useRouter } from "next/router";
import AppHeader from "../components/AppHeader";
import { FaFilter, FaHome, FaInbox, FaBox, FaUserFriends, FaPlus, FaFileCsv, FaUpload, FaBolt, FaDownload, FaFilePdf } from "react-icons/fa";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import EditRoomModal from "../components/EditRoomModal";
import jsPDF from "jspdf";
import Link from "next/link";

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

function generateSampleRoomsCSV() {
  const headers = [
    "Room,Status,Tenant,Area,LatestTotal,Electricity,Rent,Service,OverdueDays,DueDate,BillStatus"
  ];
  const rows = [];
  for (let i = 1; i <= 30; i++) {
    const status = i % 3 === 0 ? "vacant" : "occupied";
    const tenant = status === "occupied" ? `สมชาย ${i}` : "-";
    const area = 28 + (i % 5) * 2;
    const total = 5000 + i * 123;
    const elec = 100 + i * 3;
    const rent = 5000;
    const service = 200 + (i % 4) * 50;
    const overdue = i % 4 === 0 ? i : 0;
    const dueDate = `2025-07-${(i % 28 + 1).toString().padStart(2, "0")}`;
    const billStatus = i % 5 === 0 ? "unpaid" : i % 3 === 0 ? "pending" : "paid";
    rows.push([
      `Room ${100 + i}`,
      status,
      tenant,
      area,
      total,
      elec,
      rent,
      service,
      overdue,
      dueDate,
      billStatus
    ].join(","));
  }
  return headers.concat(rows).join("\n");
}

function handleExportCSV() {
  const csv = generateSampleRoomsCSV();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, "rooms_sample.csv");
}

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef(null);
  const toast = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isAddAllOpen, setIsAddAllOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [lastWaterMeter, setLastWaterMeter] = useState<number | undefined>(undefined);
  const [lastElecMeter, setLastElecMeter] = useState<number | undefined>(undefined);
  const [roomBills, setRoomBills] = useState<Record<string, any>>({});
  const [searchRoom, setSearchRoom] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'unpaid' | 'vacant'>('all');
  const [selectedRoomForEquipment, setSelectedRoomForEquipment] = useState<string>("");

  const user = {
    name: "xxx",
    avatar: "/avatar.png", // เปลี่ยน path ตามจริงถ้ามี
    greeting: "อาทิตย์ 21 มิ.ย. 2568"
  };

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
            water: d.water || 0,
            rent: d.rent || 0,
            service: d.service || 0,
            overdueDays: d.overdueDays || 0,
            billStatus: d.billStatus || "paid",
          };
        });
        setRooms(data);
      } catch (e) {
        toast({ title: "โหลดข้อมูลห้องพักล้มเหลว", status: "error" });
        setRooms([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, [toast]);

  useEffect(() => {
    async function fetchAllBills() {
      const bills: Record<string, any> = {};
      for (const room of rooms) {
        const q = query(
          collection(db, "bills"),
          where("roomId", "==", room.id),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const bill = snap.docs[0].data();
          let total = 0;
          total += Number(bill.electricityTotal || 0);
          total += Number(bill.waterTotal || 0);
          total += Number(bill.rent || 0);
          total += Number(bill.service || 0);
          if (Array.isArray(bill.extraServices)) {
            total += bill.extraServices.reduce((sum, svc) => sum + Number(svc.value || 0), 0);
          }
          bills[room.id] = { ...bill, total };
        }
      }
      setRoomBills(bills);
    }
    if (rooms.length > 0) fetchAllBills();
  }, [rooms]);

  const handleDelete = (id: string) => {
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

  const handleAddRoom = async (roomData: any) => {
    try {
      // แปลงข้อมูลจาก AddRoomModal ให้ตรงกับ Room interface
      const room: Room = {
        id: roomData.id,
        status: roomData.status || "occupied",
        tenantName: roomData.tenantName,
        area: roomData.area,
        latestTotal: (roomData.elecTotal || 0) + (roomData.waterTotal || 0) + (roomData.rent || 0) + (roomData.service || 0),
        electricity: roomData.elecTotal || 0,
        water: roomData.waterTotal || 0,
        rent: roomData.rent || 0,
        service: roomData.service || 0,
        overdueDays: 0,
        billStatus: "paid",
      };
      
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
  const handleAddData = (id: string) => {
    router.push(`/history/${id}`);
  };
  const handleUndo = (id: string) => {
    toast({ title: `ย้อนกลับห้อง ${id} (mockup)`, status: "info" });
  };
  const handleSettings = (id: string) => {
    const room = rooms.find(r => r.id === id);
    if (room) setEditRoom(room);
  };
  const handleSaveEditRoom = async (room: Partial<Room>) => {
    try {
      await setDoc(doc(db, "rooms", room.id!), {
        ...room,
        billStatus: room.billStatus || "paid"
      });
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, ...room } : r));
      toast({ title: "บันทึกข้อมูลห้องสำเร็จ", status: "success" });
    } catch (e) {
      toast({ title: "บันทึกข้อมูลห้องไม่สำเร็จ", status: "error" });
    }
    setEditRoom(null);
  };

  function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedRooms = results.data as any[];
        setImportPreview(importedRooms);
      },
      error: (err) => {
        toast({ title: "นำเข้า CSV ไม่สำเร็จ", description: err.message, status: "error" });
      }
    });
    e.target.value = "";
  }

  function handleDropCSV(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setImportFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedRooms = results.data as any[];
        setImportPreview(importedRooms);
      },
      error: (err) => {
        toast({ title: "นำเข้า CSV ไม่สำเร็จ", description: err.message, status: "error" });
      }
    });
  }

  async function handleConfirmImport() {
    if (!importPreview.length) return;
    try {
      await Promise.all(importPreview.map(async (r) => {
        const room = {
          id: r.Room || r.room || r.id,
          status: r.Status || r.status || "occupied",
          tenantName: r.Tenant || r.tenantName || "-",
          area: Number(r.Area || r.area || 0),
          latestTotal: Number(r.LatestTotal || r.latestTotal || 0),
          electricity: Number(r.Electricity || r.electricity || 0),
          water: Number(r.Water || r.water || 0),
          rent: Number(r.Rent || r.rent || 0),
          service: Number(r.Service || r.service || 0),
          overdueDays: Number(r.OverdueDays || r.overdueDays || 0),
          billStatus: r.BillStatus || "paid",
        };
        await setDoc(doc(db, "rooms", room.id), room);
      }));
      toast({ title: `นำเข้า ${importPreview.length} ห้องสำเร็จ`, status: "success" });
      setIsImportOpen(false);
      setImportFile(null);
      setImportPreview([]);
      window.location.reload();
    } catch (e) {
      toast({ title: "นำเข้าข้อมูลไม่สำเร็จ", status: "error" });
    }
  }

  function handleCloseImport() {
    setIsImportOpen(false);
    setImportFile(null);
    setImportPreview([]);
  }

  const handleAddAllData = () => {
    toast({ title: "เพิ่มข้อมูลห้องทั้งหมดสำเร็จ (mockup)", status: "success" });
    setIsAddAllOpen(false);
  };

  const handleDownloadEquipmentAssessment = () => {
    setIsEquipmentModalOpen(true);
  };

  const handleConfirmEquipmentDownload = () => {
    if (!selectedRoomForEquipment) {
      toast({ title: "กรุณาเลือกห้อง", status: "warning" });
      return;
    }
    // ... (PDF generation code as before)
  };

  const fetchLastMeter = async (roomId: string) => {
    // ... (fetch meter code as before)
  };

  const handleOpenAddRoom = async () => {
    setLastWaterMeter(undefined);
    setLastElecMeter(undefined);
    onOpen();
  };

  const filteredRooms = rooms.filter(room => {
    const matchSearch = room.id.toLowerCase().includes(searchRoom.trim().toLowerCase()) ||
      room.tenantName.toLowerCase().includes(searchRoom.trim().toLowerCase());
    let matchFilter = true;
    if (filterType === 'unpaid') {
      matchFilter = room.billStatus === 'unpaid';
    } else if (filterType === 'vacant') {
      matchFilter = room.status === 'vacant';
    }
    return matchSearch && matchFilter;
  });

  // --- Modal open/close handlers ---
  const openAddRoom = () => router.push("/rooms?modal=add", undefined, { shallow: true });
  const closeAddRoom = () => router.push("/rooms", undefined, { shallow: true });

  const openEditRoom = (id: string) => router.push(`/rooms?modal=edit&id=${id}`, undefined, { shallow: true });
  const closeEditRoom = () => router.push("/rooms", undefined, { shallow: true });

  const openImport = () => router.push("/rooms?modal=import", undefined, { shallow: true });
  const closeImport = () => router.push("/rooms", undefined, { shallow: true });

  const openAddAll = () => router.push("/rooms?modal=addall", undefined, { shallow: true });
  const closeAddAll = () => router.push("/rooms", undefined, { shallow: true });

  const openEquipment = () => router.push("/rooms?modal=equipment", undefined, { shallow: true });
  const closeEquipment = () => router.push("/rooms", undefined, { shallow: true });

  const openDelete = (id: string) => router.push(`/rooms?modal=delete&id=${id}`, undefined, { shallow: true });
  const closeDelete = () => router.push("/rooms", undefined, { shallow: true });

  return (
    <>
      <AppHeader user={user} />
      <Flex minH="100vh" bgGradient="linear(to-br, #e3f2fd, #bbdefb)" p={0}>
        {/* Sidebar */}
        <Box
          w={["70px", "220px"]}
          minH="calc(100vh - 64px)"
          bg="white"
          borderRight="1.5px solid #e3f2fd"
          boxShadow="0 2px 16px 0 rgba(33,150,243,0.06)"
          px={[1, 4]}
          py={6}
          display="flex"
          flexDirection="column"
          gap={4}
          zIndex={2}
        >
          {/* Main menu */}
          <Link href="/dashboard" passHref legacyBehavior>
            <Button as="a" leftIcon={<FaHome />} colorScheme="blue" variant={router.pathname === "/dashboard" ? "solid" : "ghost"} borderRadius="xl" fontWeight="bold" mb={2} w="full" justifyContent="flex-start">
              Dashboard
            </Button>
          </Link>
          <Link href="/rooms" passHref legacyBehavior>
            <Button as="a" leftIcon={<FaHome />} colorScheme="blue" variant={router.pathname === "/rooms" ? "solid" : "ghost"} borderRadius="xl" fontWeight="bold" mb={2} w="full" justifyContent="flex-start">
              Rooms
            </Button>
          </Link>
          <Button leftIcon={<FaInbox />} colorScheme="gray" variant={router.pathname === "/inbox" ? "solid" : "ghost"} borderRadius="xl" mb={2} w="full" justifyContent="flex-start">
            Inbox
          </Button>
          <Button leftIcon={<FaBox />} colorScheme="gray" variant={router.pathname === "/parcel" ? "solid" : "ghost"} borderRadius="xl" mb={2} w="full" justifyContent="flex-start">
            Parcel
          </Button>
          <Button leftIcon={<FaUserFriends />} colorScheme="gray" variant={router.pathname === "/employee" ? "solid" : "ghost"} borderRadius="xl" mb={8} w="full" justifyContent="flex-start">
            Employee
          </Button>
          {/* Action buttons */}
          <Button leftIcon={<FaPlus />} colorScheme="blue" w="full" borderRadius="2xl" mb={2} size="lg" fontFamily="Kanit" fontWeight="bold" fontSize="md" px={3} whiteSpace="normal" textAlign="center" lineHeight="shorter" boxShadow="sm" _hover={{ boxShadow: 'md', transform: 'translateY(-2px)', bg: 'blue.500', color: 'white' }} onClick={() => setIsAddRoomOpen(true)}>
            เพิ่มห้องใหม่
          </Button>
          <Button leftIcon={<FaBolt />} colorScheme="orange" w="full" borderRadius="2xl" mb={2} size="lg" fontFamily="Kanit" fontWeight="bold" fontSize="md" px={3} whiteSpace="normal" textAlign="center" lineHeight="shorter" boxShadow="sm" _hover={{ boxShadow: 'md', transform: 'translateY(-2px)', bg: 'orange.400', color: 'white' }} onClick={() => setIsAddAllOpen(true)}>
            เพิ่มข้อมูลห้องทั้งหมด
          </Button>
          <Button leftIcon={<FaUpload />} colorScheme="green" w="full" borderRadius="2xl" mb={2} size="lg" fontFamily="Kanit" fontWeight="bold" fontSize="md" px={3} whiteSpace="normal" textAlign="center" lineHeight="shorter" boxShadow="sm" _hover={{ boxShadow: 'md', transform: 'translateY(-2px)', bg: 'green.500', color: 'white' }} onClick={handleExportCSV}>
            อัปโหลด CSV
          </Button>
          <Button leftIcon={<FaFileCsv />} colorScheme="gray" w="full" borderRadius="2xl" mb={2} size="lg" fontFamily="Kanit" fontWeight="bold" fontSize="md" px={3} whiteSpace="normal" textAlign="center" lineHeight="shorter" boxShadow="sm" _hover={{ boxShadow: 'md', transform: 'translateY(-2px)', bg: 'gray.200', color: 'gray.700' }} onClick={() => setIsImportOpen(true)}>
            นำเข้า CSV
          </Button>
          <Button leftIcon={<FaFilePdf />} colorScheme="purple" w="full" borderRadius="2xl" size="lg" fontFamily="Kanit" fontWeight="bold" fontSize="md" px={3} whiteSpace="normal" textAlign="center" lineHeight="shorter" boxShadow="sm" _hover={{ boxShadow: 'md', transform: 'translateY(-2px)', bg: 'purple.400', color: 'white' }} onClick={() => setIsEquipmentModalOpen(true)}>
            ดาวน์โหลดไฟล์ประเมินอุปกรณ์
          </Button>
        </Box>
        {/* Main content */}
        <Box flex={1} p={[2, 4, 8]}>
          <Flex align="center" mb={6} gap={3} flexWrap="wrap">
            <Text fontWeight="bold" fontSize={["xl", "2xl"]} color="gray.700" mr={4}>Rooms</Text>
            <Input
              placeholder="Enter room NO."
              maxW="220px"
              bg="white"
              borderRadius="xl"
              mr={2}
              value={searchRoom}
              onChange={e => setSearchRoom(e.target.value)}
            />
            <Menu>
              <MenuButton as={IconButton} aria-label="Filter" icon={<FaFilter />} variant="outline" borderRadius="xl" />
              <MenuList>
                <MenuItem onClick={() => setFilterType('all')}>แสดงทั้งหมด</MenuItem>
                <MenuItem onClick={() => setFilterType('unpaid')}>ห้องที่ยังไม่จ่าย</MenuItem>
                <MenuItem onClick={() => setFilterType('vacant')}>ห้องว่าง</MenuItem>
              </MenuList>
            </Menu>
          </Flex>
          <SimpleGrid minChildWidth="260px" spacing={0}>
            {filteredRooms.map(room => {
              const electricity = roomBills[room.id]?.electricityTotal || room.electricity || 0;
              const water = roomBills[room.id]?.waterTotal || room.water || 0;
              const rent = roomBills[room.id]?.rent || room.rent || 0;
              const extraServicesTotal = Array.isArray(roomBills[room.id]?.extraServices)
                ? roomBills[room.id].extraServices.reduce((sum, svc) => sum + Number(svc.value || 0), 0)
                : 0;
              const service = extraServicesTotal;
              const latestTotal = electricity + water + rent + service;
              return (
                <RoomCard
                  key={room.id}
                  {...room}
                  latestTotal={latestTotal}
                  electricity={electricity}
                  water={water}
                  rent={rent}
                  service={service}
                  onDelete={() => handleDelete(room.id)}
                  onViewBill={() => handleViewBill(room.id)}
                  onAddData={() => handleAddData(room.id)}
                  onSettings={() => handleSettings(room.id)}
                />
              );
            })}
          </SimpleGrid>
        </Box>
        {/* AddRoomModal */}
        <AddRoomModal isOpen={isAddRoomOpen} onClose={() => setIsAddRoomOpen(false)} onAdd={handleAddRoom} />
        {/* AddAll Modal (mockup) */}
        <Modal isOpen={isAddAllOpen} onClose={() => setIsAddAllOpen(false)}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>เพิ่มข้อมูลห้องทั้งหมด</ModalHeader>
            <ModalCloseButton />
            <ModalBody>ฟีเจอร์นี้อยู่ระหว่างพัฒนา (mockup)</ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={() => setIsAddAllOpen(false)}>ปิด</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
        {/* Import CSV Modal (mockup) */}
        <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>นำเข้า CSV</ModalHeader>
            <ModalCloseButton />
            <ModalBody>ฟีเจอร์นี้อยู่ระหว่างพัฒนา (mockup)</ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={() => setIsImportOpen(false)}>ปิด</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
        {/* Equipment Assessment Modal (mockup) */}
        <Modal isOpen={isEquipmentModalOpen} onClose={() => setIsEquipmentModalOpen(false)}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>ดาวน์โหลดไฟล์ประเมินอุปกรณ์</ModalHeader>
            <ModalCloseButton />
            <ModalBody>ฟีเจอร์นี้อยู่ระหว่างพัฒนา (mockup)</ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={() => setIsEquipmentModalOpen(false)}>ปิด</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
        {/* EditRoomModal */}
        {editRoom && (
          <EditRoomModal
            isOpen={!!editRoom}
            initialRoom={editRoom}
            onClose={() => setEditRoom(null)}
            onSave={room => handleSaveEditRoom({ ...editRoom, ...room })}
          />
        )}
        {/* Confirm Delete Dialog */}
        <AlertDialog
          isOpen={isDialogOpen}
          leastDestructiveRef={cancelRef}
          onClose={() => setIsDialogOpen(false)}
        >
          <AlertDialogOverlay />
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              ยืนยันการลบห้อง
            </AlertDialogHeader>
            <AlertDialogBody>
              คุณแน่ใจหรือไม่ว่าต้องการลบห้องนี้? การลบจะไม่สามารถย้อนกลับได้
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
        </AlertDialog>
      </Flex>
    </>
  );
} 