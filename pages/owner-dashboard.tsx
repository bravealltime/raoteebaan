import { Box, Heading, Button, SimpleGrid, useToast, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure, Input, IconButton, Flex, Text, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Menu, MenuButton, MenuList, MenuItem, Center, Spinner, Image, InputGroup, InputRightElement, Container, VStack, Icon, HStack } from "@chakra-ui/react";
import { useEffect, useState, useRef, DragEvent } from "react";
import { db, auth } from "../lib/firebase";
import { collection, getDocs, deleteDoc, doc, setDoc, query, where, orderBy, limit, getDoc, Query } from "firebase/firestore";
import RoomCard from "../components/RoomCard";
import AddRoomModal from "../components/AddRoomModal";
import { useRouter } from "next/router";
import AppHeader from "../components/AppHeader";
import { FaFilter, FaHome, FaInbox, FaBox, FaUserFriends, FaPlus, FaFileCsv, FaUpload, FaBolt, FaDownload, FaFilePdf, FaEye, FaCheckCircle, FaSearch, FaBed, FaFileInvoiceDollar, FaClipboardList } from "react-icons/fa";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import EditRoomModal from "../components/EditRoomModal";
import jsPDF from "jspdf";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import { onAuthStateChanged } from "firebase/auth";
import MainLayout from "../components/MainLayout";
import InvoiceModal from "../components/InvoiceModal";
import RoomPaymentCardList, { RoomPaymentCard } from "../components/RoomPaymentCard";
import RoomStatusChart from '../components/RoomStatusChart';
import PaymentStatusChart from '../components/PaymentStatusChart';

interface Room {
  id: string;
  status: "occupied" | "vacant";
  tenantName: string;
  tenantId?: string; // Add tenantId here
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

export default function OwnerDashboard() {
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
  const [filterType, setFilterType] = useState<'all' | 'unpaid' | 'vacant' | 'review'>('unpaid');
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [selectedRoomForEquipment, setSelectedRoomForEquipment] = useState<string>("");
  const [role, setRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const { isOpen: isProofModalOpen, onOpen: onProofModalOpen, onClose: onProofModalClose } = useDisclosure();
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [parcelCount, setParcelCount] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);
  const [search, setSearch] = useState("");
  const [roomStatusData, setRoomStatusData] = useState<any[]>([]);
  const [paymentStatusData, setPaymentStatusData] = useState<any[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyPaid, setMonthlyPaid] = useState(0);

  const filterLabels: Record<string, string> = {
    all: 'ทั้งหมด',
    unpaid: 'ค้างชำระ',
    vacant: 'ห้องว่าง',
    review: 'รอตรวจสอบ'
  };

  const user = {
    name: "xxx",
    avatar: "/avatar.png",
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
        photoURL: firestoreData.avatar || u.photoURL || undefined,
        ownerId: firestoreData.ownerId || undefined,
      });
        if (userRole !== "owner") {
          router.replace("/"); // Redirect non-owners to home or login
          return;
        }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        let roomsQuery: Query = collection(db, "rooms");

        if (currentUser?.uid) {
          roomsQuery = query(roomsQuery, where("ownerId", "==", currentUser.uid));
        } else {
          // If currentUser is not available yet, wait for it
          setLoading(false);
          return;
        }

