import { Box, Flex, Text, Badge, Button, Avatar, HStack, VStack, SimpleGrid, ButtonGroup, IconButton } from "@chakra-ui/react";
import { FaDoorOpen, FaUser, FaCalendarAlt, FaExclamationTriangle, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useState, useMemo } from "react";
import { useRouter } from "next/router";

// Export interfaces for external use
export interface RoomPaymentCardProps {
  id: string;
  status: "pending" | "unpaid" | "review" | "paid";
  total: number;
  electricity: number;
  water: number;
  rent: number;
  onNotify: () => void;
  onReview?: () => void;
  onRevert?: () => void;
  onConfirmPayment?: () => void;
  tenantName?: string;
  dueDate?: string;
  lastReading?: string;
  roomType?: string;
}

export interface RoomPaymentCardListProps {
  rooms: RoomPaymentCardProps[];
  itemsPerPage?: number;
  gridProps?: any;
}

const statusMap = {
  pending: { label: "รอชำระ", color: "orange.500", bg: "orange.50" },
  unpaid: { label: "ค้างชำงระ", color: "red.500", bg: "red.50" },
  review: { label: "รอตรวจสอบ", color: "yellow.600", bg: "yellow.50" },
  paid: { label: "ชำระแล้ว", color: "green.500", bg: "green.50" },
};

export function RoomPaymentCard({
  id,
  status,
  total,
  electricity,
  water,
  rent,
  onNotify,
  onReview,
  onRevert,
  onConfirmPayment,
  tenantName = "ไม่มีผู้เช่า",
  dueDate = "ไม่ระบุ",
  lastReading = "ไม่ระบุ",
  roomType = "ห้องพัก"
}: RoomPaymentCardProps) {
  const router = useRouter();
  const statusInfo = statusMap[status] || statusMap['unpaid'];

  // Ensure all numeric values are numbers with defaults
  const safeTotal = typeof total === 'number' ? total : 0;
  const safeElectricity = typeof electricity === 'number' ? electricity : 0;
  const safeWater = typeof water === 'number' ? water : 0;
  const safeRent = typeof rent === 'number' ? rent : 0;

  return (
    <Box
      bg="white"
      borderRadius="xl"
      boxShadow="sm"
      border="1px solid"
      borderColor="gray.100"
      p={3}
      w="100%"
      h="100%"
      display="flex"
      flexDirection="column"
      gap={2}
      transition="all 0.2s"
      zIndex={1}
      _hover={{
        boxShadow: "md",
        transform: "scale(1.01)",
        zIndex: 10,
        borderColor: status === 'unpaid' ? 'red.200' : status === 'review' ? 'yellow.200' : 'orange.200',
        bg: status === 'unpaid' ? 'red.50' : status === 'review' ? 'yellow.50' : 'orange.50',
      }}
    >
      {/* Header Section */}
      <Flex align="center" gap={3} mb={1}>
        <Avatar icon={<FaDoorOpen />} bg="blue.100" color="blue.600" size="sm" />
        <Box>
          <Text fontWeight="bold" fontSize="md" color="gray.800" lineHeight="1.2">{roomType} {id}</Text>
          <Badge colorScheme={statusInfo.color.split('.')[0]} fontSize="xs">{statusInfo.label}</Badge>
        </Box>
      </Flex>
      <Box mb={1}>
        <Text fontSize="sm" color="gray.600" noOfLines={1} isTruncated fontWeight="medium">{tenantName}</Text>
        <Flex gap={4} mt={1}>
          <Box>
            <Text fontSize="xs" color="gray.500">ครบกำหนด</Text>
            <Text fontWeight="medium" color="gray.700" fontSize="xs">{dueDate}</Text>
          </Box>
          <Box>
            <Text fontSize="xs" color="gray.500">มิเตอร์ล่าสุด</Text>
            <Text fontWeight="medium" color="gray.700" fontSize="xs">{lastReading}</Text>
          </Box>
        </Flex>
      </Box>
      <Flex align="center" justify="space-between" mt={1} mb={1} px={1}>
        <Box textAlign="center">
          <Text fontSize="xs" color="gray.500">ไฟฟ้า</Text>
          <Text fontWeight="bold" color="yellow.600" fontSize="sm">฿{safeElectricity.toLocaleString()}</Text>
        </Box>
        <Box textAlign="center">
          <Text fontSize="xs" color="gray.500">น้ำ</Text>
          <Text fontWeight="bold" color="blue.600" fontSize="sm">฿{safeWater.toLocaleString()}</Text>
        </Box>
        <Box textAlign="center">
          <Text fontSize="xs" color="gray.500">ค่าเช่า</Text>
          <Text fontWeight="bold" color="gray.700" fontSize="sm">฿{safeRent.toLocaleString()}</Text>
        </Box>
      </Flex>
      <Box bg={statusInfo.bg} p={2} borderRadius="md" mb={1}>
        <Flex align="center" justify="space-between">
          <Flex align="center" gap={1}>
            <FaExclamationTriangle color={statusInfo.color} size={14} />
            <Text fontWeight="bold" color="gray.800" fontSize="sm">รวม</Text>
          </Flex>
          <Text fontWeight="bold" color={statusInfo.color} fontSize="lg">฿{safeTotal.toLocaleString()}</Text>
        </Flex>
      </Box>
      {status === 'review' ? (
        <Flex gap={3} direction="column">
          <Button
            colorScheme="yellow"
            variant="solid"
            borderRadius="lg"
            w="full"
            fontWeight="bold"
            size="lg"
            fontSize="lg"
            py={6}
            onClick={e => {
              e.stopPropagation();
              if (onReview) {
                onReview();
              }
            }}
            _hover={{ transform: "translateY(-1px)" }}
            transition="all 0.2s"
          >
            ตรวจสอบสลิป
          </Button>
          <Flex gap={2}>
            <Button
              colorScheme="green"
              variant="solid"
              borderRadius="lg"
              flex={1}
              fontWeight="bold"
              size="md"
              fontSize="md"
              py={4}
              onClick={e => {
                e.stopPropagation();
                if (onConfirmPayment) {
                  onConfirmPayment();
                }
              }}
              _hover={{ transform: "translateY(-1px)" }}
              transition="all 0.2s"
            >
              ยืนยันชำระ
            </Button>
            <Button
              colorScheme="gray"
              variant="outline"
              borderRadius="lg"
              flex={1}
              fontWeight="bold"
              size="md"
              fontSize="md"
              py={4}
              onClick={e => {
                e.stopPropagation();
                if (onRevert) {
                  onRevert();
                }
              }}
              _hover={{ transform: "translateY(-1px)", bg: "gray.50" }}
              transition="all 0.2s"
            >
              ย้อนกลับ
            </Button>
          </Flex>
        </Flex>
      ) : status === 'paid' ? (
        <Button
          colorScheme="green"
          variant="solid"
          borderRadius="lg"
          w="full"
          fontWeight="bold"
          size="lg"
          fontSize="lg"
          py={6}
          isDisabled
        >
          ชำระแล้ว
        </Button>
      ) : (
        <Button
          colorScheme={status === 'pending' ? 'orange' : 'red'}
          variant="solid"
          borderRadius="lg"
          w="full"
          fontWeight="bold"
          size="lg"
          fontSize="lg"
          py={6}
          onClick={e => {
            e.stopPropagation();
            onNotify();
          }}
          _hover={{ transform: "translateY(-1px)" }}
          transition="all 0.2s"
        >
          {status === 'pending' ? 'แจ้งเตือนชำระเงิน' : 'แจ้งเตือนค้างชำระ'}
        </Button>
      )}
    </Box>
  );
}

