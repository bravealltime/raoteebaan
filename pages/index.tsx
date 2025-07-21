import { Box, Heading, Button, SimpleGrid, useToast, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure, Input, IconButton, Flex, Text, Tooltip, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Menu, MenuButton, MenuList, MenuItem, Center, Spinner, Select, Checkbox, Image, Table, Thead, Tbody, Tr, Th, Td, FormControl, FormLabel, InputGroup, InputRightElement, CloseButton, VStack, HStack, Wrap, WrapItem, Spacer, Container, Icon } from "@chakra-ui/react";
import { useEffect, useState, useRef, DragEvent, useCallback } from "react";
import { db, auth } from "../lib/firebase";
import { collection, getDocs, deleteDoc, doc, setDoc, query, where, orderBy, limit, getDoc, addDoc, updateDoc, writeBatch, Timestamp } from "firebase/firestore";
import RoomCard from "../components/RoomCard";
import AddRoomModal from "../components/AddRoomModal";
import { useRouter } from "next/router";
import AppHeader from "../components/AppHeader";
import { motion } from "framer-motion";
import { FaFilter, FaHome, FaInbox, FaBox, FaUserFriends, FaPlus, FaFileCsv, FaUpload, FaBolt, FaDownload, FaFilePdf, FaTrash, FaSearch } from "react-icons/fa";
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

// ... (the rest of the imports)

// ... (the rest of the component code)

interface RoomsPageProps {
  currentUser: any;
  role: string | null;
}

