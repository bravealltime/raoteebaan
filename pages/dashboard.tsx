import { Box, Heading, Button, SimpleGrid, useToast, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure, Input, IconButton, Flex, Text, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton } from "@chakra-ui/react";
import { useEffect, useState, useRef, DragEvent } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, deleteDoc, doc, setDoc, query, where, orderBy, limit } from "firebase/firestore";
import RoomCard from "../components/RoomCard";
import AddRoomModal from "../components/AddRoomModal";
import { useRouter } from "next/router";
import AppHeader from "../components/AppHeader";
import { FaFilter, FaHome, FaInbox, FaBox, FaUserFriends, FaPlus, FaFileCsv, FaUpload, FaBolt } from "react-icons/fa";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import EditRoomModal from "../components/EditRoomModal";

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

export default function Dashboard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef(null);
  const toast = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [isAddAllOpen, setIsAddAllOpen] = useState(false);
  const [lastWaterMeter, setLastWaterMeter] = useState<number | undefined>(undefined);
  const [lastElecMeter, setLastElecMeter] = useState<number | undefined>(undefined);
  const [roomBills, setRoomBills] = useState<Record<string, any>>({});

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
  const handleSaveEditRoom = async (room: Room) => {
    try {
      await setDoc(doc(db, "rooms", room.id), room);
      setRooms(prev => prev.map(r => r.id === room.id ? room : r));
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
    toast({ title: "ฟีเจอร์เพิ่มข้อมูลห้องทั้งหมด (mockup)", description: "สำหรับบันทึกยูนิตค่าน้ำค่าไฟเดือนใหม่", status: "info" });
    setIsAddAllOpen(false);
  };

  const fetchLastMeter = async (roomId: string) => {
    // สมมุติว่าเก็บใน collection 'bills' โดยมี field 'roomId', 'waterMeterCurrent', 'electricityMeterCurrent', 'createdAt'
    const billsRef = collection(db, "bills");
    const q = query(billsRef, where("roomId", "==", roomId), orderBy("createdAt", "desc"), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data();
      setLastWaterMeter(data.waterMeterCurrent ?? 0);
      setLastElecMeter(data.electricityMeterCurrent ?? 0);
    } else {
      setLastWaterMeter(0);
      setLastElecMeter(0);
    }
  };

  const handleOpenAddRoom = async () => {
    // ถ้าต้องการ autofill จากห้องที่เลือก ให้ใส่ roomId ที่ต้องการ
    // ตัวอย่างนี้จะไม่ autofill ถ้าไม่มี roomId (เพิ่มห้องใหม่จริง ๆ)
    setLastWaterMeter(undefined);
    setLastElecMeter(undefined);
    onOpen();
  };

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
          <Button leftIcon={<FaHome />} colorScheme="blue" variant="ghost" borderRadius="xl" fontWeight="bold" mb={2} w="full" justifyContent="flex-start" isActive>
            Room
          </Button>
          <Button leftIcon={<FaInbox />} colorScheme="gray" variant="ghost" borderRadius="xl" mb={2} w="full" justifyContent="flex-start">
            Inbox
          </Button>
          <Button leftIcon={<FaBox />} colorScheme="gray" variant="ghost" borderRadius="xl" mb={2} w="full" justifyContent="flex-start">
            Parcel
          </Button>
          <Button leftIcon={<FaUserFriends />} colorScheme="gray" variant="ghost" borderRadius="xl" mb={8} w="full" justifyContent="flex-start">
            Employee
          </Button>
          {/* Action buttons */}
          <Button leftIcon={<FaPlus />} colorScheme="blue" w="full" borderRadius="xl" mb={2} onClick={handleOpenAddRoom}>
            เพิ่มห้องใหม่
          </Button>
          <Button leftIcon={<FaBolt />} colorScheme="orange" w="full" borderRadius="xl" mb={2} onClick={() => setIsAddAllOpen(true)}>
            เพิ่มข้อมูลห้องทั้งหมด
          </Button>
          <Button leftIcon={<FaUpload />} colorScheme="green" w="full" borderRadius="xl" mb={2} onClick={handleExportCSV}>
            อัปโหลด CSV
          </Button>
          <Button leftIcon={<FaFileCsv />} colorScheme="gray" w="full" borderRadius="xl" onClick={() => setIsImportOpen(true)}>
            นำเข้า CSV
          </Button>
        </Box>
        {/* Main content */}
        <Box flex={1} p={[2, 4, 8]}>
          <Flex align="center" mb={6} gap={3} flexWrap="wrap">
            <Text fontWeight="bold" fontSize={["xl", "2xl"]} color="gray.700" mr={4}>Room</Text>
            <Input placeholder="Enter room NO." maxW="220px" bg="white" borderRadius="xl" mr={2} />
            <IconButton aria-label="Filter" icon={<FaFilter />} variant="ghost" />
          </Flex>
          <SimpleGrid minChildWidth="260px" spacing={0}>
            {rooms.map(room => {
              const electricity = roomBills[room.id]?.electricityTotal || room.electricity || 0;
              const water = roomBills[room.id]?.waterTotal || room.water || 0;
              const rent = roomBills[room.id]?.rent || room.rent || 0;
              const extraServicesTotal = Array.isArray(roomBills[room.id]?.extraServices)
                ? roomBills[room.id].extraServices.reduce((sum, svc) => sum + Number(svc.value || 0), 0)
                : 0;
              const service = extraServicesTotal;
              const latestTotal = electricity + water + rent + service;
              console.log('[DEBUG] dashboard room:', room);
              console.log('[DEBUG] dashboard bill:', roomBills[room.id]);
              console.log('[DEBUG] RoomCard props:', {
                ...room,
                latestTotal,
                electricity,
                water,
                rent,
                service
              });
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
        <AddRoomModal isOpen={isOpen} onClose={onClose} onAdd={handleAddRoom} lastWaterMeter={lastWaterMeter} lastElecMeter={lastElecMeter} />
        <EditRoomModal
          isOpen={!!editRoom}
          onClose={() => setEditRoom(null)}
          onSave={handleSaveEditRoom}
          initialRoom={editRoom || rooms[0]}
        />
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
        {/* Modal Import CSV */}
        <Modal isOpen={isImportOpen} onClose={handleCloseImport} isCentered size="md">
          <ModalOverlay />
          <ModalContent borderRadius="2xl" p={2}>
            <ModalHeader fontWeight="bold" color="blue.600">นำเข้าข้อมูลห้อง (CSV)</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Box mb={4}>
                <input
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  id="import-csv-input"
                  onChange={handleImportCSV}
                />
                <Box
                  border={isDragActive ? "2.5px dashed #3182ce" : "2px dashed #cbd5e1"}
                  borderRadius="xl"
                  p={6}
                  textAlign="center"
                  bg={isDragActive ? "blue.50" : "gray.50"}
                  color="blue.600"
                  fontWeight="bold"
                  fontSize="md"
                  cursor="pointer"
                  transition="all 0.2s"
                  onClick={() => document.getElementById("import-csv-input")?.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragActive(true); }}
                  onDragLeave={e => { e.preventDefault(); setIsDragActive(false); }}
                  onDrop={handleDropCSV}
                  mb={2}
                >
                  {isDragActive ? "ปล่อยไฟล์ที่นี่เพื่ออัปโหลด" : "ลากไฟล์ CSV มาวาง หรือคลิกเพื่อเลือกไฟล์"}
                </Box>
                {importFile && (
                  <Text fontSize="sm" color="gray.600" mb={2}>ไฟล์ที่เลือก: {importFile.name}</Text>
                )}
                {importPreview.length > 0 && (
                  <Box bg="gray.50" borderRadius="md" p={3} mt={2}>
                    <Text fontWeight="bold" color="blue.700" mb={1}>ตัวอย่างข้อมูล ({importPreview.length} ห้อง)</Text>
                    <Box as="ul" pl={4} fontSize="sm" color="gray.700">
                      {importPreview.slice(0, 5).map((r, idx) => (
                        <li key={idx}>{r.Room || r.room || JSON.stringify(r)}</li>
                      ))}
                      {importPreview.length > 5 && <li>...และอื่นๆ</li>}
                    </Box>
                  </Box>
                )}
              </Box>
            </ModalBody>
            <ModalFooter>
              <Button onClick={handleCloseImport} variant="ghost" mr={2}>ยกเลิก</Button>
              <Button colorScheme="blue" onClick={handleConfirmImport} isDisabled={!importPreview.length}>ยืนยันนำเข้า</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
        {/* Modal หรือ Toast แจ้งเตือน (mockup) */}
        <Modal isOpen={isAddAllOpen} onClose={() => setIsAddAllOpen(false)} isCentered>
          <ModalOverlay />
          <ModalContent borderRadius="2xl" p={2}>
            <ModalHeader fontWeight="bold" color="orange.500">เพิ่มข้อมูลห้องทั้งหมด</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Text mb={2}>ฟีเจอร์นี้สำหรับบันทึกยูนิตค่าน้ำค่าไฟเดือนใหม่ของทุกห้องในครั้งเดียว (อยู่ระหว่างพัฒนา)</Text>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="orange" mr={3} onClick={handleAddAllData}>ตกลง</Button>
              <Button onClick={() => setIsAddAllOpen(false)}>ยกเลิก</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Flex>
    </>
  );
} 