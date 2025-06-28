import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Box, Heading, Text, Flex, Spinner, Table, Thead, Tbody, Tr, Th, Td, Button, Icon } from "@chakra-ui/react";
import { db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { FaFileInvoice, FaArrowLeft } from "react-icons/fa";

const mockBill = {
  date: "25/12/2024",
  dueDate: "31/12/2024",
  room: "101",
  tenant: "สมชาย ใจร้าย",
  total: 10201.5,
  items: [
    { label: "ค่าไฟฟ้า", value: 1552.5 },
    { label: "ค่าน้ำ", value: 0 },
    { label: "ค่าเช่า", value: 5000 },
    { label: "ค่าที่จอดรถ", value: 3000 },
    { label: "ค่าเน็ต", value: 649 },
  ],
};

export default function BillDetail() {
  const router = useRouter();
  const { roomId } = router.query;
  const [bill, setBill] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    const fetchBill = async () => {
      setLoading(true);
      try {
        // ตัวอย่าง: ดึงข้อมูลจาก Firestore (สมมุติว่าเก็บบิลไว้ที่ rooms/{roomId})
        const docRef = doc(db, "rooms", String(roomId));
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const d = docSnap.data();
          setBill({
            date: d.billDate || mockBill.date,
            dueDate: d.dueDate || mockBill.dueDate,
            room: d.id || roomId,
            tenant: d.tenantName || "-",
            total: d.latestTotal || 0,
            items: [
              { label: "ค่าไฟฟ้า", value: d.electricity || 0 },
              { label: "ค่าน้ำ", value: d.water || 0 },
              { label: "ค่าเช่า", value: d.rent || 0 },
              { label: "ค่าที่จอดรถ", value: d.parking || 0 },
              { label: "ค่าเน็ต", value: d.internet || 0 },
            ],
          });
        } else {
          setBill(mockBill);
        }
      } catch {
        setBill(mockBill);
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [roomId]);

  if (loading) return <Flex minH="100vh" align="center" justify="center"><Spinner size="xl" /></Flex>;
  if (!bill) return <Box p={8}><Text>ไม่พบข้อมูลบิล</Text></Box>;

  return (
    <Flex minH="100vh" align="center" justify="center" bgGradient="linear(to-br, #e3f2fd, #bbdefb)">
      <Box bg="white" borderRadius="2xl" boxShadow="2xl" p={[4, 8]} maxW="420px" w="full" color="gray.800">
        <Button leftIcon={<FaArrowLeft />} mb={4} variant="ghost" colorScheme="blue" onClick={() => router.push("/dashboard")}>กลับหน้าหลัก</Button>
        <Flex direction="column" align="center" mb={4}>
          <Icon as={FaFileInvoice} w={8} h={8} color="green.500" mb={2} />
          <Heading fontWeight="bold" fontSize="2xl" color="green.600" mb={1}>ใบแจ้งค่าใช้จ่าย</Heading>
          <Text color="gray.500" fontSize="sm">วันที่ออกใบแจ้งหนี้: {bill.date}</Text>
        </Flex>
        <Flex justify="space-between" mb={2}>
          <Box>
            <Text>ห้อง: <b>{bill.room}</b></Text>
            <Text>ชื่อผู้เช่า: <b>{bill.tenant}</b></Text>
          </Box>
          <Box textAlign="right">
            <Text>รอบบิล: <b>{bill.date}</b></Text>
            <Text>วันครบกำหนด: <b>{bill.dueDate}</b></Text>
          </Box>
        </Flex>
        <Text textAlign="center" fontSize="3xl" color="green.500" fontWeight="extrabold" my={4}>
          ฿{bill.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Text>
        <Box mb={4}>
          <Text fontWeight="bold" mb={2}>รายละเอียดค่าใช้จ่าย</Text>
          <Table size="sm" variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>รายการ</Th>
                <Th isNumeric>จำนวนเงิน (บาท)</Th>
              </Tr>
            </Thead>
            <Tbody>
              {bill.items.map((item: any, idx: number) => (
                <Tr key={idx}>
                  <Td>{item.label}</Td>
                  <Td isNumeric>{item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Td>
                </Tr>
              ))}
              <Tr fontWeight="bold">
                <Td>รวมทั้งสิ้น</Td>
                <Td isNumeric>{bill.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Td>
              </Tr>
            </Tbody>
          </Table>
        </Box>
        <Box bg="yellow.50" borderRadius="md" p={3} color="yellow.800" fontSize="sm" mb={2}>
          <b>วิธีการชำระเงิน</b>
          <ul style={{ marginLeft: 16 }}>
            <li>กรุณาชำระเงินภายในวันที่ <b>{bill.dueDate}</b></li>
            <li>ช่องทางการชำระเงิน: โอนบัญชีธนาคาร/พร้อมเพย์/เงินสด</li>
            <li>แจ้งสลิปหรือหลักฐานการชำระเงินกับผู้ดูแล</li>
          </ul>
        </Box>
      </Box>
    </Flex>
  );
} 