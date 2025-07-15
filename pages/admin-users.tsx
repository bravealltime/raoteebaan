
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  addDoc,
  serverTimestamp,
  getDoc,
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
  VStack,
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
  FaKey,
  FaSave,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import MainLayout from "../components/MainLayout";

function AdminUsers() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
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
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<any | null>(null);
  const [modifiedRoles, setModifiedRoles] = useState<{ [key: string]: string }>({});
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [permissionsCurrentPage, setPermissionsCurrentPage] = useState(1);
  const PERMISSIONS_PER_PAGE = 5;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setCurrentUser(null);
        setLoadingUser(false);
        router.replace("/login");
        return;
      }
      const userRef = doc(db, "users", u.uid);
      const snap = await getDoc(userRef);
      setCurrentUser({
        uid: u.uid,
        ...snap.data(),
      });
      setLoadingUser(false);
    });
    return () => unsub();
  }, [router]);

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

  const handleResetPassword = (user: any) => {
    setUserToReset(user);
    setIsConfirmResetOpen(true);
  };

  const confirmResetPassword = async () => {
    if (!userToReset) return;
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
        return;
      }

      const response = await fetch("/api/send-reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({ email: userToReset.email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "ส่งอีเมลรีเซ็ตรหัสผ่านสำเร็จ",
          description: `ลิงก์สำหรับรีเซ็ตรหัสผ่านถูกส่งไปที่ ${userToReset.email} แล้ว`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: "ส่งอีเมลรีเซ็ตรหัสผ่านไม่สำเร็จ",
          description: data.error,
          status: "error",
        });
      }
    } catch (e) {
      toast({
        title: "ส่งอีเมลรีเซ็ตรหัสผ่านไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
        status: "error",
      });
    }
    setIsConfirmResetOpen(false);
  };

  const handleEditClick = (user: any) => {
    setEditForm({ ...user });
    setIsEditOpen(true);
  };

  const handleEditUser = async () => {
    if (!editForm) return;
    setEditLoading(true);
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
        setEditLoading(false);
        return;
      }

      const response = await fetch("/api/update-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        toast({
          title: "อัปเดตผู้ใช้สำเร็จ",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        setIsEditOpen(false);
        fetchData();
      } else {
        const data = await response.json();
        toast({
          title: "อัปเดตผู้ใช้ไม่สำเร็จ",
          description: data.error || "เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "อัปเดตผู้ใช้ไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการเชื่อมต่อ",
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

  // Loading state for currentUser
  if (loadingUser) {
    return <Center minH="100vh"><Spinner /></Center>;
  }
  if (!currentUser) {
    return <Center minH="100vh"><Text>กรุณาเข้าสู่ระบบ</Text></Center>;
  }

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
                            aria-label="reset-password"
                            icon={<FaKey />}
                            colorScheme="yellow"
                            variant="ghost"
                            borderRadius="full"
                            size="sm"
                            mr={2}
                            onClick={() => handleResetPassword(u)}
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
                            isDisabled={u.id === currentUser?.uid}
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
                            isDisabled={u.id === currentUser?.uid}
                          />
                          <IconButton
                            aria-label="delete"
                            icon={<FaTrash />}
                            colorScheme="red"
                            variant="ghost"
                            borderRadius="full"
                            size="sm"
                            onClick={() => handleDeleteClick(u)}
                            isDisabled={u.id === currentUser?.uid}
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

      {/* Confirm Reset Password Modal */}
      <Modal
        isOpen={isConfirmResetOpen}
        onClose={() => setIsConfirmResetOpen(false)}
        isCentered
        size={{ base: "full", md: "sm" }}
      >
        <ModalOverlay />
        <ModalContent borderRadius="2xl" p={2} m={{ base: 4, md: "auto" }}>
          <ModalHeader fontWeight="bold" color="yellow.600">
            ยืนยันการรีเซ็ตรหัสผ่าน
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning" borderRadius="xl" mb={4}>
              <AlertIcon />
              คุณแน่ใจหรือไม่ว่าต้องการส่งอีเมลรีเซ็ตรหัสผ่านไปที่ <b>{userToReset?.email}</b>?
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="yellow"
              mr={3}
              onClick={confirmResetPassword}
              borderRadius="xl"
              fontWeight="bold"
            >
              ส่งอีเมล
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsConfirmResetOpen(false)}
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
        onClose={() => {
          setIsManagePermissionsOpen(false);
          setModifiedRoles({});
        }}
        isCentered
        size={{ base: "full", md: "4xl" }}
        scrollBehavior="inside"
      >
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent
          borderRadius="2xl"
          m={{ base: 2, md: 6 }}
          bg="gray.50"
        >
          <ModalHeader
            fontWeight="bold"
            color="gray.800"
            display="flex"
            alignItems="center"
            gap={3}
            bg="white"
            borderTopRadius="2xl"
            p={6}
            borderBottom="1px solid"
            borderColor="gray.200"
          >
            <Icon as={FaUserTag} fontSize="2xl" color="blue.500" />
            <Box>
              <Heading size="md">จัดการสิทธิ์ผู้ใช้</Heading>
              <Text fontSize="sm" color="gray.500">
                เปลี่ยนสิทธิ์และบทบาทของผู้ใช้แต่ละคน
              </Text>
            </Box>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody p={{ base: 4, md: 6 }}>
            <Alert status="info" borderRadius="xl" mb={6} variant="subtle">
              <AlertIcon />
              <Box>
                <AlertTitle>คำแนะนำ:</AlertTitle>
                <AlertDescription>
                  เลือกสิทธิ์ใหม่จากเมนูและกด <b>บันทึก</b>
                  เพื่ออัปเดตเฉพาะผู้ใช้นั้นๆ การเปลี่ยนแปลงจะมีผลทันที
                </AlertDescription>
              </Box>
            </Alert>
            <VStack spacing={4} align="stretch">
              {users
                .filter((u) => u.id !== currentUser?.uid) // Filter out current user
                .slice(
                  (permissionsCurrentPage - 1) * PERMISSIONS_PER_PAGE,
                  permissionsCurrentPage * PERMISSIONS_PER_PAGE
                )
                .map((u) => (
                <Flex
                  key={u.id}
                  p={4}
                  bg="white"
                  borderRadius="xl"
                  boxShadow="sm"
                  align="center"
                  justify="space-between"
                  flexWrap="wrap"
                  gap={4}
                >
                  <Flex align="center" gap={4} flex={1} minW="250px">
                    <Avatar name={u.name} src={u.avatar} size="md" />
                    <Box>
                      <Text fontWeight="bold" color="gray.800">
                        {u.name}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {u.email}
                      </Text>
                    </Box>
                  </Flex>
                  <Flex align="center" gap={3} flexWrap="wrap">
                    <Select
                      value={modifiedRoles[u.id] || u.role}
                      onChange={(e) =>
                        setModifiedRoles((prev) => ({
                          ...prev,
                          [u.id]: e.target.value,
                        }))
                      }
                      borderRadius="lg"
                      size="sm"
                      bg="gray.100"
                      fontWeight="bold"
                      minW="160px"
                    >
                      <option value="admin">🛡️ ผู้ดูแลระบบ</option>
                      <option value="juristic">🏢 นิติ</option>
                      <option value="technician">🛠️ ช่าง</option>
                      <option value="owner">🏠 เจ้าของห้อง</option>
                      <option value="user">👤 ลูกบ้าน</option>
                    </Select>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      leftIcon={<FaSave />}
                      borderRadius="lg"
                      isLoading={updatingRoleId === u.id}
                      isDisabled={!modifiedRoles[u.id] || modifiedRoles[u.id] === u.role}
                      onClick={async () => {
                        setUpdatingRoleId(u.id);
                        try {
                          await setDoc(
                            doc(db, "users", u.id),
                            { role: modifiedRoles[u.id] },
                            { merge: true }
                          );
                          toast({
                            title: "อัปเดตสิทธิ์สำเร็จ",
                            status: "success",
                            duration: 2000,
                            isClosable: true,
                          });
                          fetchData(); // Refresh data
                          setModifiedRoles(prev => {
                            const newRoles = {...prev};
                            delete newRoles[u.id];
                            return newRoles;
                          });
                        } catch (error) {
                          toast({
                            title: "อัปเดตสิทธิ์ไม่สำเร็จ",
                            status: "error",
                            duration: 3000,
                            isClosable: true,
                          });
                        } finally {
                          setUpdatingRoleId(null);
                        }
                      }}
                    >
                      บันทึก
                    </Button>
                  </Flex>
                </Flex>
              ))}
            </VStack>
          </ModalBody>
          <ModalFooter
            bg="white"
            borderBottomRadius="2xl"
            borderTop="1px solid"
            borderColor="gray.200"
            p={4}
            justifyContent="space-between"
          >
            <Button
              onClick={() => {
                setIsManagePermissionsOpen(false);
                setModifiedRoles({});
                setPermissionsCurrentPage(1);
              }}
              borderRadius="xl"
              colorScheme="gray"
              variant="outline"
            >
              ปิด
            </Button>
            <Flex align="center" gap={2}>
              <IconButton
                aria-label="Previous Page"
                icon={<FaChevronLeft />}
                size="sm"
                borderRadius="lg"
                isDisabled={permissionsCurrentPage === 1}
                onClick={() => setPermissionsCurrentPage((p) => p - 1)}
              />
              <Text fontSize="sm" fontWeight="bold">
                หน้า {permissionsCurrentPage} จาก {Math.ceil(users.filter(u => u.id !== currentUser?.uid).length / PERMISSIONS_PER_PAGE)}
              </Text>
              <IconButton
                aria-label="Next Page"
                icon={<FaChevronRight />}
                size="sm"
                borderRadius="lg"
                isDisabled={permissionsCurrentPage >= Math.ceil(users.filter(u => u.id !== currentUser?.uid).length / PERMISSIONS_PER_PAGE)}
                onClick={() => setPermissionsCurrentPage((p) => p + 1)}
              />
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </MainLayout>
  );
}

export default AdminUsers;
 