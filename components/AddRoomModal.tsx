import { useState } from "react";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Button, Input, VStack } from "@chakra-ui/react";

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (room: {
    id: string;
    status: "occupied" | "vacant";
    tenantName: string;
    area: number;
    latestTotal: number;
    electricity: number;
    rent: number;
    service: number;
    overdueDays: number;
  }) => void;
}

export default function AddRoomModal({ isOpen, onClose, onAdd }: AddRoomModalProps) {
  const [id, setId] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [area, setArea] = useState(0);
  const [latestTotal, setLatestTotal] = useState(0);
  const [electricity, setElectricity] = useState(0);
  const [rent, setRent] = useState(0);
  const [service, setService] = useState(0);
  const [overdueDays, setOverdueDays] = useState(0);

  const handleAdd = () => {
    onAdd({
      id,
      status: "occupied",
      tenantName,
      area,
      latestTotal,
      electricity,
      rent,
      service,
      overdueDays,
    });
    setId("");
    setTenantName("");
    setArea(0);
    setLatestTotal(0);
    setElectricity(0);
    setRent(0);
    setService(0);
    setOverdueDays(0);
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
            <Input placeholder="ชื่อผู้เช่า" value={tenantName} onChange={e => setTenantName(e.target.value)} />
            <Input placeholder="ขนาด (ตร.ม.)" type="number" value={area} onChange={e => setArea(Number(e.target.value))} />
            <Input placeholder="ยอดรวม" type="number" value={latestTotal} onChange={e => setLatestTotal(Number(e.target.value))} />
            <Input placeholder="ค่าไฟฟ้า" type="number" value={electricity} onChange={e => setElectricity(Number(e.target.value))} />
            <Input placeholder="ค่าเช่า" type="number" value={rent} onChange={e => setRent(Number(e.target.value))} />
            <Input placeholder="ค่าบริการ" type="number" value={service} onChange={e => setService(Number(e.target.value))} />
            <Input placeholder="วันค้างชำระ" type="number" value={overdueDays} onChange={e => setOverdueDays(Number(e.target.value))} />
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