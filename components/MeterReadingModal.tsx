import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, 
  Button, FormControl, FormLabel, Input, VStack, HStack, Text, SimpleGrid, Box
} from "@chakra-ui/react";
import { useState, useEffect } from "react";

interface MeterReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  rooms: { id: string; tenantName: string; status: string }[];
  previousReadings: Record<string, { electricity: number; water: number }>;
}

export default function MeterReadingModal({ isOpen, onClose, onSave, rooms, previousReadings }: MeterReadingModalProps) {
  const [readings, setReadings] = useState<Record<string, { electricity: string; water: string }>>({});
  const [rates, setRates] = useState({ electricity: 8, water: 15 });
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');

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
      })),
    };
    onSave(dataToSave);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay />
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
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs">มิเตอร์น้ำ (ก่อนหน้า: {previousReadings[room.id]?.water || 0})</FormLabel>
                      <Input 
                        placeholder="เลขปัจจุบัน"
                        type="number" 
                        size="sm"
                        onChange={e => handleReadingChange(room.id, 'water', e.target.value)} 
                      />
                    </FormControl>
                  </HStack>
                </Box>
              ))}
            </SimpleGrid>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>ยกเลิก</Button>
          <Button colorScheme="blue" onClick={handleSave}>บันทึกข้อมูล</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}