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
  gridProps?: any;
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
      borderRadius="2xl"
      boxShadow="md"
      border="1px solid"
      borderColor="gray.100"
      p={6}
      mb={6}
      w="100%"
      minW="320px"
      maxW="360px"
      display="flex"
      flexDirection="column"
      gap={5}
      transition="all 0.2s"
      zIndex={1}
      _hover={{
        boxShadow: "xl",
        transform: "scale(1.02)",
        zIndex: 10,
        borderColor: status === 'unpaid' ? 'red.200' : 'orange.200',
        bg: status === 'unpaid' ? 'red.50' : 'orange.50',
      }}
    >
      {/* Header Section */}
      <Flex align="center" gap={4} mb={2}>
        <Avatar icon={<FaDoorOpen />} bg="blue.100" color="blue.600" size="md" />
        <Box>
          <Text fontWeight="bold" fontSize="xl" color="gray.800">{roomType} {id}</Text>
          <Text fontWeight="semibold" fontSize="md" color={statusInfo.color}>{statusInfo.label}</Text>
        </Box>
      </Flex>
      <Box mb={2}>
        <Text fontSize="md" color="gray.600" noOfLines={1} isTruncated>{tenantName}</Text>
        <Flex gap={6} mt={2}>
          <Box>
            <Text fontSize="sm" color="gray.500">ครบกำหนด</Text>
            <Text fontWeight="medium" color="gray.700" fontSize="md">{dueDate}</Text>
          </Box>
          <Box>
            <Text fontSize="sm" color="gray.500">มิเตอร์ล่าสุด</Text>
            <Text fontWeight="medium" color="gray.700" fontSize="md">{lastReading}</Text>
          </Box>
        </Flex>
      </Box>
      <Flex align="center" gap={8} mt={2} mb={2}>
        <Box>
          <Text fontSize="md" color="gray.500">ไฟฟ้า</Text>
          <Text fontWeight="bold" color="yellow.600" fontSize="lg">฿{safeElectricity.toLocaleString()}</Text>
        </Box>
        <Box>
          <Text fontSize="md" color="gray.500">น้ำ</Text>
          <Text fontWeight="bold" color="blue.600" fontSize="lg">฿{safeWater.toLocaleString()}</Text>
        </Box>
        <Box>
          <Text fontSize="md" color="gray.500">ค่าเช่า</Text>
          <Text fontWeight="bold" color="gray.700" fontSize="lg">฿{safeRent.toLocaleString()}</Text>
        </Box>
      </Flex>
      <Box bg={status === 'unpaid' ? 'red.50' : 'orange.50'} p={4} borderRadius="lg" mb={2}>
        <Flex align="center" justify="space-between">
          <Flex align="center" gap={2}>
            <FaExclamationTriangle color={statusInfo.color} size={18} />
            <Text fontWeight="bold" color="gray.800" fontSize="lg">รวมทั้งหมด</Text>
          </Flex>
          <Text fontWeight="bold" color={statusInfo.color} fontSize="2xl">฿{safeTotal.toLocaleString()}</Text>
        </Flex>
      </Box>
      <Button
        colorScheme={status === 'pending' ? 'orange' : 'red'}
        variant="solid"
        borderRadius="lg"
        w="full"
        fontWeight="bold"
        size="lg"
        fontSize="lg"
        py={6}
        onClick={e => { e.stopPropagation(); onNotify(); }}
        _hover={{ transform: "translateY(-1px)" }}
        transition="all 0.2s"
      >
        {status === 'pending' ? 'แจ้งเตือนชำระเงิน' : 'แจ้งเตือนค้างชำระ'}
      </Button>
    </Box>
  );
}

export default function RoomPaymentCardList({ rooms = [], itemsPerPage = 4, gridProps = {} }: RoomPaymentCardListProps) {
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
    <Box w="100%">
      <SimpleGrid
        columns={{ base: 1, sm: 2, md: 3, lg: 4 }}
        spacing={6}
        mb={6}
        w="full"
        maxW="unset"
        justifyItems="center"
        {...gridProps}
      >
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