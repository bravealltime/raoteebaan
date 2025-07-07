import { Box, Heading, Button, SimpleGrid, useToast, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure, Input, IconButton, Flex, Text, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Menu, MenuButton, MenuList, MenuItem, Center, Spinner, Select, Checkbox, Image, Table, Thead, Tbody, Tr, Th, Td, FormControl, FormLabel, InputGroup, InputRightElement, CloseButton, VStack, HStack } from "@chakra-ui/react";
import { useEffect, useState, useRef, DragEvent } from "react";
import { db, auth } from "../lib/firebase";
import { collection, getDocs, deleteDoc, doc, setDoc, query, where, orderBy, limit, getDoc, addDoc, updateDoc } from "firebase/firestore";
import RoomCard from "../components/RoomCard";
import AddRoomModal from "../components/AddRoomModal";
import { useRouter } from "next/router";
import AppHeader from "../components/AppHeader";
import { FaFilter, FaHome, FaInbox, FaBox, FaUserFriends, FaPlus, FaFileCsv, FaUpload, FaBolt, FaDownload, FaFilePdf, FaTrash } from "react-icons/fa";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import EditRoomModal from "../components/EditRoomModal";
import jsPDF from "jspdf";
import "../Kanit-Regular-normal.js"; // Import the font file
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import Sidebar from "../components/Sidebar";
import MainLayout from "../components/MainLayout";
import MeterReadingModal from "../components/MeterReadingModal";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import UploadSlipModal from "../components/UploadSlipModal";

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
  ownerId?: string;
}

