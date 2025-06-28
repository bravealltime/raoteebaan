import { useState, useEffect } from "react";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Button, Input, VStack } from "@chakra-ui/react";

interface EditRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (room: {
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
  initialRoom: {
    id: string;
    status: "occupied" | "vacant";
    tenantName: string;
    area: number;
    latestTotal: number;
    electricity: number;
    rent: number;
    service: number;
    overdueDays: number;
  };
}

export default function EditRoomModal({ isOpen, onClose, onSave, initialRoom }: EditRoomModalProps) {
  const [id, setId] = useState(initialRoom.id);
  const [tenantName, setTenantName] = useState(initialRoom.tenantName);
  const [area, setArea] = useState(initialRoom.area);
  const [latestTotal, setLatestTotal] = useState(initialRoom.latestTotal);
  const [electricity, setElectricity] = useState(initialRoom.electricity);
  const [rent, setRent] = useState(initialRoom.rent);
  const [service, setService] = useState(initialRoom.service);
  const [overdueDays, setOverdueDays] = useState(initialRoom.overdueDays);

  useEffect(() => {
    setId(initialRoom.id);
    setTenantName(initialRoom.tenantName);
    setArea(initialRoom.area);
    setLatestTotal(initialRoom.latestTotal);
    setElectricity(initialRoom.electricity);
    setRent(initialRoom.rent);
    setService(initialRoom.service);
    setOverdueDays(initialRoom.overdueDays);
  }, [initialRoom, isOpen]);

  const handleSave = () => {
    onSave({
      id,
      status: initialRoom.status,
      tenantName,
      area,
      latestTotal,
      electricity,
      rent,
      service,
      overdueDays,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>แก้ไขข้อมูลห้อง</ModalHeader>
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
          <Button colorScheme="blue" mr={3} onClick={handleSave}>บันทึก</Button>
          <Button onClick={onClose}>ยกเลิก</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 