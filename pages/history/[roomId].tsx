import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import {
  Box, Heading, Text, Flex, Button, Input, Table, Thead, Tbody, Tr, Th, Td, Icon, InputGroup, InputLeftElement, Stack, useToast, useBreakpointValue, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay
} from "@chakra-ui/react";
import { FaArrowLeft, FaCalculator, FaBolt, FaTint, FaTrash } from "react-icons/fa";
import AppHeader from "../../components/AppHeader";
import { db } from "../../lib/firebase";
import { collection, addDoc, query, where, orderBy, limit, getDocs, deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

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

  // โหลดข้อมูลห้องจาก Firestore
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

      const billData = {
        roomId: String(roomId),
        date: new Date(date),
        dueDate: new Date(dueDate),
        createdAt: new Date(),
        status: 'unpaid',
        electricityMeterCurrent: newElecMeter,
        electricityMeterPrev: prevElec,
        electricityRate: Number(elecRate),
        electricityUnit,
        electricityTotal,
        waterMeterCurrent: newWaterMeter,
        waterMeterPrev: prevWater,
        waterRate: Number(waterRate),
        waterUnit,
        waterTotal,
        rent,
        service,
        extraServices: latestRoomData?.extraServices || [],
        tenantName: latestRoomData?.tenantName || '-',
        total,
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

  const handleDeleteBill = async (billId: string) => {
    setDeleteConfirmId(billId);
  };

  const confirmDeleteBill = async () => {
    if (!deleteConfirmId || !roomId) return;

    try {
      // 1. Delete the specific bill document
      await deleteDoc(doc(db, "bills", deleteConfirmId));
      toast({ title: "ลบข้อมูลสำเร็จ", status: "success", duration: 2000 });

      // 2. Fetch the new latest bill for the room
      const q = query(
        collection(db, "bills"),
        where("roomId", "==", String(roomId)),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);

      let newLatestBillData;
      if (!snap.empty) {
        // If there's a new latest bill, use its data
        const latestBill = snap.docs[0].data();
        newLatestBillData = {
          latestTotal: latestBill.total || 0,
          billStatus: latestBill.status || 'paid',
          electricity: latestBill.electricityTotal || 0,
          water: latestBill.waterTotal || 0,
          overdueDays: 0, // Reset overdue days
        };
      } else {
        // If no bills are left, reset to default values
        newLatestBillData = {
          latestTotal: 0,
          billStatus: 'paid',
          electricity: 0,
          water: 0,
          overdueDays: 0,
        };
      }

      // 3. Update the room document with the new latest data
      const roomDocRef = doc(db, "rooms", String(roomId));
      await updateDoc(roomDocRef, newLatestBillData);

      // 4. Refresh the history list on the current page
      const updatedHistoryQuery = query(
        collection(db, "bills"),
        where("roomId", "==", String(roomId)),
        orderBy("createdAt", "desc")
      );
      const updatedSnap = await getDocs(updatedHistoryQuery);
      const newHistory = updatedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(newHistory);

    } catch (e) {
      console.error("Error deleting bill:", e);
      toast({ title: "ลบข้อมูลไม่สำเร็จ", description: "เกิดข้อผิดพลาด โปรดลองอีกครั้ง", status: "error" });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const user = {
    name: "xxx",
    avatar: "/avatar.png",
    greeting: "อาทิตย์ 21 มิ.ย. 2568"
  };

  return (
    <>
      <AppHeader user={user} />
      <Box minH="100vh" bgGradient="linear(to-br, #e3f2fd, #bbdefb)" p={[2, 8]} color="gray.800">
        <Flex align="center" mb={8}>
          <Button leftIcon={<FaArrowLeft />} variant="ghost" colorScheme="blue" borderRadius="xl" fontFamily="Kanit" size="md" onClick={() => router.back()}>กลับหน้าหลัก</Button>
          <Heading fontWeight="bold" fontSize={["xl", "2xl"]} color="blue.700" ml={4}>ประวัติค่าไฟ - ห้อง {roomId}</Heading>
        </Flex>
        
        {/* แสดงข้อมูลห้อง */}
        {roomData && (
          <Box bg="white" borderRadius="2xl" boxShadow="0 2px 16px 0 rgba(33,150,243,0.10)" p={[4, 6]} mb={6}>
            <Text fontWeight="bold" fontSize="lg" color="blue.700" mb={3}>ข้อมูลห้อง</Text>
            <Flex gap={6} flexWrap="wrap">
              <Box>
                <Text color="gray.600" fontSize="sm">ชื่อผู้เช่า</Text>
                <Text fontWeight="semibold" color="gray.800">{roomData.tenantName || '-'}</Text>
              </Box>
              <Box>
                <Text color="gray.600" fontSize="sm">ขนาดห้อง</Text>
                <Text fontWeight="semibold" color="gray.800">{roomData.area || 0} ตร.ม.</Text>
              </Box>
              <Box>
                <Text color="gray.600" fontSize="sm">สถานะ</Text>
                <Text fontWeight="semibold" color={roomData.status === 'occupied' ? 'green.600' : 'gray.600'}>
                  {roomData.status === 'occupied' ? 'มีคนอยู่' : 'ว่าง'}
                </Text>
              </Box>
              <Box>
                <Text color="gray.600" fontSize="sm">ค่าเช่า</Text>
                <Text fontWeight="semibold" color="gray.800">฿{roomData.rent?.toLocaleString('th-TH') || 0}</Text>
              </Box>
            </Flex>
          </Box>
        )}
        <Flex gap={6} flexWrap="wrap" mb={8}>
          {/* Card: บันทึกค่าไฟฟ้า */}
          <Box flex={1} minW="320px" bg="white" borderRadius="2xl" boxShadow="0 2px 16px 0 rgba(33,150,243,0.10)" p={[4, 6]}>
            <Flex align="center" mb={4} gap={2}>
              <Icon as={FaBolt} color="yellow.400" boxSize={6} />
              <Text fontWeight="bold" fontSize="lg" color="blue.700">บันทึกค่าไฟฟ้ารอบใหม่</Text>
            </Flex>
            <Flex gap={3} mb={4}>
              <Box flex={1} minW="120px">
                <Text mb={1} color="gray.600">วันที่จด</Text>
                <Input type="date" value={electricity.date} onChange={e => setElectricity({ ...electricity, date: e.target.value })} size="lg" bg="gray.50" />
              </Box>
              <Box flex={1} minW="120px">
                <Text mb={1} color="gray.600">วันครบกำหนด</Text>
                <Input type="date" value={electricity.dueDate} onChange={e => setElectricity({ ...electricity, dueDate: e.target.value })} size="lg" bg="gray.50" />
              </Box>
            </Flex>
            <Box mb={3}>
              <Text mb={1} color="gray.600">เลขมิเตอร์ปัจจุบัน</Text>
              <InputGroup>
                <InputLeftElement pointerEvents="none"><FaBolt color="#fbbf24" /></InputLeftElement>
                <Input placeholder="เลขมิเตอร์" value={electricity.meter} onChange={e => setElectricity({ ...electricity, meter: e.target.value })} size="lg" bg="gray.50" />
              </InputGroup>
            </Box>
            <Box mb={3}>
              <Text mb={1} color="gray.600">ค่ามิเตอร์ครั้งก่อน</Text>
              <Input value={electricity.prev} isReadOnly size="lg" bg="gray.100" color="gray.500" />
              <Text fontSize="xs" color="gray.400" mt={1}>
                {roomData ? 'จากข้อมูลห้อง' : history.length > 0 ? 'จากประวัติล่าสุด' : 'ไม่มีข้อมูล'}
              </Text>
            </Box>
            <Box mb={3}>
              <Text mb={1} color="gray.600">เรทค่าไฟ (บาท/หน่วย)</Text>
              <Input placeholder="เช่น 4.5" value={electricity.rate} onChange={e => setElectricity({ ...electricity, rate: e.target.value })} size="lg" bg="gray.50" type="number" min="0" step="0.01" />
              <Text fontSize="xs" color="gray.400" mt={1}>
                {history.length > 0 ? 'จากประวัติล่าสุด' : 'ค่าเริ่มต้น'}
              </Text>
            </Box>
          </Box>
          {/* Card: บันทึกค่าน้ำ */}
          <Box flex={1} minW="320px" bg="white" borderRadius="2xl" boxShadow="0 2px 16px 0 rgba(33,150,243,0.10)" p={[4, 6]}>
            <Flex align="center" mb={4} gap={2}>
              <Icon as={FaTint} color="blue.400" boxSize={6} />
              <Text fontWeight="bold" fontSize="lg" color="blue.700">บันทึกค่าน้ำรอบใหม่</Text>
            </Flex>
            <Box mb={3}>
              <Text mb={1} color="gray.600">เลขมิเตอร์น้ำปัจจุบัน</Text>
              <InputGroup>
                <InputLeftElement pointerEvents="none"><FaTint color="#38bdf8" /></InputLeftElement>
                <Input placeholder="เลขมิเตอร์น้ำ" value={water.meter} onChange={e => setWater({ ...water, meter: e.target.value })} size="lg" bg="gray.50" />
              </InputGroup>
            </Box>
            <Box mb={3}>
              <Text mb={1} color="gray.600">ค่ามิเตอร์น้ำครั้งก่อน</Text>
              <Input value={water.prev} isReadOnly size="lg" bg="gray.100" color="gray.500" />
              <Text fontSize="xs" color="gray.400" mt={1}>
                {roomData ? 'จากข้อมูลห้อง' : history.length > 0 ? 'จากประวัติล่าสุด' : 'ไม่มีข้อมูล'}
              </Text>
            </Box>
            <Box mb={3}>
              <Text mb={1} color="gray.600">เรทค่าน้ำ (บาท/หน่วย)</Text>
              <Input placeholder="เช่น 15.5" value={water.rate} onChange={e => setWater({ ...water, rate: e.target.value })} size="lg" bg="gray.50" type="number" min="0" step="0.01" />
              <Text fontSize="xs" color="gray.400" mt={1}>
                {history.length > 0 ? 'จากประวัติล่าสุด' : 'ค่าเริ่มต้น'}
              </Text>
            </Box>
          </Box>
        </Flex>
        {/* ปุ่มบันทึกข้อมูลรวม */}
        <Flex justify="flex-end" mb={8}>
          <Button leftIcon={<FaCalculator />} colorScheme="blue" size="md" borderRadius="xl" fontFamily="Kanit" fontWeight="bold" px={6} onClick={handleSaveData}>
            บันทึกข้อมูล
          </Button>
        </Flex>
        {/* Card: ประวัติการคำนวณ */}
        <Box bg="white" borderRadius="2xl" boxShadow="0 2px 16px 0 rgba(33,150,243,0.10)" p={[4, 6]}>
          <Text fontWeight="bold" fontSize="lg" color="blue.700" mb={4}>ประวัติการคำนวณ</Text>
          <Table size="md" variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>วันที่</Th>
                <Th color="orange.400">หน่วยไฟ</Th>
                <Th>เรทไฟ</Th>
                <Th color="green.400">ค่าไฟห้อง</Th>
                <Th>หน่วยน้ำ</Th>
                <Th>เรทน้ำ</Th>
                <Th color="blue.400">ค่าน้ำห้อง</Th>
                <Th>การดำเนินการ</Th>
              </Tr>
            </Thead>
            <Tbody>
              {history.map((item, idx) => (
                <Tr key={item.id || idx}>
                  <Td>{formatDate(item.date)}</Td>
                  <Td color="orange.400">{item.electricityUnit}</Td>
                  <Td>{item.electricityRate ? item.electricityRate : '-'}</Td>
                  <Td color="green.400">
                    {typeof item.electricityTotal === 'number'
                      ? item.electricityTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : '-'}
                  </Td>
                  <Td>{item.waterUnit}</Td>
                  <Td>{item.waterRate ? item.waterRate : '-'}</Td>
                  <Td color="blue.400">
                    {typeof item.waterTotal === 'number'
                      ? item.waterTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : '-'}
                  </Td>
                  <Td>
                    <Button size="sm" colorScheme="red" variant="ghost" borderRadius="xl" fontFamily="Kanit" onClick={() => handleDeleteBill(item.id)} leftIcon={<FaTrash />}>
                      ลบ
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
        <AlertDialog
          isOpen={!!deleteConfirmId}
          leastDestructiveRef={cancelRef}
          onClose={() => setDeleteConfirmId(null)}
        >
          <AlertDialogOverlay />
          <AlertDialogContent borderRadius="2xl">
            <AlertDialogHeader fontWeight="bold">ยืนยันการลบข้อมูล</AlertDialogHeader>
            <AlertDialogBody>คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลบิลนี้? การกระทำนี้ไม่สามารถย้อนกลับได้</AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setDeleteConfirmId(null)} borderRadius="xl" fontFamily="Kanit" size="md">
                ยกเลิก
              </Button>
              <Button colorScheme="red" onClick={confirmDeleteBill} ml={3} borderRadius="xl" fontFamily="Kanit" size="md">
                ลบ
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Box>
    </>
  );
} 