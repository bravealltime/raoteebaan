import { useState } from "react";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Button, Input, VStack } from "@chakra-ui/react";

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (room: { id: string; name: string; area: number; total: number }) => void;
}

export default function AddRoomModal({ isOpen, onClose, onAdd }: AddRoomModalProps) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [area, setArea] = useState(0);
  const [total, setTotal] = useState(0);

  const handleAdd = () => {
    onAdd({ id, name, area, total });
    setId(""); setName(""); setArea(0); setTotal(0);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>เพิ่มห้องใหม่</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={3}>
            <Input placeholder="เลขห้อง" value={id} onChange={e => setId(e.target.value)} />
            <Input placeholder="ชื่อผู้เช่า" value={name} onChange={e => setName(e.target.value)} />
            <Input placeholder="ขนาด (ตร.ม.)" type="number" value={area} onChange={e => setArea(Number(e.target.value))} />
            <Input placeholder="ยอดค้างชำระ" type="number" value={total} onChange={e => setTotal(Number(e.target.value))} />
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={handleAdd}>เพิ่ม</Button>
          <Button onClick={onClose}>ยกเลิก</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 