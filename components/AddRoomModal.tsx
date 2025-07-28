import { useState, useEffect } from "react";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Button, Input, VStack, SimpleGrid, HStack, CloseButton, Box, InputGroup, FormControl, FormErrorMessage, Spinner, InputRightElement, Select } from "@chakra-ui/react";
import { FaTint, FaBolt, FaCalendarAlt, FaPlus, FaHome } from "react-icons/fa";
import { motion } from "framer-motion";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (room: any) => void;
  lastWaterMeter?: number;
  lastElecMeter?: number;
  userRole?: string | null;
  ownerId?: string; // Add ownerId to props
  isCentered?: boolean;
  size?: string | object;
}

export default function AddRoomModal({ isOpen, onClose, onAdd, lastWaterMeter, lastElecMeter, userRole, ownerId, isCentered, size }: AddRoomModalProps) {
  const [roomId, setRoomId] = useState("");
  const [isRoomIdInvalid, setIsRoomIdInvalid] = useState(false);
  const [isCheckingRoomId, setIsCheckingRoomId] = useState(false);
  const [roomIdErrorMessage, setRoomIdErrorMessage] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [contractStartDate, setContractStartDate] = useState<Date | null>(null);
  const [contractEndDate, setContractEndDate] = useState<Date | null>(null);
  const [contractDuration, setContractDuration] = useState<number | string>("");
  const [rent, setRent] = useState(0);
  const [area, setArea] = useState(0);
  const [recordDate, setRecordDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  
  const [waterCurrent, setWaterCurrent] = useState(0);
  const [waterPrev, setWaterPrev] = useState<number | undefined>(undefined);
  const [waterRate, setWaterRate] = useState(0);
  const [waterTotal, setWaterTotal] = useState(0);
  const [elecCurrent, setElecCurrent] = useState(0);
  const [elecPrev, setElecPrev] = useState<number | undefined>(undefined);
  const [elecRate, setElecRate] = useState(0);
  const [elecTotal, setElecTotal] = useState(0);
  const [extraServices, setExtraServices] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    if (isOpen) {
      setWaterPrev(lastWaterMeter !== undefined ? lastWaterMeter : 0);
      setElecPrev(lastElecMeter !== undefined ? lastElecMeter : 0);
      setRecordDate(new Date());
      setDueDate(new Date());
    }
  }, [isOpen, lastWaterMeter, lastElecMeter]);

  useEffect(() => {
    const checkRoomId = async () => {
      if (roomId.trim() === "") {
        setIsRoomIdInvalid(false);
        setRoomIdErrorMessage("");
        return;
      }
      setIsCheckingRoomId(true);
      try {
        const roomDoc = await getDoc(doc(db, "rooms", roomId));
        if (roomDoc.exists()) {
          setIsRoomIdInvalid(true);
          setRoomIdErrorMessage("เลขห้องนี้มีอยู่แล้ว");
        } else {
          setIsRoomIdInvalid(false);
          setRoomIdErrorMessage("");
        }
      } catch (error) {
        console.error("Error checking room ID:", error);
        setIsRoomIdInvalid(false); // Or handle error state differently
      }
      setIsCheckingRoomId(false);
    };

    const handler = setTimeout(() => {
      checkRoomId();
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [roomId]);

  useEffect(() => {
    if (contractStartDate && contractDuration) {
      const newEndDate = new Date(contractStartDate);
      newEndDate.setMonth(newEndDate.getMonth() + Number(contractDuration));
      setContractEndDate(newEndDate);
    } else {
      setContractEndDate(null);
    }
  }, [contractStartDate, contractDuration]);

  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numericValue = value.replace(/[^0-9]/g, '');
    setRoomId(numericValue);
  };

  const handleAddService = () => {
    setExtraServices([...extraServices, { label: "", value: 0 }]);
  };
  const handleServiceChange = (idx: number, key: "label" | "value", val: string | number) => {
    setExtraServices(svcs => svcs.map((s, i) => i === idx ? { ...s, [key]: val } : s));
  };
  const handleRemoveService = (idx: number) => {
    setExtraServices(svcs => svcs.filter((_, i) => i !== idx));
  };

  const handleAdd = () => {
    if (isRoomIdInvalid || !roomId.trim() || isCheckingRoomId) return;

    const isVacant = !tenantName.trim();
    onAdd({
      id: roomId.trim(),
      status: isVacant ? "vacant" : "occupied",
      tenantName: isVacant ? "-" : tenantName,
      tenantEmail,
      ownerId,
      area,
      emergencyContact,
      contractStartDate: contractStartDate ? contractStartDate.toISOString() : null,
      contractEndDate: contractEndDate ? contractEndDate.toISOString() : null,
      ...(isVacant ? {} : {
        waterCurrent,
        waterPrev,
        waterRate,
        waterTotal,
        elecCurrent,
        elecPrev,
        elecRate,
        elecTotal,
      }),
      extraServices,
      rent,
      recordDate: recordDate ? recordDate.toISOString() : null,
      dueDate: dueDate ? dueDate.toISOString() : null,
    });
    // Reset form fields
    setRoomId("");
    setIsRoomIdInvalid(false);
    setRoomIdErrorMessage("");
    setTenantName("");
    setTenantEmail("");
    setRent(0);
    setArea(0);
    setRecordDate(new Date());
    setDueDate(new Date());
    setWaterCurrent(0);
    setWaterPrev(undefined);
    setWaterRate(0);
    setWaterTotal(0);
    setElecCurrent(0);
    setElecPrev(undefined);
    setElecRate(0);
    setElecTotal(0);
    setExtraServices([]);
    onClose();
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
        <ModalContent borderRadius="2xl" p={4} maxH="98vh" maxW="1200px" minH="700px" overflowY="visible" bg="white">
          <ModalHeader fontWeight="bold" color="blue.600" fontSize="2xl">เพิ่มห้องใหม่</ModalHeader>
          <ModalCloseButton color="blue.400" />
          <ModalBody>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <Box bg="white" borderRadius="2xl" p={4} boxShadow="md" border="1.5px solid brand.50">
                <HStack mb={2} align="center">
                  <Box as={FaHome} color="blue.400" />
                  <Box fontWeight={700} color="blue.600" fontSize="md">ข้อมูลห้อง</Box>
                </HStack>
                <FormControl isInvalid={isRoomIdInvalid} mb={2}>
                  <InputGroup>
                    <Input
                      placeholder="เลขห้อง *"
                      value={roomId}
                      onChange={handleRoomIdChange}
                      type="tel"
                      inputMode="numeric"
                      bg="gray.50"
                      color="gray.800"
                      borderRadius="lg"
                      borderColor={isRoomIdInvalid ? "red.300" : "blue.100"}
                      _focus={{ borderColor: isRoomIdInvalid ? 'red.500' : 'blue.400' }}
                    />
                    {isCheckingRoomId && (
                      <InputRightElement>
                        <Spinner size="sm" color="blue.500" />
                      </InputRightElement>
                    )}
                  </InputGroup>
                  {isRoomIdInvalid ? (
                    <FormErrorMessage mt={1} fontSize="xs">
                      {roomIdErrorMessage}
                    </FormErrorMessage>
                  ) : (
                    <Box fontSize="xs" color="gray.400" mt={1}>กรอกเลขห้องที่เป็นตัวเลขเท่านั้น</Box>
                  )}
                </FormControl>
                <Box mb={2}>
                  <Input mt={1} size="md" placeholder="ชื่อผู้เช่า *" value={tenantName} onChange={e => setTenantName(e.target.value)} bg="gray.50" color="gray.800" borderRadius="lg" borderColor="blue.100" _focus={{ borderColor: 'blue.400' }} />
                  <Box fontSize="xs" color="gray.400" mt={1}>กรอกชื่อผู้เช่า เช่น สมชาย ใจดี</Box>
                </Box>
                {userRole === 'owner' && (
                  <Box mb={2}>
                    <Input mt={1} size="md" placeholder="อีเมลผู้เช่า (สำหรับสร้างบัญชี)" value={tenantEmail} onChange={e => setTenantEmail(e.target.value)} bg="gray.50" color="gray.800" borderRadius="lg" borderColor="blue.100" _focus={{ borderColor: 'blue.400' }} />
                    <Box fontSize="xs" color="gray.400" mt={1}>ระบบจะสร้างบัญชีและส่งรหัสผ่านให้ผู้เช่าทางอีเมลนี้</Box>
                  </Box>
                )}
                <Box mb={2}>
                  <Input mt={1} size="md" placeholder="เบอร์ติดต่อฉุกเฉิน" value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} bg="gray.50" color="gray.800" borderRadius="lg" borderColor="blue.100" _focus={{ borderColor: 'blue.400' }} type="tel" />
                  <Box fontSize="xs" color="gray.400" mt={1}>สำหรับติดต่อกรณีฉุกเฉิน</Box>
                </Box>
                <SimpleGrid columns={3} gap={2}>
                  <Box>
                    <Input size="md" mt={1} placeholder="วันเริ่มสัญญา" value={contractStartDate ? contractStartDate.toISOString().split('T')[0] : ''} onChange={e => setContractStartDate(e.target.value ? new Date(e.target.value) : null)} bg="gray.50" color="gray.800" borderRadius="lg" borderColor="blue.100" _focus={{ borderColor: 'blue.400' }} type="date" />
                    <Box fontSize="xs" color="gray.400" mt={1}>วันเริ่มสัญญา</Box>
                  </Box>
                  <Box>
                    <Select
                      size="md"
                      mt={1}
                      placeholder="เลือกระยะเวลา"
                      value={contractDuration}
                      onChange={e => setContractDuration(e.target.value)}
                      bg="gray.50"
                      color="gray.800"
                      borderRadius="lg"
                      borderColor="blue.100"
                      _focus={{ borderColor: 'blue.400' }}
                    >
                      <option value={6}>6 เดือน</option>
                      <option value={12}>12 เดือน</option>
                      <option value={24}>24 เดือน</option>
                    </Select>
                    <Box fontSize="xs" color="gray.400" mt={1}>ระยะเวลาสัญญา</Box>
                  </Box>
                  <Box>
                    <Input size="md" mt={1} placeholder="วันสิ้นสุดสัญญา" value={contractEndDate ? contractEndDate.toISOString().split('T')[0] : ''} isReadOnly bg="gray.100" color="gray.800" borderRadius="lg" borderColor="blue.100" _focus={{ borderColor: 'blue.400' }} type="date" />
                    <Box fontSize="xs" color="gray.400" mt={1}>จะคำนวณอัตโนมัติ</Box>
                  </Box>
                </SimpleGrid>
                <SimpleGrid columns={2} gap={2} mt={1}>
                  <Box>
                    <Input size="md" placeholder="ค่าเช่า *" value={rent} type="number" onChange={e => setRent(Number(e.target.value))} bg="gray.50" color="gray.800" borderRadius="lg" borderColor="blue.100" _focus={{ borderColor: 'blue.400' }} />
                    <Box fontSize="xs" color="gray.400" mt={1}>บาท/เดือน</Box>
                  </Box>
                  <Box>
                    <Input size="md" placeholder="ขนาดห้อง" value={area} type="number" onChange={e => setArea(Number(e.target.value))} bg="gray.50" color="gray.800" borderRadius="lg" borderColor="blue.100" _focus={{ borderColor: 'blue.400' }} />
                    <Box fontSize="xs" color="gray.400" mt={1}>ตร.ม.</Box>
                  </Box>
                </SimpleGrid>
                <Box mt={2}>
                  <Input size="md" mt={1} placeholder="วันที่บันทึก (DD/MM/YYYY) *" value={recordDate ? recordDate.toISOString().split('T')[0] : ''} onChange={e => setRecordDate(e.target.value ? new Date(e.target.value) : null)} bg="gray.50" color="gray.800" borderRadius="lg" borderColor="blue.100" _focus={{ borderColor: 'blue.400' }} type="date" />
                  <Box fontSize="xs" color="gray.400" mt={1}>วันที่เริ่มต้นสัญญา เช่น 25/12/2024</Box>
                </Box>
              </Box>
              <Box bg="white" borderRadius="2xl" p={4} boxShadow="md" border="1.5px solid brand.50">
                <HStack mb={2} align="center">
                  <Box as={FaBolt} color="yellow.400" />
                  <Box fontWeight={700} color="yellow.600" fontSize="md">ข้อมูลค่าไฟ</Box>
                </HStack>
                <SimpleGrid columns={2} gap={2} mt={1}>
                  <Box>
                    <Input size="md" placeholder="มิเตอร์ไฟ (ปัจจุบัน)" value={elecCurrent} type="number" onChange={e => setElecCurrent(Number(e.target.value))} bg="gray.50" color="gray.800" borderRadius="lg" borderColor="yellow.100" _focus={{ borderColor: 'yellow.400' }} />
                    <Box fontSize="xs" color="gray.400" mt={1}>เลขที่เห็นบนมิเตอร์ล่าสุด</Box>
                  </Box>
                  <Box>
                    <Input size="md" placeholder="มิเตอร์ไฟ (ก่อนหน้า)" value={elecPrev ?? ""} type="number" onChange={e => setElecPrev(Number(e.target.value))} bg="gray.50" color="gray.800" borderRadius="lg" borderColor="yellow.100" _focus={{ borderColor: 'yellow.400' }} />
                    <Box fontSize="xs" color="gray.400" mt={1}>เลขรอบก่อนหน้า</Box>
                  </Box>
                </SimpleGrid>
                <SimpleGrid columns={2} gap={2} mt={1}>
                  <Box>
                    <Input size="md" placeholder="ค่าไฟ/หน่วย" value={elecRate} type="number" onChange={e => setElecRate(Number(e.target.value))} bg="gray.50" color="gray.800" borderRadius="lg" borderColor="yellow.100" _focus={{ borderColor: 'yellow.400' }} />
                    <Box fontSize="xs" color="gray.400" mt={1}>บาท/หน่วย</Box>
                  </Box>
                  <Box>
                    <Input size="md" placeholder="ยอดรวมค่าไฟ (ถ้ามี)" value={elecTotal} type="number" onChange={e => setElecTotal(Number(e.target.value))} bg="gray.50" color="gray.800" borderRadius="lg" borderColor="yellow.100" _focus={{ borderColor: 'yellow.400' }} />
                    <Box fontSize="xs" color="gray.400" mt={1}>ถ้าคำนวณไว้แล้ว</Box>
                  </Box>
                </SimpleGrid>
              </Box>
              <Box bg="white" borderRadius="2xl" p={4} boxShadow="md" border="1.5px solid brand.50">
                <HStack mb={2} align="center">
                  <Box as={FaTint} color="cyan.400" />
                  <Box fontWeight={700} color="cyan.600" fontSize="md">ข้อมูลค่าน้ำ</Box>
                </HStack>
                <SimpleGrid columns={2} gap={2} mt={1}>
                  <Box>
                    <Input size="md" placeholder="มิเตอร์น้ำ (ปัจจุบัน)" value={waterCurrent} type="number" onChange={e => setWaterCurrent(Number(e.target.value))} bg="gray.50" color="gray.800" borderRadius="lg" borderColor="cyan.100" _focus={{ borderColor: 'cyan.400' }} />
                    <Box fontSize="xs" color="gray.400" mt={1}>เลขที่เห็นบนมิเตอร์ล่าสุด</Box>
                  </Box>
                  <Box>
                    <Input size="md" placeholder="มิเตอร์น้ำ (ก่อนหน้า)" value={waterPrev ?? ""} type="number" onChange={e => setWaterPrev(Number(e.target.value))} bg="gray.50" color="gray.800" borderRadius="lg" borderColor="cyan.100" _focus={{ borderColor: 'cyan.400' }} />
                    <Box fontSize="xs" color="gray.400" mt={1}>เลขรอบก่อนหน้า</Box>
                  </Box>
                </SimpleGrid>
                <SimpleGrid columns={2} gap={2} mt={1}>
                  <Box>
                    <Input size="md" placeholder="ค่าน้ำ/หน่วย" value={waterRate} type="number" onChange={e => setWaterRate(Number(e.target.value))} bg="gray.50" color="gray.800" borderRadius="lg" borderColor="cyan.100" _focus={{ borderColor: 'cyan.400' }} />
                    <Box fontSize="xs" color="gray.400" mt={1}>บาท/หน่วย</Box>
                  </Box>
                  <Box>
                    <Input size="md" placeholder="ยอดรวมค่าน้ำ (ถ้ามี)" value={waterTotal} type="number" onChange={e => setWaterTotal(Number(e.target.value))} bg="gray.50" color="gray.800" borderRadius="lg" borderColor="cyan.100" _focus={{ borderColor: 'cyan.400' }} />
                    <Box fontSize="xs" color="gray.400" mt={1}>ถ้าคำนวณไว้แล้ว</Box>
                  </Box>
                </SimpleGrid>
              </Box>
              <Box bg="white" borderRadius="2xl" p={4} boxShadow="md" border="1.5px solid brand.50" gridColumn={{ md: '1 / span 3' }}>
                <HStack mb={2} align="center">
                  <Box as={FaCalendarAlt} color="pink.400" />
                  <Box fontWeight={700} color="pink.600" fontSize="md">วันครบกำหนดชำระ</Box>
                </HStack>
                <Box mb={2}>
                  <Input size="md" mt={1} placeholder="วันที่ครบกำหนด (DD/MM/YYYY)" value={dueDate ? dueDate.toISOString().split('T')[0] : ''} onChange={e => setDueDate(e.target.value ? new Date(e.target.value) : null)} bg="gray.50" color="gray.800" borderRadius="lg" borderColor="pink.100" _focus={{ borderColor: 'pink.400' }} type="date" />
                  <Box fontSize="xs" color="gray.400" mt={1}>วันที่ต้องชำระเงิน เช่น 31/12/2024</Box>
                </Box>
                <HStack mt={2} mb={1} align="center">
                  <Box as={FaPlus} color="green.400" />
                  <Box fontWeight={700} color="green.600" fontSize="md">ค่าบริการเสริม</Box>
                </HStack>
                {extraServices.map((svc, idx) => (
                  <HStack key={idx} spacing={2} align="center" mt={1}>
                    <Input
                      size="md"
                      placeholder="ชื่อบริการ เช่น ที่จอดรถ"
                      value={svc.label}
                      onChange={e => handleServiceChange(idx, "label", e.target.value)}
                      bg="gray.50" color="gray.800" borderRadius="lg" borderColor="green.100" _focus={{ borderColor: 'green.400' }}
                    />
                    <Input
                      size="md"
                      placeholder="จำนวนเงิน"
                      type="number"
                      value={svc.value}
                      onChange={e => handleServiceChange(idx, "value", Number(e.target.value))}
                      bg="gray.50" color="gray.800" borderRadius="lg" borderColor="green.100" _focus={{ borderColor: 'green.400' }}
                    />
                    <CloseButton onClick={() => handleRemoveService(idx)} />
                  </HStack>
                ))}
                <Button leftIcon={<FaPlus />} colorScheme="green" variant="outline" size="md" mt={2} borderRadius="xl" fontFamily="Kanit" fontWeight="medium" onClick={handleAddService}>
                  เพิ่มบริการเสริม
                </Button>
              </Box>
            </SimpleGrid>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleAdd} size="md" borderRadius="xl" fontFamily="Kanit" fontWeight="bold" isDisabled={isRoomIdInvalid || !roomId.trim() || isCheckingRoomId}>
              เพิ่ม
            </Button>
            <Button variant="ghost" onClick={onClose} size="md" borderRadius="xl" fontFamily="Kanit">ยกเลิก</Button>
          </ModalFooter>
        </ModalContent>
      </motion.div>
    </Modal>
  );
}
