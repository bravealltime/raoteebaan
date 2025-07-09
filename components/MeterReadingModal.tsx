import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, 
  Button, FormControl, FormLabel, Input, VStack, HStack, Text, SimpleGrid, Box, IconButton, Spinner
} from "@chakra-ui/react";
import { useState, useEffect, useRef } from "react";
import { FaCamera } from "react-icons/fa";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { motion } from "framer-motion";

interface MeterReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  rooms: { id: string; tenantName: string; status: string }[];
  previousReadings: Record<string, { electricity: number; water: number }>;
  isCentered?: boolean;
  size?: string | object;
}

export default function MeterReadingModal({ isOpen, onClose, onSave, rooms, previousReadings, isCentered, size }: MeterReadingModalProps) {
  const [readings, setReadings] = useState<Record<string, { electricity: string; water: string }>>({});
  const [rates, setRates] = useState({ electricity: 8, water: 15 });
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [uploadingElecImage, setUploadingElecImage] = useState<Record<string, boolean>>({});
  const [uploadedElecImageUrls, setUploadedElecImageUrls] = useState<Record<string, string>>({});
  const elecImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingWaterImage, setUploadingWaterImage] = useState<Record<string, boolean>>({});
  const [uploadedWaterImageUrls, setUploadedWaterImageUrls] = useState<Record<string, string>>({});
  const waterImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, roomId: string, type: 'electricity' | 'water') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === 'electricity') {
      setUploadingElecImage(prev => ({ ...prev, [roomId]: true }));
    } else {
      setUploadingWaterImage(prev => ({ ...prev, [roomId]: true }));
    }

    try {
      const storageRef = ref(getStorage(), `meter_readings/${roomId}/${type}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      if (type === 'electricity') {
        setUploadedElecImageUrls(prev => ({ ...prev, [roomId]: downloadURL }));
      } else {
        setUploadedWaterImageUrls(prev => ({ ...prev, [roomId]: downloadURL }));
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      // Optionally show a toast notification for error
    } finally {
      if (type === 'electricity') {
        setUploadingElecImage(prev => ({ ...prev, [roomId]: false }));
      } else {
        setUploadingWaterImage(prev => ({ ...prev, [roomId]: false }));
      }
    }
  };

  useEffect(() => {
    // Reset state when modal opens
    if (isOpen) {
      setReadings({});
      const nextMonth = new Date(recordDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(5);
      setDueDate(nextMonth.toISOString().split('T')[0]);
    }
  }, [isOpen, recordDate]);

  const handleReadingChange = (roomId: string, type: 'electricity' | 'water', value: string) => {
    setReadings(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [type]: value,
      },
    }));
  };

  const handleSave = () => {
    const dataToSave = {
      rates,
      recordDate,
      dueDate,
      readings: Object.entries(readings).map(([roomId, values]) => ({
        roomId,
        electricity: values.electricity || '',
        water: values.water || '',
        electricityImageUrl: uploadedElecImageUrls[roomId] || undefined,
        waterImageUrl: uploadedWaterImageUrls[roomId] || undefined,
      })),
    };
    // Debug log for uploaded image URLs and data to save
    
    onSave(dataToSave);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={size} scrollBehavior="inside" isCentered={isCentered}>
      <ModalOverlay />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <ModalContent>
          <ModalHeader>เพิ่มข้อมูลบิลทุกห้อง</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">
              <Box p={4} bg="gray.50" borderRadius="lg">
                <HStack spacing={4}>
                  <FormControl>
                    <FormLabel fontSize="sm">เรตค่าไฟ (ต่อหน่วย)</FormLabel>
                    <Input bg="white" type="number" value={rates.electricity} onChange={e => setRates(prev => ({ ...prev, electricity: Number(e.target.value) }))} />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">เรตค่าน้ำ (ต่อหน่วย)</FormLabel>
                    <Input bg="white" type="number" value={rates.water} onChange={e => setRates(prev => ({ ...prev, water: Number(e.target.value) }))} />
                  </FormControl>
                </HStack>
                <HStack spacing={4} mt={4}>
                  <FormControl>
                    <FormLabel fontSize="sm">วันที่บันทึก</FormLabel>
                    <Input bg="white" type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)} />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">วันครบกำหนดชำระ</FormLabel>
                    <Input bg="white" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </FormControl>
                </HStack>
              </Box>

              <SimpleGrid columns={{ base: 1, md: 2, lg: 3}} spacingX={6} spacingY={4}>
                {rooms.filter(room => room.status === 'occupied').map(room => (
                  <Box key={room.id} p={3} borderRadius="md" borderWidth="1px">
                    <Text fontWeight="bold" mb={2}>ห้อง {room.id} <Text as="span" color="gray.500" fontWeight="normal">({room.tenantName})</Text></Text>
                    <HStack>
                      <FormControl>
                        <FormLabel fontSize="xs">มิเตอร์ไฟ (ก่อนหน้า: {previousReadings[room.id]?.electricity || 0})</FormLabel>
                        <Input 
                          placeholder="เลขปัจจุบัน"
                          type="number" 
                          size="sm"
                          onChange={e => handleReadingChange(room.id, 'electricity', e.target.value)} 
                        />
                        <Button
                          leftIcon={uploadingElecImage[room.id] ? <Spinner size="sm" /> : <FaCamera />}
                          size="xs"
                          colorScheme="teal"
                          variant="outline"
                          onClick={() => elecImageInputRefs.current[room.id]?.click()}
                          isLoading={uploadingElecImage[room.id]}
                          isDisabled={uploadingElecImage[room.id]}
                          mt={1}
                          w="full"
                        >
                          {uploadedElecImageUrls[room.id] ? "อัปโหลดแล้ว" : "รูปมิเตอร์ไฟ"}
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          ref={el => { elecImageInputRefs.current[room.id] = el; }}
                          onChange={e => handleImageUpload(e, room.id, 'electricity')}
                          style={{ display: 'none' }}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="xs">มิเตอร์น้ำ (ก่อนหน้า: {previousReadings[room.id]?.water || 0})</FormLabel>
                        <Input 
                          placeholder="เลขปัจจุบัน"
                          type="number" 
                          size="sm"
                          onChange={e => handleReadingChange(room.id, 'water', e.target.value)} 
                        />
                        <Button
                          leftIcon={uploadingWaterImage[room.id] ? <Spinner size="sm" /> : <FaCamera />}
                          size="xs"
                          colorScheme="teal"
                          variant="outline"
                          onClick={() => waterImageInputRefs.current[room.id]?.click()}
                          isLoading={uploadingWaterImage[room.id]}
                          isDisabled={uploadingWaterImage[room.id]}
                          mt={1}
                          w="full"
                        >
                          {uploadedWaterImageUrls[room.id] ? "อัปโหลดแล้ว" : "รูปมิเตอร์น้ำ"}
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          ref={el => { waterImageInputRefs.current[room.id] = el; }}
                          onChange={e => handleImageUpload(e, room.id, 'water')}
                          style={{ display: 'none' }}
                        />
                      </FormControl>
                    </HStack>
                  </Box>
                ))}
              </SimpleGrid>
            </VStack>
          </ModalBody>
          {/* Debug section for uploaded image URLs and dataToSave */}
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>ยกเลิก</Button>
            <Button colorScheme="blue" onClick={handleSave}>บันทึกข้อมูล</Button>
          </ModalFooter>
        </ModalContent>
      </motion.div>
    </Modal>
  );
}