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
  useToast,
  Box,
} from "@chakra-ui/react";
import { FaCog, FaPaperPlane, FaUserPlus } from "react-icons/fa";
import { motion } from "framer-motion";

interface User {
  uid: string;
  name: string;
  email: string;
  role: string;
}

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
  ownerId?: string;
  createNewTenant?: boolean; // Flag to indicate new tenant creation
}

interface EditRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (room: Partial<RoomData>) => void;
  initialRoom: RoomData;
  users: User[];
  isCentered?: boolean;
  size?: string | object;
}

export default function EditRoomModal({ isOpen, onClose, onSave, initialRoom, users, isCentered, size }: EditRoomModalProps) {
  if (!initialRoom) return null;

  const [room, setRoom] = useState<RoomData>(initialRoom);
  const [createNewTenant, setCreateNewTenant] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // When modal opens or initialRoom changes, reset state
    setRoom(JSON.parse(JSON.stringify(initialRoom)));
    setCreateNewTenant(false); // Default to selecting existing tenant
  }, [initialRoom, isOpen]);

  const handleTenantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTenantId = e.target.value;
    if (selectedTenantId) {
      const selectedTenant = users.find(user => user.uid === selectedTenantId);
      if (selectedTenant) {
        setRoom(prev => ({
          ...prev,
          tenantId: selectedTenant.uid,
          tenantName: selectedTenant.name,
          tenantEmail: selectedTenant.email,
          status: "occupied",
        }));
      }
    } else {
      setRoom(prev => ({
        ...prev,
        tenantId: null,
        tenantName: "",
        tenantEmail: "",
        status: "vacant",
      }));
    }
  };

  const handleInputChange = (field: keyof RoomData, value: any) => {
    setRoom(prev => ({ ...prev, [field]: value }));
  };

  const handleNumericChange = (field: keyof RoomData, value: string) => {
    const num = Number(value);
    if (!isNaN(num)) {
      setRoom(prev => ({ ...prev, [field]: num }));
    }
  };

  const handleSave = () => {
    const finalRoomData = { ...room, createNewTenant };
    if (createNewTenant && (!finalRoomData.tenantName || !finalRoomData.tenantEmail)) {
        toast({ title: "ข้อมูลไม่ครบถ้วน", description: "กรุณากรอกชื่อและอีเมลสำหรับผู้เช่าใหม่", status: "warning" });
        return;
    }
    onSave(finalRoomData);
    onClose();
  };

  const handleToggleCreateNew = (isChecked: boolean) => {
    setCreateNewTenant(isChecked);
    // When switching to create new, clear previous selection
    if (isChecked) {
      setRoom(prev => ({
        ...prev,
        tenantId: null,
        tenantName: "",
        tenantEmail: "",
      }));
    }
  };

  // ... other handlers like handleAddService, handleSendResetPassword etc. remain the same
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

  const handleSendResetPassword = async () => {
    if (!room.tenantEmail) {
      toast({
        title: "ไม่พบอีเมล",
        description: "กรุณาเลือกหรือกรอกอีเมลผู้เช่าก่อน",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      const res = await fetch('/api/send-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: room.tenantEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      toast({
        title: "ส่งอีเมลสำเร็จ",
        description: `อีเมลรีเซ็ตรหัสผ่านถูกส่งไปที่ ${room.tenantEmail} แล้ว`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });

    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered={isCentered} size={size}>
      <ModalOverlay />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <ModalContent borderRadius="2xl" p={2} maxH="95vh" overflowY="auto" minW={{ base: '95vw', md: '520px' }}>
          <ModalHeader display="flex" alignItems="center" gap={2} color="blue.600" fontWeight="bold">
            <Icon as={FaCog} /> แก้ไขข้อมูลห้องพัก {room.id}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text color="gray.500" fontSize="sm" mb={4}>
              ปรับข้อมูลห้อง, ผู้เช่า, ค่าเช่า และบริการต่าง ๆ ได้ที่นี่
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} alignItems="flex-start">
              {/* Left Column */}
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="bold" color="blue.500" mb={2}>ข้อมูลห้อง</Text>
                  <VStack spacing={3} align="stretch" bg="gray.50" p={4} borderRadius="lg">
                    <FormControl>
                      <FormLabel fontSize="sm">เลขห้อง</FormLabel>
                      <Input value={room.id} isReadOnly disabled bg="white" />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">ขนาด (ตร.ม.)</FormLabel>
                      <Input placeholder="เช่น 28" type="number" value={room.area} onChange={e => handleNumericChange('area', e.target.value)} />
                    </FormControl>
                    <FormControl display="flex" alignItems="center" justifyContent="space-between">
                      <FormLabel htmlFor="status-toggle" mb="0" fontSize="sm">สถานะห้อง</FormLabel>
                      <HStack>
                        <Text color={room.status === "occupied" ? 'green.600' : 'gray.600'} fontWeight="medium">
                          {room.status === "occupied" ? "มีคนอยู่" : "ว่าง"}
                        </Text>
                        <Switch id="status-toggle" colorScheme="green" isChecked={room.status === "occupied"} onChange={e => handleInputChange('status', e.target.checked ? "occupied" : "vacant")} />
                      </HStack>
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">สถานะบิล</FormLabel>
                      <Select value={room.billStatus} onChange={e => handleInputChange('billStatus', e.target.value)}>
                        <option value="paid">ชำระแล้ว (Paid)</option>
                        <option value="unpaid">ยังไม่ชำระ (Unpaid)</option>
                        <option value="pending">รอตรวจสอบ (Pending)</option>
                      </Select>
                    </FormControl>
                  </VStack>
                </Box>

                <Box>
                  <Text fontWeight="bold" color="blue.500" mb={2}>ข้อมูลผู้เช่า</Text>
                  <VStack spacing={3} align="stretch" bg="gray.50" p={4} borderRadius="lg">
                    <FormControl display="flex" alignItems="center" justifyContent="space-between" bg="white" p={2} borderRadius="md">
                      <FormLabel htmlFor="create-new-tenant-toggle" mb="0" fontSize="sm" fontWeight="bold" color="teal.600">
                        <Icon as={FaUserPlus} mr={2} />
                        สร้างผู้เช่าใหม่?
                      </FormLabel>
                      <Switch id="create-new-tenant-toggle" colorScheme="teal" isChecked={createNewTenant} onChange={(e) => handleToggleCreateNew(e.target.checked)} />
                    </FormControl>

                    <Box opacity={createNewTenant ? 0.4 : 1} transition="opacity 0.2s">
                      <FormControl isDisabled={createNewTenant}>
                        <FormLabel fontSize="sm">เลือกผู้เช่าที่มีอยู่</FormLabel>
                        <Select placeholder="-- ห้องว่าง --" value={room.tenantId || ''} onChange={handleTenantChange}>
                          {users.map(user => (
                            <option key={user.uid} value={user.uid}>{user.name} ({user.email})</option>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>

                    <Box opacity={!createNewTenant ? 0.4 : 1} transition="opacity 0.2s">
                      <VStack spacing={3} align="stretch">
                        <FormControl isDisabled={!createNewTenant}>
                          <FormLabel fontSize="sm">ชื่อผู้เช่าใหม่</FormLabel>
                          <Input placeholder="เช่น สมหญิง รักดี" value={room.tenantName || ''} onChange={e => handleInputChange('tenantName', e.target.value)} />
                        </FormControl>
                        <FormControl isDisabled={!createNewTenant}>
                          <FormLabel fontSize="sm">อีเมลผู้เช่าใหม่</FormLabel>
                          <Input placeholder="new.tenant@example.com" value={room.tenantEmail || ''} onChange={e => handleInputChange('tenantEmail', e.target.value)} />
                        </FormControl>
                      </VStack>
                    </Box>

                    <Button
                      leftIcon={<FaPaperPlane />}
                      colorScheme="purple"
                      variant="outline"
                      size="sm"
                      mt={2}
                      onClick={handleSendResetPassword}
                      isDisabled={!room.tenantEmail}
                    >
                      ส่งอีเมลรีเซ็ตรหัสผ่าน
                    </Button>
                  </VStack>
                </Box>
              </VStack>

              {/* Right Column */}
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="bold" color="blue.500" mb={2}>ค่าใช้จ่าย & บริการ</Text>
                  <VStack spacing={3} align="stretch" bg="gray.50" p={4} borderRadius="lg">
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
                  </VStack>
                </Box>
                
                <Box>
                  <Text fontWeight="bold" color="blue.500" mb={2}>บริการเสริม</Text>
                  <VStack spacing={3} align="stretch" bg="gray.50" p={4} borderRadius="lg">
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
                          colorScheme="red"
                          onClick={() => handleRemoveService(idx)}
                        />
                      </HStack>
                    ))}
                    <Button onClick={handleAddService} colorScheme="teal" variant="outline" size="sm" borderRadius="lg" mt={1} alignSelf="flex-start">
                      + เพิ่มบริการเสริม
                    </Button>
                  </VStack>
                </Box>
              </VStack>
            </SimpleGrid>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleSave} borderRadius="xl" px={6} fontWeight="bold">บันทึก</Button>
            <Button onClick={onClose} borderRadius="xl">ยกเลิก</Button>
          </ModalFooter>
        </ModalContent>
      </motion.div>
    </Modal>
  );
}