import { Box, Flex, Text, Badge, Button, Divider, Icon, Tooltip, IconButton, Spacer, Progress, Avatar } from "@chakra-ui/react";
import { FaChevronRight, FaDoorOpen, FaPlus, FaUser, FaCalendarAlt, FaFileInvoice, FaTrash, FaCog, FaUpload, FaCheckCircle, FaEye } from "react-icons/fa";
import { motion } from "framer-motion";

interface RoomCardProps {
  id: string;
  tenantName: string;
  tenantEmail?: string | null;
  area: number;
  latestTotal: number;
  currentMonthTotal?: number; // Make it optional for backward compatibility
  electricity: number;
  water: number;
  rent: number;
  service: number;
  overdueDays: number;
  dueDate?: string;
  billStatus?: string;
  role?: string | null;
  onViewBill?: () => void;
  onAddData?: () => void;
  onDelete?: () => void;
  onSettings?: () => void;
  onUploadProof?: () => void;
  onViewProof?: (slipUrl: string) => void;
  onMarkAsPaid?: () => void;
  onDeleteProof?: () => void;
  slipUrl?: string;
}

const statusMap = {
  paid: { color: "green", label: "PAID", bg: "green.100", text: "green.700" },
  unpaid: { color: "red", label: "UNPAID", bg: "red.100", text: "red.700" },
  pending: { color: "orange", label: "PENDING", bg: "orange.100", text: "orange.700" },
  complete: { color: "green", label: "COMPLETE", bg: "green.100", text: "green.700" },
};

const MotionBox = motion(Box);

