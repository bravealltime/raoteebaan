
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Avatar,
  Badge,
  IconButton,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  useToast,
  Spinner,
  Center,
  SimpleGrid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Link,
  Tooltip,
  Icon,
  Spacer,
} from "@chakra-ui/react";
import {
  FaUserShield,
  FaUser,
  FaCrown,
  FaUserFriends,
  FaEdit,
  FaTrash,
  FaBan,
  FaPlus,
  FaHome,
  FaFileInvoice,
  FaEnvelope,
  FaUserTag,
} from "react-icons/fa";
import MainLayout from "../components/MainLayout";
import withAuthProtection from "../lib/withAuthProtection";

function AdminUsers({ currentUser }) {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const toast = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    role: "user",
    status: "active",
    roomId: "", // Add roomId to state
  });
  const [addLoading, setAddLoading] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [showResetLink, setShowResetLink] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [isConfirmBanOpen, setIsConfirmBanOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<any | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [isManagePermissionsOpen, setIsManagePermissionsOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userSnap, roomSnap, billSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "rooms")),
        getDocs(collection(db, "bills")),
      ]);
      setUsers(userSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setRooms(roomSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setBills(billSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาดในการโหลดข้อมูล",
        description: "ไม่สามารถดึงข้อมูลผู้ใช้ ห้อง หรือบิลได้",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = async (targetUser: any) => {
    if (!currentUser) return;

    const conversationQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid)
    );

    const querySnapshot = await getDocs(conversationQuery);
    const existingConversation = querySnapshot.docs.find((doc) =>
      doc.data().participants.includes(targetUser.id)
    );

    if (existingConversation) {
      router.push(`/inbox?conversationId=${existingConversation.id}`);
    } else {
      const newConversation = await addDoc(collection(db, "conversations"), {
        participants: [currentUser.uid, targetUser.id],
        updatedAt: serverTimestamp(),
        lastMessage: "",
      });
      router.push(`/inbox?conversationId=${newConversation.id}`);
    }
  };

  const handleAddUser = async () => {
    setAddLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        toast({
          title: "Error",
          description: "Authentication token not found.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setAddLoading(false);
        return;
      }

      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
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
        setAddForm({ name: "", email: "", role: "user", status: "active", roomId: "" });

        // Refresh users
        fetchData();
      } else {
        toast({
          title: "เพิ่มผู้ใช้ไม่สำเร็จ",
          description: data.error,
          status: "error",
        });
      }
    } catch (e) {
      toast({
        title: "เพิ่มผู้ใช้ไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
        status: "error",
      });
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditClick = (user: any) => {
    setEditForm({ ...user });
    setIsEditOpen(true);
  };

  const handleEditUser = async () => {
    if (!editForm) return;
    setEditLoading(true);
    try {
      await setDoc(
        doc(db, "users", editForm.id),
        {
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          status: editForm.status,
        },
        { merge: true }
      );
      toast({
        title: "อัปเดตผู้ใช้สำเร็จ",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setIsEditOpen(false);
      fetchData();
    } catch (error) {
      toast({
        title: "อัปเดตผู้ใช้ไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleBanClick = (user: any) => {
    setUserToBan(user);
    setIsConfirmBanOpen(true);
  };

  const handleBanUser = async () => {
    if (!userToBan) return;
    try {
      await setDoc(
        doc(db, "users", userToBan.id),
        { status: "inactive" },
        { merge: true }
      );
      toast({
        title: "ระงับผู้ใช้สำเร็จ",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setIsConfirmBanOpen(false);
      fetchData();
    } catch (error) {
      toast({
        title: "ระงับผู้ใช้ไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการระงับผู้ใช้",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteClick = (user: any) => {
    setUserToDelete(user);
    setIsConfirmDeleteOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      // Note: Deleting user from Firebase Authentication is not directly possible from client-side.
      // This will only delete the user document from Firestore.
      // A Cloud Function or server-side logic would be needed to delete from Auth.
      await deleteDoc(doc(db, "users", userToDelete.id));
      toast({
        title: "ลบผู้ใช้สำเร็จ",
        description:
          "ผู้ใช้ถูกลบออกจากฐานข้อมูลแล้ว (หากต้องการลบจากระบบยืนยันตัวตน ต้องทำผ่าน Firebase Console)",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      setIsConfirmDeleteOpen(false);
      fetchData();
    } catch (error) {
      toast({
        title: "ลบผู้ใช้ไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการลบผู้ใช้",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
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

  return (
    <MainLayout role={currentUser?.role} currentUser={currentUser}>
      <Box p={{ base: 2, md: 4 }}>
        <Heading
          color="gray.700"
          fontSize={{ base: "xl", md: "2xl" }}
          mb={6}
          display="flex"
          alignItems="center"
          gap={2}
        >
          <FaUserShield /> Admin Panel
        </Heading>
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={{ base: 4, md: 6 }} mb={6}>
          <Box
            bg="white"
            borderRadius="lg"
            p={5}
            display="flex"
            alignItems="center"
            gap={4}
            boxShadow="sm"
          >
            <Icon as={FaUserFriends} fontSize="2xl" color="blue.500" />
            <Box>
              <Text fontWeight="bold" fontSize="md" color="gray.600">
                ผู้ใช้ทั้งหมด
              </Text>
              <Text fontSize="xl" fontWeight="bold">{users.length}</Text>
            </Box>
          </Box>
          <Box
            bg="white"
            borderRadius="lg"
            p={5}
            display="flex"
            alignItems="center"
            gap={4}
            boxShadow="sm"
          >
            <Icon as={FaCrown} fontSize="2xl" color="yellow.500" />
            <Box>
              <Text fontWeight="bold" fontSize="md" color="gray.600">
                ผู้ดูแลระบบ
              </Text>
              <Text fontSize="xl" fontWeight="bold">
                {users.filter((u) => u.role === "admin").length}
              </Text>
            </Box>
          </Box>
          <Box
            bg="white"
            borderRadius="lg"
            p={5}
            display="flex"
            alignItems="center"
            gap={4}
            boxShadow="sm"
          >
            <Icon as={FaHome} fontSize="2xl" color="green.500" />
            <Box>
              <Text fontWeight="bold" fontSize="md" color="gray.600">
                ห้องทั้งหมด
              </Text>
              <Text fontSize="xl" fontWeight="bold">{rooms.length}</Text>
            </Box>
          </Box>
          <Box
            bg="white"
            borderRadius="lg"
            p={5}
            display="flex"
            alignItems="center"
            gap={4}
            boxShadow="sm"
          >
            <Icon as={FaFileInvoice} fontSize="2xl" color="purple.500" />
            <Box>
              <Text fontWeight="bold" fontSize="md" color="gray.600">
                บิลทั้งหมด
              </Text>
              <Text fontSize="xl" fontWeight="bold">{bills.length}</Text>
            </Box>
          </Box>
        </SimpleGrid>
        <Box
          bg="white"
          borderRadius="lg"
          p={{ base: 3, md: 5 }}
          boxShadow="sm"
        >
          <Flex mb={4} gap={2} align="center" flexWrap="wrap" direction={{ base: "column", md: "row" }}>
            <Input
              placeholder="ค้นหาผู้ใช้..."
              maxW={{ base: "full", md: "250px" }}
              bg="gray.50"
              borderRadius="lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="sm"
            />
            <Select
              maxW={{ base: "full", md: "180px" }}
              bg="gray.50"
              borderRadius="lg"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              size="sm"
            >
              <option value="">ทุกสิทธิ์</option>
              <option value="admin">🛡️ ผู้ดูแลระบบ</option>
                <option value="juristic">🏢 นิติ</option>
                <option value="technician">🛠️ ช่าง</option>
                <option value="owner">🏠 เจ้าของห้อง</option>
                <option value="user">👤 ลูกบ้าน</option>
            </Select>
            <Spacer />
            <Button
              leftIcon={<FaPlus />}
              colorScheme="blue"
              borderRadius="lg"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              w={{ base: "full", md: "auto" }}
            >
              เพิ่มผู้ใช้
            </Button>
            <Button
              leftIcon={<FaUserTag />}
              colorScheme="gray"
              variant="outline"
              borderRadius="lg"
              size="sm"
              onClick={() => setIsManagePermissionsOpen(true)}
              w={{ base: "full", md: "auto" }}
            >
              จัดการสิทธิ์
            </Button>
          </Flex>
          <Box overflowX="auto">
            <Table
              variant="simple"
              size="sm"
            >
              <Thead>
                <Tr>
                  <Th>ผู้ใช้</Th>
                  <Th>อีเมล</Th>
                  <Th>สิทธิ์</Th>
                  <Th>วันที่สมัคร</Th>
                  <Th>สถานะ</Th>
                  <Th>จัดการ</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr>
                    <Td colSpan={7}>
                      <Spinner color="blue.300" />
                    </Td>
                  </Tr>
                ) : (
                  users
                    .filter(
                      (u) =>
                        (!search ||
                          u.name?.toLowerCase().includes(search.toLowerCase()) ||
                          u.email?.toLowerCase().includes(search.toLowerCase())) &&
                        (!filter || u.role === filter)
                    )
                    .map((u, i) => (
                      <Tr key={u.id} _hover={{ bg: "blue.50" }}>
                        <Td>
                          <Avatar name={u.name} src={u.avatar} size="sm" />
                        </Td>
                        <Td fontWeight="bold" fontSize="sm">
                          {u.name}
                        </Td>
                        <Td fontSize="sm">{u.email}</Td>
                        <Td>
                          {u.role === "admin" ? (
                            <Badge
                              colorScheme="yellow"
                              borderRadius="full"
                              fontSize="xs"
                            >
                              🛡️ ผู้ดูแลระบบ
                            </Badge>
                          ) : u.role === "juristic" ? (
                            <Badge
                              colorScheme="purple"
                              borderRadius="full"
                              fontSize="xs"
                            >
                              🏢 นิติ
                            </Badge>
                          ) : u.role === "technician" ? (
                            <Badge
                              colorScheme="orange"
                              borderRadius="full"
                              fontSize="xs"
                            >
                              🛠️ ช่าง
                            </Badge>
                          ) : u.role === "owner" ? (
                            <Badge
                              colorScheme="green"
                              borderRadius="full"
                              fontSize="xs"
                            >
                              🏠 เจ้าของห้อง
                            </Badge>
                          ) : (
                            <Badge
                              colorScheme="blue"
                              borderRadius="full"
                              fontSize="xs"
                            >
                              👤 ลูกบ้าน
                            </Badge>
                          )}
                        </Td>
                        <Td fontSize="sm">
                          {u.createdAt
                            ? new Date(
                                u.createdAt.seconds * 1000
                              ).toLocaleDateString("th-TH")
                            : "-"}
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={u.status === "active" ? "green" : "gray"}
                            borderRadius="full"
                            fontSize="xs"
                          >
                            {u.status === "active" ? "ใช้งานได้" : "ไม่ใช้งาน"}
                          </Badge>
                        </Td>
                        <Td>
                          <IconButton
                            aria-label="chat"
                            icon={<FaEnvelope />}
                            colorScheme="teal"
                            variant="ghost"
                            borderRadius="full"
                            size="sm"
                            mr={2}
                            onClick={() => handleStartConversation(u)}
                          />
                          <IconButton
                            aria-label="edit"
                            icon={<FaEdit />}
                            colorScheme="blue"
                            variant="ghost"
                            borderRadius="full"
                            size="sm"
                            mr={2}
                            onClick={() => handleEditClick(u)}
                          />
                          <IconButton
                            aria-label="ban"
                            icon={<FaBan />}
                            colorScheme="orange"
                            variant="ghost"
                            borderRadius="full"
                            size="sm"
                            mr={2}
                            onClick={() => handleBanClick(u)}
                          />
                          <IconButton
                            aria-label="delete"
                            icon={<FaTrash />}
                            colorScheme="red"
                            variant="ghost"
                            borderRadius="full"
                            size="sm"
                            onClick={() => handleDeleteClick(u)}
                          />
                        </Td>
                      </Tr>
                    ))
                )}
              </Tbody>
            </Table>
          </Box>
        </Box>
      </Box>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        isCentered
        size={{ base: "full", md: "md" }}
      >
        <ModalOverlay />
        <ModalContent borderRadius="2xl" p={2} m={{ base: 4, md: "auto" }}>
          <ModalHeader fontWeight="bold" color="blue.600">
            เพิ่มผู้ใช้ใหม่
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl mt={4}>
              <FormLabel>ชื่อ</FormLabel>
              <Input
                value={addForm.name}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="ชื่อผู้ใช้"
                borderRadius="lg"
              />
            </FormControl>
            <FormControl mt={4}>
              <FormLabel>อีเมล</FormLabel>
              <Input
                value={addForm.email}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="อีเมล"
                type="email"
                borderRadius="lg"
              />
            </FormControl>
            <FormControl mt={4}>
              <FormLabel>สิทธิ์</FormLabel>
              <Select
                value={addForm.role}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, role: e.target.value }))
                }
                borderRadius="lg"
              >
                <option value="admin">🛡️ ผู้ดูแลระบบ</option>
                        <option value="juristic">🏢 นิติ</option>
                        <option value="technician">🛠️ ช่าง</option>
                        <option value="owner">🏠 เจ้าของห้อง</option>
                        <option value="user">👤 ลูกบ้าน</option>
              </Select>
            </FormControl>
            <FormControl mt={4}>
              <FormLabel>สถานะ</FormLabel>
              <Select
                value={addForm.status}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, status: e.target.value }))
                }
                borderRadius="lg"
              >
                <option value="active">ใช้งานได้</option>
                <option value="inactive">ไม่ใช้งาน</option>
              </Select>
            </FormControl>
            {addForm.role === "user" && (
              <FormControl mt={4}>
                <FormLabel>รหัสห้อง (สำหรับลูกบ้าน)</FormLabel>
                <Input
                  value={addForm.roomId}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, roomId: e.target.value }))
                  }
                  placeholder="เช่น A101"
                  borderRadius="lg"
                />
              </FormControl>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleAddUser}
              isLoading={addLoading}
              borderRadius="xl"
              fontWeight="bold"
            >
              บันทึก
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsAddOpen(false)}
              borderRadius="xl"
            >
              ยกเลิก
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Reset Link Modal */}
      <Modal
        isOpen={showResetLink}
        onClose={closeResetLinkModal}
        isCentered
        size={{ base: "full", md: "lg" }}
      >
        <ModalOverlay />
        <ModalContent borderRadius="2xl" p={2} m={{ base: 4, md: "auto" }}>
          <ModalHeader
            fontWeight="bold"
            color="green.600"
            display="flex"
            alignItems="center"
            gap={2}
          >
            <FaEnvelope /> ลิงก์ตั้งรหัสผ่าน
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="success" borderRadius="xl" mb={4}>
              <AlertIcon />
              <Box>
                <AlertTitle>สร้างผู้ใช้สำเร็จ!</AlertTitle>
                <AlertDescription>
                  ผู้ใช้ใหม่ถูกสร้างเรียบร้อยแล้ว
                  กรุณาส่งลิงก์ด้านล่างไปให้ผู้ใช้เพื่อตั้งรหัสผ่านใหม่
                </AlertDescription>
              </Box>
            </Alert>
            <Box
              bg="gray.50"
              p={4}
              borderRadius="xl"
              border="1px solid"
              borderColor="gray.200"
            >
              <Text fontWeight="bold" mb={2} color="gray.700">
                ลิงก์ตั้งรหัสผ่าน:
              </Text>
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
              💡 เคล็ดลับ: ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง
              ผู้ใช้สามารถคลิกลิงก์เพื่อตั้งรหัสผ่านใหม่ได้
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="green"
              onClick={closeResetLinkModal}
              borderRadius="xl"
              fontWeight="bold"
            >
              เข้าใจแล้ว
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        isCentered
        size={{ base: "full", md: "md" }}
      >
        <ModalOverlay />
        <ModalContent borderRadius="2xl" p={2} m={{ base: 4, md: "auto" }}>
          <ModalHeader fontWeight="bold" color="blue.600">
            แก้ไขผู้ใช้
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {editForm && (
              <>
                <FormControl mt={4}>
                  <FormLabel>ชื่อ</FormLabel>
                  <Input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="ชื่อผู้ใช้"
                    borderRadius="lg"
                  />
                </FormControl>
                <FormControl mt={4}>
                  <FormLabel>อีเมล</FormLabel>
                  <Input
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="อีเมล"
                    type="email"
                    isDisabled
                    borderRadius="lg"
                  />
                </FormControl>
                <FormControl mt={4}>
                  <FormLabel>สิทธิ์</FormLabel>
                  <Select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, role: e.target.value }))
                    }
                    borderRadius="lg"
                  >
                    <option value="admin">ผู้ดูแลระบบ</option>
                    <option value="juristic">นิติ</option>
                    <option value="technician">ช่าง</option>
                    <option value="owner">เจ้าของห้อง</option>
                    <option value="user">ลูกบ้าน</option>
                  </Select>
                </FormControl>
                <FormControl mt={4}>
                  <FormLabel>สถานะ</FormLabel>
                  <Select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, status: e.target.value }))
                    }
                    borderRadius="lg"
                  >
                    <option value="active">ใช้งานได้</option>
                    <option value="inactive">ไม่ใช้งาน</option>
                  </Select>
                </FormControl>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleEditUser}
              isLoading={editLoading}
              borderRadius="xl"
              fontWeight="bold"
            >
              บันทึก
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsEditOpen(false)}
              borderRadius="xl"
            >
              ยกเลิก
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Confirm Ban Modal */}
      <Modal
        isOpen={isConfirmBanOpen}
        onClose={() => setIsConfirmBanOpen(false)}
        isCentered
        size={{ base: "full", md: "sm" }}
      >
        <ModalOverlay />
        <ModalContent borderRadius="2xl" p={2} m={{ base: 4, md: "auto" }}>
          <ModalHeader fontWeight="bold" color="orange.600">
            ยืนยันการระงับผู้ใช้
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning" borderRadius="xl" mb={4}>
              <AlertIcon />
              คุณแน่ใจหรือไม่ว่าต้องการระงับผู้ใช้ <b>{userToBan?.name}</b>?
              ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="orange"
              mr={3}
              onClick={handleBanUser}
              borderRadius="xl"
              fontWeight="bold"
            >
              ระงับ
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsConfirmBanOpen(false)}
              borderRadius="xl"
            >
              ยกเลิก
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        isCentered
        size={{ base: "full", md: "sm" }}
      >
        <ModalOverlay />
        <ModalContent borderRadius="2xl" p={2} m={{ base: 4, md: "auto" }}>
          <ModalHeader fontWeight="bold" color="red.600">
            ยืนยันการลบผู้ใช้
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="error" borderRadius="xl" mb={4}>
              <AlertIcon />
              คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ <b>{userToDelete?.name}</b>?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="red"
              mr={3}
              onClick={handleDeleteUser}
              borderRadius="xl"
              fontWeight="bold"
            >
              ลบ
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsConfirmDeleteOpen(false)}
              borderRadius="xl"
            >
              ยกเลิก
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Manage Permissions Modal */}
      <Modal
        isOpen={isManagePermissionsOpen}
        onClose={() => setIsManagePermissionsOpen(false)}
        isCentered
        size={{ base: "full", md: "xl" }}
      >
        <ModalOverlay />
        <ModalContent borderRadius="2xl" p={2} m={{ base: 4, md: "auto" }}>
          <ModalHeader
            fontWeight="bold"
            color="blue.600"
            display="flex"
            alignItems="center"
            gap={2}
          >
            <FaUserTag /> จัดการสิทธิ์ผู้ใช้
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Box mb={4}>
              <Text color="gray.600" fontSize="sm">
                คุณสามารถเปลี่ยนสิทธิ์ของผู้ใช้แต่ละคนได้ที่นี่ <br />
                <b>โปรดระวัง:</b> การเปลี่ยนสิทธิ์จะมีผลทันที
              </Text>
            </Box>
            <Table
              variant="simple"
              colorScheme="gray"
              bg="white"
              borderRadius="xl"
              size="md"
            >
              <Thead>
                <Tr>
                  <Th color="blue.700" fontSize="sm" minW="180px">
                    ชื่อ
                  </Th>
                  <Th color="blue.700" fontSize="sm">
                    อีเมล
                  </Th>
                  <Th color="blue.700" fontSize="sm">
                    สิทธิ์ปัจจุบัน
                  </Th>
                  <Th color="blue.700" fontSize="sm">
                    เปลี่ยนสิทธิ์เป็น
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {users.map((u) => (
                  <Tr key={u.id} _hover={{ bg: "blue.50" }}>
                    <Td
                      fontWeight="bold"
                      fontSize="sm"
                      minW="180px"
                      whiteSpace="nowrap"
                      display="flex"
                      alignItems="center"
                      gap={2}
                    >
                      <Avatar name={u.name} src={u.avatar} size="sm" mr={2} />
                      {u.name}
                    </Td>
                    <Td fontSize="sm">{u.email}</Td>
                    <Td>
                      <Tooltip
                        label={
                          u.role === "admin"
                            ? "🛡️ ผู้ดูแลระบบ"
                            : u.role === "juristic"
                            ? "🏢 นิติ"
                            : u.role === "technician"
                            ? "🛠️ ช่าง"
                            : u.role === "owner"
                            ? "🏠 เจ้าของห้อง"
                            : "👤 ลูกบ้าน"
                        }
                        hasArrow
                      >
                        {u.role === "admin" ? (
                          <Badge
                            colorScheme="yellow"
                            borderRadius="full"
                            fontSize="xs"
                            px={2}
                          >
                            ผู้ดูแลระบบ
                          </Badge>
                        ) : u.role === "juristic" ? (
                          <Badge
                            colorScheme="purple"
                            borderRadius="full"
                            fontSize="xs"
                            px={2}
                          >
                            นิติ
                          </Badge>
                        ) : u.role === "technician" ? (
                          <Badge
                            colorScheme="orange"
                            borderRadius="full"
                            fontSize="xs"
                            px={2}
                          >
                            ช่าง
                          </Badge>
                        ) : u.role === "owner" ? (
                          <Badge
                            colorScheme="green"
                            borderRadius="full"
                            fontSize="xs"
                            px={2}
                          >
                            เจ้าของห้อง
                          </Badge>
                        ) : (
                          <Badge
                            colorScheme="blue"
                            borderRadius="full"
                            fontSize="xs"
                            px={2}
                          >
                            ลูกบ้าน
                          </Badge>
                        )}
                      </Tooltip>
                    </Td>
                    <Td>
                      <Select
                        value={u.role}
                        onChange={async (e) => {
                          try {
                            await setDoc(
                              doc(db, "users", u.id),
                              { role: e.target.value },
                              { merge: true }
                            );
                            toast({
                              title: "อัปเดตสิทธิ์สำเร็จ",
                              status: "success",
                              duration: 3000,
                              isClosable: true,
                            });
                            fetchData();
                          } catch (error) {
                            toast({
                              title: "อัปเดตสิทธิ์ไม่สำเร็จ",
                              description:
                                "เกิดข้อผิดพลาดในการอัปเดตสิทธิ์ผู้ใช้",
                              status: "error",
                              duration: 5000,
                              isClosable: true,
                            });
                          }
                        }}
                        borderRadius="lg"
                        size="sm"
                        bg="gray.50"
                        fontWeight="bold"
                        icon={<FaUserTag />}
                        _focus={{ borderColor: "blue.400" }}
                        _hover={{ borderColor: "blue.300" }}
                        minW="140px"
                      >
                        <option value="admin">🛡️ ผู้ดูแลระบบ</option>
                        <option value="juristic">🏢 นิติ</option>
                        <option value="technician">🛠️ ช่าง</option>
                        <option value="owner">🏠 เจ้าของห้อง</option>
                        <option value="user">👤 ลูกบ้าน</option>
                      </Select>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={() => setIsManagePermissionsOpen(false)}
              borderRadius="xl"
              colorScheme="blue"
              leftIcon={<FaUserTag />}
            >
              ปิดหน้าจัดการสิทธิ์
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </MainLayout>
  );
}

export default withAuthProtection(AdminUsers, ['admin']);
 