        const querySnapshot = await getDocs(roomsQuery);
        let data: Room[] = await Promise.all(querySnapshot.docs.map(async doc => {
          const d = doc.data();
          let billStatus = d.billStatus || "paid";
          let proofUrl = null;
          let latestBillId = undefined;

          const q = query(
            collection(db, "bills"),
            where("roomId", "==", doc.id),
            orderBy("createdAt", "desc"),
            limit(1)
          );
          const billSnap = await getDocs(q);
        if (!billSnap.empty) {
          const latestBill = billSnap.docs[0].data();
          proofUrl = latestBill.proofUrl || null;
          latestBillId = billSnap.docs[0].id;
          // Update billStatus from the latest bill
          billStatus = latestBill.status || d.billStatus || "paid";
        } else {
          billStatus = d.billStatus || "paid";
        }

        

        return {
          id: doc.id,
          status: d.status || "occupied",
            tenantName: d.tenantName || "-",
            tenantId: d.tenantId || undefined, // Add this line
            area: d.area || 0,
            latestTotal: d.latestTotal || 0,
            electricity: d.electricity || 0,
            water: d.water || 0,
            rent: d.rent || 0,
            service: d.service || 0,
            overdueDays: d.overdueDays || 0,
            billStatus: billStatus,
            proofUrl: proofUrl,
            latestBillId: latestBillId,
          };
        }));
        setRooms(data);

        // Process data for charts
        const occupied = data.filter(r => r.status === 'occupied').length;
        const vacant = data.filter(r => r.status === 'vacant').length;
        setRoomStatusData([
          { name: 'มีผู้เช่า', value: occupied },
          { name: 'ห้องว่าง', value: vacant },
        ]);

