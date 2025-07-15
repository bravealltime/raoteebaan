import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Button, FormControl, FormLabel, Select, Textarea, useToast, VStack } from "@chakra-ui/react";
import { useState } from "react";
import { doc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

interface UpdateIssueStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: {
    id: string;
    status: string;
  };
  technicianName: string;
}

export default function UpdateIssueStatusModal({ isOpen, onClose, issue, technicianName }: UpdateIssueStatusModalProps) {
  const [status, setStatus] = useState(issue.status);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSave = async () => {
    if (!notes) {
      toast({
        title: "กรุณาใส่รายละเอียด",
        description: "โปรดอธิบายการดำเนินการของคุณ",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const issueRef = doc(db, "issues", issue.id);
      
      const newUpdate = {
        notes: notes,
        status: status,
        updatedAt: Timestamp.now(), // Use client-side timestamp
        updatedBy: technicianName,
      };

      await updateDoc(issueRef, {
        status: status,
        updates: arrayUnion(newUpdate),
      });

      toast({ title: "อัปเดตสถานะสำเร็จ", status: "success" });
      onClose();
    } catch (error) {
      console.error("Error updating issue: ", error);
      toast({ title: "เกิดข้อผิดพลาด", status: "error" });
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
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>สถานะใหม่</FormLabel>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pending">รอดำเนินการ</option>
                <option value="in_progress">กำลังดำเนินการ</option>
                <option value="resolved">แก้ไขแล้ว</option>
              </Select>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>รายละเอียดการดำเนินการ</FormLabel>
              <Textarea 
                placeholder={status === 'in_progress' ? "กำลังตรวจสอบสายไฟ..." : "เปลี่ยนหลอดไฟใหม่เรียบร้อย"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button colorScheme="blue" ml={3} onClick={handleSave} isLoading={isLoading}>
            บันทึก
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}