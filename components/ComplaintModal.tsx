
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Textarea,
  useToast,
  VStack,
  Input,
  HStack,
  Text,
  Box,
  Select,
} from "@chakra-ui/react";
import { useState } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from "firebase/firestore";

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  tenantId: string;
  tenantName: string;
}

const ComplaintModal = ({ isOpen, onClose, roomId, tenantId, tenantName }: ComplaintModalProps) => {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const resetForm = () => {
    setSubject("");
    setDescription("");
  }

  const handleClose = () => {
    resetForm();
    onClose();
  }

  const handleSubmit = async () => {
    if (!subject || !description.trim()) {
      toast({
        title: "กรุณากรอกข้อมูลให้ครบถ้วน",
        description: "โปรดเลือกหัวข้อและกรอกรายละเอียด",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Add complaint document to Firestore
      const complaintRef = await addDoc(collection(db, "complaints"), {
        roomId: roomId,
        tenantId: tenantId,
        tenantName: tenantName,
        subject: subject,
        description: description,
        status: "new", // new, in_progress, resolved
        createdAt: serverTimestamp(),
      });

      // 2. Create notifications for admins and the room owner
      const notificationPromises: Promise<any>[] = [];

      // Find Admins
      const adminsQuery = query(collection(db, "users"), where("role", "==", "admin"));
      const adminsSnapshot = await getDocs(adminsQuery);
      adminsSnapshot.forEach(adminDoc => {
        notificationPromises.push(addDoc(collection(db, "notifications"), {
          userId: adminDoc.id,
          message: `มีเรื่องร้องเรียนใหม่จากห้อง ${roomId}: ${subject}`,
          type: "complaint",
          link: `/dashboard?complaintId=${complaintRef.id}`,
          isRead: false,
          createdAt: serverTimestamp(),
        }));
      });

      // Find Room Owner
      const roomRef = doc(db, "rooms", roomId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const ownerId = roomSnap.data().ownerId;
        if (ownerId) {
           notificationPromises.push(addDoc(collection(db, "notifications"), {
            userId: ownerId,
            message: `มีเรื่องร้องเรียนใหม่จากห้อง ${roomId}: ${subject}`,
            type: "complaint",
            link: `/owner-dashboard?complaintId=${complaintRef.id}`,
            isRead: false,
            createdAt: serverTimestamp(),
          }));
        }
      }

      await Promise.all(notificationPromises);

      toast({
        title: "ส่งเรื่องร้องเรียนสำเร็จ",
        description: "เราได้รับเรื่องของคุณแล้ว และจะดำเนินการโดยเร็วที่สุด",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      handleClose();
    } catch (error) {
      console.error("Error submitting complaint: ", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งเรื่องร้องเรียนได้ในขณะนี้",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered>
      <ModalOverlay />
      <ModalContent mx={{ base: 4, md: "auto" }}>
        <ModalHeader>แจ้งเรื่องทั่วไป / เสนอแนะ</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel htmlFor="roomInfo">ข้อมูลผู้แจ้ง</FormLabel>
              <HStack>
                <Input id="roomInfo" value={`ห้อง: ${roomId}`} isReadOnly bg="gray.100" />
                <Input value={`ผู้แจ้ง: ${tenantName}`} isReadOnly bg="gray.100" />
              </HStack>
            </FormControl>
            <FormControl isRequired>
                <FormLabel htmlFor="subject">หัวข้อ</FormLabel>
                <Select 
                    id="subject"
                    placeholder="เลือกหัวข้อ"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                >
                    <option value="เสียงดังรบกวน">เสียงดังรบกวน</option>
                    <option value="ปัญหาที่จอดรถ">ปัญหาที่จอดรถ</option>
                    <option value="ปัญหาสัตว์เลี้ยง">ปัญหาสัตว์เลี้ยง</option>
                    <option value="ข้อเสนอแนะ">ข้อเสนอแนะ</option>
                    <option value="เรื่องอื่นๆ">เรื่องอื่นๆ</option>
                </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel htmlFor="description">รายละเอียด</FormLabel>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="กรุณาอธิบายรายละเอียดของปัญหาที่พบ หรือข้อเสนอแนะ"
                rows={5}
                focusBorderColor="blue.500"
              />
            </FormControl>

            <Box w="100%" p={3} bg="gray.50" borderRadius="md">
                <Text fontSize="sm" color="gray.600">
                    เรื่องของท่านจะถูกส่งไปยังผู้ดูแลอาคาร (นิติบุคคล) หรือเจ้าของห้องเพื่อดำเนินการตรวจสอบต่อไป
                </Text>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isLoading}
            isDisabled={!subject || !description.trim()}
          >
            ส่งเรื่อง
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ComplaintModal;
