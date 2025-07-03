import { Box, Heading, Button, SimpleGrid, useToast, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure, Input, IconButton, Flex, Text, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Menu, MenuButton, MenuList, MenuItem, Center, Spinner, Image } from "@chakra-ui/react";
import { useEffect, useState, useRef, DragEvent } from "react";
import { db, auth } from "../lib/firebase";
import { collection, getDocs, deleteDoc, doc, setDoc, query, where, orderBy, limit, getDoc } from "firebase/firestore";
import RoomCard from "../components/RoomCard";
import AddRoomModal from "../components/AddRoomModal";
import { useRouter } from "next/router";
import AppHeader from "../components/AppHeader";
import { FaFilter, FaHome, FaInbox, FaBox, FaUserFriends, FaPlus, FaFileCsv, FaUpload, FaBolt, FaDownload, FaFilePdf, FaEye, FaCheckCircle } from "react-icons/fa";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import EditRoomModal from "../components/EditRoomModal";
import jsPDF from "jspdf";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import { onAuthStateChanged } from "firebase/auth";
import MainLayout from "../components/MainLayout";

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
  proofUrl?: string;
  latestBillId?: string;
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
  const [searchRoom, setSearchRoom] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'unpaid' | 'vacant'>('all');
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [selectedRoomForEquipment, setSelectedRoomForEquipment] = useState<string>("");
  const [role, setRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null); // Add currentUser state
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const { isOpen: isProofModalOpen, onOpen: onProofModalOpen, onClose: onProofModalClose } = useDisclosure();

  const user = {
    name: "xxx",
    avatar: "/avatar.png", // เปลี่ยน path ตามจริงถ้ามี
    greeting: "อาทิตย์ 21 มิ.ย. 2568"
  };

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
        photoURL: firestoreData.avatar || u.photoURL || undefined, // Ensure photoURL is taken from Firestore first, then Auth
      });
      console.log("Dashboard Page - Current User Data:", {
        uid: u.uid,
        name: firestoreData.name || u.displayName || '',
        email: firestoreData.email || u.email || '',
        role: userRole,
        photoURL: firestoreData.avatar || u.photoURL || undefined,
      });
        if (role !== "admin" && role !== "owner") return null;
        if (userRole === "owner") {
          router.replace("/");
          return;
        }
        if (userRole === "employee") {
          router.replace("/employee-dashboard");
          return;
        }
        router.replace("/tenant-dashboard");
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "rooms"));
        let data: Room[] = await Promise.all(querySnapshot.docs.map(async doc => {
          const d = doc.data();
          let billStatus = d.billStatus || "paid";
          let proofUrl = null;

          // Fetch latest bill for billStatus and proofUrl
          const q = query(
            collection(db, "bills"),
            where("roomId", "==", doc.id),
            orderBy("createdAt", "desc"),
            limit(1)
          );
          const billSnap = await getDocs(q);
          if (!billSnap.empty) {
            const latestBill = billSnap.docs[0].data();
            billStatus = latestBill.status || billStatus;
            proofUrl = latestBill.proofUrl || null;
            latestBillId = billSnap.docs[0].id; // Assign the bill ID here
          }

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
            billStatus: billStatus,
            proofUrl: proofUrl,
            latestBillId: latestBillId, // Include latestBillId here
          };
        }));
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

  const handleMarkAsPaid = async (roomId: string, billId: string) => {
    try {
      await setDoc(doc(db, "bills", billId), { status: "paid", proofUrl: null }, { merge: true });
      // Optionally update room status if needed
      await setDoc(doc(db, "rooms", roomId), { billStatus: "paid" }, { merge: true });
      toast({ title: "ทำเครื่องหมายว่าชำระแล้วสำเร็จ", status: "success" });
      // Refresh rooms data to reflect changes
      const querySnapshot = await getDocs(collection(db, "rooms"));
      let data: Room[] = await Promise.all(querySnapshot.docs.map(async doc => {
        const d = doc.data();
        let billStatus = d.billStatus || "paid";
        let proofUrl = null;

        const q = query(
          collection(db, "bills"),
          where("roomId", "==", doc.id),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const billSnap = await getDocs(q);
        if (!billSnap.empty) {
          const latestBill = billSnap.docs[0].data();
          billStatus = latestBill.status || billStatus;
          proofUrl = latestBill.proofUrl || null;
        }

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
          billStatus: billStatus,
          proofUrl: proofUrl,
        };
      }));
      setRooms(data);
    } catch (e) {
      console.error("Error marking as paid:", e);
      toast({ title: "ทำเครื่องหมายว่าชำระแล้วไม่สำเร็จ", status: "error" });
    }
  };

  const handleViewProof = (url: string) => {
    setProofImageUrl(url);
    onProofModalOpen();
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
    
    // Mockup equipment data
    const equipmentData = {
      roomId: selectedRoomForEquipment,
      date: new Date().toLocaleDateString('th-TH'),
      tenantName: rooms.find(r => r.id === selectedRoomForEquipment)?.tenantName || "ว่าง",
      items: [
        { name: "เตียง", status: "ครบ", condition: "ดี", notes: "" },
        { name: "ที่นอน", status: "ครบ", condition: "ดี", notes: "" },
        { name: "โต๊ะทำงาน", status: "ครบ", condition: "ดี", notes: "" },
        { name: "เก้าอี้", status: "ครบ", condition: "ดี", notes: "" },
        { name: "ตู้เสื้อผ้า", status: "ครบ", condition: "ดี", notes: "" },
        { name: "แอร์คอนดิชัน", status: "ครบ", condition: "ดี", notes: "" },
        { name: "พัดลม", status: "ครบ", condition: "ดี", notes: "" },
        { name: "โคมไฟ", status: "ครบ", condition: "ดี", notes: "" },
        { name: "ผ้าม่าน", status: "ครบ", condition: "ดี", notes: "" },
        { name: "พรม", status: "ครบ", condition: "ดี", notes: "" }
      ]
    };

    // Create PDF
    const pdf = new jsPDF();
    
    // Set font for Thai text
    pdf.setFont("helvetica");
    
    // Header
    pdf.setFontSize(20);
    pdf.setTextColor(75, 0, 130); // Purple color
    pdf.text("ใบประเมินอุปกรณ์ในห้องพัก", 105, 20, { align: "center" });
    
    // Room information
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`ห้อง: ${equipmentData.roomId}`, 20, 40);
    pdf.text(`ผู้เช่า: ${equipmentData.tenantName}`, 20, 50);
    pdf.text(`วันที่ประเมิน: ${equipmentData.date}`, 20, 60);
    
    // Table header
    pdf.setFillColor(75, 0, 130);
    pdf.rect(20, 75, 170, 10, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.text("ลำดับ", 25, 82);
    pdf.text("รายการอุปกรณ์", 45, 82);
    pdf.text("สถานะ", 100, 82);
    pdf.text("สภาพ", 130, 82);
    pdf.text("หมายเหตุ", 160, 82);
    
    // Table content
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);
    equipmentData.items.forEach((item, index) => {
      const y = 90 + (index * 8);
      if (y > 250) {
        pdf.addPage();
        return;
      }
      
      pdf.text(`${index + 1}`, 25, y);
      pdf.text(item.name, 45, y);
      pdf.text(item.status, 100, y);
      pdf.text(item.condition, 130, y);
      pdf.text(item.notes || "-", 160, y);
    });
    
    // Signature section
    const signatureY = 220;
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text("ลายเซ็นผู้ประเมิน:", 20, signatureY);
    pdf.text("ลายเซ็นผู้เช่า:", 110, signatureY);
    
    // Signature lines
    pdf.line(20, signatureY + 10, 80, signatureY + 10);
    pdf.line(110, signatureY + 10, 170, signatureY + 10);
    
    pdf.setFontSize(10);
    pdf.text("(_________________)", 20, signatureY + 25);
    pdf.text("(_________________)", 110, signatureY + 25);
    
    pdf.text("วันที่: _________________", 20, signatureY + 40);
    pdf.text("วันที่: _________________", 110, signatureY + 40);
    
    // Footer note
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text("หมายเหตุ: ใบประเมินนี้เป็นเอกสารสำหรับตรวจสอบอุปกรณ์ในห้องพัก กรุณาตรวจสอบและเซ็นยืนยัน", 20, 270);
    
    // Save PDF
    const fileName = `equipment-assessment-room-${selectedRoomForEquipment}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    toast({ title: "ดาวน์โหลดใบประเมินอุปกรณ์สำเร็จ", status: "success" });
    setIsEquipmentModalOpen(false);
    setSelectedRoomForEquipment("");
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

  return (
    <MainLayout role={role} currentUser={currentUser}>
      <Box p={[2, 4, 8]}>
        <Flex mb={4} gap={2} align="center" flexWrap="wrap">
          <Button
            leftIcon={<FaHome />}
            colorScheme="blue"
            variant="solid"
            borderRadius="xl"
            fontWeight="bold"
            mr={2}
          >
            จัดการห้อง
          </Button>
          <Button
            leftIcon={<FaFilter />}
            colorScheme="gray"
            variant="ghost"
            borderRadius="xl"
            fontWeight="bold"
            mr={2}
            onClick={() => setFilterType(filterType === 'unpaid' ? 'all' : 'unpaid')}
          >
            {filterType === 'unpaid' ? 'แสดงทั้งหมด' : 'บิลค้างชำระ'}
          </Button>
          <Button
            leftIcon={<FaFilter />}
            colorScheme="gray"
            variant="ghost"
            borderRadius="xl"
            fontWeight="bold"
            mr={2}
            onClick={() => setFilterType(filterType === 'vacant' ? 'all' : 'vacant')}
          >
            {filterType === 'vacant' ? 'แสดงทั้งหมด' : 'ห้องว่าง'}
          </Button>
          <Input
            placeholder="ค้นหาห้อง..."
            maxW="220px"
            bg="gray.50"
            borderRadius="xl"
            color="gray.800"
            mr={2}
            value={searchRoom}
            onChange={(e) => setSearchRoom(e.target.value)}
          />
          <Button
            leftIcon={<FaPlus />}
            colorScheme="green"
            borderRadius="xl"
            fontWeight="bold"
            ml="auto"
            onClick={onOpen}
          >
            เพิ่มห้องใหม่
          </Button>
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              id={room.id}
              status={room.status}
              tenantName={room.tenantName}
              area={room.area}
              latestTotal={room.latestTotal}
              electricity={room.electricity}
              water={room.water}
              rent={room.rent}
              service={room.service}
              overdueDays={room.overdueDays}
              billStatus={room.billStatus}
              proofUrl={room.proofUrl}
              role={role}
              onViewBill={() => handleViewBill(room.id)}
              onAddData={() => handleAddData(room.id)}
              onDelete={() => handleDelete(room.id)}
              onSettings={() => handleSettings(room.id)}
              onViewProof={() => room.proofUrl && handleViewProof(room.proofUrl)}
              onMarkAsPaid={() => room.latestBillId && handleMarkAsPaid(room.id, room.latestBillId)}
            />
          ))}
        </SimpleGrid>

        {/* Proof Image Modal */}
        <Modal isOpen={isProofModalOpen} onClose={onProofModalClose} isCentered size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalCloseButton />
            <ModalBody p={4}>
              {proofImageUrl && (
                <Image src={proofImageUrl} alt="Payment Proof" maxW="full" maxH="80vh" objectFit="contain" />
              )}
            </ModalBody>
          </ModalContent>
        </Modal>

        <AddRoomModal isOpen={isOpen} onClose={onClose} onAddRoom={handleAddRoom} lastWaterMeter={lastWaterMeter} lastElecMeter={lastElecMeter} />
        {editRoom && (
          <EditRoomModal isOpen={!!editRoom} onClose={() => setEditRoom(null)} room={editRoom} onSave={handleSaveEditRoom} />
        )}

        <AlertDialog
          isOpen={isDialogOpen}
          leastDestructiveRef={cancelRef}
          onClose={() => setIsDialogOpen(false)}
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                ลบห้อง
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
    </MainLayout>
  );
} 