        const paid = data.filter(r => r.billStatus === 'paid').length;
        const unpaid = data.filter(r => r.billStatus === 'unpaid').length;
        setPaymentStatusData([
          { name: 'สถานะ', paid: paid, unpaid: unpaid },
        ]);

      } catch (e) {
        toast({ title: "โหลดข้อมูลห้องพักล้มเหลว", status: "error" });
        setRooms([]);
      } finally {
        setLoading(false);
      }
    };

    if (role === "owner") {
      fetchRooms();
    }

    const handleRouteChange = (url: string) => {
      if (url === "/owner-dashboard") {
        fetchRooms();
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [toast, router.events, role, currentUser]);

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

  useEffect(() => {
    async function fetchParcels() {
      const querySnapshot = await getDocs(collection(db, "parcels"));
      const parcels = querySnapshot.docs.map(doc => doc.data());
      const notReceived = parcels.filter((p: any) => p.status === 'received');
      setParcelCount(notReceived.length);
    }
    fetchParcels();
  }, []);

  useEffect(() => {
    async function fetchInbox() {
      const querySnapshot = await getDocs(collection(db, "conversations"));
      const conversations = querySnapshot.docs.map(doc => doc.data());
      const currentUid = currentUser?.uid;
      const unread = conversations.filter((c: any) =>
        c.lastMessage &&
        c.lastMessage.receiverId === currentUid &&
        !c.lastMessage.isRead
      );
      setInboxCount(unread.length);
    }
    if (currentUser?.uid) fetchInbox();

    async function fetchMonthlyBills() {
      if (!currentUser?.uid) return;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const billsRef = collection(db, "bills");
      const q = query(
        billsRef, 
        where("ownerId", "==", currentUser.uid),
        where("createdAt", ">=", startOfMonth), 
        where("createdAt", "<=", endOfMonth)
      );
      const snap = await getDocs(q);

      let totalIncome = 0;
      let totalPaid = 0;

      snap.docs.forEach(doc => {
        const bill = doc.data();
        totalIncome += bill.total || 0;
        if (bill.status === 'paid') {
          totalPaid += bill.total || 0;
        }
      });

      setMonthlyIncome(totalIncome);
      setMonthlyPaid(totalPaid);
    }

    fetchMonthlyBills();
  }, [currentUser]);

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

  const handleViewBill = (id: string) => {
    const room = rooms.find(r => r.id === id);
    const bill = roomBills[id];
    if (!room || !bill) return;
    setSelectedBill({
      date: bill.date || "-",
      dueDate: bill.dueDate || "-",
      room: room.id,
      tenant: room.tenantName,
      total: bill.total || 0,
      items: [
        { label: "ค่าไฟฟ้า", value: bill.electricityTotal || 0 },
        { label: "ค่าน้ำ", value: bill.waterTotal || 0 },
        { label: "ค่าเช่า", value: bill.rent || 0 },
        { label: "ค่าบริการ", value: bill.service || 0 },
        ...(Array.isArray(bill.extraServices) ? bill.extraServices.map((svc: any) => ({ label: svc.label, value: svc.value })) : [])
      ],
      promptpay: bill.promptpay || undefined,
      area: room.area,
      status: room.status,
      overdueDays: room.overdueDays,
      billStatus: room.billStatus,
    });
    setIsInvoiceOpen(true);
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
      await setDoc(doc(db, "rooms", roomId), { billStatus: "paid" }, { merge: true });
      toast({ title: "ทำเครื่องหมายว่าชำระแล้วสำเร็จ", status: "success" });
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

  const handleDownloadEquipmentAssessment = () => {
    setIsEquipmentModalOpen(true);
  };

  const handleConfirmEquipmentDownload = () => {
    if (!selectedRoomForEquipment) {
      toast({ title: "กรุณาเลือกห้อง", status: "warning" });
      return;
    }
    
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

    const pdf = new jsPDF();
    
    pdf.setFont("helvetica");
    
    pdf.setFontSize(20);
    pdf.setTextColor(75, 0, 130);
    pdf.text("ใบประเมินอุปกรณ์ในห้องพัก", 105, 20, { align: "center" });
    
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`ห้อง: ${equipmentData.roomId}`, 20, 40);
    pdf.text(`ผู้เช่า: ${equipmentData.tenantName}`, 20, 50);
    pdf.text(`วันที่ประเมิน: ${equipmentData.date}`, 20, 60);
    
    pdf.setFillColor(75, 0, 130);
    pdf.rect(20, 75, 170, 10, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.text("ลำดับ", 25, 82);
    pdf.text("รายการอุปกรณ์", 45, 82);
    pdf.text("สถานะ", 100, 82);
    pdf.text("สภาพ", 130, 82);
    pdf.text("หมายเหตุ", 160, 82);
    
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
    
    const signatureY = 220;
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text("ลายเซ็นผู้ประเมิน:", 20, signatureY);
    pdf.text("ลายเซ็นผู้เช่า:", 110, signatureY);
    
    pdf.line(20, signatureY + 10, 80, signatureY + 10);
    pdf.line(110, signatureY + 10, 170, signatureY + 10);
    
    pdf.setFontSize(10);
    pdf.text("(_________________)", 20, signatureY + 25);
    pdf.text("(_________________)", 110, signatureY + 25);
    
    pdf.text("วันที่: _________________", 20, signatureY + 40);
    pdf.text("วันที่: _________________", 110, signatureY + 40);
    
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text("หมายเหตุ: ใบประเมินนี้เป็นเอกสารสำหรับตรวจสอบอุปกรณ์ในห้องพัก กรุณาตรวจสอบและเซ็นยืนยัน", 20, 270);
    
    const fileName = `equipment-assessment-room-${selectedRoomForEquipment}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    toast({ title: "ดาวน์โหลดใบประเมินอุปกรณ์สำเร็จ", status: "success" });
    setIsEquipmentModalOpen(false);
    setSelectedRoomForEquipment("");
  };

  const fetchLastMeter = async (roomId: string) => {
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
    setLastWaterMeter(undefined);
    setLastElecMeter(undefined);
    onOpen();
  };

  const totalRooms = rooms.length;
  const availableRooms = rooms.filter(r => r.status === "occupied").length;
  const vacantRooms = rooms.filter(r => r.status === "vacant").length;
  // Count rooms that have bills with proofUrl (slips uploaded for review)
  const paymentsUnderReview = rooms.filter(r => r.proofUrl && r.proofUrl !== null).length;
  // Filter unpaid rooms based on billStatus from rooms collection
  const unpaidRooms = rooms.filter(room => room.billStatus === 'unpaid');
  
  // Filter rooms based on filterType and search
  const getFilteredRooms = () => {
    let baseRooms: Room[] = [];
    
    switch (filterType) {
      case 'unpaid':
        baseRooms = rooms.filter(room => room.billStatus === 'unpaid');
        break;
      case 'vacant':
        baseRooms = rooms.filter(room => room.status === 'vacant');
        break;
      case 'review':
        baseRooms = rooms.filter(room => room.proofUrl && room.proofUrl !== null);
        break;
      default:
        baseRooms = rooms;
    }
    
    // Apply search filter
    const searchTerm = search.trim().toLowerCase();
    return baseRooms.filter(room => {
      return room.id.toLowerCase().includes(searchTerm) ||
             room.tenantName.toLowerCase().includes(searchTerm);
    });
  };

  const filteredRooms = getFilteredRooms();

  // Convert rooms to RoomPaymentCard format
  const roomPaymentCards = filteredRooms.map(room => {
    const bill = roomBills[room.id];
    const total = bill?.total || room.latestTotal || 0;
    
    // Determine status based on filterType and room data
    let status: "pending" | "unpaid" | "review" | "paid" = "unpaid";
    if (filterType === 'review' && room.proofUrl) {
      status = "review";
    } else if (room.billStatus === 'pending') {
      status = "pending";
    } else if (room.billStatus === 'unpaid') {
      status = "unpaid";
    } else if (room.billStatus === 'paid') {
      status = "paid";
    }

    return {
      id: room.id,
      status,
      total,
      electricity: bill?.electricityTotal || room.electricity || 0,
      water: bill?.waterTotal || room.water || 0,
      rent: bill?.rent || room.rent || 0,
      
      onReview: status === "review" ? () => {
        if (room.proofUrl) {
          setProofImageUrl(room.proofUrl);
          onProofModalOpen();
        }
      } : undefined,
      onRevert: status === "review" ? async () => {
        try {
          if (room.latestBillId) {
            // Remove proofUrl from the bill
            await setDoc(doc(db, "bills", room.latestBillId), { 
              proofUrl: null 
            }, { merge: true });
            
            // Update room's billStatus back to unpaid
            await setDoc(doc(db, "rooms", room.id), { 
              billStatus: "unpaid" 
            }, { merge: true });
            
            toast({ title: `ย้อนกลับห้อง ${room.id} ไปค้างชำระสำเร็จ`, status: "success" });
            
            // Refresh the page to update the data
            window.location.reload();
          }
        } catch (error) {
          console.error("Error reverting room status:", error);
          toast({ title: "ย้อนกลับสถานะไม่สำเร็จ", status: "error" });
        }
      } : undefined,
      onConfirmPayment: status === "review" ? async () => {
        try {
          if (room.latestBillId) {
            // Update bill status to paid and remove proofUrl
            await setDoc(doc(db, "bills", room.latestBillId), { 
              status: "paid",
              proofUrl: null,
              paidDate: new Date()
            }, { merge: true });
            
            // Update room's billStatus to paid
            await setDoc(doc(db, "rooms", room.id), { 
              billStatus: "paid" 
            }, { merge: true });
            
            toast({ title: `ยืนยันการชำระเงินห้อง ${room.id} สำเร็จ`, status: "success" });
            
            // Refresh the page to update the data
            window.location.reload();
          }
        } catch (error) {
          console.error("Error confirming payment:", error);
          toast({ title: "ยืนยันการชำระเงินไม่สำเร็จ", status: "error" });
        }
      } : undefined,
      tenantName: room.tenantName,
      dueDate: bill?.dueDate ? (typeof bill.dueDate === 'object' ? bill.dueDate.toDate?.()?.toLocaleDateString('th-TH') : bill.dueDate) : "ไม่ระบุ",
      lastReading: bill?.date ? (typeof bill.date === 'object' ? bill.date.toDate?.()?.toLocaleDateString('th-TH') : bill.date) : "ไม่ระบุ",
      roomType: "ห้องพัก",
      onNotify: async () => {
        if (!room.tenantId) {
          toast({ title: "ไม่พบข้อมูลผู้เช่าสำหรับห้องนี้", status: "warning" });
          return;
        }
        try {
          const response = await fetch('/api/send-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tenantId: room.tenantId,
              roomId: room.id,
              message: `ห้อง ${room.id} ของคุณมียอดค้างชำระ กรุณาตรวจสอบบิลและชำระเงินโดยเร็วที่สุด`,
            }),
          });

          if (response.ok) {
            toast({ title: `ส่งแจ้งเตือนห้อง ${room.id} สำเร็จ`, status: "success" });
          } else {
            const errorData = await response.json();
            toast({ title: `ส่งแจ้งเตือนห้อง ${room.id} ไม่สำเร็จ`, description: errorData.message, status: "error" });
          }
        } catch (error) {
          console.error("Error sending notification:", error);
          toast({ title: `ส่งแจ้งเตือนห้อง ${room.id} ไม่สำเร็จ`, description: "เกิดข้อผิดพลาดในการเชื่อมต่อ", status: "error" });
        }
      },
    };
  });

  return (
    <MainLayout 
      role={role} 
      currentUser={currentUser}
      isProofModalOpen={isProofModalOpen}
      onProofModalClose={onProofModalClose}
      proofImageUrl={proofImageUrl}
    >
      <Container maxW="container.xl" py={{ base: 2, md: 4 }}>
        <VStack spacing={6} align="stretch">
          {/* Summary Cards */}
          <SimpleGrid columns={{ base: 1, sm: 2, md: 4, lg: 4 }} spacing={{ base: 4, md: 6 }}>
            <SummaryCard icon={FaHome} label="ห้องทั้งหมด" value={totalRooms} />
            <SummaryCard icon={FaBed} label="ห้องมีผู้เช่า" value={availableRooms} />
            <SummaryCard icon={FaBed} label="ห้องว่าง" value={vacantRooms} color="green.500" />
            <SummaryCard icon={FaFileInvoiceDollar} label="รอตรวจสอบ" value={paymentsUnderReview} color="yellow.500" />
            <SummaryCard icon={FaInbox} label="กล่องข้อความ" value={inboxCount} />
            <SummaryCard icon={FaBox} label="พัสดุ" value={parcelCount} />
            <SummaryCard icon={FaFileInvoiceDollar} label="รายรับที่ต้องได้เดือนนี้" value={`${monthlyIncome.toLocaleString()} บาท`} color="blue.500" />
            <SummaryCard icon={FaCheckCircle} label="รายรับที่ได้เดือนนี้" value={`${monthlyPaid.toLocaleString()} บาท`} color="green.500" />
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 6 }} mb={6}>
            <Box bg="white" borderRadius="xl" p={{ base: 3, md: 5 }} boxShadow="sm">
              <RoomStatusChart data={roomStatusData} />
            </Box>
            <Box bg="white" borderRadius="xl" p={{ base: 3, md: 5 }} boxShadow="sm">
              <PaymentStatusChart data={paymentStatusData} />
            </Box>
          </SimpleGrid>

          {/* Main Content */}
          <Box bg="white" borderRadius="xl" p={{ base: 3, md: 5 }} boxShadow="sm">
            <Flex direction={{ base: "column", md: "row" }} justify="space-between" align={{ base: "flex-start", md: "center" }} mb={5} gap={4}>
              <VStack align="flex-start" spacing={1}>
                <Heading as="h2" size="md">
                  {filterType === 'review' ? 'รายการรอตรวจสอบ' : 
                   filterType === 'unpaid' ? 'ค้างชำระ' :
                   filterType === 'vacant' ? 'ห้องว่าง' : 'ห้องทั้งหมด'}
                </Heading>
                <Text color="gray.500" fontSize="sm">
                  {filterType === 'review' ? 'รายการที่มีการส่งสลิปเข้ามาให้ตรวจสอบ' :
                   filterType === 'unpaid' ? 'รายการห้องที่ยังไม่ได้ชำระเงิน' :
                   filterType === 'vacant' ? 'รายการห้องว่าง' : 'รายการห้องทั้งหมด'}
                </Text>
              </VStack>
              <Flex gap={2} w={{ base: "full", md: "auto" }}>
                <Menu>
                  <MenuButton as={Button} leftIcon={<FaFilter />} colorScheme="purple" variant="outline" w={{ base: "full", md: "auto" }} size="sm">
                    <Text as="span" isTruncated>{filterLabels[filterType]}</Text>
                  </MenuButton>
                  <MenuList>
                    <MenuItem onClick={() => setFilterType('all')} fontWeight={filterType === 'all' ? 'bold' : 'normal'}>ทั้งหมด</MenuItem>
                    <MenuItem onClick={() => setFilterType('unpaid')} fontWeight={filterType === 'unpaid' ? 'bold' : 'normal'}>ค้างชำระ</MenuItem>
                    <MenuItem onClick={() => setFilterType('vacant')} fontWeight={filterType === 'vacant' ? 'bold' : 'normal'}>ห้องว่าง</MenuItem>
                    <MenuItem onClick={() => setFilterType('review')} fontWeight={filterType === 'review' ? 'bold' : 'normal'}>รอตรวจสอบ</MenuItem>
                  </MenuList>
                </Menu>
                <InputGroup w={{ base: "full", md: "auto" }} size="sm">
                  <Input
                    placeholder="ค้นหาห้องหรือชื่อผู้เช่า..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    borderRadius="lg"
                  />
                </InputGroup>
              </Flex>
            </Flex>
            
            {loading ? (
              <Center h="200px">
                <Spinner size="xl" />
              </Center>
            ) : filterType === 'review' && filteredRooms.length === 0 ? (
              <Text color="gray.400" textAlign="center" py={8}>
                ไม่มีรายการรอตรวจสอบ
              </Text>
            ) : filteredRooms.length > 0 ? (
              <RoomPaymentCardList rooms={roomPaymentCards} gridProps={{ columns: { base: 1, md: 2, lg: 3, xl: 4 }, spacing: 6 }} />
            ) : (
              <Center h="200px">
                <VStack spacing={4}>
                  <Icon as={FaClipboardList} w={16} h={16} color="gray.300" />
                  <Heading as="h3" size="md" color="gray.500">ไม่พบข้อมูล</Heading>
                  <Text color="gray.400">ลองเปลี่ยนตัวกรองหรือคำค้นหาของคุณ</Text>
                </VStack>
              </Center>
            )}
          </Box>
        </VStack>
      </Container>

      <Modal isOpen={isProofModalOpen} onClose={onProofModalClose} isCentered size={{ base: "full", md: "xl" }}>
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

      {/* Removed AddRoomModal and EditRoomModal as they are not relevant for owner dashboard */}

      <AddRoomModal isOpen={isOpen} onClose={onClose} onAdd={handleAddRoom} lastWaterMeter={lastWaterMeter} lastElecMeter={lastElecMeter} isCentered size={{ base: "full", md: "2xl" }} />
      {editRoom && (
        <EditRoomModal isOpen={!!editRoom} onClose={() => setEditRoom(null)} initialRoom={editRoom} onSave={handleSaveEditRoom} isCentered size={{ base: "full", md: "2xl" }} />
      )}

      <AlertDialog
        isOpen={isDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsDialogOpen(false)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent m={{ base: 4, md: "auto" }}>
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

      {selectedBill && (
        <InvoiceModal isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} bill={selectedBill} />
      )}
    </MainLayout>
  );
}

const SummaryCard: React.FC<{ icon: React.ElementType; label: string; value: string | number; color?: string; }> = ({ icon, label, value, color = "gray.700" }) => (
  <Flex align="center" bg="white" borderRadius="xl" p={4} boxShadow="sm">
    <Icon as={icon} w={8} h={8} color={color} />
    <Box ml={4}>
      <Text color="gray.500">{label}</Text>
      <Text fontWeight="bold" fontSize="2xl">{value}</Text>
    </Box>
  </Flex>
);