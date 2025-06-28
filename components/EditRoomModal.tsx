import { useState, useEffect } from "react";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Button, Input, VStack, Icon, HStack, CloseButton, SimpleGrid } from "@chakra-ui/react";
import { FaCog } from "react-icons/fa";

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
    water: number;
    rent: number;
    service: number;
    overdueDays: number;
    extraServices: { label: string; value: number }[];
  }) => void;
  initialRoom: {
    id: string;
    status: "occupied" | "vacant";
    tenantName: string;
    area: number;
    latestTotal: number;
    electricity: number;
    water: number;
    rent: number;
    service: number;
    overdueDays: number;
    extraServices?: { label: string; value: number }[];
  };
}

export default function EditRoomModal({ isOpen, onClose, onSave, initialRoom }: EditRoomModalProps) {
  if (!initialRoom) return null;
  const [id, setId] = useState(initialRoom.id);
  const [tenantName, setTenantName] = useState(initialRoom.tenantName);
  const [area, setArea] = useState(initialRoom.area);
  const [latestTotal, setLatestTotal] = useState(initialRoom.latestTotal);
  const [electricity, setElectricity] = useState(initialRoom.electricity);
  const [water, setWater] = useState(initialRoom.water);
  const [rent, setRent] = useState(initialRoom.rent);
  const [service, setService] = useState(initialRoom.service);
  const [overdueDays, setOverdueDays] = useState(initialRoom.overdueDays);
  const [extraServices, setExtraServices] = useState<{ label: string; value: number }[]>(initialRoom.extraServices || []);

  useEffect(() => {
    setId(initialRoom.id);
    setTenantName(initialRoom.tenantName);
    setArea(initialRoom.area);
    setLatestTotal(initialRoom.latestTotal);
    setElectricity(initialRoom.electricity);
    setWater(initialRoom.water);
    setRent(initialRoom.rent);
    setService(initialRoom.service);
    setOverdueDays(initialRoom.overdueDays);
    if (Array.isArray((initialRoom as any).extraServices)) {
      setExtraServices((initialRoom as any).extraServices);
    } else {
      setExtraServices([]);
    }
  }, [initialRoom, isOpen]);

  const handleAddService = () => {
    setExtraServices([...extraServices, { label: "", value: 0 }]);
  };
  const handleServiceChange = (idx: number, key: "label" | "value", val: string | number) => {
    setExtraServices(svcs => svcs.map((s, i) => i === idx ? { ...s, [key]: val } : s));
  };
  const handleRemoveService = (idx: number) => {
    setExtraServices(svcs => svcs.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onSave({
      id,
      status: initialRoom.status,
      tenantName,
      area,
      latestTotal,
      electricity,
      water,
      rent,
      service,
      overdueDays,
      extraServices,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl">
      <ModalOverlay />
      <ModalContent borderRadius="2xl" p={2} maxH="90vh" overflowY="auto">
        <ModalHeader display="flex" alignItems="center" gap={2} color="blue.600" fontWeight="bold">
          <Icon as={FaCog} /> แก้ไขข้อมูลห้องพัก
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <div style={{ color: '#64748b', fontSize: 14, marginBottom: 8 }}>
            ปรับข้อมูลห้อง, ผู้เช่า, ค่าเช่า และบริการต่าง ๆ ได้ที่นี่
          </div>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} alignItems="flex-start">
            <VStack spacing={3} align="stretch">
              <label style={{ fontWeight: 500, color: '#2563eb' }}>ข้อมูลห้อง</label>
              <label>เลขห้อง</label>
              <Input placeholder="เช่น 101" value={id} onChange={e => setId(e.target.value)} />
              <label>ขนาด (ตร.ม.)</label>
              <Input placeholder="เช่น 28" type="number" value={area} onChange={e => setArea(Number(e.target.value))} />
              <label style={{ fontWeight: 500, color: '#2563eb', marginTop: 12 }}>ข้อมูลผู้เช่า</label>
              <label>ชื่อผู้เช่า</label>
              <Input placeholder="เช่น สมชาย ใจดี" value={tenantName} onChange={e => setTenantName(e.target.value)} />
            </VStack>
            <VStack spacing={3} align="stretch">
              <label style={{ fontWeight: 500, color: '#2563eb' }}>ค่าใช้จ่ายหลัก</label>
              <label>ยอดรวม</label>
              <Input placeholder="ยอดรวมทั้งหมด" type="number" value={latestTotal} onChange={e => setLatestTotal(Number(e.target.value))} />
              <label>ค่าไฟฟ้า</label>
              <Input placeholder="เช่น 350" type="number" value={electricity} onChange={e => setElectricity(Number(e.target.value))} />
              <label>ค่าน้ำ</label>
              <Input placeholder="เช่น 100" type="number" value={water} onChange={e => setWater(Number(e.target.value))} />
              <label>ค่าเช่า</label>
              <Input placeholder="เช่น 5000" type="number" value={rent} onChange={e => setRent(Number(e.target.value))} />
              <label>ค่าบริการ (รวม)
                <span style={{ color: '#64748b', fontWeight: 400, fontSize: 12, marginLeft: 4 }}>(ถ้ามีบริการเสริมให้เพิ่มด้านล่าง)</span>
              </label>
              <Input placeholder="เช่น 300" type="number" value={service} onChange={e => setService(Number(e.target.value))} />
              <label>วันค้างชำระ</label>
              <Input placeholder="เช่น 0" type="number" value={overdueDays} onChange={e => setOverdueDays(Number(e.target.value))} />
              <label style={{ fontWeight: 500, color: '#2563eb', marginTop: 12 }}>บริการเสริม</label>
              {extraServices.map((svc, idx) => (
                <HStack key={idx} spacing={2} align="center">
                  <Input
                    placeholder="ชื่อบริการ เช่น ที่จอดรถ"
                    value={svc.label}
                    onChange={e => handleServiceChange(idx, "label", e.target.value)}
                  />
                  <Input
                    placeholder="จำนวนเงิน"
                    type="number"
                    value={svc.value}
                    onChange={e => handleServiceChange(idx, "value", Number(e.target.value))}
                  />
                  <CloseButton onClick={() => handleRemoveService(idx)} />
                </HStack>
              ))}
              <Button onClick={handleAddService} colorScheme="teal" variant="ghost" size="sm" borderRadius="xl" mt={1} alignSelf="flex-start">
                + เพิ่มค่าบริการเสริม
              </Button>
            </VStack>
          </SimpleGrid>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={handleSave} borderRadius="xl" px={6} fontWeight="bold">บันทึก</Button>
          <Button onClick={onClose} borderRadius="xl">ยกเลิก</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 