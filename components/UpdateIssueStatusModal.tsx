
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
  Select,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

interface UpdateIssueStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: any; // Consider defining a proper type for issue
}

const UpdateIssueStatusModal = ({ isOpen, onClose, issue }: UpdateIssueStatusModalProps) => {
  const [status, setStatus] = useState(issue?.status || "pending");
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!issue) return;

    setIsLoading(true);
    try {
      const issueRef = doc(db, "issues", issue.id);
      await updateDoc(issueRef, { status: status });

      toast({
        title: "อัปเดตสถานะสำเร็จ",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      onClose();
    } catch (error) {
      console.error("Error updating status: ", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะได้",
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
        <ModalHeader>อัปเดตสถานะการแจ้งซ่อม</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <FormLabel htmlFor="status">สถานะ</FormLabel>
            <Select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="pending">รอรับเรื่อง</option>
              <option value="in_progress">กำลังดำเนินการ</option>
              <option value="resolved">แก้ไขแล้ว</option>
            </Select>
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
            บันทึก
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default UpdateIssueStatusModal;