function RoomsPage({ currentUser, role }: RoomsPageProps) {
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
  const [importElecRate, setImportElecRate] = useState(8);
  const [importWaterRate, setImportWaterRate] = useState(20);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [lastWaterMeter, setLastWaterMeter] = useState<number | undefined>(undefined);
  const [lastElecMeter, setLastElecMeter] = useState<number | undefined>(undefined);
  const [roomBills, setRoomBills] = useState<Record<string, any>>({});
  const [previousReadings, setPreviousReadings] = useState<Record<string, { electricity: number; water: number }>>({});
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  
  const [searchRoom, setSearchRoom] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'unpaid' | 'vacant' | 'occupied'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
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
  const [isUploadSlipModalOpen, setIsUploadSlipModalOpen] = useState(false);
  const [selectedRoomForSlip, setSelectedRoomForSlip] = useState<Room | null>(null);
  const [isSlipViewModalOpen, setIsSlipViewModalOpen] = useState(false);
  const [currentSlipUrl, setCurrentSlipUrl] = useState<string | null>(null);

  

  const fetchData = useCallback(async () => {
    if (!currentUser || !role) return;

    setLoading(true);
    try {
      let roomsQuery;
      if (role === 'admin') {
        roomsQuery = collection(db, "rooms");
      } else if (role === 'owner') {
        roomsQuery = query(collection(db, "rooms"), where("ownerId", "==", currentUser.uid));
      } else if (role === 'user') {
        roomsQuery = query(collection(db, "rooms"), where("tenantId", "==", currentUser.uid));
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
          status: d.tenantId ? "occupied" : "vacant",
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

      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersDataMap: Record<string, any> = {};
      usersSnapshot.forEach((doc) => {
        usersDataMap[doc.id] = doc.data();
      });
      setUsersMap(usersDataMap);

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
  }, [currentUser, role, toast]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);

  

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
      const sanitizedRoomId = roomData.id.trim().replace(/[/\\.#$[\]]/g, '-');
      if (sanitizedRoomId !== roomData.id.trim()) {
          toast({
              title: "ชื่อห้องถูกปรับเปลี่ยน",
              description: `อักขระที่ไม่ได้รับอนุญาตในชื่อห้องถูกเปลี่ยนเป็น '-'`,
              status: "warning",
              duration: 5000,
              isClosable: true,
          });
      }
      
      if (!sanitizedRoomId) {
          throw new Error("Room ID cannot be empty.");
      }

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
        id: sanitizedRoomId,
        status: roomData.status === "vacant" ? "vacant" : "occupied",
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
        ownerId: currentUser.uid || undefined,
      };
      
      await setDoc(doc(db, "rooms", sanitizedRoomId), room);
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
  const handleSaveEditRoom = async (editedRoom: Partial<Room> & { createNewTenant?: boolean }) => {
    try {
      const originalRoom = rooms.find(r => r.id === editedRoom.id);
      if (!originalRoom) {
        throw new Error("Room not found!");
      }

      let finalTenantId = editedRoom.tenantId;
      let finalTenantName = editedRoom.tenantName;
      let finalTenantEmail = editedRoom.tenantEmail === '' ? null : editedRoom.tenantEmail;
      let finalStatus = editedRoom.status;
      let finalBillStatus = editedRoom.billStatus;

      // --- Handle New Tenant Creation --- //
      if (editedRoom.createNewTenant) {
        if (!editedRoom.tenantName || !editedRoom.tenantEmail) {
          throw new Error("กรุณากรอกชื่อและอีเมลสำหรับผู้เช่าใหม่");
        }

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
          body: JSON.stringify({
            email: editedRoom.tenantEmail,
            name: editedRoom.tenantName,
            role: 'user',
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          if (res.status === 400 && data.error.includes('อีเมลนี้มีผู้ใช้งานแล้ว')) {
            // If email already exists, link the existing user
            finalTenantId = data.user?.uid; // Assuming data.user.uid is returned even on email exists error
            toast({ title: "ผู้เช่ามีบัญชีอยู่แล้ว", description: "กำลังเชื่อมโยงบัญชี...", status: "info" });
          } else {
            throw new Error(data.error || 'Failed to create or link user');
          }
        } else {
          finalTenantId = data.user.uid;
          toast({ title: "สร้างบัญชีผู้เช่าสำเร็จ", description: `รหัสผ่านถูกส่งไปที่ ${editedRoom.tenantEmail}`, status: "success" });
        }
        // For a newly created/linked tenant, set status to occupied and bill status to unpaid
        finalStatus = "occupied";
        finalBillStatus = "unpaid";
      }

      // --- Prepare Batch Write --- //
      const batch = writeBatch(db);

      // 1. Handle previous tenant (if any) - clear their room link
      if (originalRoom.tenantId && originalRoom.tenantId !== finalTenantId) {
        const oldTenantUserRef = doc(db, "users", originalRoom.tenantId);
        batch.update(oldTenantUserRef, { 
          roomId: null,
          roomNumber: null 
        });
      }

      // 2. Handle new tenant assignment - clear their old room link and update their user document
      if (finalTenantId && finalTenantId !== originalRoom.tenantId) {
        // Clear the new tenant from their old room (if any)
        const oldRoomQuery = query(collection(db, "rooms"), where("tenantId", "==", finalTenantId));
        const oldRoomSnap = await getDocs(oldRoomQuery);
        oldRoomSnap.forEach(doc => {
          if (doc.id !== editedRoom.id) { // Don't clear the room we are assigning to
            batch.update(doc.ref, {
              status: "vacant",
              tenantId: null,
              tenantEmail: null,
              tenantName: "",
              billStatus: "vacant",
            });
          }
        });

        // Update the new tenant's user document with the new room ID
        const userRef = doc(db, "users", finalTenantId);
        batch.update(userRef, { 
          roomId: editedRoom.id,
          roomNumber: editedRoom.id 
        });
      }

      // 3. Update the current room with all final changes
      const roomRef = doc(db, "rooms", editedRoom.id!)
      batch.set(roomRef, {
        ...editedRoom,
        tenantId: finalTenantId,
        tenantName: finalTenantName,
        tenantEmail: finalTenantEmail,
        status: finalStatus,
        billStatus: finalBillStatus,
        createNewTenant: false, // Ensure this flag is not saved to Firestore
      }, { merge: true });

      await batch.commit();
      toast({ title: "บันทึกข้อมูลห้องสำเร็จ", status: "success" });

      await fetchData(); // Refresh data to show changes

    } catch (e: any) {
      toast({ title: "บันทึกข้อมูลห้องไม่สำเร็จ", description: e.message, status: "error" });
    } finally {
      setEditRoom(null);
    }
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

    const toastId = toast({
      title: "กำลังบันทึกข้อมูล...",
      status: "info",
      duration: null,
      isClosable: true,
    });

    try {
      const batch = writeBatch(db);

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
          return; // Skip if no new meter readings
        }

        const newElec = hasNewElec ? parseFloat(String(reading.electricity)) : prevElec;
        const newWater = hasNewWater ? parseFloat(String(reading.water)) : prevWater;

        if (isNaN(newElec) || isNaN(newWater)) {
          warnings.push(`ห้อง ${reading.roomId}: กรุณากรอกเลขมิเตอร์เป็นตัวเลขเท่านั้น`);
          return;
        }

        if ((hasNewElec && newElec < prevElec) || (hasNewWater && newWater < prevWater)) {
          warnings.push(`ห้อง ${reading.roomId}: เลขมิเตอร์ใหม่น้อยกว่าของเก่า`);
          return;
        }

        // --- Start: Calculate Brought Forward Amount ---/
        let broughtForward = 0;
        const previousUnpaidBills: string[] = [];
        const unpaidBillsQuery = query(
          collection(db, "bills"),
          where("roomId", "==", reading.roomId),
          where("status", "==", "unpaid")
        );
        const unpaidBillsSnap = await getDocs(unpaidBillsQuery);
        unpaidBillsSnap.forEach(billDoc => {
          broughtForward += billDoc.data().total || 0;
          previousUnpaidBills.push(billDoc.id);
          // Mark old bill as 'rolled-over' in the same batch
          batch.update(billDoc.ref, { status: "rolled-over" });
        });
        // --- End: Calculate Brought Forward Amount ---/

        const electricityUnit = newElec - prevElec;
        const waterUnit = newWater - prevWater;

        const elecTotal = electricityUnit * rates.electricity;
        const waterTotal = waterUnit * rates.water;
        
        const rent = roomData.rent || 0;
        const service = roomData.service || 0;
        const extraServicesTotal = (roomData.extraServices || []).reduce((sum: number, s: { value: number }) => sum + s.value, 0);
        
        // The total for THIS billing period
        const currentPeriodTotal = elecTotal + waterTotal + rent + service + extraServicesTotal;
        // The final total including any outstanding balance
        const finalTotal = currentPeriodTotal + broughtForward;

        const newBillRef = doc(collection(db, "bills"));
        const newBill: any = {
          id: newBillRef.id,
          roomId: reading.roomId,
          tenantId: roomData.tenantId || null,
          createdAt: Timestamp.fromDate(new Date()),
          date: Timestamp.fromDate(new Date(recordDate)),
          dueDate: Timestamp.fromDate(new Date(dueDate)),
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
          
          broughtForward: broughtForward, // Add brought forward amount
          previousUnpaidBills: previousUnpaidBills, // Add reference to old bills
          total: finalTotal, // Total is now the sum of current and previous balance
        };

        if (reading.electricityImageUrl) newBill.electricityImageUrl = reading.electricityImageUrl;
        if (reading.waterImageUrl) newBill.waterImageUrl = reading.waterImageUrl;

        batch.set(newBillRef, newBill);

        batch.update(roomDocRef, {
          latestTotal: finalTotal,
          billStatus: "unpaid",
          overdueDays: 0,
          electricity: elecTotal, // Storing current period's value
          water: waterTotal,     // Storing current period's value
        });
        
        successCount++;
      });

      await Promise.all(billPromises);
      
      // Commit all the batched writes at once
      await batch.commit();

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

  const handleImportCsv = async () => {
    if (!importFile) {
      toast({ title: "กรุณาเลือกไฟล์ CSV", status: "warning" });
      return;
    }
    if (!importElecRate || !importWaterRate) {
      toast({ title: "กรุณากรอกอัตราค่าไฟและค่าน้ำ", status: "warning" });
      return;
    }

    setLoading(true);
    const toastId = toast({
      title: "กำลังนำเข้าข้อมูล...",
      status: "info",
      duration: null,
      isClosable: true,
    });

    try {
      Papa.parse(importFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const roomsToImport: Room[] = [];
          const batch = writeBatch(db);
          const errors: string[] = [];
          let successCount = 0;

          for (const row of results.data) {
            const roomId = (row as any).id?.trim();
            if (!roomId) {
              continue; // Skip empty rows
            }

            const roomRef = doc(db, "rooms", roomId);
            const roomSnap = await getDoc(roomRef);
            if (roomSnap.exists()) {
              errors.push(`ห้อง ${roomId} มีอยู่แล้วในระบบ จะข้ามการนำเข้า`);
              continue;
            }

            const status = (row as any).status === "vacant" ? "vacant" : "occupied";
            const tenantName = (row as any).tenantName || "";
            
            if (status === 'occupied' && !tenantName) {
                errors.push(`ห้อง ${roomId}: ห้องมีคนอยู่แต่ไม่มีชื่อผู้เช่า จะข้ามการนำเข้า`);
                continue;
            }

            const rent = Number((row as any).rent) || 0;
            const service = Number((row as any).service) || 0;
            const elecUnit = Number((row as any).electricity_unit) || 0;
            const waterUnit = Number((row as any).water_unit) || 0;

            const elecBill = elecUnit * importElecRate;
            const waterBill = waterUnit * importWaterRate;
            const latestTotal = elecBill + waterBill + rent + service;

            const newRoomData: Room = {
              id: roomId,
              status: status,
              tenantName: tenantName,
              area: Number((row as any).area) || 0,
              rent: rent,
              service: service,
              electricity: elecBill,
              water: waterBill,
              latestTotal: latestTotal,
              overdueDays: 0,
              billStatus: status === 'vacant' ? 'vacant' : 'unpaid',
              tenantId: null,
              tenantEmail: (row as any).tenantEmail || null,
              ownerId: currentUser.uid || undefined,
              extraServices: [], // Removed from import
            };

            if (newRoomData.tenantEmail) {
              const emailRegex = /\S+@\S+\.\S+/;
              if (!emailRegex.test(newRoomData.tenantEmail)) {
                errors.push(`ห้อง ${roomId}: รูปแบบอีเมลไม่ถูกต้อง (${newRoomData.tenantEmail})`);
                newRoomData.tenantId = null;
              } else {
                try {
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
                    body: JSON.stringify({ email: newRoomData.tenantEmail, name: newRoomData.tenantName }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    if (res.status === 400 && data.error.includes('Email already exists.')) {
                      newRoomData.tenantId = data.user?.uid;
                      toast({ title: `ผู้เช่า ${newRoomData.tenantName} (${newRoomData.tenantEmail}) มีบัญชีอยู่แล้ว`, description: "กำลังเชื่อมโยงบัญชี...", status: "info", duration: 3000 });
                    } else {
                      throw new Error(data.error || 'Failed to create user');
                    }
                  } else {
                    newRoomData.tenantId = data.user.uid;
                    toast({ title: `สร้างบัญชีผู้เช่า ${newRoomData.tenantName} สำเร็จ`, description: `รหัสผ่านถูกส่งไปที่ ${newRoomData.tenantEmail}`, status: "success", duration: 3000 });
                  }
                } catch (e: any) {
                  errors.push(`ไม่สามารถสร้าง/เชื่อมโยงบัญชีผู้เช่าสำหรับห้อง ${roomId}: ${e.message}`);
                  newRoomData.tenantId = null;
                }
              }
            }
            
            batch.set(roomRef, newRoomData);

            if (status === 'occupied') {
              const billDate = (row as any).date ? new Date((row as any).date) : new Date();
              const dueDate = (row as any).dueDate ? new Date((row as any).dueDate) : new Date(billDate.getTime() + 10 * 24 * 60 * 60 * 1000);

              const newBill = {
                roomId: roomId,
                tenantId: newRoomData.tenantId,
                tenantName: newRoomData.tenantName,
                createdAt: new Date(),
                date: billDate,
                dueDate: dueDate,
                status: "unpaid",
                electricityMeterCurrent: elecUnit,
                electricityMeterPrev: 0,
                electricityRate: importElecRate,
                electricityUnit: elecUnit,
                electricityTotal: elecBill,
                waterMeterCurrent: waterUnit,
                waterMeterPrev: 0,
                waterRate: importWaterRate,
                waterUnit: waterUnit,
                waterTotal: waterBill,
                rent: rent,
                service: service,
                extraServices: [],
                total: latestTotal,
              };
              const newBillRef = doc(collection(db, "bills"));
              batch.set(newBillRef, newBill);
            }
            
            roomsToImport.push(newRoomData);
            successCount++;
          }

          if (successCount > 0) {
            await batch.commit();
            setRooms(prev => [...prev, ...roomsToImport]);
            toast.update(toastId, {
              title: "นำเข้าข้อมูลสำเร็จ!",
              description: `นำเข้าห้องพัก ${successCount} ห้อง และสร้างบิลเริ่มต้นเรียบร้อยแล้ว ${errors.length > 0 ? `(มีข้อผิดพลาด/คำเตือน ${errors.length} รายการ)` : ''}`,
              status: "success",
              duration: 5000,
            });
          } else {
             toast.update(toastId, {
              title: "ไม่พบข้อมูลห้องที่สามารถนำเข้าได้",
              description: errors.join('\n') || "ตรวจสอบไฟล์ CSV ของคุณ",
              status: "warning",
              duration: 5000,
            });
          }

          if (errors.length > 0) {
            toast({
              title: "ข้อผิดพลาด/คำเตือนจากการนำเข้า",
              description: errors.join('\n'),
              status: "warning",
              duration: 10000,
              isClosable: true,
            });
          }

          setIsImportOpen(false);
          setImportFile(null);
          setImportPreview([]);
          setLoading(false);
        },
        error: (err: any) => {
          toast.update(toastId, {
            title: "เกิดข้อผิดพลาดในการอ่านไฟล์ CSV",
            description: err.message,
            status: "error",
            duration: 5000,
          });
          setLoading(false);
        },
      });
    } catch (e: any) {
      toast.update(toastId, {
        title: "เกิดข้อผิดพลาด",
        description: e.message,
        status: "error",
        duration: 5000,
      });
      setLoading(false);
    }
  };

  const handleOpenUploadSlipModal = (room: Room) => {
    setSelectedRoomForSlip(room);
    setIsUploadSlipModalOpen(true);
  };

  const handleViewProof = (slipUrl: string) => {
    if (slipUrl) {
      setCurrentSlipUrl(slipUrl);
      setIsSlipViewModalOpen(true);
    } else {
      toast({ title: "ไม่พบสลิป", description: "ไม่พบ URL ของสลิปสำหรับบิลนี้", status: "error" });
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

      // Use a batch to ensure both updates succeed or fail together.
      const batch = writeBatch(db);

      const billDocRef = billSnap.docs[0].ref;
      batch.update(billDocRef, {
        status: "paid",
        paidAt: new Date(),
      });

      const roomDocRef = doc(db, "rooms", roomId);
      batch.update(roomDocRef, {
        billStatus: "paid",
      });

      await batch.commit();

      // Update local state for immediate UI feedback
      setRooms(prevRooms => 
        prevRooms.map(room => 
          room.id === roomId ? { ...room, billStatus: "paid" } : room
        )
      );

      toast.update(toastId, {
        title: "Marked as Paid",
        description: `Bill for Room ${roomId} has been marked as paid.`,
        status: "success",
        duration: 5000,
      });

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

      setRooms(prevRooms => 
        prevRooms.map(room => 
          room.id === roomId ? { ...room, billStatus: "unpaid" } : room
        )
      );

      toast.update(toastId, {
        title: "Proof Deleted",
        description: `Proof for Room ${roomId} has been deleted.`,
        status: "success",
        duration: 5000,
      });

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

  const handleNotifyAllUnpaidRooms = async () => {
    const unpaidRooms = rooms.filter(room => room.billStatus === 'unpaid' && room.tenantId);

    if (unpaidRooms.length === 0) {
      toast({
        title: "ไม่มีห้องค้างชำระ",
        description: "ไม่พบห้องที่มียอดค้างชำระที่สามารถส่งการแจ้งเตือนได้",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const toastId = toast({
      title: "กำลังส่งการแจ้งเตือน...",
      description: `กำลังส่งการแจ้งเตือนไปยัง ${unpaidRooms.length} ห้อง...`,
      status: "info",
      duration: null,
      isClosable: true,
    });

    let successCount = 0;
    let failCount = 0;
    const failedRooms: string[] = [];

    for (const room of unpaidRooms) {
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
          successCount++;
        } else {
          const errorData = await response.json();
          failedRooms.push(`${room.id} (${errorData.message || 'Unknown error'})`);
          failCount++;
        }
      } catch (error) {
        console.error(`Error sending notification to room ${room.id}:`, error);
        failedRooms.push(`${room.id} (Connection error)`);
        failCount++;
      }
    }

    toast.update(toastId, {
      title: "ส่งการแจ้งเตือนเสร็จสิ้น",
      description: `ส่งสำเร็จ ${successCount} ห้อง, ล้มเหลว ${failCount} ห้อง`,
      status: failCount > 0 ? "warning" : "success",
      duration: 5000,
      isClosable: true,
    });

    if (failedRooms.length > 0) {
      toast({
        title: "ห้องที่ส่งแจ้งเตือนไม่สำเร็จ",
        description: failedRooms.join(', '),
        status: "error",
        duration: 9000,
        isClosable: true,
      });
    }
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
      matchFilter = room.billStatus === 'unpaid' && room.status === 'occupied';
    } else if (filterType === 'vacant') {
      matchFilter = room.status === 'vacant';
    } else if (filterType === 'occupied') {
      matchFilter = room.status === 'occupied';
    }
    return matchSearch && matchFilter;
  });

  const paginatedRooms = filteredRooms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredRooms.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  if (loading) return <Center minH="100vh"><Spinner color="blue.400" /></Center>;

  return (
    <MainLayout role={role} currentUser={currentUser}>
      <Container maxW="container.2xl" py={{ base: 4, md: 6 }} px={{ base: 4, md: 6 }}>
        <VStack spacing={6} align="stretch">
          {/* Header and Controls */}
          <Flex
            direction={{ base: "column", lg: "row" }}
            justify="space-between"
            align={{ base: "flex-start", lg: "center" }}
            gap={4}
          >
            <Box>
              <Heading as="h1" size="xl" fontWeight="bold" color="gray.800">
                ห้องพักทั้งหมด
              </Heading>
              <Text color="gray.500">ภาพรวมและจัดการห้องพักของคุณ</Text>
            </Box>

            {(role === 'admin' || role === 'owner') && (
              <Flex direction={{ base: "column", sm: "row" }} gap={3} align={{ base: "stretch", sm: "center" }}>
                <Button
                  leftIcon={<FaPlus />}
                  colorScheme="purple"
                  onClick={() => setIsAddRoomOpen(true)}
                  boxShadow="sm"
                >
                  เพิ่มห้องใหม่
                </Button>
                <Menu>
                  <MenuButton as={Button} colorScheme="gray" variant="outline" boxShadow="sm">
                    เครื่องมือเพิ่มเติม
                  </MenuButton>
                  <MenuList>
                    <MenuItem icon={<FaUpload />} onClick={() => setIsImportOpen(true)}>นำเข้าจาก CSV</MenuItem>
                    <MenuItem icon={<FaFilePdf />} onClick={handleDownloadEquipmentAssessment}>ใบประเมินอุปกรณ์</MenuItem>
                    <MenuItem icon={<FaPlus />} onClick={handleOpenMeterModal}>เพิ่มข้อมูลมิเตอร์ทั้งหมด</MenuItem>
                    <MenuItem icon={<FaBolt />} onClick={handleNotifyAllUnpaidRooms}>แจ้งเตือนห้องค้างชำระ</MenuItem>
                  </MenuList>
                </Menu>
              </Flex>
            )}
          </Flex>

          {/* Filter and Search Bar */}
          <Flex 
            p={4} 
            bg="white" 
            borderRadius="xl" 
            boxShadow="sm"
            justify="space-between"
            align="center"
            direction={{ base: "column", md: "row" }}
            gap={4}
          >
            <HStack spacing={4}>
              <Button 
                variant={filterType === 'all' ? 'solid' : 'ghost'}
                colorScheme="purple"
                onClick={() => setFilterType('all')}
              >
                ทั้งหมด ({rooms.length})
              </Button>
              <Button 
                variant={filterType === 'occupied' ? 'solid' : 'ghost'}
                colorScheme="purple"
                onClick={() => setFilterType('occupied')}
              >
                มีผู้เช่า ({rooms.filter(r => r.status === 'occupied').length})
              </Button>
              <Button 
                variant={filterType === 'vacant' ? 'solid' : 'ghost'}
                colorScheme="purple"
                onClick={() => setFilterType('vacant')}
              >
                ห้องว่าง ({rooms.filter(r => r.status === 'vacant').length})
              </Button>
              <Button 
                variant={filterType === 'unpaid' ? 'solid' : 'ghost'}
                colorScheme="red"
                onClick={() => setFilterType('unpaid')}
              >
                ค้างชำระ ({rooms.filter(r => r.billStatus === 'unpaid' && r.status === 'occupied').length})
              </Button>
            </HStack>
            <InputGroup maxW={{ base: "full", md: "300px" }}>
              <Input
                placeholder="ค้นหาด้วยเลขห้อง หรือชื่อผู้เช่า..."
                bg="gray.50"
                borderRadius="lg"
                value={searchRoom}
                onChange={e => setSearchRoom(e.target.value)}
              />
              <InputRightElement>
                <FaSearch color="gray.400" />
              </InputRightElement>
            </InputGroup>
          </Flex>

          {/* Rooms Grid */}
          {loading ? (
            <Center h="40vh">
              <Spinner size="xl" color="purple.500" thickness="4px" />
            </Center>
          ) : paginatedRooms.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing={{ base: 6, md: 8 }}>
                {paginatedRooms.map(room => {
                  const bill = roomBills[room.id];
                  const electricity = bill?.electricityTotal || room.electricity || 0;
                  const water = bill?.waterTotal || room.water || 0;
                  const rent = room.rent || 0;
                  const service = room.service || 0;
                  const currentMonthTotal = electricity + water + rent + service;

                  return (
                    <motion.div variants={itemVariants} key={room.id}>
                      <RoomCard
                        {...room}
                        tenantName={room.tenantName}
                        tenantEmail={room.tenantEmail}
                        role={role}
                        currentMonthTotal={currentMonthTotal}
                        electricity={electricity}
                        water={water}
                        rent={rent}
                        service={service}
                        onDelete={() => handleDelete(room.id)}
                        onViewBill={() => handleViewBill(room.id)}
                        onAddData={() => handleAddData(room.id)}
                        onSettings={() => handleSettings(room.id)}
                        onUploadProof={() => handleOpenUploadSlipModal(room)}
                        onViewProof={handleViewProof}
                        slipUrl={bill?.slipUrl}
                        onMarkAsPaid={() => handleMarkAsPaid(room.id)}
                        onDeleteProof={() => handleDeleteProof(room.id)}
                      />
                    </motion.div>
                  );
                })}
              </SimpleGrid>
            </motion.div>
          ) : (
            <Center h="40vh" bg="gray.50" borderRadius="xl">
              <VStack spacing={5}>
                <Icon as={FaSearch} w={20} h={20} color="gray.300" />
                <Heading as="h3" size="lg" color="gray.500">ไม่พบข้อมูลห้องพัก</Heading>
                <Text color="gray.400">ลองเปลี่ยนตัวกรองหรือคำค้นหาของคุณ</Text>
              </VStack>
            </Center>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Flex justify="center" align="center" mt={6}>
              <HStack spacing={2}>
                <Button onClick={() => handlePageChange(1)} isDisabled={currentPage === 1} variant="outline" size="sm">หน้าแรก</Button>
                <Button onClick={() => handlePageChange(currentPage - 1)} isDisabled={currentPage === 1} variant="outline" size="sm">ก่อนหน้า</Button>
                <Text fontSize="sm" fontWeight="bold">หน้า {currentPage} จาก {totalPages}</Text>
                <Button onClick={() => handlePageChange(currentPage + 1)} isDisabled={currentPage === totalPages} variant="outline" size="sm">ถัดไป</Button>
                <Button onClick={() => handlePageChange(totalPages)} isDisabled={currentPage === totalPages} variant="outline" size="sm">หน้าสุดท้าย</Button>
              </HStack>
            </Flex>
          )}
        </VStack>
      </Container>

      {/* All Modals */}
      {selectedRoomForSlip && (
        <UploadSlipModal
          isOpen={isUploadSlipModalOpen}
          onClose={() => setIsUploadSlipModalOpen(false)}
          onConfirm={handleConfirmUploadSlip}
          roomName={selectedRoomForSlip.id}
          ownerId={selectedRoomForSlip.ownerId || ''}
          isCentered
          size={{ base: "full", md: "xl" }}
        />
      )}
      <Modal isOpen={isSlipViewModalOpen} onClose={() => setIsSlipViewModalOpen(false)} size={{ base: "full", md: "xl" }} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>หลักฐานการชำระเงิน</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {currentSlipUrl && <Image src={currentSlipUrl} alt="Payment Slip" objectFit="contain" />}
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setIsSlipViewModalOpen(false)}>ปิด</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <AddRoomModal isOpen={isAddRoomOpen} onClose={() => setIsAddRoomOpen(false)} onAdd={handleAddRoom} userRole={role} ownerId={currentUser.uid || undefined} isCentered size={{ base: "full", md: "2xl" }} />
      <EditRoomModal
        isOpen={!!editRoom}
        initialRoom={editRoom}
        onClose={() => setEditRoom(null)}
        onSave={room => handleSaveEditRoom({ ...editRoom, ...room })}
        users={Object.values(usersMap).filter(user => user.role === 'user' || user.role === 'tenant')}
        isCentered
        size={{ base: "full", md: "2xl" }}
      />
      <AlertDialog
        isOpen={isDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsDialogOpen(false)}
        isCentered
      >
        <AlertDialogOverlay />
        <AlertDialogContent m={{ base: 4, md: "auto" }}>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">ยืนยันการลบห้อง</AlertDialogHeader>
          <AlertDialogBody>คุณแน่ใจหรือไม่ว่าต้องการลบห้องนี้? การลบจะไม่สามารถย้อนกลับได้</AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
            <Button colorScheme="red" onClick={confirmDelete} ml={3}>ลบ</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <MeterReadingModal 
        isOpen={isMeterReadingModalOpen}
        onClose={() => setIsMeterReadingModalOpen(false)}
        onSave={handleSaveMeterReadings}
        rooms={filteredRooms.filter(r => r.tenantId) as { id: string; tenantName: string; status: string; tenantId: string; }[]}
        previousReadings={previousReadings}
        isCentered
        size={{ base: "full", md: "4xl" }}
      />
      <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} isCentered size={{ base: "full", md: "xl" }}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Import CSV</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {/* ... Import Modal Content remains the same ... */}
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setIsImportOpen(false)}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal isOpen={isEquipmentModalOpen} onClose={() => setIsEquipmentModalOpen(false)} isCentered size={{ base: "full", md: "xl" }} scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Equipment Assessment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {/* ... Equipment Modal Content remains the same ... */}
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setIsEquipmentModalOpen(false)}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </MainLayout>
  );
}

export default RoomsPage;
