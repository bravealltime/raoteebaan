
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
} from "@chakra-ui/react";
import { useState } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

const ReportIssueModal = ({ isOpen, onClose, roomId }: ReportIssueModalProps) => {
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: "กรุณากรอกรายละเอียด",
        description: "โปรดอธิบายปัญหาที่คุณพบ",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      await addDoc(collection(db, "issues"), {
        roomId: roomId,
        description: description,
        status: "pending",
        reportedAt: serverTimestamp(),
      });

      toast({
        title: "แจ้งปัญหาสำเร็จ",
        description: "เราได้รับเรื่องของคุณแล้ว ช่างจะติดต่อกลับโดยเร็วที่สุด",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      onClose();
      setDescription("");
    } catch (error) {
      console.error("Error reporting issue: ", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแจ้งปัญหาได้ในขณะนี้",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>แจ้งปัญหา/ซ่อมแซม</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <FormLabel htmlFor="description">รายละเอียดปัญหา</FormLabel>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น แอร์ไม่เย็น, น้ำรั่ว, ไฟดับ"
              rows={5}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            ส่งเรื่อง
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ReportIssueModal;
