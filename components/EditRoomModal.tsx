import { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Input,
  VStack,
  Icon,
  HStack,
  IconButton,
  CloseButton,
  SimpleGrid,
  Switch,
  FormControl,
  FormLabel,
  Flex,
  Select,
  Text,
} from "@chakra-ui/react";
import { FaCog } from "react-icons/fa";

// Replicating the Room interface from pages/rooms.tsx to ensure all fields are handled.
interface RoomData {
  id: string;
  status: "occupied" | "vacant";
  tenantName: string;
  area: number;
  latestTotal: number;
  electricity: number;
  water: number;
  rent: number;
  service: number;
  extraServices?: { label: string; value: number }[];
  overdueDays: number;
  billStatus: string;
  tenantId?: string | null;
  tenantEmail?: string | null;
}

interface EditRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (room: Partial<RoomData>) => void;
  initialRoom: RoomData;
}

export default function EditRoomModal({ isOpen, onClose, onSave, initialRoom }: EditRoomModalProps) {
  if (!initialRoom) return null;

  const [room, setRoom] = useState<RoomData>(initialRoom);

  useEffect(() => {
    // Deep copy to avoid modifying the original object directly
    setRoom(JSON.parse(JSON.stringify(initialRoom)));
  }, [initialRoom, isOpen]);

  const handleChange = (field: keyof RoomData, value: any) => {
    setRoom(prev => ({ ...prev, [field]: value }));
  };
  
  const handleNumericChange = (field: keyof RoomData, value: string) => {
    const num = Number(value);
    if (!isNaN(num)) {
      setRoom(prev => ({ ...prev, [field]: num }));
    }
  };

  const handleAddService = () => {
    const services = room.extraServices ? [...room.extraServices] : [];
    services.push({ label: "", value: 0 });
    setRoom(prev => ({ ...prev, extraServices: services }));
  };

  const handleServiceChange = (idx: number, key: "label" | "value", val: string | number) => {
    const services = room.extraServices ? [...room.extraServices] : [];
    const updatedService = { ...services[idx], [key]: val };
    services[idx] = updatedService;
    setRoom(prev => ({ ...prev, extraServices: services }));
  };

  const handleRemoveService = (idx: number) => {
    const services = room.extraServices ? [...room.extraServices] : [];
    services.splice(idx, 1);
    setRoom(prev => ({ ...prev, extraServices: services }));
  };

  const handleSave = () => {
    onSave(room);
    onClose(); // Close modal after saving
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl">
      <ModalOverlay />
      <ModalContent borderRadius="2xl" p={2} maxH="95vh" overflowY="auto" minW={{ base: '95vw', md: '520px' }}>
        <ModalHeader display="flex" alignItems="center" gap={2} color="blue.600" fontWeight="bold">
          <Icon as={FaCog} /> แก้ไขข้อมูลห้องพัก {room.id}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text color="gray.500" fontSize="sm" mb={4}>
            ปรับข้อมูลห้อง, ผู้เช่า, ค่าเช่า และบริการต่าง ๆ ได้ที่นี่
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} alignItems="flex-start">
            <VStack spacing={3} align="stretch">
              <Text fontWeight="bold" color="blue.500">ข้อมูลห้อง</Text>
              <FormControl>
                <FormLabel fontSize="sm">เลขห้อง</FormLabel>
                <Input value={room.id} isReadOnly disabled bg="gray.100" />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">ขนาด (ตร.ม.)</FormLabel>
                <Input placeholder="เช่น 28" type="number" value={room.area} onChange={e => handleNumericChange('area', e.target.value)} />
              </FormControl>
              <FormControl display="flex" alignItems="center" mt={2}>
                <FormLabel htmlFor="status-toggle" mb="0" fontSize="sm">สถานะห้อง</FormLabel>
                <Switch id="status-toggle" colorScheme="green" isChecked={room.status === "occupied"} onChange={e => handleChange('status', e.target.checked ? "occupied" : "vacant")} />
                <Text ml={3} color={room.status === "occupied" ? 'green.600' : 'gray.600'} fontWeight="medium">
                  {room.status === "occupied" ? "มีคนอยู่" : "ว่าง"}
                </Text>
              </FormControl>
               <FormControl>
                <FormLabel fontSize="sm">สถานะบิล</FormLabel>
                <Select value={room.billStatus} onChange={e => handleChange('billStatus', e.target.value)}>
                  <option value="paid">ชำระแล้ว (Paid)</option>
                  <option value="unpaid">ยังไม่ชำระ (Unpaid)</option>
                  <option value="pending">รอตรวจสอบ (Pending)</option>
                </Select>
              </FormControl>

              <Text fontWeight="bold" color="blue.500" mt={4}>ข้อมูลผู้เช่า</Text>
              <FormControl>
                <FormLabel fontSize="sm">ชื่อผู้เช่า</FormLabel>
                <Input placeholder="เช่น สมชาย ใจดี" value={room.tenantName} onChange={e => handleChange('tenantName', e.target.value)} />
              </FormControl>
            </VStack>
            <VStack spacing={3} align="stretch">
              <Text fontWeight="bold" color="blue.500">ค่าใช้จ่าย (ข้อมูลจากบิลล่าสุด)</Text>
              <FormControl>
                <FormLabel fontSize="sm">ค่าไฟฟ้า</FormLabel>
                <Input placeholder="เช่น 350" type="number" value={room.electricity} onChange={e => handleNumericChange('electricity', e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">ค่าน้ำ</FormLabel>
                <Input placeholder="เช่น 100" type="number" value={room.water} onChange={e => handleNumericChange('water', e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">ค่าเช่า</FormLabel>
                <Input placeholder="เช่น 5000" type="number" value={room.rent} onChange={e => handleNumericChange('rent', e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">ค่าบริการพื้นฐาน</FormLabel>
                <Input placeholder="เช่น 300" type="number" value={room.service} onChange={e => handleNumericChange('service', e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">วันค้างชำระ</FormLabel>
                <Input placeholder="เช่น 0" type="number" value={room.overdueDays} onChange={e => handleNumericChange('overdueDays', e.target.value)} />
              </FormControl>
              
              <Text fontWeight="bold" color="blue.500" mt={4}>บริการเสริม</Text>
              {room.extraServices?.map((svc, idx) => (
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
                  <IconButton
                    aria-label="Remove service"
                    icon={<CloseButton />}
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveService(idx)}
                  />
                </HStack>
              ))}
              <Button onClick={handleAddService} colorScheme="teal" variant="outline" size="sm" borderRadius="lg" mt={1} alignSelf="flex-start">
                + เพิ่มบริการเสริม
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