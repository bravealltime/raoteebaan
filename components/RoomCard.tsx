import { Box, Flex, Text, Badge, Button, Divider, Icon, Tooltip, IconButton } from "@chakra-ui/react";
import { FaChevronRight, FaDoorOpen, FaPlus, FaUser, FaCalendarAlt, FaFileInvoice, FaTrash, FaCog } from "react-icons/fa";

interface RoomCardProps {
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
  dueDate?: string;
  billStatus?: "paid" | "unpaid" | "pending" | "complete";
  onViewBill?: () => void;
  onAddData?: () => void;
  onDelete?: () => void;
  onSettings?: () => void;
}

const statusMap = {
  paid: { color: "green", label: "PAID", bg: "green.100", text: "green.700" },
  unpaid: { color: "red", label: "UNPAID", bg: "red.100", text: "red.700" },
  pending: { color: "orange", label: "PENDING", bg: "orange.100", text: "orange.700" },
  complete: { color: "green", label: "COMPLETE", bg: "green.100", text: "green.700" },
};

export default function RoomCard({ id, status, tenantName, area, latestTotal, electricity, water, rent, service, overdueDays, dueDate, billStatus = "paid", onViewBill, onAddData, onDelete, onSettings }: RoomCardProps) {
  const statusInfo = statusMap[billStatus] || statusMap.paid;
  return (
    <Box
      bg="white"
      borderRadius="2xl"
      border="1.5px solid #e3f2fd"
      boxShadow="0 4px 24px 0 rgba(33,150,243,0.12)"
      p={4}
      minW="220px"
      maxW="260px"
      w="full"
      minH="320px"
      display="flex"
      flexDirection="column"
      gap={1}
      transition="box-shadow 0.15s"
      _hover={{ boxShadow: "0 8px 32px 0 rgba(33,150,243,0.18)" }}
      position="relative"
      m={0}
    >
      <Icon as={FaFileInvoice} color="blue.100" boxSize={24} position="absolute" top={-2} right={-2} zIndex={0} opacity={0.18} pointerEvents="none" />
      <Flex align="center" gap={2} mb={1} zIndex={1}>
        <Icon as={FaDoorOpen} color="blue.300" boxSize={5} />
        <Text fontWeight="bold" fontSize="lg" color="blue.700">Room {id}</Text>
        <Badge colorScheme={status === "occupied" ? "green" : "gray"} borderRadius="full" px={2} fontSize="xs" bg={status === "occupied" ? "green.100" : "gray.100"} color={status === "occupied" ? "green.700" : "gray.600"}>
          {status === "occupied" ? "มีคนอยู่" : "ว่าง"}
        </Badge>
      </Flex>
      <Flex align="center" gap={2} mb={1} zIndex={1}>
        <Icon as={FaUser} color="gray.300" boxSize={4} />
        <Text color="gray.600" fontSize="sm" noOfLines={1}>{tenantName}</Text>
      </Flex>
      <Flex align="center" gap={2} mb={1} zIndex={1}>
        <Icon as={FaCalendarAlt} color="gray.300" boxSize={4} />
        <Text color="gray.400" fontSize="xs">ขนาด {area} ตร.ม.</Text>
        {dueDate && <Text color="blue.400" fontSize="xs" ml={2}>ครบกำหนด: {dueDate}</Text>}
      </Flex>
      <Divider my={1} borderColor="gray.100" />
      <Flex align="center" gap={2} mb={1} zIndex={1}>
        <Badge bg={statusInfo.bg} color={statusInfo.text} borderRadius="full" fontSize="xs" px={2}>{statusInfo.label}</Badge>
      </Flex>
      <Box bg="blue.50" borderRadius="lg" py={2} px={2} my={1} zIndex={1} boxShadow="sm">
        <Text color="gray.800" fontWeight="bold" fontSize="2xl" textAlign="center">฿{latestTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
      </Box>
      <Divider my={1} borderColor="gray.100" />
      <Flex align="center" gap={2} mb={1} zIndex={1} justify="space-between">
        <Tooltip label="ค่าไฟฟ้า" fontSize="xs"><Text color="gray.500" fontSize="xs">ไฟ: ฿{electricity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Tooltip>
        <Tooltip label="ค่าน้ำ" fontSize="xs"><Text color="gray.500" fontSize="xs">น้ำ: ฿{water.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Tooltip>
        <Tooltip label="ค่าเช่า" fontSize="xs"><Text color="gray.500" fontSize="xs">เช่า: ฿{rent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Tooltip>
        <Tooltip label="ค่าบริการ" fontSize="xs"><Text color="gray.500" fontSize="xs">บริการ: ฿{service.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></Tooltip>
      </Flex>
      {overdueDays > 0 && (
        <Text color="red.400" fontSize="xs" fontWeight="bold" zIndex={1}>เกินกำหนด {overdueDays} วัน</Text>
      )}
      <Divider my={1} borderColor="gray.100" />
      <Flex
        align="center"
        justify="space-between"
        mt="auto"
        gap={2}
        zIndex={1}
        bg="gray.50"
        borderRadius="xl"
        py={2}
        px={2}
        boxShadow="sm"
      >
        <Tooltip label="เพิ่มข้อมูลใหม่" fontSize="xs" hasArrow placement="top">
          <IconButton
            aria-label="เพิ่มข้อมูล"
            icon={<FaPlus />}
            colorScheme="teal"
            variant="ghost"
            borderRadius="full"
            size="md"
            _hover={{ bg: "teal.100", color: "teal.600", transform: "scale(1.08)" }}
            onClick={onAddData}
          />
        </Tooltip>
        <Tooltip label="ดูใบแจ้งค่าใช้จ่าย" fontSize="xs" hasArrow placement="top">
          <IconButton
            aria-label="ดูใบแจ้งค่าใช้จ่าย"
            icon={<FaFileInvoice />}
            colorScheme="blue"
            variant="ghost"
            borderRadius="full"
            size="md"
            _hover={{ bg: "blue.50", color: "blue.600", transform: "scale(1.08)" }}
            onClick={onViewBill}
          />
        </Tooltip>
        {onSettings && (
          <Tooltip label="ตั้งค่าห้อง" fontSize="xs" hasArrow placement="top">
            <IconButton
              aria-label="ตั้งค่าห้อง"
              icon={<FaCog />}
              size="md"
              colorScheme="gray"
              variant="ghost"
              borderRadius="full"
              _hover={{ bg: "gray.200", color: "gray.700", transform: "scale(1.08)" }}
              onClick={onSettings}
            />
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip label="ลบห้องนี้" fontSize="xs" hasArrow placement="top">
            <IconButton
              aria-label="ลบการ์ด"
              icon={<FaTrash />}
              size="md"
              colorScheme="red"
              variant="ghost"
              borderRadius="full"
              _hover={{ bg: "red.100", color: "red.600", transform: "scale(1.08)" }}
              onClick={onDelete}
            />
          </Tooltip>
        )}
      </Flex>
    </Box>
  );
} 