export default function Rooms() {
  const router = useRouter();
  const cancelRef = useRef(null);
  const toast = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
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
    { name: "เตียง", status: "ครบ", condition: "ดี", notes: "" },
    { name: "ที่นอน", status: "ครบ", condition: "ดี", notes: "" },
    { name: "โต๊ะทำงาน", status: "ครบ", condition: "ดี", notes: "" },
    { name: "เก้าอี้", status: "ครบ", condition: "ดี", notes: "" },
    { name: "ตู้เสื้อผ้า", status: "ครบ", condition: "ดี", notes: "" },
    { name: "เครื่องปรับอากาศ", status: "ครบ", condition: "ดี", notes: "" },
    { name: "พัดลม", status: "ครบ", condition: "ดี", notes: "" },
    { name: "โคมไฟ", status: "ครบ", condition: "ดี", notes: "" },
    { name: "ผ้าม่าน", status: "ครบ", condition: "ดี", notes: "" },
    { name: "เครื่องทำน้ำอุ่น", status: "ครบ", condition: "ดี", notes: "" },
  ]);
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [newEquipmentStatus, setNewEquipmentStatus] = useState("ครบ");
  const [newEquipmentCondition, setNewEquipmentCondition] = useState("ดี");
  const [newEquipmentNotes, setNewEquipmentNotes] = useState("");
  const [isMeterReadingModalOpen, setIsMeterReadingModalOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null); // Add currentUser state
  const [isUploadSlipModalOpen, setIsUploadSlipModalOpen] = useState(false);
  const [selectedRoomForSlip, setSelectedRoomForSlip] = useState<Room | null>(null);
  const [isSlipViewModalOpen, setIsSlipViewModalOpen] = useState(false);
  const [currentSlipUrl, setCurrentSlipUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/login')
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      const userRole = snap.exists() ? snap.data().role : "user";
      const firestoreData = snap.exists() ? snap.data() : {};

      setUserId(user.uid);
      setUserEmail(user.email);
      setRole(userRole);
      setCurrentUser({
        uid: user.uid,
        name: firestoreData.name || user.displayName || '',
        email: firestoreData.email || user.email || '',
        role: userRole,
        photoURL: firestoreData.avatar || user.photoURL || undefined, // Ensure photoURL is taken from Firestore first, then Auth
        roomNumber: firestoreData.roomNumber || undefined,
      });
      setLoading(false)
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId || !role) return;

      setLoading(true);
      try {
        let roomsQuery;
        if (role === 'admin') {
          roomsQuery = collection(db, "rooms");
        } else if (role === 'owner') {
          roomsQuery = query(collection(db, "rooms"), where("ownerId", "==", userId));
        } else if (role === 'user') {
          roomsQuery = query(collection(db, "rooms"), where("tenantId", "==", userId));
        } else {
          setRooms([]);
          setLoading(false);
          return;
        }

        const roomsSnapshot = await getDocs(roomsQuery);
        const roomsData: Room[] = roomsSnapshot.docs.map(doc => {
          const d = doc.data() as Room;
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
            ownerId: d.ownerId,
          };
        });

        setRooms(roomsData);

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
  }, [userId, role, toast]);

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
      let tenantId = null;
      if (roomData.tenantEmail) {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) {
          throw new Error("Authentication token not found. Please log in again.");
        }

        const res = await fetch('/api/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({ email: roomData.tenantEmail, name: roomData.tenantName }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 400 && data.error.includes('อีเมลนี้มีผู้ใช้งานแล้ว')) {
            // If email already exists, link the existing user
            tenantId = data.user?.uid; // Assuming data.user.uid is returned even on email exists error
            toast({ title: "ผู้เช่ามีบัญชีอยู่แล้ว", description: "กำลังเชื่อมโยงบัญชี...", status: "info" });
          } else {
            throw new Error(data.error || 'Failed to create user');
          }
        } else {
          tenantId = data.user.uid;
          toast({ title: "สร้างบัญชีผู้เช่าสำเร็จ", description: `รหัสผ่านถูกส่งไปที่ ${roomData.tenantEmail}`, status: "success" });
        }
      }

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
        tenantId: tenantId,
        tenantEmail: roomData.tenantEmail || null,
        ownerId: userId || undefined,
      };
      
      await setDoc(doc(db, "rooms", room.id), room);
      setRooms(prev => [...prev, room]);
      toast({ title: "เพิ่มห้องใหม่สำเร็จ", status: "success" });

    } catch (e: any) {
      toast({ title: "เพิ่มห้องใหม่ไม่สำเร็จ", description: e.message, status: "error" });
    }
    setIsAddRoomOpen(false);
  };

  const handleViewBill = (id: string) => {
    router.push(`/bill/${id}`);
  };
  const handleAddData = (id: string) => {
    router.push(`/history/${id}`);
  };
  const handleSettings = (id: string) => {
    const room = rooms.find(r => r.id === id);
    if (room) setEditRoom(room);
  };
  const handleSaveEditRoom = async (editedRoom: Partial<Room>) => {
    try {
      const originalRoom = rooms.find(r => r.id === editedRoom.id);

      if (editedRoom.tenantEmail && editedRoom.tenantEmail !== originalRoom?.tenantEmail) {
        const res = await fetch('/api/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: editedRoom.tenantEmail, 
            name: editedRoom.tenantName, 
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 400 && data.error.includes('อีเมลนี้มีผู้ใช้งานแล้ว')) {
             toast({ title: "ผู้เช่ามีบัญชีอยู่แล้ว", description: "กำลังเชื่อมโยงบัญชี...", status: "info" });
          } else {
            throw new Error(data.error || 'Failed to create or link user');
          }
        } else {
            editedRoom.tenantId = data.user.uid;
            toast({ title: "สร้างบัญชีผู้เช่าสำเร็จ", description: `รหัสผ่านถูกส่งไปที่ ${editedRoom.tenantEmail}`, status: "success" });
        }
      }

      await setDoc(doc(db, "rooms", editedRoom.id!), {
        ...editedRoom,
      }, { merge: true });

      setRooms(prev => prev.map(r => r.id === editedRoom.id ? { ...r, ...editedRoom } : r));
      toast({ title: "บันทึกข้อมูลห้องสำเร็จ", status: "success" });

    } catch (e: any) {
      toast({ title: "บันทึกข้อมูลห้องไม่สำเร็จ", description: e.message, status: "error" });
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

    // Debug log for readings array
    

    const toastId = toast({
      title: "กำลังบันทึกข้อมูล...",
      status: "info",
      duration: null,
      isClosable: true,
    });

    try {
      const billPromises = readings.map(async (reading: any) => {
        // Debug log for each reading
        
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
          return;
        }

        const newElec = hasNewElec ? Number(reading.electricity) : prevElec;
        const newWater = hasNewWater ? Number(reading.water) : prevWater;

        if ((hasNewElec && newElec < prevElec) || (hasNewWater && newWater < prevWater)) {
          warnings.push(`ห้อง ${reading.roomId}: เลขมิเตอร์ใหม่น้อยกว่าของเก่า`);
          return;
        }

        const electricityUnit = newElec - prevElec;
        const waterUnit = newWater - prevWater;

        const elecTotal = electricityUnit * rates.electricity;
        const waterTotal = waterUnit * rates.water;
        
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
          
          electricityMeterCurrent: newElec,
          electricityMeterPrev: prevElec,
          electricityRate: rates.electricity,
          electricityUnit,
          electricityTotal: elecTotal,

          waterMeterCurrent: newWater,
          waterMeterPrev: prevWater,
          waterRate: rates.water,
          waterUnit,
          waterTotal: waterTotal,

          rent,
          service,
          extraServices: roomData.extraServices || [],
          total,
          electricityImageUrl: reading.electricityImageUrl || undefined, // Add electricity image URL here
          waterImageUrl: reading.waterImageUrl || undefined, // Add water image URL here
        };

        // Debug log for newBill
        

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
          toast({
              title: "คำเตือน",
              description: warnings.join(', '),
              status: "warning",
              duration: 10000,
              isClosable: true
          })
      }

      setIsMeterReadingModalOpen(false);
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

  const handleOpenUploadSlipModal = (room: Room) => {
    setSelectedRoomForSlip(room);
    setIsUploadSlipModalOpen(true);
  };

  const handleViewProof = async (room: Room) => {
    const latestBillQuery = query(
      collection(db, "bills"),
      where("roomId", "==", room.id),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const billSnap = await getDocs(latestBillQuery);

    if (billSnap.empty) {
      toast({ title: "No bill found for this room.", status: "error" });
      return;
    }

    const billData = billSnap.docs[0].data();
    if (billData.slipUrl) {
      setCurrentSlipUrl(billData.slipUrl);
      setIsSlipViewModalOpen(true);
    } else {
      toast({ title: "No proof of payment found for this bill.", status: "error" });
    }
  };

  const handleConfirmUploadSlip = async (file: File, amount: number) => {
    if (!selectedRoomForSlip) return;

    const toastId = toast({
      title: "Submitting Payment...",
      status: "info",
      duration: null,
      isClosable: true,
    });

    try {
      
      // 1. Send slip to Discord via webhook
      const webhookUrl = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error("Discord webhook URL is not configured.");
        throw new Error("Discord webhook URL is not configured.");
      }
      

      const formData = new FormData();
      formData.append("file", file);
      formData.append("payload_json", JSON.stringify({
        content: `**New Payment Submitted for Room ${selectedRoomForSlip.id}**`,
        embeds: [
          {
            title: "Payment Details",
            color: 5814783, // Blue color
            fields: [
              { name: "Room ID", value: selectedRoomForSlip.id, inline: true },
              { name: "Tenant Name", value: selectedRoomForSlip.tenantName, inline: true },
              { name: "Amount Paid", value: `฿${amount.toLocaleString()}`, inline: true },
              { name: "Bill Status", value: "Pending Review", inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }));

      
      const response = await fetch(webhookUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Discord API error: ${response.statusText}, Response: ${errorText}`);
        throw new Error(`Discord API error: ${response.statusText}`);
      }
      

      const discordResponse = await response.json();
      const slipUrl = discordResponse.attachments?.[0]?.url;
      
      

      if (!slipUrl) {
        throw new Error("Could not get slip URL from Discord response.");
      }
      

      // 2. Update Firestore bill status with the Discord URL
      
      const latestBillQuery = query(
        collection(db, "bills"),
        where("roomId", "==", selectedRoomForSlip.id),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const billSnap = await getDocs(latestBillQuery);

      if (billSnap.empty) {
        console.warn("No bill found for this room. Cannot update status.");
        throw new Error("No bill found for this room. Cannot update status.");
      }
      
      const billDocRef = billSnap.docs[0].ref;
      await updateDoc(billDocRef, {
        paidAmount: amount,
        status: "pending",
        paidAt: new Date(),
        slipUrl: slipUrl,
      });
      await updateDoc(doc(db, "rooms", selectedRoomForSlip.id), {
        billStatus: "pending",
      });
      

      toast.update(toastId, {
        title: "Upload Successful",
        description: "Your payment has been submitted for review.",
        status: "success",
        duration: 5000,
      });

      setIsUploadSlipModalOpen(false);
      setSelectedRoomForSlip(null);
      window.location.reload();

    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.update(toastId, {
        title: "Submission Failed",
        description: "There was an error submitting your payment. Please try again.",
        status: "error",
        duration: 5000,
      });
    }
  };

  const handleMarkAsPaid = async (roomId: string) => {
    const toastId = toast({
      title: "Marking as Paid...",
      status: "info",
      duration: null,
      isClosable: true,
    });

    try {
      const latestBillQuery = query(
        collection(db, "bills"),
        where("roomId", "==", roomId),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const billSnap = await getDocs(latestBillQuery);

      if (billSnap.empty) {
        throw new Error("No pending bill found for this room.");
      }

      const billDocRef = billSnap.docs[0].ref;
      await updateDoc(billDocRef, {
        status: "paid",
      });

      await updateDoc(doc(db, "rooms", roomId), {
        billStatus: "paid",
      });

      toast.update(toastId, {
        title: "Marked as Paid",
        description: `Bill for Room ${roomId} has been marked as paid.`, 
        status: "success",
        duration: 5000,
      });
      window.location.reload();

    } catch (error) {
      console.error("Error marking as paid:", error);
      toast.update(toastId, {
        title: "Error",
        description: "Could not mark bill as paid. Please try again.",
        status: "error",
        duration: 5000,
      });
    }
  };

  const handleDeleteProof = async (roomId: string) => {
    const toastId = toast({
      title: "Deleting Proof...",
      status: "info",
      duration: null,
      isClosable: true,
    });

    try {
      const latestBillQuery = query(
        collection(db, "bills"),
        where("roomId", "==", roomId),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const billSnap = await getDocs(latestBillQuery);

      if (billSnap.empty) {
        throw new Error("No pending bill found for this room.");
      }

      const billDocRef = billSnap.docs[0].ref;
      await updateDoc(billDocRef, {
        status: "unpaid",
        paidAmount: 0,
        paidAt: null,
        slipUrl: null,
      });

      await updateDoc(doc(db, "rooms", roomId), {
        billStatus: "unpaid",
      });

      toast.update(toastId, {
        title: "Proof Deleted",
        description: `Proof for Room ${roomId} has been deleted.`, 
        status: "success",
        duration: 5000,
      });
      window.location.reload();

    } catch (error) {
      console.error("Error deleting proof:", error);
      toast.update(toastId, {
        title: "Error",
        description: "Could not delete proof. Please try again.",
        status: "error",
        duration: 5000,
      });
    }
  };

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
      items: equipmentList.map(item => ({
        name: item.name,
        status: item.status,
        condition: item.condition,
        notes: item.notes,
      }))
    };
    const pdf = new jsPDF();
    pdf.setFont("Kanit-Regular");
    pdf.setFontSize(20);
    pdf.setTextColor(75, 0, 130);
    pdf.text("ใบประเมินอุปกรณ์ในห้องพัก", 105, 20, { align: "center" });
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`ห้อง: ${equipmentData.roomId}`, 20, 45);
    pdf.text(`ผู้เช่า: ${equipmentData.tenantName}`, 20, 55);
    pdf.text(`วันที่ประเมิน: ${equipmentData.date}`, 20, 65);
    pdf.setFillColor(75, 0, 130);
    pdf.rect(20, 80, 170, 10, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.text("ลำดับ", 25, 87);
    pdf.text("รายการอุปกรณ์", 45, 87);
    pdf.text("สถานะ", 95, 87);
    pdf.text("สภาพ", 120, 87);
    pdf.text("หมายเหตุ", 150, 87);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    equipmentData.items.forEach((item, index) => {
      const y = 95 + (index * 10);
      if (y > 250) {
        pdf.addPage();
        return;
      }
      pdf.text(`${index + 1}`, 25, y);
      pdf.text(item.name, 45, y);
      pdf.text(item.status, 95, y);
      pdf.text(item.condition, 120, y);
      pdf.text(item.notes || "-", 150, y);
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
    toast({ title: "ดาวน์โหลดใบประเมินอุปกรณ์สำเร็จ!", status: "success", duration: 3000 });
    setIsEquipmentModalOpen(false);
    setSelectedRoomForEquipment("");
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 300);
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

  if (loading) return <Center minH="100vh"><Spinner color="blue.400" /></Center>;

  return (
    <MainLayout role={role} currentUser={{
      uid: userId || '',
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      role: role || '',
      photoURL: currentUser?.photoURL || undefined,
      roomNumber: currentUser?.roomNumber || undefined,
    }}>
      <Box flex={1} p={[2, 4, 8]}>
        <Flex align="center" mb={6} gap={3} flexWrap="wrap">
          <Text fontWeight="bold" fontSize={["xl", "2xl"]} color="gray.700" mr={4}>Rooms</Text>
          {(role === 'admin' || role === 'owner') && (
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
                leftIcon={<FaFilePdf size={22} />}
                colorScheme="purple"
                size="lg"
                borderRadius="xl"
                fontWeight="bold"
                variant="solid"
                _hover={{ boxShadow: "md", transform: "scale(1.05)", bg: "purple.600", color: "white" }}
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
                role={role}
                latestTotal={latestTotal}
                electricity={electricity}
                water={water}
                rent={rent}
                service={service}
                onDelete={() => handleDelete(room.id)}
                onViewBill={() => handleViewBill(room.id)}
                onAddData={() => handleAddData(room.id)}
                onSettings={() => handleSettings(room.id)}
                onUploadProof={() => handleOpenUploadSlipModal(room)}
                onViewProof={() => handleViewProof(room)}
                onMarkAsPaid={() => handleMarkAsPaid(room.id)}
                onDeleteProof={() => handleDeleteProof(room.id)}
              />
            );
          })}
        </SimpleGrid>
      </Box>

      {selectedRoomForSlip && (
        <UploadSlipModal
          isOpen={isUploadSlipModalOpen}
          onClose={() => setIsUploadSlipModalOpen(false)}
          onConfirm={handleConfirmUploadSlip}
          roomName={selectedRoomForSlip.id}
        />
      )}

      {/* Slip View Modal */}
      <Modal isOpen={isSlipViewModalOpen} onClose={() => setIsSlipViewModalOpen(false)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Payment Slip</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {currentSlipUrl && <Image src={currentSlipUrl} alt="Payment Slip" objectFit="contain" />}
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setIsSlipViewModalOpen(false)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AddRoomModal isOpen={isAddRoomOpen} onClose={() => setIsAddRoomOpen(false)} onAdd={handleAddRoom} userRole={role} ownerId={userId || undefined} />

      <EditRoomModal
        isOpen={!!editRoom}
        initialRoom={editRoom}
        onClose={() => setEditRoom(null)}
        onSave={room => handleSaveEditRoom({ ...editRoom, ...room })}
      />

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
        rooms={filteredRooms}
        previousReadings={previousReadings}
      />

      <Modal isOpen={isEquipmentModalOpen} onClose={() => setIsEquipmentModalOpen(false)} isCentered size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>ใบประเมินอุปกรณ์</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel>เลือกห้องที่ต้องการดาวน์โหลด</FormLabel>
              <Select
                placeholder="เลือกห้อง"
                value={selectedRoomForEquipment}
                onChange={e => setSelectedRoomForEquipment(e.target.value)}
              >
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    ห้อง {room.id} ({room.tenantName})
                  </option>
                ))}
              </Select>
            </FormControl>

            <Box mb={6}>
              <Heading size="md" mb={3} color="blue.700">เพิ่มอุปกรณ์ใหม่</Heading>
              <VStack spacing={3} align="stretch" p={4} borderWidth="1px" borderRadius="lg" bg="gray.50">
                <FormControl>
                  <FormLabel>ชื่ออุปกรณ์</FormLabel>
                  <InputGroup>
                    <Input
                      placeholder="เช่น โทรทัศน์, ตู้เย็น"
                      value={newEquipmentName}
                      onChange={(e) => setNewEquipmentName(e.target.value)}
                    />
                    {newEquipmentName && (
                      <InputRightElement>
                        <CloseButton onClick={() => setNewEquipmentName("")} size="sm" />
                      </InputRightElement>
                    )}
                  </InputGroup>
                </FormControl>
                <HStack spacing={3}>
                  <FormControl flex={1}>
                    <FormLabel>สถานะ</FormLabel>
                    <Select
                      value={newEquipmentStatus}
                      onChange={(e) => setNewEquipmentStatus(e.target.value)}
                    >
                      <option value="ครบ">ครบ</option>
                      <option value="ไม่ครบ">ไม่ครบ</option>
                    </Select>
                  </FormControl>
                  <FormControl flex={1}>
                    <FormLabel>สภาพ</FormLabel>
                    <Select
                      value={newEquipmentCondition}
                      onChange={(e) => setNewEquipmentCondition(e.target.value)}
                    >
                      <option value="ดี">ดี</option>
                      <option value="พอใช้">พอใช้</option>
                      <option value="ชำรุด">ชำรุด</option>
                    </Select>
                  </FormControl>
                </HStack>
                <FormControl>
                  <FormLabel>หมายเหตุ (ถ้ามี)</FormLabel>
                  <Input
                    placeholder="เช่น มีรอยขีดข่วนเล็กน้อย"
                    value={newEquipmentNotes}
                    onChange={(e) => setNewEquipmentNotes(e.target.value)}
                  />
                </FormControl>
                <Button
                  leftIcon={<FaPlus />}
                  colorScheme="blue"
                  onClick={() => {
                    if (newEquipmentName.trim() === "") {
                      toast({ title: "กรุณากรอกชื่ออุปกรณ์", status: "warning" });
                      return;
                    }
                    setEquipmentList([
                      ...equipmentList,
                      {
                        name: newEquipmentName,
                        status: newEquipmentStatus,
                        condition: newEquipmentCondition,
                        notes: newEquipmentNotes,
                      },
                    ]);
                    setNewEquipmentName("");
                    setNewEquipmentStatus("ครบ");
                    setNewEquipmentCondition("ดี");
                    setNewEquipmentNotes("");
                  }}
                >
                  เพิ่มอุปกรณ์
                </Button>
              </VStack>
            </Box>

            <Box>
              <Heading size="md" mb={3} color="blue.700">รายการอุปกรณ์</Heading>
              <Box maxH="400px" overflowY="auto" mb={4} borderWidth="1px" borderRadius="lg" p={2} bg="white">
                <Table variant="simple" size="sm" width="full">
                  <Thead bg="gray.100">
                    <Tr>
                      <Th>อุปกรณ์</Th>
                      <Th>สถานะ</Th>
                      <Th>สภาพ</Th>
                      <Th>หมายเหตุ</Th>
                      <Th></Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {equipmentList.length === 0 ? (
                      <Tr>
                        <Td colSpan={5} textAlign="center" color="gray.500">ไม่มีอุปกรณ์ในรายการ</Td>
                      </Tr>
                    ) : (
                      equipmentList.map((item, index) => (
                        <Tr key={index}>
                          <Td py={2}>{item.name}</Td>
                          <Td py={2}>
                            <Select
                              value={item.status}
                              onChange={(e) => {
                                const newEquipmentList = [...equipmentList];
                                newEquipmentList[index].status = e.target.value;
                                setEquipmentList(newEquipmentList);
                              }}
                              size="sm"
                            >
                              <option value="ครบ">ครบ</option>
                              <option value="ไม่ครบ">ไม่ครบ</option>
                            </Select>
                          </Td>
                          <Td py={2}>
                            <Select
                              value={item.condition}
                              onChange={(e) => {
                                const newEquipmentList = [...equipmentList];
                                newEquipmentList[index].condition = e.target.value;
                                setEquipmentList(newEquipmentList);
                              }}
                              size="sm"
                            >
                              <option value="ดี">ดี</option>
                              <option value="พอใช้">พอใช้</option>
                              <option value="ชำรุด">ชำรุด</option>
                            </Select>
                          </Td>
                          <Td py={2}>
                            <Input
                              value={item.notes}
                              onChange={(e) => {
                                const newEquipmentList = [...equipmentList];
                                newEquipmentList[index].notes = e.target.value;
                                setEquipmentList(newEquipmentList);
                              }}
                              size="sm"
                            />
                          </Td>
                          <Td py={2}>
                            <IconButton
                              aria-label="ลบอุปกรณ์"
                              icon={<FaTrash />}
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => {
                                const newEquipmentList = equipmentList.filter((_, i) => i !== index);
                                setEquipmentList(newEquipmentList);
                              }}
                            />
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="gray" mr={3} onClick={() => setIsEquipmentModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button colorScheme="purple" onClick={handleConfirmEquipmentDownload}>
              ดาวน์โหลด PDF
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </MainLayout>
  );
}