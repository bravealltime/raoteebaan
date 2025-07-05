import { Box, Flex, Text, Badge, Button, Avatar, HStack, VStack, SimpleGrid, ButtonGroup, IconButton } from "@chakra-ui/react";
import { FaDoorOpen, FaUser, FaCalendarAlt, FaExclamationTriangle, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useState, useMemo } from "react";

// Export interfaces for external use
export interface RoomPaymentCardProps {
  id: string;
  status: "pending" | "unpaid";
  total: number;
  electricity: number;
  water: number;
  rent: number;
  onNotify: () => void;
  tenantName?: string;
  dueDate?: string;
  lastReading?: string;
  roomType?: string;
}

export interface RoomPaymentCardListProps {
  rooms: RoomPaymentCardProps[];
  itemsPerPage?: number;
}

const statusMap = {
  pending: { label: "รอชำระ", color: "orange.500", bg: "orange.50" },
  unpaid: { label: "ค้างชำระ", color: "red.500", bg: "red.50" },
};

export function RoomPaymentCard({ 
  id, 
  status, 
  total, 
  electricity, 
  water, 
  rent, 
  onNotify,
  tenantName = "ไม่มีผู้เช่า",
  dueDate = "ไม่ระบุ",
  lastReading = "ไม่ระบุ",
  roomType = "ห้องพัก"
}: RoomPaymentCardProps) {
  const statusInfo = statusMap[status] || statusMap['unpaid'];
  
  // Ensure all numeric values are numbers with defaults
  const safeTotal = typeof total === 'number' ? total : 0;
  const safeElectricity = typeof electricity === 'number' ? electricity : 0;
  const safeWater = typeof water === 'number' ? water : 0;
  const safeRent = typeof rent === 'number' ? rent : 0;
  
  return (
    <Box
      bg="white"
      borderRadius="md"
      boxShadow="sm"
      border="1px solid"
      borderColor="gray.100"
      p={3}
      mb={2}
      w="100%"
      maxW="280px"
      mx="auto"
      _hover={{ boxShadow: "md", transform: "translateY(-1px)" }}
      transition="all 0.2s"
    >
      {/* Ultra Compact Header */}
      <Flex justify="space-between" align="center" mb={2}>
        <Flex align="center" gap={1.5}>
          <Avatar icon={<FaDoorOpen />} bg="blue.100" color="blue.600" size="xs" />
          <VStack align="start" spacing={0}>
            <Text fontWeight="bold" fontSize="sm" color="gray.800">
              {roomType} {id}
            </Text>
            <Flex align="center" gap={0.5}>
              <FaUser size={8} color="#718096" />
              <Text fontSize="xs" color="gray.600" noOfLines={1} maxW="80px">{tenantName}</Text>
            </Flex>
          </VStack>
        </Flex>
        <Badge
          colorScheme={status === 'pending' ? 'orange' : 'red'}
          variant="subtle"
          px={1.5}
          py={0.5}
          borderRadius="full"
          fontSize="xs"
          fontWeight="semibold"
        >
          {statusInfo.label}
        </Badge>
      </Flex>

      {/* Ultra Compact Bill Details */}
      <VStack spacing={1.5} mb={2}>
        {/* Due Date & Meter */}
        <Flex justify="space-between" w="full" align="center" fontSize="xs" color="gray.500">
          <Flex align="center" gap={0.5}>
            <FaCalendarAlt size={8} />
            <Text>ครบกำหนด: {dueDate}</Text>
          </Flex>
          <Text>มิเตอร์: {lastReading}</Text>
        </Flex>
        
        {/* Bill Breakdown */}
        <HStack spacing={1} w="full" justify="space-between" bg="gray.50" p={1.5} borderRadius="sm">
          <VStack spacing={0} align="center" flex={1}>
            <Text fontSize="xs" color="gray.500">ไฟฟ้า</Text>
            <Text fontWeight="bold" color="yellow.600" fontSize="xs">
              ฿{safeElectricity.toLocaleString()}
            </Text>
          </VStack>
          <VStack spacing={0} align="center" flex={1}>
            <Text fontSize="xs" color="gray.500">น้ำ</Text>
            <Text fontWeight="bold" color="blue.600" fontSize="xs">
              ฿{safeWater.toLocaleString()}
            </Text>
          </VStack>
          <VStack spacing={0} align="center" flex={1}>
            <Text fontSize="xs" color="gray.500">ค่าเช่า</Text>
            <Text fontWeight="bold" color="gray.700" fontSize="xs">
              ฿{safeRent.toLocaleString()}
            </Text>
          </VStack>
        </HStack>

        {/* Total Section */}
        <Flex justify="space-between" align="center" w="full" bg={status === 'unpaid' ? 'red.50' : 'orange.50'} p={1.5} borderRadius="sm">
          <Flex align="center" gap={0.5}>
            <FaExclamationTriangle color={statusInfo.color} size={10} />
            <Text fontWeight="bold" color="gray.700" fontSize="xs">รวมทั้งหมด</Text>
          </Flex>
          <Text fontWeight="bold" color={statusInfo.color} fontSize="sm">
            ฿{safeTotal.toLocaleString()}
          </Text>
        </Flex>
      </VStack>

      {/* Action Button */}
      <Button
        colorScheme={status === 'pending' ? 'orange' : 'red'}
        variant="solid"
        borderRadius="sm"
        w="full"
        fontWeight="bold"
        size="xs"
        onClick={e => { e.stopPropagation(); onNotify(); }}
        _hover={{ transform: "translateY(-1px)" }}
        transition="all 0.2s"
      >
        {status === 'pending' ? 'แจ้งเตือนชำระเงิน' : 'แจ้งเตือนค้างชำระ'}
      </Button>
    </Box>
  );
}

export default function RoomPaymentCardList({ rooms = [], itemsPerPage = 4 }: RoomPaymentCardListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Ensure rooms is always an array
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const totalPages = Math.ceil(safeRooms.length / itemsPerPage);
  
  const currentRooms = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return safeRooms.slice(startIndex, endIndex);
  }, [safeRooms, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (safeRooms.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="gray.500" fontSize="lg">ไม่มีข้อมูลห้องพัก</Text>
      </Box>
    );
  }

  return (
    <Box>
      {/* Cards Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
        {currentRooms.map((room, index) => (
          <RoomPaymentCard key={`${room.id}-${index}`} {...room} />
        ))}
      </SimpleGrid>

      {/* Pagination */}
      {totalPages > 1 && (
        <Flex justify="center" align="center" gap={2} mt={4}>
          <ButtonGroup size="sm" isAttached variant="outline">
            <IconButton
              aria-label="Previous page"
              icon={<FaChevronLeft />}
              onClick={() => handlePageChange(currentPage - 1)}
              isDisabled={currentPage === 1}
              colorScheme="blue"
            />
            
            {/* Page Numbers */}
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
      <Flex justify="center" mt={2}>
        <Text fontSize="sm" color="gray.600">
          แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, safeRooms.length)} จาก {safeRooms.length} ห้อง
        </Text>
      </Flex>
    </Box>
  );
} 