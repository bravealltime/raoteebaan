import { Box, Heading, Button, SimpleGrid, useToast, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure, Input, IconButton, Flex, Text, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Menu, MenuButton, MenuList, MenuItem, Center, Spinner, Select, Checkbox } from "@chakra-ui/react";
import { useEffect, useState, useRef, DragEvent } from "react";
import { db, auth } from "../lib/firebase";
import { collection, getDocs, deleteDoc, doc, setDoc, query, where, orderBy, limit, getDoc, addDoc, updateDoc } from "firebase/firestore";
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
import { onAuthStateChanged } from "firebase/auth";
import Sidebar from "../components/Sidebar";
import MainLayout from "../components/MainLayout";
import MeterReadingModal from "../components/MeterReadingModal";

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
  extraServices?: { label: string, value: number }[];
  overdueDays: number;
  billStatus: string;
  tenantId?: string | null;
  tenantEmail?: string | null;
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
  const [previousReadings, setPreviousReadings] = useState<Record<string, { electricity: number; water: number }>>({});
  
  const [searchRoom, setSearchRoom] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'unpaid' | 'vacant'>('all');
  const [selectedRoomForEquipment, setSelectedRoomForEquipment] = useState<string>("");
  const [equipmentList, setEquipmentList] = useState([
    { name: "เตียง", selected: true },
    { name: "ที่นอน", selected: true },
    { name: "โต๊ะทำงาน", selected: true },
    { name: "เก้าอี้", selected: true },
    { name: "ตู้เสื้อผ้า", selected: true },
    { name: "เครื่องปรับอากาศ", selected: true },
    { name: "พัดลม", selected: false },
    { name: "โคมไฟ", selected: true },
    { name: "ผ้าม่าน", selected: true },
    { name: "เครื่องทำน้ำอุ่น", selected: true },
  ]);
  const [isMeterReadingModalOpen, setIsMeterReadingModalOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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
      setUserId(u.uid);
      setUserEmail(u.email);
      const snap = await getDoc(doc(db, "users", u.uid));
      const userRole = snap.exists() ? snap.data().role : "user";
      setRole(userRole);
      if (userRole === "admin") {
        // Admin can see all rooms, no redirect needed
      } else if (userRole === "owner") {
        // Owner is already on the correct page
      } else {
        router.replace("/dashboard");
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch all rooms
        const roomsSnapshot = await getDocs(collection(db, "rooms"));
        const roomsData: Room[] = roomsSnapshot.docs.map(doc => {
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
            extraServices: d.extraServices || [],
            overdueDays: d.overdueDays || 0,
            billStatus: d.billStatus || "paid",
            tenantId: d.tenantId || null,
            tenantEmail: d.tenantEmail || null,
          };
        });

        setRooms(roomsData);

        // Fetch the latest bill for each room in parallel
        const billPromises = roomsData.map(async (room) => {
          const q = query(
            collection(db, "bills"),
            where("roomId", "==", room.id),
            orderBy("createdAt", "desc"),
            limit(1)
          );
          const billSnap = await getDocs(q);
          if (!billSnap.empty) {
            return { roomId: room.id, bill: billSnap.docs[0].data() };
          } else {
            return { roomId: room.id, bill: null };
          }
        });

        const fetchedBills = await Promise.all(billPromises);
        const billsMap: Record<string, any> = {};
        fetchedBills.forEach(({ roomId, bill }) => {
          if (bill) {
            billsMap[roomId] = bill;
          }
        });
        setRoomBills(billsMap);

      } catch (e) {
        console.error(e);
        toast({ title: "โหลดข้อมูลล้มเหลว", status: "error" });
        setRooms([]);
        setRoomBills({});
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

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
        tenantId: roomData.tenantId || null,
        tenantEmail: roomData.tenantEmail || null,
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

  const handleOpenMeterModal = async () => {
    toast({ title: "กำลังโหลดข้อมูลล่าสุด...", status: "info", duration: 1500 });
    const readings: Record<string, { electricity: number; water: number }> = {};
    const promises = rooms.map(async (room) => {
      const q = query(
        collection(db, "bills"),
        where("roomId", "==", room.id),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const billSnap = await getDocs(q);
      if (!billSnap.empty) {
        const lastBill = billSnap.docs[0].data();
        console.log('Last Bill Data for room', room.id, ':', lastBill);
        readings[room.id] = {
          electricity: lastBill.electricityMeterCurrent || 0,
          water: lastBill.waterMeterCurrent || 0,
        };
      } else {
        readings[room.id] = { electricity: 0, water: 0 };
      }
    });

    await Promise.all(promises);
    setPreviousReadings(readings);
    setIsMeterReadingModalOpen(true);
  };
    const handleSaveMeterReadings = async (data: any) => {
    const { rates, recordDate, dueDate, readings } = data;
    const warnings: string[] = [];
    let successCount = 0;

    const toastId = toast({
      title: "กำลังบันทึกข้อมูล...",
      status: "info",
      duration: null, // Indefinite
      isClosable: true,
    });

    try {
      const billPromises = readings.map(async (reading: any) => {
        const roomDocRef = doc(db, "rooms", reading.roomId);
        const roomSnap = await getDoc(roomDocRef);
        if (!roomSnap.exists()) {
          warnings.push(`ไม่พบห้อง ${reading.roomId}`);
          return;
        }

        const roomData = roomSnap.data();
        const prevElec = previousReadings[reading.roomId]?.electricity || 0;
        const prevWater = previousReadings[reading.roomId]?.water || 0;

        const hasNewElec = reading.electricity && String(reading.electricity).trim() !== '';
        const hasNewWater = reading.water && String(reading.water).trim() !== '';

        if (!hasNewElec && !hasNewWater) {
          return; // Skip if no new readings for this room
        }

        const newElec = hasNewElec ? Number(reading.electricity) : prevElec;
        const newWater = hasNewWater ? Number(reading.water) : prevWater;

        if ((hasNewElec && newElec < prevElec) || (hasNewWater && newWater < prevWater)) {
          warnings.push(`ห้อง ${reading.roomId}: เลขมิเตอร์ใหม่น้อยกว่าของเก่า`);
          return;
        }

        const elecUnits = newElec - prevElec;
        const waterUnits = newWater - prevWater;

        const elecTotal = elecUnits * rates.electricity;
        const waterTotal = waterUnits * rates.water;
        
        const rent = roomData.rent || 0;
        const service = roomData.service || 0;
        const extraServicesTotal = (roomData.extraServices || []).reduce((sum: number, s: { value: number }) => sum + s.value, 0);
        const total = elecTotal + waterTotal + rent + service + extraServicesTotal;

        const newBill = {
          roomId: reading.roomId,
          tenantId: roomData.tenantId || null,
          createdAt: new Date(),
          date: new Date(recordDate),
          dueDate: new Date(dueDate),
          status: "unpaid",
          
          // Align with history page structure
          electricityMeterCurrent: newElec,
          electricityMeterPrev: prevElec,
          electricityRate: rates.electricity,
          electricityUnit: elecUnits,
          electricityTotal: elecTotal,

          waterMeterCurrent: newWater,
          waterMeterPrev: prevWater,
          waterRate: rates.water,
          waterUnit: waterUnits,
          waterTotal: waterTotal,

          rent,
          service,
          extraServices: roomData.extraServices || [],
          total,
        };

        await addDoc(collection(db, "bills"), newBill);

        await updateDoc(roomDocRef, {
          latestTotal: total,
          billStatus: "unpaid",
          overdueDays: 0,
          electricity: elecTotal,
          water: waterTotal,
        });
        
        successCount++;
      });

      await Promise.all(billPromises);

      toast.update(toastId, {
        title: "บันทึกข้อมูลสำเร็จ!",
        description: `บันทึกข้อมูลบิลของ ${successCount} ห้องเรียบร้อยแล้ว ${warnings.length > 0 ? `(มีคำเตือน ${warnings.length} รายการ)` : ''}`,
        status: "success",
        duration: 5000,
      });
      
      if (warnings.length > 0) {
          // Show warnings in a separate toast
          toast({
              title: "คำเตือน",
              description: warnings.join(', '),
              status: "warning",
              duration: 10000,
              isClosable: true
          })
      }

      setIsMeterReadingModalOpen(false);
      // Refresh data to reflect the changes
      window.location.reload();

    } catch (error) {
      console.error("Error saving meter readings:", error);
      toast.update(toastId, {
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้",
        status: "error",
        duration: 5000,
      });
    }
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
          tenantId: r.TenantId || null,
          tenantEmail: r.TenantEmail || null,
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

  const handleConfirmEquipmentDownload = async () => {
    if (!selectedRoomForEquipment) {
      toast({ title: "กรุณาเลือกห้อง", status: "warning" });
      return;
    }

    const room = rooms.find(r => r.id === selectedRoomForEquipment);
    if (!room) {
      toast({ title: "ไม่พบข้อมูลห้อง", status: "error" });
      return;
    }

    const selectedItems = equipmentList.filter(item => item.selected);
    if (selectedItems.length === 0) {
      toast({ title: "กรุณาเลือกอุปกรณ์อย่างน้อย 1 รายการ", status: "warning" });
      return;
    }

    try {
      const fontResponse = await fetch('/Kanit-Regular.ttf');
      const fontBuffer = await fontResponse.arrayBuffer();
      const fontBase64 = btoa(new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

      const pdf = new jsPDF();
      pdf.addFileToVFS('Kanit-Regular.ttf', fontBase64);
      pdf.addFont('Kanit-Regular.ttf', 'Kanit', 'normal');
      pdf.setFont('Kanit');

      pdf.setFontSize(20);
      pdf.setTextColor(41, 128, 185);
      pdf.text("ใบประเมินสภาพห้องและอุปกรณ์", 105, 20, { align: "center" });

      pdf.setFontSize(12);
      pdf.setTextColor(52, 73, 94);
      pdf.text(`หมายเลขห้อง: ${room.id}`, 20, 40);
      pdf.text(`ผู้เช่า: ${room.tenantName || "ว่าง"}`, 20, 50);
      pdf.text(`วันที่ประเมิน: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`, 130, 40);

      const tableHeaderY = 65;
      pdf.setFillColor(236, 240, 241);
      pdf.rect(15, tableHeaderY, 180, 10, "F");
      pdf.setTextColor(44, 62, 80);
      pdf.setFontSize(10);
      pdf.text("ลำดับ", 18, tableHeaderY + 7);
      pdf.text("รายการอุปกรณ์", 35, tableHeaderY + 7);
      pdf.text("สภาพ", 110, tableHeaderY + 7);
      pdf.text("หมายเหตุ", 165, tableHeaderY + 7);
      pdf.text("ดี", 112, tableHeaderY + 7);
      pdf.text("พอใช้", 128, tableHeaderY + 7);
      pdf.text("ชำรุด", 145, tableHeaderY + 7);

      pdf.setTextColor(52, 73, 94);
      pdf.setFontSize(10);
      let tableContentY = tableHeaderY + 10;
      selectedItems.forEach((item, index) => {
        tableContentY += 10;
        if (tableContentY > 260) {
            pdf.addPage();
            tableContentY = 20;
        }
        pdf.text(`${index + 1}.`, 18, tableContentY);
        pdf.text(item.name, 35, tableContentY);
        pdf.rect(112, tableContentY - 4, 5, 5); // Checkbox for "ดี"
        pdf.rect(128, tableContentY - 4, 5, 5); // Checkbox for "พอใช้"
        pdf.rect(145, tableContentY - 4, 5, 5); // Checkbox for "ชำรุด"
        pdf.line(165, tableContentY + 1, 195, tableContentY + 1); // Line for notes
      });

      const signatureY = tableContentY + 30 > 240 ? 20 : tableContentY + 30;
      if (signatureY === 20) pdf.addPage();
      
      pdf.setFontSize(12);
      pdf.setTextColor(44, 62, 80);
      pdf.text("ลงชื่อผู้ประเมิน:", 20, signatureY);
      pdf.text("ลงชื่อผู้เช่า:", 110, signatureY);
      
      pdf.setLineWidth(0.2);
      pdf.line(20, signatureY + 15, 80, signatureY + 15);
      pdf.line(110, signatureY + 15, 170, signatureY + 15);
      
      pdf.setFontSize(10);
      pdf.text("(.................................................)", 20, signatureY + 20);
      pdf.text("(.................................................)", 110, signatureY + 20);
      pdf.text("วันที่: .................................", 20, signatureY + 30);
      pdf.text("วันที่: .................................", 110, signatureY + 30);

      pdf.setFontSize(8);
      pdf.setTextColor(127, 140, 141);
      pdf.text("เอกสารฉบับนี้ใช้เพื่อยืนยันสภาพอุปกรณ์ ณ วันที่เข้าพัก โปรดตรวจสอบอย่างละเอียด", 105, 285, { align: "center" });

      const fileName = `equipment-assessment-room-${selectedRoomForEquipment}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({ title: "ดาวน์โหลดใบประเมินสำเร็จ", status: "success" });
      setIsEquipmentModalOpen(false);
      setSelectedRoomForEquipment("");

    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "เกิดข้อผิดพลาดในการสร้าง PDF", description: "ไม่สามารถโหลดฟอนต์ได้", status: "error" });
    }
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
    if (!role) return false; // Don't render if role is not set yet

    if (role === "admin") return true;
    if (role === "owner") {
      if (room.tenantId && userId && room.tenantId === userId) return true;
      if (room.tenantEmail && userEmail && room.tenantEmail === userEmail) return true;
      return false;
    }
    return false;
  }).filter(room => {
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

  if (role === null) return <Center minH="100vh"><Spinner color="blue.400" /></Center>;
  if (role !== "admin" && role !== "owner") return null;

  return (
    <MainLayout role={role}>
      <Box flex={1} p={[2, 4, 8]}>
        <Flex align="center" mb={6} gap={3} flexWrap="wrap">
          <Text fontWeight="bold" fontSize={["xl", "2xl"]} color="gray.700" mr={4}>Rooms</Text>
          {role === 'admin' && (
            <>
              <Button
                leftIcon={<FaPlus />}
                colorScheme="blue"
                variant="solid"
                borderRadius="xl"
                onClick={() => setIsAddRoomOpen(true)}
              >
                เพิ่มห้อง
              </Button>
              <Button
                leftIcon={<FaUpload />}
                colorScheme="teal"
                variant="outline"
                borderRadius="xl"
                onClick={() => setIsImportOpen(true)}
              >
                นำเข้า CSV
              </Button>
              <Button
                leftIcon={<FaFilePdf />}
                colorScheme="purple"
                variant="outline"
                borderRadius="xl"
                onClick={handleDownloadEquipmentAssessment}
              >
                ใบประเมินอุปกรณ์
              </Button>
              <Button
                leftIcon={<FaPlus />}
                colorScheme="green"
                variant="solid"
                borderRadius="xl"
                onClick={handleOpenMeterModal}
              >
                เพิ่มข้อมูลทุกห้อง
              </Button>
            </>
          )}
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
            const rent = room.rent || 0;
            const baseService = room.service || 0;
            const extraServicesTotal = Array.isArray(room.extraServices)
              ? room.extraServices.reduce((sum, svc) => sum + Number(svc.value || 0), 0)
              : 0;
            const service = baseService + extraServicesTotal;
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
      {/* Equipment Assessment Modal */}
      <Modal isOpen={isEquipmentModalOpen} onClose={() => setIsEquipmentModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>ดาวน์โหลดไฟล์ประเมินอุปกรณ์</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={2} fontWeight="bold">เลือกห้อง</Text>
            <Select
              placeholder="เลือกห้อง"
              value={selectedRoomForEquipment}
              onChange={(e) => setSelectedRoomForEquipment(e.target.value)}
              mb={4}
            >
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  ห้อง {room.id} ({room.tenantName})
                </option>
              ))}
            </Select>
            <Text mb={2} fontWeight="bold">เลือกรายการอุปกรณ์</Text>
            <SimpleGrid columns={2} spacing={2}>
              {equipmentList.map((item, index) => (
                <Checkbox 
                  key={item.name} 
                  isChecked={item.selected}
                  onChange={e => {
                    const newList = [...equipmentList];
                    newList[index].selected = e.target.checked;
                    setEquipmentList(newList);
                  }}
                >
                  {item.name}
                </Checkbox>
              ))}
            </SimpleGrid>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsEquipmentModalOpen(false)}>ยกเลิก</Button>
            <Button colorScheme="blue" onClick={handleConfirmEquipmentDownload} disabled={!selectedRoomForEquipment}>
              ดาวน์โหลด
            </Button>
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

      <MeterReadingModal 
        isOpen={isMeterReadingModalOpen}
        onClose={() => setIsMeterReadingModalOpen(false)}
        onSave={handleSaveMeterReadings}
        rooms={rooms}
        previousReadings={previousReadings}
      />

    </MainLayout>
  );
} 