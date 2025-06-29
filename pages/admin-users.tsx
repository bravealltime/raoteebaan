import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { Box, Flex, Heading, Text, Button, Avatar, Badge, IconButton, Input, Table, Thead, Tbody, Tr, Th, Td, Select, useToast, Spinner, Center, SimpleGrid, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, FormControl, FormLabel, Alert, AlertIcon, AlertTitle, AlertDescription, Link } from "@chakra-ui/react";
import { FaUserShield, FaUser, FaCrown, FaUserFriends, FaEdit, FaTrash, FaBan, FaPlus, FaHome, FaFileInvoice, FaEnvelope } from "react-icons/fa";
import AppHeader from "../components/AppHeader";
import Sidebar from "../components/Sidebar";
import { onAuthStateChanged } from "firebase/auth";

export default function AdminUsers() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const toast = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", role: "user", status: "active" });
  const [addLoading, setAddLoading] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [showResetLink, setShowResetLink] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      const snap = await getDoc(doc(db, "users", u.uid));
      const userRole = snap.exists() ? snap.data().role : "user";
      setRole(userRole);
      if (userRole !== "admin") {
        if (userRole === "employee") router.replace("/employee-dashboard");
        else router.replace("/user-dashboard");
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (role === "admin") {
      setLoading(true);
      Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "rooms")),
        getDocs(collection(db, "bills")),
      ]).then(([userSnap, roomSnap, billSnap]) => {
        setUsers(userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setRooms(roomSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setBills(billSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      });
    }
  }, [role]);

  const handleAddUser = async () => {
    setAddLoading(true);
    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addForm),
      });

      const data = await response.json();

      if (response.ok) {
        toast({ 
          title: "เพิ่มผู้ใช้สำเร็จ", 
          description: "ลิงก์ตั้งรหัสผ่านถูกส่งไปที่อีเมลแล้ว",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        
        // Show reset link to admin
        setResetLink(data.resetLink);
        setShowResetLink(true);
        
        // Reset form
        setAddForm({ name: "", email: "", role: "user", status: "active" });
        
        // Refresh users
        const userSnap = await getDocs(collection(db, "users"));
        setUsers(userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        toast({ 
          title: "เพิ่มผู้ใช้ไม่สำเร็จ", 
          description: data.error,
          status: "error" 
        });
      }
    } catch (e) {
      toast({ 
        title: "เพิ่มผู้ใช้ไม่สำเร็จ", 
        description: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
        status: "error" 
      });
    } finally {
      setAddLoading(false);
    }
  };

  const copyResetLink = () => {
    if (resetLink) {
      navigator.clipboard.writeText(resetLink);
      toast({ 
        title: "คัดลอกลิงก์แล้ว", 
        status: "success",
        duration: 2000,
      });
    }
  };

  const closeResetLinkModal = () => {
    setShowResetLink(false);
    setResetLink(null);
    setIsAddOpen(false);
  };

  if (role === null) return <Center minH="100vh"><Spinner color="blue.400" /></Center>;
  if (role !== "admin") return null;

  return (
    <Box minH="100vh" bgGradient="linear(to-br, #e3f2fd, #bbdefb)">
      <AppHeader />
      <Flex minH="100vh" p={0}>
        <Sidebar />
        <Box flex={1} p={[2, 4, 8]}>
          <Heading color="blue.600" fontSize="2xl" mb={6} display="flex" alignItems="center" gap={2}>
            <FaUserShield /> Admin Panel
          </Heading>
          <SimpleGrid columns={[1, 2, 4]} spacing={4} mb={6}>
            <Box bg="white" borderRadius="xl" p={6} color="blue.700" display="flex" alignItems="center" gap={4} boxShadow="md" border="1.5px solid #e3f2fd">
              <FaUserFriends fontSize="2xl" />
              <Box>
                <Text fontWeight="bold" fontSize="lg">ผู้ใช้ทั้งหมด</Text>
                <Text fontSize="2xl">{users.length}</Text>
              </Box>
            </Box>
            <Box bg="white" borderRadius="xl" p={6} color="yellow.700" display="flex" alignItems="center" gap={4} boxShadow="md" border="1.5px solid #ffe082">
              <FaCrown fontSize="2xl" color="#ffd700" />
              <Box>
                <Text fontWeight="bold" fontSize="lg">ผู้ดูแลระบบ</Text>
                <Text fontSize="2xl">{users.filter(u => u.role === "admin").length}</Text>
              </Box>
            </Box>
            <Box bg="white" borderRadius="xl" p={6} color="green.700" display="flex" alignItems="center" gap={4} boxShadow="md" border="1.5px solid #c8e6c9">
              <FaHome fontSize="2xl" />
              <Box>
                <Text fontWeight="bold" fontSize="lg">ห้องทั้งหมด</Text>
                <Text fontSize="2xl">{rooms.length}</Text>
              </Box>
            </Box>
            <Box bg="white" borderRadius="xl" p={6} color="purple.700" display="flex" alignItems="center" gap={4} boxShadow="md" border="1.5px solid #e1bee7">
              <FaFileInvoice fontSize="2xl" />
              <Box>
                <Text fontWeight="bold" fontSize="lg">บิลทั้งหมด</Text>
                <Text fontSize="2xl">{bills.length}</Text>
              </Box>
            </Box>
          </SimpleGrid>
          <Box bg="white" borderRadius="2xl" p={6} color="gray.800" boxShadow="xl" border="1.5px solid #e3f2fd">
            <Flex mb={4} gap={2} align="center" flexWrap="wrap">
              <Button leftIcon={<FaUserFriends />} colorScheme="blue" variant="solid" borderRadius="xl" fontWeight="bold" mr={2}>
                จัดการผู้ใช้
              </Button>
              <Button colorScheme="gray" variant="ghost" borderRadius="xl" fontWeight="bold" mr={2}>
                จัดการสิทธิ์
              </Button>
              <Button colorScheme="gray" variant="ghost" borderRadius="xl" fontWeight="bold">
                รายงาน
              </Button>
              <Input placeholder="ค้นหาผู้ใช้..." maxW="220px" bg="gray.50" borderRadius="xl" color="gray.800" mr={2} value={search} onChange={e => setSearch(e.target.value)} />
              <Select maxW="160px" bg="gray.50" borderRadius="xl" color="gray.800" value={filter} onChange={e => setFilter(e.target.value)}>
                <option value="">ทุกสิทธิ์</option>
                <option value="admin">ผู้ดูแลระบบ</option>
                <option value="juristic">นิติ</option>
                <option value="technician">ช่าง</option>
                <option value="owner">เจ้าของห้อง</option>
                <option value="user">ลูกบ้าน</option>
              </Select>
              <Button leftIcon={<FaPlus />} colorScheme="green" borderRadius="xl" fontWeight="bold" ml="auto" onClick={() => setIsAddOpen(true)}>
                เพิ่มผู้ใช้
              </Button>
            </Flex>
            <Box overflowX="auto">
              <Table variant="simple" colorScheme="gray" bg="white" borderRadius="xl">
                <Thead>
                  <Tr>
                    <Th color="blue.700">รูปโปรไฟล์</Th>
                    <Th color="blue.700">ชื่อ</Th>
                    <Th color="blue.700">อีเมล</Th>
                    <Th color="blue.700">สิทธิ์</Th>
                    <Th color="blue.700">วันที่สมัคร</Th>
                    <Th color="blue.700">สถานะ</Th>
                    <Th color="blue.700">จัดการ</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {loading ? (
                    <Tr><Td colSpan={7}><Spinner color="blue.300" /></Td></Tr>
                  ) : (
                    users.filter(u => (!search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())) && (!filter || u.role === filter)).map((u, i) => (
                      <Tr key={u.id} _hover={{ bg: "blue.50" }}>
                        <Td><Avatar name={u.name} src={u.avatar} size="sm" /></Td>
                        <Td fontWeight="bold">{u.name}</Td>
                        <Td>{u.email}</Td>
                        <Td>
                          {u.role === "admin" ? <Badge colorScheme="yellow" borderRadius="full">ผู้ดูแลระบบ</Badge> :
                            u.role === "juristic" ? <Badge colorScheme="purple" borderRadius="full">นิติ</Badge> :
                            u.role === "technician" ? <Badge colorScheme="orange" borderRadius="full">ช่าง</Badge> :
                            u.role === "owner" ? <Badge colorScheme="green" borderRadius="full">เจ้าของห้อง</Badge> :
                            <Badge colorScheme="blue" borderRadius="full">ลูกบ้าน</Badge>}
                        </Td>
                        <Td>{u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString("th-TH") : "-"}</Td>
                        <Td>
                          <Badge colorScheme={u.status === "active" ? "green" : "gray"} borderRadius="full">
                            {u.status === "active" ? "ใช้งานได้" : "ไม่ใช้งาน"}
                          </Badge>
                        </Td>
                        <Td>
                          <IconButton aria-label="edit" icon={<FaEdit />} colorScheme="blue" variant="ghost" borderRadius="full" mr={1} />
                          <IconButton aria-label="ban" icon={<FaBan />} colorScheme="orange" variant="ghost" borderRadius="full" mr={1} />
                          <IconButton aria-label="delete" icon={<FaTrash />} colorScheme="red" variant="ghost" borderRadius="full" />
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Box>
          </Box>
        </Box>
      </Flex>
      
      {/* Add User Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} isCentered size="md">
        <ModalOverlay />
        <ModalContent borderRadius="2xl" p={2}>
          <ModalHeader fontWeight="bold" color="blue.600">เพิ่มผู้ใช้ใหม่</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={3}>
              <FormLabel>ชื่อ</FormLabel>
              <Input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="ชื่อผู้ใช้" />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>อีเมล</FormLabel>
              <Input value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="อีเมล" type="email" />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>สิทธิ์</FormLabel>
              <Select value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}>
                <option value="admin">ผู้ดูแลระบบ</option>
                <option value="juristic">นิติ</option>
                <option value="technician">ช่าง</option>
                <option value="owner">เจ้าของห้อง</option>
                <option value="user">ลูกบ้าน</option>
              </Select>
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>สถานะ</FormLabel>
              <Select value={addForm.status} onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">ใช้งานได้</option>
                <option value="inactive">ไม่ใช้งาน</option>
              </Select>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleAddUser} isLoading={addLoading} borderRadius="xl" fontWeight="bold">บันทึก</Button>
            <Button variant="ghost" onClick={() => setIsAddOpen(false)} borderRadius="xl">ยกเลิก</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Reset Link Modal */}
      <Modal isOpen={showResetLink} onClose={closeResetLinkModal} isCentered size="lg">
        <ModalOverlay />
        <ModalContent borderRadius="2xl" p={2}>
          <ModalHeader fontWeight="bold" color="green.600" display="flex" alignItems="center" gap={2}>
            <FaEnvelope /> ลิงก์ตั้งรหัสผ่าน
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="success" borderRadius="xl" mb={4}>
              <AlertIcon />
              <Box>
                <AlertTitle>สร้างผู้ใช้สำเร็จ!</AlertTitle>
                <AlertDescription>
                  ผู้ใช้ใหม่ถูกสร้างเรียบร้อยแล้ว กรุณาส่งลิงก์ด้านล่างไปให้ผู้ใช้เพื่อตั้งรหัสผ่าน
                </AlertDescription>
              </Box>
            </Alert>
            <Box bg="gray.50" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
              <Text fontWeight="bold" mb={2} color="gray.700">ลิงก์ตั้งรหัสผ่าน:</Text>
              <Text fontSize="sm" color="gray.600" wordBreak="break-all" mb={3}>
                {resetLink}
              </Text>
              <Button 
                leftIcon={<FaEnvelope />} 
                colorScheme="blue" 
                size="sm" 
                onClick={copyResetLink}
                borderRadius="xl"
              >
                คัดลอกลิงก์
              </Button>
            </Box>
            <Text fontSize="sm" color="gray.500" mt={3}>
              💡 เคล็ดลับ: ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง ผู้ใช้สามารถคลิกลิงก์เพื่อตั้งรหัสผ่านใหม่ได้
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="green" onClick={closeResetLinkModal} borderRadius="xl" fontWeight="bold">
              เข้าใจแล้ว
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
} 