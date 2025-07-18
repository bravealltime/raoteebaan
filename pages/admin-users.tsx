
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
import AdminUsersContent from "../components/AdminUsersContent";

const StatBox = ({ icon, label, value, color }) => (
  <Box
    bg="white"
    borderRadius="lg"
    p={5}
    display="flex"
    alignItems="center"
    gap={4}
    boxShadow="sm"
  >
    <Icon as={icon} fontSize="2xl" color={color} />
    <Box>
      <Text fontWeight="bold" fontSize="md" color="gray.600">
        {label}
      </Text>
      <Text fontSize="xl" fontWeight="bold">{value}</Text>
    </Box>
  </Box>
);

interface AdminUsersProps {
  currentUser: any;
  role: string | null;
}

function AdminUsers({ currentUser, role }: AdminUsersProps) {
  const router = useRouter();
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
  if (!currentUser) {
    return <Center minH="100vh"><Text>กรุณาเข้าสู่ระบบ</Text></Center>;
  }

  return <AdminUsersContent
    currentUser={currentUser}
    role={role}
    users={users}
    rooms={rooms}
    bills={bills}
    search={search}
    setSearch={setSearch}
    filter={filter}
    setFilter={setFilter}
    loading={loading}
    isAddOpen={isAddOpen}
    setIsAddOpen={setIsAddOpen}
    addForm={addForm}
    setAddForm={setAddForm}
    addLoading={addLoading}
    handleAddUser={handleAddUser}
    isEditOpen={isEditOpen}
    setIsEditOpen={setIsEditOpen}
    editForm={editForm}
    setEditForm={setEditForm}
    editLoading={editLoading}
    handleEditUser={handleEditUser}
    handleEditClick={handleEditClick}
    isConfirmBanOpen={isConfirmBanOpen}
    setIsConfirmBanOpen={setIsConfirmBanOpen}
    userToBan={userToBan}
    handleBanUser={handleBanUser}
    handleBanClick={handleBanClick}
    isConfirmDeleteOpen={isConfirmDeleteOpen}
    setIsConfirmDeleteOpen={setIsConfirmDeleteOpen}
    userToDelete={userToDelete}
    handleDeleteUser={handleDeleteUser}
    handleDeleteClick={handleDeleteClick}
    isConfirmResetOpen={isConfirmResetOpen}
    setIsConfirmResetOpen={setIsConfirmResetOpen}
    userToReset={userToReset}
    confirmResetPassword={confirmResetPassword}
    handleResetPassword={handleResetPassword}
    showResetLink={showResetLink}
    setShowResetLink={setShowResetLink}
    resetLink={resetLink}
    setResetLink={setResetLink}
    copyResetLink={copyResetLink}
    closeResetLinkModal={closeResetLinkModal}
    handleStartConversation={handleStartConversation}
    StatBox={StatBox}
    toast={toast}
    isManagePermissionsOpen={isManagePermissionsOpen}
    setIsManagePermissionsOpen={setIsManagePermissionsOpen}
    modifiedRoles={modifiedRoles}
    setModifiedRoles={setModifiedRoles}
    updatingRoleId={updatingRoleId}
    setUpdatingRoleId={setUpdatingRoleId}
    permissionsCurrentPage={permissionsCurrentPage}
    setPermissionsCurrentPage={setPermissionsCurrentPage}
    PERMISSIONS_PER_PAGE={PERMISSIONS_PER_PAGE}
  />;
}

export default AdminUsers;
 