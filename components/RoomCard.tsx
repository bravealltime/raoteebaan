import { Box, Flex, Text, Badge, Switch, HStack, Divider, IconButton, useColorModeValue, Tooltip } from "@chakra-ui/react";
import { FaUser, FaRulerCombined, FaPlus, FaFileInvoice, FaTrash, FaCog } from "react-icons/fa";

interface RoomCardProps {
  id: string;
  status: "occupied" | "vacant";
  tenantName: string;
  area: number;
  latestTotal: number;
  electricity: number;
  rent: number;
  service: number;
  overdueDays: number;
  onDelete?: () => void;
  onViewBill?: () => void;
  onAddData?: () => void;
  onSettings?: () => void;
}

export default function RoomCard({ id, status, tenantName, area, latestTotal, electricity, rent, service, overdueDays, onDelete, onViewBill, onAddData, onSettings }: RoomCardProps) {
  const cardBg = useColorModeValue("white", "grayBg.800");
  const cardShadow = "0 4px 24px 0 rgba(33, 150, 243, 0.10)";
  return (
    <Box
      bg={cardBg}
      borderRadius="2xl"
      boxShadow={cardShadow}
      p={7}
      minW="300px"
      maxW="340px"
      color="gray.800"
      position="relative"
      transition="transform 0.15s, box-shadow 0.15s"
      _hover={{ transform: "translateY(-4px) scale(1.03)", boxShadow: "0 8px 32px 0 rgba(33,150,243,0.18)" }}
    >
      <Flex align="center" justify="space-between" mb={2}>
        <Text fontWeight="bold" fontSize="2xl" color="brand.700">{id}</Text>
        <HStack>
          <Badge colorScheme={status === "occupied" ? "green" : "gray"} borderRadius="full" px={2} fontSize="sm">
            {status === "occupied" ? "มีคนอยู่" : "ว่าง"}
          </Badge>
          <Switch colorScheme="green" isChecked={status === "occupied"} isReadOnly size="md" />
        </HStack>
      </Flex>
      <Flex align="center" color="gray.500" fontSize="md" mb={1} gap={2}>
        <FaUser /> <Text>{tenantName}</Text>
      </Flex>
      <Flex align="center" color="gray.400" fontSize="sm" mb={2} gap={2}>
        <FaRulerCombined /> <Text>{area} ตร.ม.</Text>
      </Flex>
      <Divider my={2} borderColor="gray.200" />
      <Text color="gray.500" fontSize="sm">ยอดชำระล่าสุด</Text>
      <Text color="red.400" fontSize="2xl" fontWeight="bold" mb={2}>฿{latestTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
      <Flex justify="space-between" color="gray.600" fontSize="sm" mb={1}>
        <Text>ค่าไฟ</Text>
        <Text>฿{electricity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
      </Flex>
      <Flex justify="space-between" color="gray.600" fontSize="sm" mb={1}>
        <Text>ค่าเช่า</Text>
        <Text>฿{rent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
      </Flex>
      <Flex justify="space-between" color="gray.600" fontSize="sm" mb={2}>
        <Text>บริการเสริม</Text>
        <Text>฿{service.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
      </Flex>
      <Flex align="center" fontSize="sm" color="gray.500" mb={3}>
        <Text>กำหนดชำระ:</Text>
        <Text ml={2} color="red.400" fontWeight="bold">เกินกำหนด {overdueDays} วัน</Text>
      </Flex>
      <Divider my={2} borderColor="gray.200" />
      <Flex justify="space-between" mt={2}>
        <Tooltip label="เพิ่มข้อมูล" hasArrow><IconButton aria-label="เพิ่มข้อมูล" icon={<FaPlus />} variant="ghost" colorScheme="blue" onClick={onAddData} size="lg" fontSize="xl" /></Tooltip>
        <Tooltip label="ดูบิล" hasArrow><IconButton aria-label="ดูบิล" icon={<FaFileInvoice />} variant="ghost" colorScheme="blue" onClick={onViewBill} size="lg" fontSize="xl" /></Tooltip>
        <Tooltip label="ลบ" hasArrow><IconButton aria-label="ลบ" icon={<FaTrash />} variant="ghost" colorScheme="red" onClick={onDelete} size="lg" fontSize="xl" /></Tooltip>
        <Tooltip label="ตั้งค่า" hasArrow><IconButton aria-label="ตั้งค่า" icon={<FaCog />} variant="ghost" colorScheme="gray" onClick={onSettings} size="lg" fontSize="xl" /></Tooltip>
      </Flex>
    </Box>
  );
} 