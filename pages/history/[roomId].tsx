import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import {
  Box, Heading, Text, Flex, Button, Input, Table, Thead, Tbody, Tr, Th, Td, Icon, InputGroup, InputLeftElement, Stack, useToast, useBreakpointValue, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay,
  TableContainer
} from "@chakra-ui/react";
import { FaArrowLeft, FaCalculator, FaBolt, FaTint, FaTrash } from "react-icons/fa";
import MainLayout from "../../components/MainLayout";
import TenantLayout from "../../components/TenantLayout";
import { db } from "../../lib/firebase";
import { collection, addDoc, query, where, orderBy, limit, getDocs, deleteDoc, doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";


export default function HistoryRoom() {
  const router = useRouter();
  const { roomId } = router.query;
  const [electricity, setElectricity] = useState({ date: '', dueDate: '', meter: '', prev: '', unit: '', total: '', rate: '0' });
  const [water, setWater] = useState({ meter: '', prev: '', unit: '', total: '', rate: '0' });
  const [history, setHistory] = useState<any[]>([]);
  const [roomData, setRoomData] = useState<any>(null);
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const cancelRef = useRef<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUser({ ...user, ...userData });
          setUserRole(userData.role);
        } else {
          // Handle case where user is authenticated but not in Firestore
          setUserRole(null);
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // โหลดข้อมูลห้องから Firestore
  useEffect(() => {
    if (!roomId) return;
    const fetchRoomData = async () => {
      try {
        const roomDoc = await getDoc(doc(db, "rooms", String(roomId)));
        if (roomDoc.exists()) {
          const data = roomDoc.data();
          setRoomData(data);
        }
      } catch (error) {
        console.error("Error fetching room data:", error);
      }
    };
    fetchRoomData();
  }, [roomId]);

  useEffect(() => {
    if (!currentUser || !roomData || !userRole) return; // Wait for all data to be loaded

    const { uid } = currentUser;

    if (userRole === 'admin') {
      // Admin can access everything
      return;
    } else if (userRole === 'owner') {
      // Owner can access only their own rooms
      if (roomData.ownerId !== uid) {
        toast({ title: "ไม่มีสิทธิ์เข้าถึง", description: "คุณไม่ใช่เจ้าของห้องนี้", status: "error" });
        router.replace('/');
      }
    } else if (userRole === 'user') {
      // Tenant can only access their own room
      if (roomData.tenantId !== uid) {
        toast({ title: "ไม่มีสิทธิ์เข้าถึง", description: "นี่ไม่ใช่ห้องของคุณ", status: "error" });
        router.replace('/tenant-dashboard');
      }
    } else {
      // Other roles are not allowed
      toast({ title: "ไม่มีสิทธิ์เข้าถึง", status: "error" });
      router.replace('/login');
    }

  }, [currentUser, roomData, userRole, router, toast]);

  // โหลดประวัติจาก Firestore ทุกครั้งที่ roomId เปลี่ยน
  useEffect(() => {
    if (!roomId) return;
    const fetchHistory = async () => {
      const q = query(
        collection(db, "bills"),
        where("roomId", "==", String(roomId)),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const newHistory = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(newHistory);
    };
    fetchHistory();
  }, [roomId]);

  // ตั้งค่า default จากประวัติล่าสุด (ค่ามิเตอร์ครั้งก่อน)
  useEffect(() => {
    if (history.length > 0) {
      setElectricity(e => ({ ...e, prev: String(history[0].electricityMeterCurrent || 0) }));
      setWater(w => ({ ...w, prev: String(history[0].waterMeterCurrent || 0) }));
    } else {
      setElectricity(e => ({ ...e, prev: '0' }));
      setWater(w => ({ ...w, prev: '0' }));
    }
  }, [history]);

  // ตั้งค่า rate จากประวัติล่าสุดหรือค่า default
  useEffect(() => {
    if (history.length > 0) {
      // ใช้ rate จากประวัติล่าสุด
      setElectricity(e => ({ 
        ...e, 
        rate: String(history[0].electricityRate || 4.5)
      }));
      setWater(w => ({ 
        ...w, 
        rate: String(history[0].waterRate || 15.5)
      }));
    } else {
      // ใช้ค่า default ถ้าไม่มีประวัติ
      setElectricity(e => ({ ...e, rate: '4.5' }));
      setWater(w => ({ ...w, rate: '15.5' }));
    }
  }, [history]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    // Firestore timestamp object has seconds and nanoseconds properties
    if (timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
    // Handle ISO string date
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        return date.toLocaleDateString("th-TH", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    }
    return "Invalid Date";
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveData = async () => {
    if (!roomId || isSaving) return;

    const { date, dueDate, meter: elecMeter, rate: elecRate } = electricity;
    const { meter: waterMeter, rate: waterRate } = water;

    if (!date || !dueDate || !elecMeter || !elecRate || !waterMeter || !waterRate) {
      toast({ title: "กรุณากรอกข้อมูลให้ครบทุกช่อง", status: "warning" });
      return;
    }

    setIsSaving(true);
    try {
      const roomDocRef = doc(db, "rooms", String(roomId));
      const roomDoc = await getDoc(roomDocRef);
      const latestRoomData = roomDoc.exists() ? roomDoc.data() : null;

      const prevElec = history[0]?.electricityMeterCurrent || 0;
      const prevWater = history[0]?.waterMeterCurrent || 0;

      const newElecMeter = Number(elecMeter);
      const newWaterMeter = Number(waterMeter);

      if (newElecMeter < prevElec || newWaterMeter < prevWater) {
        toast({ title: "ข้อผิดพลาด", description: "เลขมิเตอร์ใหม่ต้องไม่น้อยกว่าเลขมิเตอร์ครั้งก่อน", status: "error" });
        setIsSaving(false);
        return;
      }

      const electricityUnit = newElecMeter - prevElec;
      const electricityTotal = electricityUnit * Number(elecRate);
      const waterUnit = newWaterMeter - prevWater;
      const waterTotal = waterUnit * Number(waterRate);

      const rent = latestRoomData?.rent || 0;
      const service = latestRoomData?.service || 0;
      const extraServicesTotal = (latestRoomData?.extraServices || []).reduce((sum: number, s: { value: number }) => sum + s.value, 0);
      const total = electricityTotal + waterTotal + rent + service + extraServicesTotal;

      const newBill = {
        date: date,
        dueDate: dueDate,
        electricityMeterCurrent: newElecMeter,
        electricityMeterPrev: prevElec,
        electricityRate: Number(elecRate),
        electricityUnit: electricityUnit,
        electricityTotal: electricityTotal,
        waterMeterCurrent: newWaterMeter,
        waterMeterPrev: prevWater,
        waterRate: Number(waterRate),
        waterUnit: waterUnit,
        waterTotal: waterTotal,
        rent: rent,
        service: service,
        extraServices: latestRoomData?.extraServices || [],
        total: total,
      };

      const billData = {
        ...newBill,
        createdAt: Timestamp.fromDate(new Date()),
        date: Timestamp.fromDate(new Date(newBill.date)),
        dueDate: Timestamp.fromDate(new Date(newBill.dueDate)),
        status: "unpaid",
        roomId: roomId,
        tenantId: latestRoomData?.tenantId || null,
      };

      await addDoc(collection(db, "bills"), billData);

      await updateDoc(roomDocRef, {
        latestTotal: total,
        billStatus: 'unpaid',
        electricity: electricityTotal,
        water: waterTotal,
        overdueDays: 0,
      });

      toast({ title: "บันทึกข้อมูลสำเร็จ", status: "success" });

      // Refresh history
      const q = query(collection(db, "bills"), where("roomId", "==", String(roomId)), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const newHistory = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(newHistory);

    } catch (e) {
      console.error("Error saving data:", e);
      toast({ title: "บันทึกข้อมูลไม่สำเร็จ", status: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBill = (billId: string) => {
    setDeleteConfirmId(billId);
  };

  const confirmDeleteBill = async () => {
    if (!deleteConfirmId || !roomId) return;

    try {
      // 1. Delete the specific bill document
      await deleteDoc(doc(db, "bills", deleteConfirmId));
      toast({ title: "ลบข้อมูลสำเร็จ", status: "success", duration: 2000 });

      // 2. Refresh the history list on the current page to get the new state
      const updatedHistoryQuery = query(
        collection(db, "bills"),
        where("roomId", "==", String(roomId)),
        orderBy("createdAt", "desc")
      );
      const updatedSnap = await getDocs(updatedHistoryQuery);
      const newHistory = updatedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(newHistory); // Update the UI with the new history

      // 3. Determine the new latest bill from the refreshed data
      let newLatestBillData;
      if (newHistory.length > 0) {
        const latestBill = newHistory[0] as any; // The new latest bill
        newLatestBillData = {
          latestTotal: latestBill.total || 0,
          billStatus: latestBill.status || 'paid',
          electricity: latestBill.electricityTotal || 0,
          water: latestBill.waterTotal || 0,
          overdueDays: 0, // Reset overdue days
        };
      } else {
        // If no bills are left, reset room to default values
        newLatestBillData = {
          latestTotal: 0,
          billStatus: 'paid',
          electricity: 0,
          water: 0,
          overdueDays: 0,
        };
      }

      // 4. Update the room document with the new latest data
      const roomDocRef = doc(db, "rooms", String(roomId));
      await updateDoc(roomDocRef, newLatestBillData);

    } catch (e) {
      console.error("Error deleting bill:", e);
      toast({ title: "ลบข้อมูลไม่สำเร็จ", description: "เกิดข้อผิดพลาด โปรดลองอีกครั้ง", status: "error" });
    } finally {
      setDeleteConfirmId(null); // Close the modal
    }
  };

  const user = {
    name: "xxx",
    avatar: "/avatar.png",
    greeting: "อาทิตย์ 21 มิ.ย. 2568"
  };

  return (
    (userRole === 'user' ?
      <TenantLayout currentUser={currentUser}>
        <Box minH="100vh" p={{ base: 2, md: 4 }} color="gray.800">
          <Flex align="center" mb={6} direction={{ base: "column", md: "row" }} gap={4}>
            <Button leftIcon={<FaArrowLeft />} variant="ghost" colorScheme="blue" borderRadius="lg" size="md" onClick={() => router.back()} w={{ base: "full", md: "auto" }}>กลับหน้าหลัก</Button>
            <Heading fontWeight="bold" fontSize={{ base: "xl", md: "2xl" }} color="gray.700" ml={{ base: 0, md: 4 }} textAlign={{ base: "center", md: "left" }} w="full">
              ประวัติค่าไฟ - ห้อง {roomId}
            </Heading>
          </Flex>
          
          {/* แสดงข้อมูลห้อง */}
          {roomData && (
            <Box bg="white" borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }} mb={6}>
              <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }} color="blue.700" mb={3}>ข้อมูลห้อง</Text>
              <Flex gap={6} flexWrap="wrap" direction={{ base: "column", sm: "row" }}>
                <Box>
                  <Text color="gray.600" fontSize="sm">ชื่อผู้เช่า</Text>
                  <Text fontWeight="semibold" color="gray.800" fontSize={{ base: "md", md: "lg" }}>{roomData.tenantName || '-'}</Text>
                </Box>
                <Box>
                  <Text color="gray.600" fontSize="sm">ขนาดห้อง</Text>
                  <Text fontWeight="semibold" color="gray.800" fontSize={{ base: "md", md: "lg" }}>{roomData.area || 0} ตร.ม.</Text>
                </Box>
                <Box>
                  <Text color="gray.600" fontSize="sm">สถานะ</Text>
                  <Text fontWeight="semibold" color={roomData.status === 'occupied' ? 'green.600' : 'gray.600'} fontSize={{ base: "md", md: "lg" }}>
                    {roomData.status === 'occupied' ? 'มีคนอยู่' : 'ว่าง'}
                  </Text>
                </Box>
                <Box>
                  <Text color="gray.600" fontSize="sm">ค่าเช่า</Text>
                  <Text fontWeight="semibold" color="gray.800" fontSize={{ base: "md", md: "lg" }}>฿{roomData.rent?.toLocaleString('th-TH') || 0}</Text>
                </Box>
              </Flex>
            </Box>
          )}
          {userRole !== 'user' && (
            <Flex gap={6} flexWrap="wrap" mb={8} direction={{ base: "column", lg: "row" }}>
              {/* Card: บันทึกค่าไฟฟ้า */}
              <Box flex={1} minW={{ base: "full", md: "320px" }} bg="white" borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }}>
                <Flex align="center" mb={4} gap={2}>
                  <Icon as={FaBolt} color="yellow.500" boxSize={6} />
                  <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }} color="blue.700">บันทึกค่าไฟฟ้ารอบใหม่</Text>
                </Flex>
                <Flex gap={3} mb={4} direction={{ base: "column", sm: "row" }}>
                  <Box flex={1} w="full">
                    <Text mb={1} color="gray.600" fontSize="sm">วันที่จด</Text>
                    <Input type="date" value={electricity.date} onChange={e => setElectricity({ ...electricity, date: e.target.value })} size="md" bg="gray.50" borderRadius="md" />
                  </Box>
                  <Box flex={1} w="full">
                    <Text mb={1} color="gray.600" fontSize="sm">วันครบกำหนด</Text>
                    <Input type="date" value={electricity.dueDate} onChange={e => setElectricity({ ...electricity, dueDate: e.target.value })} size="md" bg="gray.50" borderRadius="md" />
                  </Box>
                </Flex>
                <Box mb={3}>
                  <Text mb={1} color="gray.600" fontSize="sm">เลขมิเตอร์ปัจจุบัน</Text>
                  <InputGroup size="md">
                    <InputLeftElement pointerEvents="none"><FaBolt color="#fbbf24" /></InputLeftElement>
                    <Input placeholder="เลขมิเตอร์" value={electricity.meter} onChange={e => setElectricity({ ...electricity, meter: e.target.value })} bg="gray.50" borderRadius="md" />
                  </InputGroup>
                </Box>
                <Box mb={3}>
                  <Text mb={1} color="gray.600" fontSize="sm">ค่ามิเตอร์ครั้งก่อน</Text>
                  <Input value={electricity.prev} isReadOnly size="md" bg="gray.100" color="gray.500" borderRadius="md" />
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    {roomData ? 'จากข้อมูลห้อง' : history.length > 0 ? 'จากประวัติล่าสุด' : 'ไม่มีข้อมูล'}
                  </Text>
                </Box>
                <Box mb={3}>
                  <Text mb={1} color="gray.600" fontSize="sm">เรทค่าไฟ (บาท/หน่วย)</Text>
                  <Input placeholder="เช่น 4.5" value={electricity.rate} onChange={e => setElectricity({ ...electricity, rate: e.target.value })} size="md" bg="gray.50" type="number" min="0" step="0.01" borderRadius="md" />
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    {history.length > 0 ? 'จากประวัติล่าสุด' : 'ค่าเริ่มต้น'}
                  </Text>
                </Box>
              </Box>
              {/* Card: บันทึกค่าน้ำ */}
              <Box flex={1} minW={{ base: "full", md: "320px" }} bg="white" borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }}>
                <Flex align="center" mb={4} gap={2}>
                  <Icon as={FaTint} color="blue.500" boxSize={6} />
                  <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }} color="blue.700">บันทึกค่าน้ำรอบใหม่</Text>
                </Flex>
                <Box mb={3}>
                  <Text mb={1} color="gray.600" fontSize="sm">เลขมิเตอร์น้ำปัจจุบัน</Text>
                  <InputGroup size="md">
                    <InputLeftElement pointerEvents="none"><FaTint color="#38bdf8" /></InputLeftElement>
                    <Input placeholder="เลขมิเตอร์น้ำ" value={water.meter} onChange={e => setWater({ ...water, meter: e.target.value })} bg="gray.50" borderRadius="md" />
                  </InputGroup>
                </Box>
                <Box mb={3}>
                  <Text mb={1} color="gray.600" fontSize="sm">ค่ามิเตอร์น้ำครั้งก่อน</Text>
                  <Input value={water.prev} isReadOnly size="md" bg="gray.100" color="gray.500" borderRadius="md" />
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    {roomData ? 'จากข้อมูลห้อง' : history.length > 0 ? 'จากประวัติล่าสุด' : 'ไม่มีข้อมูล'}
                  </Text>
                </Box>
                <Box mb={3}>
                  <Text mb={1} color="gray.600" fontSize="sm">เรทค่าน้ำ (บาท/หน่วย)</Text>
                  <Input placeholder="เช่น 15.5" value={water.rate} onChange={e => setWater({ ...water, rate: e.target.value })} size="md" bg="gray.50" type="number" min="0" step="0.01" borderRadius="md" />
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    {history.length > 0 ? 'จากประวัติล่าสุด' : 'ค่าเริ่มต้น'}
                  </Text>
                </Box>
              </Box>
            </Flex>
          )}
          {/* ปุ่มบันทึกข้อมูลรวม */}
          {userRole !== 'user' && (
            <Flex justify="flex-end" mb={8}>
              <Button leftIcon={<FaCalculator />} colorScheme="blue" size="md" borderRadius="lg" fontWeight="bold" px={6} onClick={handleSaveData} isLoading={isSaving}>
                บันทึกข้อมูล
              </Button>
            </Flex>
          )}
          {/* Card: ประวัติการคำนวณ */}
          <Box bg="white" borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }}>
            <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }} color="blue.700" mb={4}>ประวัติการคำนวณ</Text>
            <TableContainer>
              <Table size={{ base: "sm", md: "md" }} variant="simple">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>วันที่</Th>
                    <Th color="orange.500">หน่วยไฟ</Th>
                    <Th>เรทไฟ</Th>
                    <Th color="green.500">ค่าไฟห้อง</Th>
                    <Th>หน่วยน้ำ</Th>
                    <Th>เรทน้ำ</Th>
                    <Th color="blue.500">ค่าน้ำห้อง</Th>
                    {userRole !== 'user' && <Th>การดำเนินการ</Th>}
                  </Tr>
                </Thead>
                <Tbody>
                  {history.length === 0 ? (
                    <Tr>
                      <Td colSpan={userRole !== 'user' ? 8 : 7} textAlign="center" color="gray.500" py={8}>ไม่มีประวัติการคำนวณ</Td>
                    </Tr>
                  ) : (
                    history.map((item, idx) => (
                      <Tr key={item.id || idx}>
                        <Td>{formatDate(item.date)}</Td>
                        <Td color="orange.500">{item.electricityUnit}</Td>
                        <Td>{item.electricityRate ? item.electricityRate : '-'}</Td>
                        <Td color="green.500">
                          {typeof item.electricityTotal === 'number'
                            ? item.electricityTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '-'}
                        </Td>
                        <Td>{item.waterUnit}</Td>
                        <Td>{item.waterRate ? item.waterRate : '-'}</Td>
                        <Td color="blue.500">
                          {typeof item.waterTotal === 'number'
                            ? item.waterTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '-'}
                        </Td>
                        {userRole !== 'user' && (
                          <Td>
                            <Button size="sm" colorScheme="red" variant="ghost" borderRadius="lg" onClick={() => handleDeleteBill(item.id)} leftIcon={<FaTrash />}>
                              ลบ
                            </Button>
                          </Td>
                        )}
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
          {userRole !== 'user' && (
            <AlertDialog
              isOpen={!!deleteConfirmId}
              leastDestructiveRef={cancelRef}
              onClose={() => setDeleteConfirmId(null)}
              isCentered
            >
              <AlertDialogOverlay />
              <AlertDialogContent borderRadius="xl" m={{ base: 4, md: "auto" }}>
                <AlertDialogHeader fontWeight="bold" color="red.600">ยืนยันการลบข้อมูล</AlertDialogHeader>
                <AlertDialogBody>คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลบิลนี้? การกระทำนี้ไม่สามารถย้อนกลับได้</AlertDialogBody>
                <AlertDialogFooter>
                  <Button ref={cancelRef} onClick={() => setDeleteConfirmId(null)} borderRadius="lg" size="md">
                    ยกเลิก
                  </Button>
                  <Button colorScheme="red" onClick={confirmDeleteBill} ml={3} borderRadius="lg" size="md">
                    ลบ
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </Box>
      </TenantLayout>
      :
      <MainLayout role={userRole} currentUser={currentUser}>
        <Box minH="100vh" p={{ base: 2, md: 4 }} color="gray.800">
          <Flex align="center" mb={6} direction={{ base: "column", md: "row" }} gap={4}>
            <Button leftIcon={<FaArrowLeft />} variant="ghost" colorScheme="blue" borderRadius="lg" size="md" onClick={() => router.back()} w={{ base: "full", md: "auto" }}>กลับหน้าหลัก</Button>
            <Heading fontWeight="bold" fontSize={{ base: "xl", md: "2xl" }} color="gray.700" ml={{ base: 0, md: 4 }} textAlign={{ base: "center", md: "left" }} w="full">
              ประวัติค่าไฟ - ห้อง {roomId}
            </Heading>
          </Flex>
          
          {/* แสดงข้อมูลห้อง */}
          {roomData && (
            <Box bg="white" borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }} mb={6}>
              <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }} color="blue.700" mb={3}>ข้อมูลห้อง</Text>
              <Flex gap={6} flexWrap="wrap" direction={{ base: "column", sm: "row" }}>
                <Box>
                  <Text color="gray.600" fontSize="sm">ชื่อผู้เช่า</Text>
                  <Text fontWeight="semibold" color="gray.800" fontSize={{ base: "md", md: "lg" }}>{roomData.tenantName || '-'}</Text>
                </Box>
                <Box>
                  <Text color="gray.600" fontSize="sm">ขนาดห้อง</Text>
                  <Text fontWeight="semibold" color="gray.800" fontSize={{ base: "md", md: "lg" }}>{roomData.area || 0} ตร.ม.</Text>
                </Box>
                <Box>
                  <Text color="gray.600" fontSize="sm">สถานะ</Text>
                  <Text fontWeight="semibold" color={roomData.status === 'occupied' ? 'green.600' : 'gray.600'} fontSize={{ base: "md", md: "lg" }}>
                    {roomData.status === 'occupied' ? 'มีคนอยู่' : 'ว่าง'}
                  </Text>
                </Box>
                <Box>
                  <Text color="gray.600" fontSize="sm">ค่าเช่า</Text>
                  <Text fontWeight="semibold" color="gray.800" fontSize={{ base: "md", md: "lg" }}>฿{roomData.rent?.toLocaleString('th-TH') || 0}</Text>
                </Box>
              </Flex>
            </Box>
          )}
          {userRole !== 'user' && (
            <Flex gap={6} flexWrap="wrap" mb={8} direction={{ base: "column", lg: "row" }}>
              {/* Card: บันทึกค่าไฟฟ้า */}
              <Box flex={1} minW={{ base: "full", md: "320px" }} bg="white" borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }}>
                <Flex align="center" mb={4} gap={2}>
                  <Icon as={FaBolt} color="yellow.500" boxSize={6} />
                  <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }} color="blue.700">บันทึกค่าไฟฟ้ารอบใหม่</Text>
                </Flex>
                <Flex gap={3} mb={4} direction={{ base: "column", sm: "row" }}>
                  <Box flex={1} w="full">
                    <Text mb={1} color="gray.600" fontSize="sm">วันที่จด</Text>
                    <Input type="date" value={electricity.date} onChange={e => setElectricity({ ...electricity, date: e.target.value })} size="md" bg="gray.50" borderRadius="md" />
                  </Box>
                  <Box flex={1} w="full">
                    <Text mb={1} color="gray.600" fontSize="sm">วันครบกำหนด</Text>
                    <Input type="date" value={electricity.dueDate} onChange={e => setElectricity({ ...electricity, dueDate: e.target.value })} size="md" bg="gray.50" borderRadius="md" />
                  </Box>
                </Flex>
                <Box mb={3}>
                  <Text mb={1} color="gray.600" fontSize="sm">เลขมิเตอร์ปัจจุบัน</Text>
                  <InputGroup size="md">
                    <InputLeftElement pointerEvents="none"><FaBolt color="#fbbf24" /></InputLeftElement>
                    <Input placeholder="เลขมิเตอร์" value={electricity.meter} onChange={e => setElectricity({ ...electricity, meter: e.target.value })} bg="gray.50" borderRadius="md" />
                  </InputGroup>
                </Box>
                <Box mb={3}>
                  <Text mb={1} color="gray.600" fontSize="sm">ค่ามิเตอร์ครั้งก่อน</Text>
                  <Input value={electricity.prev} isReadOnly size="md" bg="gray.100" color="gray.500" borderRadius="md" />
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    {roomData ? 'จากข้อมูลห้อง' : history.length > 0 ? 'จากประวัติล่าสุด' : 'ไม่มีข้อมูล'}
                  </Text>
                </Box>
                <Box mb={3}>
                  <Text mb={1} color="gray.600" fontSize="sm">เรทค่าไฟ (บาท/หน่วย)</Text>
                  <Input placeholder="เช่น 4.5" value={electricity.rate} onChange={e => setElectricity({ ...electricity, rate: e.target.value })} size="md" bg="gray.50" type="number" min="0" step="0.01" borderRadius="md" />
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    {history.length > 0 ? 'จากประวัติล่าสุด' : 'ค่าเริ่มต้น'}
                  </Text>
                </Box>
              </Box>
              {/* Card: บันทึกค่าน้ำ */}
              <Box flex={1} minW={{ base: "full", md: "320px" }} bg="white" borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }}>
                <Flex align="center" mb={4} gap={2}>
                  <Icon as={FaTint} color="blue.500" boxSize={6} />
                  <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }} color="blue.700">บันทึกค่าน้ำรอบใหม่</Text>
                </Flex>
                <Box mb={3}>
                  <Text mb={1} color="gray.600" fontSize="sm">เลขมิเตอร์น้ำปัจจุบัน</Text>
                  <InputGroup size="md">
                    <InputLeftElement pointerEvents="none"><FaTint color="#38bdf8" /></InputLeftElement>
                    <Input placeholder="เลขมิเตอร์น้ำ" value={water.meter} onChange={e => setWater({ ...water, meter: e.target.value })} bg="gray.50" borderRadius="md" />
                  </InputGroup>
                </Box>
                <Box mb={3}>
                  <Text mb={1} color="gray.600" fontSize="sm">ค่ามิเตอร์น้ำครั้งก่อน</Text>
                  <Input value={water.prev} isReadOnly size="md" bg="gray.100" color="gray.500" borderRadius="md" />
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    {roomData ? 'จากข้อมูลห้อง' : history.length > 0 ? 'จากประวัติล่าสุด' : 'ไม่มีข้อมูล'}
                  </Text>
                </Box>
                <Box mb={3}>
                  <Text mb={1} color="gray.600" fontSize="sm">เรทค่าน้ำ (บาท/หน่วย)</Text>
                  <Input placeholder="เช่น 15.5" value={water.rate} onChange={e => setWater({ ...water, rate: e.target.value })} size="md" bg="gray.50" type="number" min="0" step="0.01" borderRadius="md" />
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    {history.length > 0 ? 'จากประวัติล่าสุด' : 'ค่าเริ่มต้น'}
                  </Text>
                </Box>
              </Box>
            </Flex>
          )}
          {/* ปุ่มบันทึกข้อมูลรวม */}
          {userRole !== 'user' && (
            <Flex justify="flex-end" mb={8}>
              <Button leftIcon={<FaCalculator />} colorScheme="blue" size="md" borderRadius="lg" fontWeight="bold" px={6} onClick={handleSaveData} isLoading={isSaving}>
                บันทึกข้อมูล
              </Button>
            </Flex>
          )}
          {/* Card: ประวัติการคำนวณ */}
          <Box bg="white" borderRadius="xl" boxShadow="sm" p={{ base: 4, md: 6 }}>
            <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }} color="blue.700" mb={4}>ประวัติการคำนวณ</Text>
            <TableContainer>
              <Table size={{ base: "sm", md: "md" }} variant="simple">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>วันที่</Th>
                    <Th color="orange.500">หน่วยไฟ</Th>
                    <Th>เรทไฟ</Th>
                    <Th color="green.500">ค่าไฟห้อง</Th>
                    <Th>หน่วยน้ำ</Th>
                    <Th>เรทน้ำ</Th>
                    <Th color="blue.500">ค่าน้ำห้อง</Th>
                    {userRole !== 'user' && <Th>การดำเนินการ</Th>}
                  </Tr>
                </Thead>
                <Tbody>
                  {history.length === 0 ? (
                    <Tr>
                      <Td colSpan={userRole !== 'user' ? 8 : 7} textAlign="center" color="gray.500" py={8}>ไม่มีประวัติการคำนวณ</Td>
                    </Tr>
                  ) : (
                    history.map((item, idx) => (
                      <Tr key={item.id || idx}>
                        <Td>{formatDate(item.date)}</Td>
                        <Td color="orange.500">{item.electricityUnit}</Td>
                        <Td>{item.electricityRate ? item.electricityRate : '-'}</Td>
                        <Td color="green.500">
                          {typeof item.electricityTotal === 'number'
                            ? item.electricityTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '-'}
                        </Td>
                        <Td>{item.waterUnit}</Td>
                        <Td>{item.waterRate ? item.waterRate : '-'}</Td>
                        <Td color="blue.500">
                          {typeof item.waterTotal === 'number'
                            ? item.waterTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '-'}
                        </Td>
                        {userRole !== 'user' && (
                          <Td>
                            <Button size="sm" colorScheme="red" variant="ghost" borderRadius="lg" onClick={() => handleDeleteBill(item.id)} leftIcon={<FaTrash />}>
                              ลบ
                            </Button>
                          </Td>
                        )}
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
          {userRole !== 'user' && (
            <AlertDialog
              isOpen={!!deleteConfirmId}
              leastDestructiveRef={cancelRef}
              onClose={() => setDeleteConfirmId(null)}
              isCentered
            >
              <AlertDialogOverlay />
              <AlertDialogContent borderRadius="xl" m={{ base: 4, md: "auto" }}>
                <AlertDialogHeader fontWeight="bold" color="red.600">ยืนยันการลบข้อมูล</AlertDialogHeader>
                <AlertDialogBody>คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลบิลนี้? การกระทำนี้ไม่สามารถย้อนกลับได้</AlertDialogBody>
                <AlertDialogFooter>
                  <Button ref={cancelRef} onClick={() => setDeleteConfirmId(null)} borderRadius="lg" size="md">
                    ยกเลิก
                  </Button>
                  <Button colorScheme="red" onClick={confirmDeleteBill} ml={3} borderRadius="lg" size="md">
                    ลบ
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </Box>
      </MainLayout>
    )
  ); 
} 