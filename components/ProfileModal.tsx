
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Heading,
  Text,
  Flex,
  Avatar,
  Button,
  VStack,
  Divider,
  Badge,
  Input,
  FormControl,
  FormLabel,
  useToast,
  SimpleGrid,
  HStack,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { auth, storage } from "../lib/firebase";
import { updateProfile, updateEmail, signOut } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, onSnapshot, doc as firestoreDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function ProfileModal({ isOpen, onClose, onLogout }: ProfileModalProps) {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", avatar: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const u = auth.currentUser;
    if (u) {
      const unsub = onSnapshot(firestoreDoc(db, "users", u.uid), (snap) => {
        const firestoreData = snap.exists() ? snap.data() : {};
        const userData = {
          name: firestoreData.name || u.displayName || "-",
          email: firestoreData.email || u.email || "-",
          avatar: firestoreData.avatar || u.photoURL || "",
          started: u.metadata?.creationTime?.split("T")[0] || "-",
          lastActive: u.metadata?.lastSignInTime?.split("T")[0] || "-",
          status: firestoreData.status || (u.emailVerified ? "active" : "inactive"),
          role: firestoreData.role || "user",
        };
        setUser(userData);
        setForm({
          name: userData.name,
          email: userData.email,
          avatar: userData.avatar,
        });
        setAvatarPreview(userData.avatar);
      });
      return () => unsub();
    } else {
        onClose();
        router.replace("/login");
    }
  }, [isOpen, router, onClose]);

  const handleEdit = () => setEditMode(true);
  const handleCancel = () => {
    setEditMode(false);
    if (user) {
        setForm({ name: user.name, email: user.email, avatar: user.avatar });
        setAvatarPreview(user.avatar);
    }
    setSelectedFile(null);
  };

  const handleChange = (e: any) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleAvatarChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "ไฟล์ใหญ่เกินไป กรุณาเลือกรูปที่มีขนาดไม่เกิน 5MB", status: "warning" });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({ title: "กรุณาเลือกไฟล์รูปภาพเท่านั้น", status: "warning" });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = ev => {
        setAvatarPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      let avatarURL = user.avatar;
      if (selectedFile) {
        const storageRef = ref(storage, `avatars/${auth.currentUser.uid}/${selectedFile.name}`);
        await uploadBytes(storageRef, selectedFile);
        avatarURL = await getDownloadURL(storageRef);
      }
      
      if (form.name !== user.name || avatarURL !== user.avatar) {
        await updateProfile(auth.currentUser, {
          displayName: form.name,
          photoURL: avatarURL || undefined,
        });
      }

      if (form.email !== user.email && (user.role === "admin" || user.role === "owner")) {
        await updateEmail(auth.currentUser, form.email);
      }

      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        {
          name: form.name,
          email: form.email,
          avatar: avatarURL,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      setUser(prevUser => ({ ...prevUser, avatar: avatarURL }));
      toast({ title: "บันทึกโปรไฟล์สำเร็จ", status: "success" });
      setEditMode(false);
      setSelectedFile(null);
      onClose();
    } catch (e: any) {
      console.error("Error saving profile:", e);
      toast({ 
        title: "เกิดข้อผิดพลาด", 
        description: e.message || "ไม่สามารถบันทึกโปรไฟล์ได้", 
        status: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'owner': return 'เจ้าของห้อง';
      default: return 'ผู้ใช้งานทั่วไป';
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onClose();
      router.push("/login");
    } catch (e) {
      toast({ title: "ออกจากระบบไม่สำเร็จ", status: "error" });
    }
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl">
      <ModalOverlay />
      <ModalContent borderRadius="xl" mx={{ base: 4, sm: 0 }}>
        <ModalHeader>
            <Flex direction="column" align="center" pt={6}>
                <Avatar size="xl" name={form.name || user.name} src={avatarPreview || user.avatar} mb={4} />
                <Heading fontSize={{ base: "xl", md: "2xl" }} color="blue.700" mb={1}>โปรไฟล์ผู้ใช้งาน</Heading>
                <Text color="gray.500">ข้อมูลบัญชีของคุณ</Text>
                <Badge colorScheme={user.role === "admin" ? "purple" : "blue"} borderRadius="full" px={3} py={1} fontSize="sm" mt={2}>
                    {getRoleDisplayName(user.role)}
                </Badge>
            </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody px={{ base: 4, md: 8 }} pb={{ base: 4, md: 8 }}>
          <VStack align="stretch" spacing={4} mb={6}>
            <FormControl>
              <FormLabel>ชื่อผู้ใช้</FormLabel>
              {editMode ? (
                <Input name="name" value={form.name} onChange={handleChange} />
              ) : (
                <Text fontWeight="bold" color="gray.800" p={2} bg="gray.50" borderRadius="md">{user.name}</Text>
              )}
            </FormControl>
            <FormControl>
              <FormLabel>อีเมล</FormLabel>
              {editMode ? (
                <Input name="email" value={form.email} onChange={handleChange} isDisabled={user.role !== "admin" && user.role !== "owner"} />
              ) : (
                <Text color="gray.800" p={2} bg="gray.50" borderRadius="md">{user.email}</Text>
              )}
            </FormControl>
            {editMode && (
              <FormControl>
                <FormLabel>รูปโปรไฟล์</FormLabel>
                <HStack>
                  <Button size="md" onClick={() => fileInputRef.current?.click()} borderRadius="lg">อัปโหลดรูปใหม่</Button>
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    style={{ display: "none" }} 
                    onChange={handleAvatarChange} 
                  />
                  {selectedFile && (
                    <Text fontSize="sm" color="gray.600" noOfLines={1}>ไฟล์ที่เลือก: {selectedFile.name}</Text>
                  )}
                </HStack>
              </FormControl>
            )}
            <SimpleGrid columns={2} spacing={4}>
              <Box>
                <Text color="gray.600" fontSize="sm">สถานะ</Text>
                <Badge colorScheme={user.status === "active" ? "green" : "gray"} borderRadius="full" px={3} py={1} fontSize="sm">
                  {user.status === "active" ? "ใช้งานอยู่" : "ไม่ใช้งาน"}
                </Badge>
              </Box>
              <Box>
                <Text color="gray.600" fontSize="sm">วันที่เริ่มใช้งาน</Text>
                <Text color="gray.800">{user.started}</Text>
              </Box>
            </SimpleGrid>
          </VStack>
          <Divider mb={6} />
          <Flex gap={3} direction={{ base: "column", sm: "row" }}>
            {editMode ? (
              <>
                <Button colorScheme="blue" flex={1} onClick={handleSave} isLoading={loading} borderRadius="lg" size="md">บันทึก</Button>
                <Button flex={1} variant="outline" onClick={handleCancel} borderRadius="lg" size="md">ยกเลิก</Button>
              </>
            ) : (
              <>
                <Button colorScheme="blue" flex={1} onClick={handleEdit} borderRadius="lg" size="md">แก้ไขโปรไฟล์</Button>
                <Button colorScheme="red" flex={1} variant="outline" onClick={onLogout} borderRadius="lg" size="md">ออกจากระบบ</Button>
              </>
            )}
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