export default function RoomPaymentCardList({ rooms = [], itemsPerPage = 4, gridProps = {} }: RoomPaymentCardListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const totalPages = Math.ceil(safeRooms.length / itemsPerPage);

  const currentRooms = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return safeRooms.slice(startIndex, endIndex);
  }, [safeRooms, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (safeRooms.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="gray.500" fontSize="lg">ไม่มีข้อมูลห้องพัก</Text>
      </Box>
    );
  }

  return (
    <Box w="100%">
      <SimpleGrid {...gridProps}>
        {currentRooms.map((room) => (
          <RoomPaymentCard key={room.id} {...room} />
        ))}
      </SimpleGrid>

      {/* Pagination */}
      {totalPages > 1 && (
        <Flex justify="center" align="center" gap={2} mt={8}>
          <ButtonGroup size="sm" isAttached variant="outline">
            <IconButton
              aria-label="Previous page"
              icon={<FaChevronLeft />}
              onClick={() => handlePageChange(currentPage - 1)}
              isDisabled={currentPage === 1}
              colorScheme="blue"
            />

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                onClick={() => handlePageChange(page)}
                colorScheme={currentPage === page ? "blue" : "gray"}
                variant={currentPage === page ? "solid" : "outline"}
                minW="40px"
              >
                {page}
              </Button>
            ))}

            <IconButton
              aria-label="Next page"
              icon={<FaChevronRight />}
              onClick={() => handlePageChange(currentPage + 1)}
              isDisabled={currentPage === totalPages}
              colorScheme="blue"
            />
          </ButtonGroup>
        </Flex>
      )}

      {/* Page Info */}
      {totalPages > 1 && (
        <Flex justify="center" mt={2}>
          <Text fontSize="sm" color="gray.600">
            แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, safeRooms.length)} จาก {safeRooms.length} ห้อง
          </Text>
        </Flex>
      )}
    </Box>
  );
} 