export default function RoomCard({ id, tenantName, tenantEmail, area, latestTotal, currentMonthTotal, electricity, water, rent, service, overdueDays, dueDate, billStatus = "paid", role, slipUrl, onViewBill, onAddData, onDelete, onSettings, onUploadProof, onViewProof, onMarkAsPaid, onDeleteProof }: RoomCardProps) {
  const isOccupied = tenantEmail && tenantEmail.trim() !== "";
  const status = isOccupied ? "occupied" : "vacant";
  const statusInfo = statusMap[billStatus] || statusMap.paid;
  const broughtForward = latestTotal - (currentMonthTotal || 0);
  // For demo: fake avatar url and last updated
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(tenantName || 'U')}&background=0D8ABC&color=fff&size=64`;
  const lastUpdated = '12 มิ.ย. 2024';
  // Progress bar: days left until due (assume 30 days cycle)
  let daysLeft = 0;
  if (dueDate) {
    // Try to parse dueDate as DD/MM/YYYY or YYYY-MM-DD
    let due = new Date(dueDate);
    if (isNaN(due.getTime()) && /\d{2}\/\d{2}\/\d{4}/.test(dueDate)) {
      const [d, m, y] = dueDate.split('/');
      due = new Date(`${y}-${m}-${d}`);
    }
    const now = new Date();
    daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
  // Note message
  let note = '';
  if (billStatus === 'unpaid' && overdueDays > 30) note = 'ค้างชำระนาน กรุณาติดต่อเจ้าหน้าที่';
  else if (billStatus === 'pending') note = 'รอการตรวจสอบสลิป';
  else if (billStatus === 'paid') note = 'ไม่มีค้างชำระ';
  else if (daysLeft > 0) note = `เหลืออีก ${daysLeft} วันถึงกำหนดจ่าย`;
  else if (daysLeft === 0) note = 'ครบกำหนดวันนี้';
  else if (daysLeft < 0) note = `เลยกำหนด ${Math.abs(daysLeft)} วัน`;

  return (
    <MotionBox
      bg="white"
      borderRadius="2xl"
      border="2.5px solid"
      borderColor={status === "occupied" ? "blue.100" : "gray.100"}
      boxShadow="0 4px 24px 0 rgba(33,150,243,0.18), 0 1.5px 8px 0 rgba(0,0,0,0.08)"
      minW="340px"
      maxW="340px"
      w="340px"
      h="500px"
      borderWidth="2px"
      borderStyle="solid"
      borderColor="white"
      display="flex"
      flexDirection="column"
      overflow="hidden"
      position="relative"
      m={0}
      whileHover={{ scale: 1.045, boxShadow: "0 12px 48px 0 rgba(33,150,243,0.28), 0 2px 12px 0 rgba(0,0,0,0.12)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Top Accent Bar */}
      <Box w="full" h="10px" bg={status === "occupied" ? "blue.400" : "gray.300"} position="absolute" top={0} left={0} zIndex={2} />
      {/* Watermark Icon */}
      <Icon as={FaFileInvoice} color="blue.100" boxSize={32} position="absolute" top={-8} right={-8} zIndex={0} opacity={0.10} pointerEvents="none" />
      {/* Header Section */}
      <Box bg="blue.50" px={4} pt={5} pb={2} borderBottom="1px solid" borderColor="blue.100" zIndex={1}>
        <Flex align="center" justify="space-between">
          <Flex align="center" gap={2}>
            <Icon as={FaDoorOpen} color="blue.400" boxSize={5} />
            <Text fontWeight="extrabold" fontSize="xl" color="blue.700">Room {id}</Text>
          </Flex>
          <Badge colorScheme={status === "occupied" ? "green" : "gray"} borderRadius="full" px={2} fontSize="sm" bg={status === "occupied" ? "green.100" : "gray.100"} color={status === "occupied" ? "green.700" : "gray.600"}>
            {status === "occupied" ? "มีคนอยู่" : "ว่าง"}
          </Badge>
        </Flex>
        <Flex align="center" gap={2} mt={1}>
          <Avatar src={avatarUrl} size="sm" name={tenantName} mr={1} />
          <Icon as={FaUser} color="gray.400" boxSize={4} />
          <Text color="gray.700" fontSize="md" noOfLines={1} fontWeight="semibold">{tenantName || "-"}</Text>
          <Divider orientation="vertical" h={3} mx={2} borderColor="gray.200" />
          <Icon as={FaCalendarAlt} color="gray.400" boxSize={4} />
          <Text color="gray.500" fontSize="sm">{area} ตร.ม.</Text>
        </Flex>
        <Flex align="center" gap={2} mt={1}>
          {dueDate && <Text color="blue.500" fontSize="sm">ครบกำหนด: {dueDate}</Text>}
          {overdueDays > 0 && (
            <Badge colorScheme="red" borderRadius="full" px={2} fontSize="sm">เกินกำหนด {overdueDays} วัน</Badge>
          )}
        </Flex>
      </Box>
      {/* Bill Status Section */}
      <Box px={4} py={2} bg="white" borderBottom="1px solid" borderColor="gray.100" zIndex={1}>
        <Flex align="center" gap={2}>
          <Badge bg={statusInfo.bg} color={statusInfo.text} borderRadius="full" fontSize="xs" px={2}>{statusInfo.label}</Badge>
          {overdueDays > 30 && billStatus === 'unpaid' && (
            <Badge colorScheme="red" borderRadius="full" px={2} fontSize="xs">ค้างชำระ &gt; 30 วัน</Badge>
          )}
        </Flex>
      </Box>
      {/* Progress Bar Section */}
      <Box px={4} pt={2} pb={0}>
        <Progress value={daysLeft > 0 ? 30 - daysLeft : 30} max={30} size="sm" colorScheme={daysLeft < 0 ? "red" : "blue"} borderRadius="md" />
      </Box>
      {/* Total Section */}
      <Box bg="blue.50" borderRadius="lg" py={2} px={4} mx={4} my={2} boxShadow="sm" zIndex={1}>
        <Text color="blue.800" fontWeight="extrabold" fontSize="3xl" textAlign="center">฿{latestTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Text>
        {broughtForward > 0 && (
          <Tooltip label={`ยอดเดือนนี้: ฿${(currentMonthTotal || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} + ยอดยกมา: ฿${broughtForward.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`}>
            <Text color="gray.500" fontSize="sm" textAlign="center" mt={0}>
              (เดือนนี้: ฿{(currentMonthTotal || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })})
            </Text>
          </Tooltip>
        )}
      </Box>
      {/* Details Section */}
      <Box px={4} py={2} bg="gray.50" borderRadius="md" mx={4} mb={2} zIndex={1}>
        <Flex align="center" justify="space-between" mb={1}>
          <Tooltip label="ค่าไฟฟ้า" fontSize="sm"><Text color="gray.600" fontSize="md">ไฟ: <b>฿{electricity.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</b></Text></Tooltip>
          <Tooltip label="ค่าน้ำ" fontSize="sm"><Text color="gray.600" fontSize="md">น้ำ: <b>฿{water.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</b></Text></Tooltip>
        </Flex>
        <Flex align="center" justify="space-between">
          <Tooltip label="ค่าเช่า" fontSize="sm"><Text color="gray.600" fontSize="md">เช่า: <b>฿{rent.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</b></Text></Tooltip>
          <Tooltip label="ค่าบริการ" fontSize="sm"><Text color="gray.600" fontSize="md">บริการ: <b>฿{service.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</b></Text></Tooltip>
        </Flex>
      </Box>
      {/* Note/Status Message */}
      <Box px={4} pb={1}>
        <Text color={note.includes('ค้างชำระ') ? 'red.500' : note.includes('รอการตรวจสอบ') ? 'orange.500' : 'gray.600'} fontSize="md" textAlign="center" fontWeight="semibold">{note}</Text>
      </Box>
      {/* Actions Section */}
      <Flex align="center" justify="space-evenly" gap={4} w="full" px={4} pb={2}>
        {role === 'user' ? (
          <Flex direction="column" w="full" gap={1}>
            {billStatus === 'unpaid' && (
              <Button leftIcon={<FaUpload />} colorScheme="green" variant="solid" size="sm" w="full" borderRadius="lg" boxShadow="sm" _hover={{ transform: "translateY(-2px)", boxShadow: "md" }} onClick={onUploadProof}>อัปโหลดสลิป</Button>
            )}
            {billStatus === 'pending' && (
              <Flex direction="column" w="full" gap={1}>
                <Button leftIcon={<FaEye />} colorScheme="orange" variant="solid" size="sm" w="full" borderRadius="lg" onClick={() => onViewProof && slipUrl && onViewProof(slipUrl)} isDisabled={!slipUrl}>ดูสลิป</Button>
                <Button leftIcon={<FaTrash />} colorScheme="red" variant="outline" size="xs" w="full" borderRadius="lg" onClick={onDeleteProof}>ลบสลิป</Button>
              </Flex>
            )}
            <Button leftIcon={<FaFileInvoice />} colorScheme="blue" variant="outline" size="xs" w="full" borderRadius="lg" onClick={onViewBill}>ดูใบแจ้งหนี้</Button>
          </Flex>
        ) : (
          <Flex gap={4} w="full" justify="center">
            {billStatus === 'pending' && (role === 'admin' || role === 'owner') ? (
              <Flex direction="column" w="full" gap={1}>
                <Button leftIcon={<FaEye />} colorScheme="orange" variant="solid" size="sm" w="full" borderRadius="lg" onClick={() => onViewProof && slipUrl && onViewProof(slipUrl)} isDisabled={!slipUrl}>ดูสลิป</Button>
                <Button leftIcon={<FaCheckCircle />} colorScheme="green" variant="solid" size="sm" w="full" borderRadius="lg" onClick={onMarkAsPaid}>ยืนยันรับเงิน</Button>
              </Flex>
            ) : (
              <>
                <Flex direction="column" align="center" gap={1} mx={1.5} minW="64px">
                  <Tooltip label="เพิ่มข้อมูลใหม่" fontSize="xs" hasArrow placement="top">
                    <IconButton aria-label="เพิ่มข้อมูล" icon={<FaPlus fontSize="1.5rem" />} colorScheme="teal" variant="ghost" borderRadius="lg" size="md" w="48px" h="48px" _hover={{ bg: "teal.100", color: "teal.600", transform: "scale(1.08)", borderRadius: "lg" }} onClick={onAddData} />
                  </Tooltip>
                  <Text fontSize="sm" color="gray.800" fontWeight="medium">เพิ่ม</Text>
                </Flex>
                <Flex direction="column" align="center" gap={1} mx={1.5} minW="64px">
                  <Tooltip label="ดูใบแจ้งค่าใช้จ่าย" fontSize="xs" hasArrow placement="top">
                    <IconButton aria-label="ดูใบแจ้งค่าใช้จ่าย" icon={<FaFileInvoice fontSize="1.5rem" />} colorScheme="blue" variant="ghost" borderRadius="lg" size="md" w="48px" h="48px" _hover={{ bg: "blue.50", color: "blue.600", transform: "scale(1.08)", borderRadius: "lg" }} onClick={onViewBill} />
                  </Tooltip>
                  <Text fontSize="sm" color="gray.800" fontWeight="medium">บิล</Text>
                </Flex>
                {onSettings && (
                  <Flex direction="column" align="center" gap={1} mx={1.5} minW="64px">
                    <Tooltip label="ตั้งค่าห้อง" fontSize="xs" hasArrow placement="top">
                      <IconButton aria-label="ตั้งค่าห้อง" icon={<FaCog fontSize="1.5rem" />} size="md" colorScheme="gray" variant="ghost" borderRadius="lg" w="48px" h="48px" _hover={{ bg: "gray.200", color: "gray.700", transform: "scale(1.08)", borderRadius: "lg" }} onClick={onSettings} />
                    </Tooltip>
                    <Text fontSize="sm" color="gray.800" fontWeight="medium">ตั้งค่า</Text>
                  </Flex>
                )}
                {onDelete && (
                  <Flex direction="column" align="center" gap={1} mx={1.5} minW="64px">
                    <Tooltip label="ลบห้องนี้" fontSize="xs" hasArrow placement="top">
                      <IconButton aria-label="ลบห้องนี้" icon={<FaTrash fontSize="1.5rem" />} size="md" colorScheme="red" variant="ghost" borderRadius="lg" w="48px" h="48px" _hover={{ bg: "red.100", color: "red.700", transform: "scale(1.08)", borderRadius: "lg" }} onClick={onDelete} />
                    </Tooltip>
                    <Text fontSize="sm" color="gray.800" fontWeight="medium">ลบ</Text>
                  </Flex>
                )}
              </>
            )}
          </Flex>
        )}
      </Flex>
      {/* Last Updated Section */}
      <Box px={4} pb={2}>
        <Text color="gray.400" fontSize="xs" textAlign="right">อัปเดตล่าสุด: {lastUpdated}</Text>
      </Box>
    </MotionBox>
  );
} 