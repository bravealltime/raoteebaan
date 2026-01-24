import { Box, Flex, Text, Badge, Icon, Avatar, IconButton, Tooltip, HStack } from "@chakra-ui/react";
import { FaDoorOpen, FaFileInvoice, FaCog, FaTrash, FaUpload, FaEye, FaCheckCircle, FaPlus } from "react-icons/fa";

interface RoomCardProps {
  id: string;
  tenantName: string;
  latestTotal: number;
  billStatus: "paid" | "unpaid" | "pending";
  isOccupied: boolean;
  onViewDetails: () => void;
  onDelete?: () => void;
  onViewBill?: () => void;
  onAddData?: () => void;
  onSettings?: () => void;
  onUploadProof?: () => void;
  onViewProof?: (url: string) => void;
  onMarkAsPaid?: () => void;
  onDeleteProof?: () => void;
  slipUrl?: string;
  role?: string | null;
}

export default function RoomCard({
  id,
  tenantName,
  latestTotal,
  billStatus,
  isOccupied,
  onViewDetails,
  onDelete,
  onViewBill,
  onAddData,
  onSettings,
  onUploadProof,
  onViewProof,
  onMarkAsPaid,
  onDeleteProof,
  slipUrl,
  role,
}: RoomCardProps) {

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent calling onViewDetails when a button is clicked
    if ((e.target as HTMLElement).closest('button')) {
      e.stopPropagation();
      return;
    }
    onViewDetails();
  };

  const statusInfo = {
    paid: { label: "ชำระแล้ว", color: "green.500", bg: "green.50" },
    unpaid: { label: "ค้างชำระ", color: "red.500", bg: "red.50" },
    pending: { label: "รอตรวจสอบ", color: "orange.500", bg: "orange.50" },
  };

  const currentStatus = (!isOccupied || latestTotal === 0) ? statusInfo.paid : (statusInfo[billStatus] || statusInfo.paid);

  return (
    <Box
      onClick={handleCardClick}
      bg="white"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.200"
      boxShadow="sm"
      cursor="pointer"
      transition="all 0.2s ease-in-out"
      _hover={{
        transform: "translateY(-4px)",
        boxShadow: "md",
      }}
      display="flex"
      flexDirection="column"
    >
      <Flex
        align="center"
        justify="space-between"
        p={4}
        bg={isOccupied ? "blue.50" : "gray.50"}
        borderTopRadius="xl"
      >
        <Flex align="center" gap={2}>
          <Icon as={FaDoorOpen} color={isOccupied ? "blue.600" : "gray.500"} />
          <Text fontWeight="bold" fontSize="lg" color={isOccupied ? "blue.800" : "gray.700"}>
            ห้อง {id}
          </Text>
        </Flex>
        <Badge colorScheme={isOccupied ? "teal" : "gray"} variant="subtle">
          {isOccupied ? "มีผู้เช่า" : "ว่าง"}
        </Badge>
      </Flex>

      <Flex
        direction="column"
        align="center"
        justify="center"
        p={6}
        minH="180px"
        flexGrow={1}
      >
        <Avatar
          size="lg"
          name={tenantName}
          mb={3}
          bg="blue.100"
          color="blue.600"
        />
        <Text fontWeight="semibold" fontSize="xl" color="gray.800" textAlign="center" noOfLines={1}>
          {isOccupied ? tenantName : `ห้องว่าง ${id}`}
        </Text>
        <Text fontSize="md" color="gray.500">
          {isOccupied ? "ผู้เช่าปัจจุบัน" : "ไม่มีผู้เช่า"}
        </Text>
      </Flex>

      <Flex
        direction="column"
        align="center"
        justify="center"
        p={4}
        bg={currentStatus.bg}
      >
        <Text fontSize="sm" color="gray.600" mb={1}>
          ยอดชำระล่าสุด
        </Text>
        <Text fontWeight="bold" fontSize="2xl" color={currentStatus.color}>
          ฿{latestTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
        </Text>
        <Badge mt={2} px={3} py={1} borderRadius="full" color={currentStatus.color} bg="white" fontWeight="bold">
          {currentStatus.label}
        </Badge>
      </Flex>

      <Flex
        align="center"
        justify="space-evenly"
        p={2}
        borderTopWidth="1px"
        borderColor="gray.200"
        borderBottomRadius="xl"
      >
        {role === 'user' ? (
          <HStack spacing={2}>
            {billStatus === 'unpaid' && (
              <Tooltip label="อัปโหลดสลิป" fontSize="xs" hasArrow>
                <IconButton aria-label="อัปโหลดสลิป" icon={<FaUpload />} onClick={onUploadProof} variant="ghost" colorScheme="green" />
              </Tooltip>
            )}
            {billStatus === 'pending' && slipUrl && (
              <Tooltip label="ดูสลิป" fontSize="xs" hasArrow>
                <IconButton aria-label="ดูสลิป" icon={<FaEye />} onClick={() => onViewProof && onViewProof(slipUrl)} variant="ghost" colorScheme="orange" />
              </Tooltip>
            )}
            <Tooltip label="ดูใบแจ้งหนี้" fontSize="xs" hasArrow>
              <IconButton aria-label="ดูใบแจ้งหนี้" icon={<FaFileInvoice />} onClick={onViewBill} variant="ghost" colorScheme="blue" />
            </Tooltip>
          </HStack>
        ) : (
          <HStack spacing={2}>
            <Tooltip label="เพิ่มข้อมูลมิเตอร์" fontSize="xs" hasArrow>
              <IconButton aria-label="เพิ่มข้อมูลมิเตอร์" icon={<FaPlus />} onClick={onAddData} variant="ghost" colorScheme="teal" />
            </Tooltip>
            <Tooltip label="ดูใบแจ้งค่าใช้จ่าย" fontSize="xs" hasArrow>
              <IconButton aria-label="ดูใบแจ้งค่าใช้จ่าย" icon={<FaFileInvoice />} onClick={onViewBill} variant="ghost" colorScheme="blue" />
            </Tooltip>
            {billStatus === 'pending' && slipUrl && (
              <Tooltip label="ตรวจสอบสลิป" fontSize="xs" hasArrow>
                <IconButton aria-label="ตรวจสอบสลิป" icon={<FaEye />} onClick={() => onViewProof && onViewProof(slipUrl)} variant="ghost" colorScheme="orange" />
              </Tooltip>
            )}
            {billStatus === 'pending' && (
              <Tooltip label="ยืนยันการชำระเงิน" fontSize="xs" hasArrow>
                <IconButton aria-label="ยืนยันการชำระเงิน" icon={<FaCheckCircle />} onClick={onMarkAsPaid} variant="ghost" colorScheme="green" />
              </Tooltip>
            )}
            {billStatus === 'pending' && (
              <Tooltip label="ลบสลิป" fontSize="xs" hasArrow>
                <IconButton aria-label="ลบสลิป" icon={<FaTrash />} onClick={onDeleteProof} variant="ghost" colorScheme="red" />
              </Tooltip>
            )}
            <Tooltip label="ตั้งค่าห้อง" fontSize="xs" hasArrow>
              <IconButton aria-label="ตั้งค่าห้อง" icon={<FaCog />} onClick={onSettings} variant="ghost" colorScheme="gray" />
            </Tooltip>
            <Tooltip label="ลบห้องนี้" fontSize="xs" hasArrow>
              <IconButton aria-label="ลบห้องนี้" icon={<FaTrash />} onClick={onDelete} variant="ghost" colorScheme="red" />
            </Tooltip>
          </HStack>
        )}
      </Flex>
    </Box>
  );
}