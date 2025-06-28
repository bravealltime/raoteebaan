import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  Box, Heading, Text, Flex, Button, Input, Table, Thead, Tbody, Tr, Th, Td, Icon, InputGroup, InputLeftElement, Stack, useToast, useBreakpointValue
} from "@chakra-ui/react";
import { FaArrowLeft, FaCalculator, FaBolt, FaTint } from "react-icons/fa";
import AppHeader from "../../components/AppHeader";

const mockHistory = [
  {
    date: "25/12/2024",
    electricityUnit: 345,
    electricityRate: 4.5,
    electricityTotal: 1552.5,
    waterUnit: "-",
    waterRate: 15.5,
    waterTotal: 0,
  },
];

export default function HistoryRoom() {
  const router = useRouter();
  const { roomId } = router.query;
  const [electricity, setElectricity] = useState({ date: '', dueDate: '', meter: '', prev: '', unit: '', total: '', rate: '0' });
  const [water, setWater] = useState({ meter: '', prev: '', unit: '', total: '', rate: '0' });
  const [history, setHistory] = useState<any[]>(mockHistory);
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, md: false });

  // TODO: ดึงข้อมูลจริงจาก Firestore ตาม roomId

  const handleCalcElectricity = () => {
    toast({ title: "คำนวณค่าไฟ (mockup)", status: "info" });
  };
  const handleCalcWater = () => {
    toast({ title: "คำนวณค่าน้ำ (mockup)", status: "info" });
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
          <Button leftIcon={<FaArrowLeft />} variant="ghost" colorScheme="blue" onClick={() => router.push("/dashboard")}>กลับหน้าหลัก</Button>
          <Heading fontWeight="bold" fontSize={["xl", "2xl"]} color="blue.700" ml={4}>ประวัติค่าไฟ - ห้อง {roomId}</Heading>
        </Flex>
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
            </Box>
          </Box>
        </Flex>
        {/* ปุ่มบันทึกข้อมูลรวม */}
        <Flex justify="flex-end" mb={8}>
          <Button leftIcon={<FaCalculator />} colorScheme="blue" size="lg" borderRadius="xl" px={8} onClick={() => { handleCalcElectricity(); handleCalcWater(); }}>
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
              </Tr>
            </Thead>
            <Tbody>
              {history.map((item, idx) => (
                <Tr key={idx}>
                  <Td>{item.date}</Td>
                  <Td color="orange.400">{item.electricityUnit}</Td>
                  <Td>{item.electricityRate}</Td>
                  <Td color="green.400">{item.electricityTotal}</Td>
                  <Td>{item.waterUnit}</Td>
                  <Td>{item.waterRate}</Td>
                  <Td color="blue.400">{item.waterTotal}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Box>
    </>
  );
} 