import { Box, Heading, Text, Flex, Avatar, Button, VStack, Divider, Badge, IconButton, Input, FormControl, FormLabel, useToast } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { auth, storage } from "../lib/firebase";
import { FaArrowLeft } from "react-icons/fa";
import { updateProfile, updateEmail, signOut } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, onSnapshot, doc as firestoreDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Profile() {
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
    const u = auth.currentUser;
    if (u) {
      // subscribe Firestore user doc แบบ realtime
      const unsub = onSnapshot(firestoreDoc(db, "users", u.uid), (snap) => {
        const firestoreData = snap.exists() ? snap.data() : {};
        setUser({
          name: firestoreData.name || u.displayName || "-",
          email: firestoreData.email || u.email || "-",
          avatar: firestoreData.avatar || u.photoURL || "",
          started: u.metadata?.creationTime?.split("T")[0] || "-",
          lastActive: u.metadata?.lastSignInTime?.split("T")[0] || "-",
          status: firestoreData.status || (u.emailVerified ? "active" : "inactive"),
          role: firestoreData.role || (u.email === "admin@example.com" ? "admin" : "user"),
        });
        setForm({
          name: firestoreData.name || u.displayName || "",
          email: firestoreData.email || u.email || "",
          avatar: firestoreData.avatar || u.photoURL || "",
        });
        setAvatarPreview(firestoreData.avatar || u.photoURL || "");
      });
      return () => unsub();
    } else {
      setUser(null);
      setForm({ name: "", email: "", avatar: "" });
      setAvatarPreview("");
      router.replace("/login");
    }
  }, []);

  const handleEdit = () => setEditMode(true);
  const handleCancel = () => {
    setEditMode(false);
    setForm({ name: user.name, email: user.email, avatar: user.avatar });
    setAvatarPreview(user.avatar);
    setSelectedFile(null);
  };

  const handleChange = (e: any) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleAvatarChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      // ตรวจสอบขนาดไฟล์ (ไม่เกิน 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "ไฟล์ใหญ่เกินไป กรุณาเลือกรูปที่มีขนาดไม่เกิน 5MB", status: "warning" });
        return;
      }
      
      // ตรวจสอบประเภทไฟล์
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

  async function uploadToDiscordWebhook(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("https://discord.com/api/webhooks/1388606701053149347/tbJBU84BK2qXGBnuO1fVm7u1LsKrudEKOI_rS9HVwsy9JhlZpx7LwNXpA2TfJDh38pGI", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("อัปโหลดไป Discord ไม่สำเร็จ");
    const data = await res.json();
    if (data.attachments && data.attachments[0] && data.attachments[0].url) {
      return data.attachments[0].url;
    }
    throw new Error("ไม่พบลิงก์รูปใน response ของ Discord");
  }

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      let avatarURL = user.avatar;
      if (selectedFile) {
        // เช็คไฟล์ก่อนอัปโหลด
        if (!selectedFile.type.startsWith('image/')) {
          toast({ title: "กรุณาเลือกไฟล์รูปภาพเท่านั้น", status: "warning" });
          setLoading(false);
          return;
        }
        if (selectedFile.size > 5 * 1024 * 1024) {
          toast({ title: "ไฟล์ใหญ่เกินไป กรุณาเลือกรูปที่มีขนาดไม่เกิน 5MB", status: "warning" });
          setLoading(false);
          return;
        }
        
        // Upload to Firebase Storage
        const storageRef = ref(storage, `avatars/${auth.currentUser.uid}/${selectedFile.name}`);
        await uploadBytes(storageRef, selectedFile);
        avatarURL = await getDownloadURL(storageRef);
      }
      // อัปเดตโปรไฟล์ใน Auth
      if (form.name !== user.name || avatarURL !== user.avatar) {
        await updateProfile(auth.currentUser, {
          displayName: form.name,
          photoURL: avatarURL || undefined,
        });
      }
      if (form.email !== user.email) {
        if (user.role === "admin" || user.role === "owner") {
          await updateEmail(auth.currentUser, form.email);
        } else {
          toast({
            title: "ไม่สามารถเปลี่ยนอีเมลได้",
            description: "คุณไม่มีสิทธิ์เปลี่ยนอีเมลของคุณ",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
          setLoading(false);
          return;
        }
      }
      // บันทึกลง Firestore
      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        {
          name: form.name,
          email: form.email,
          avatar: avatarURL,
          status: user.status,
          role: user.role,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      // Update user state with new avatarURL
      setUser(prevUser => ({ ...prevUser, avatar: avatarURL }));
      toast({ title: "บันทึกโปรไฟล์สำเร็จ", status: "success" });
      setEditMode(false);
      setSelectedFile(null);
      router.replace(router.pathname);
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
      case 'admin':
        return 'ผู้ดูแลระบบ';
      case 'owner':
        return 'เจ้าของห้อง';
      default:
        return 'ผู้ใช้งานทั่วไป';
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (e) {
      toast({ title: "ออกจากระบบไม่สำเร็จ", status: "error" });
    }
  };

  if (!user) return null;

  return (
    <Flex minH="100vh" align="center" justify="center" bgGradient="linear(to-br, brand.50, brand.100)">
      <Box bg="white" borderRadius="2xl" boxShadow="2xl" p={{ base: 4, md: 8 }} maxW={{ base: "90%", md: "400px" }} w="full" position="relative">
        <IconButton
          icon={<FaArrowLeft />}
          aria-label="ย้อนกลับ"
          position="absolute"
          top={4}
          left={4}
          colorScheme="blue"
          variant="ghost"
          borderRadius="full"
          onClick={() => router.back()}
        />
        <Flex direction="column" align="center" mb={6} mt={2}>
          <Avatar size="2xl" name={form.name || user.name} src={avatarPreview || user.avatar} mb={4} />
          <Heading fontSize="2xl" color="blue.700" mb={1}>โปรไฟล์ผู้ใช้งาน</Heading>
          <Text color="gray.500">ข้อมูลบัญชีของคุณ</Text>
          <Badge colorScheme={user.role === "admin" ? "purple" : "blue"} borderRadius="full" px={3} py={1} fontSize="sm" mt={2}>
            {getRoleDisplayName(user.role)}
          </Badge>
        </Flex>
        <VStack align="stretch" spacing={3} mb={6}>
          <FormControl>
            <FormLabel>ชื่อผู้ใช้</FormLabel>
            {editMode ? (
              <Input name="name" value={form.name} onChange={handleChange} />
            ) : (
              <Text fontWeight="bold" color="gray.800">{user.name}</Text>
            )}
          </FormControl>
          <FormControl>
            <FormLabel>อีเมล</FormLabel>
            {editMode ? (
              <Input name="email" value={form.email} onChange={handleChange} isDisabled={user.role !== "admin" && user.role !== "owner"} />
            ) : (
              <Text color="gray.800">{user.email}</Text>
            )}
          </FormControl>
          <FormControl>
            <FormLabel>รูปโปรไฟล์</FormLabel>
            {editMode ? (
              <>
                <Button size="md" onClick={() => fileInputRef.current?.click()} mb={2} borderRadius="xl" fontFamily="Kanit">อัปโหลดรูปใหม่</Button>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  style={{ display: "none" }} 
                  onChange={handleAvatarChange} 
                />
                {selectedFile && (
                  <Text fontSize="sm" color="gray.600">ไฟล์ที่เลือก: {selectedFile.name}</Text>
                )}
              </>
            ) : null}
          </FormControl>
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
          <Box>
            <Text color="gray.600" fontSize="sm">ใช้งานล่าสุด</Text>
            <Text color="gray.800">{user.lastActive}</Text>
          </Box>
        </VStack>
        <Divider mb={6} />
        <Flex gap={3}>
          {editMode ? (
            <>
              <Button colorScheme="blue" flex={1} onClick={handleSave} isLoading={loading} borderRadius="xl" fontFamily="Kanit" size="md">บันทึก</Button>
              <Button flex={1} variant="outline" onClick={handleCancel} borderRadius="xl" fontFamily="Kanit" size="md">ยกเลิก</Button>
            </>
          ) : (
            <>
              <Button colorScheme="blue" flex={1} onClick={handleEdit} borderRadius="xl" fontFamily="Kanit" size="md">แก้ไขโปรไฟล์</Button>
              <Button colorScheme="red" flex={1} variant="outline" onClick={handleLogout} borderRadius="xl" fontFamily="Kanit" size="md">ออกจากระบบ</Button>
            </>
          )}
        </Flex>
      </Box>
    </Flex>
  );
} 