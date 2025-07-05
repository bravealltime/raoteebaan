import { Box, Flex, Text, Badge, Button } from "@chakra-ui/react";

interface RoomPaymentCardProps {
  id: string;
  status: "pending" | "unpaid";
  total: number;
  onClick?: () => void;
  onNotify: () => void;
}

const statusMap = {
  pending: { colorScheme: "orange", label: "PENDING" },
  unpaid: { colorScheme: "red", label: "UNPAID" },
};

export default function RoomPaymentCard({ id, status, total, onNotify }: RoomPaymentCardProps) {
  const statusInfo = statusMap[status];
  return (
    <Box
      bg="white"
      borderRadius="xl"
      boxShadow="sm"
      p={4}
      minW="240px"
      maxW="280px"
      w="full"
      minH="180px"
      display="flex"
      flexDirection="column"
      gap={3}
    >
      <Flex justify="space-between" align="center" mb={2}>
        <Text fontWeight="bold" color="blue.700" fontSize="lg">
          Room {id}
        </Text>
        <Badge colorScheme={statusInfo.colorScheme} borderRadius="full" fontSize="xs" px={2} py={1}>
          {statusInfo.label}
        </Badge>
      </Flex>
      <Box bg="blue.50" borderRadius="lg" py={3} px={2} my={1} boxShadow="xs">
        <Text color="blue.700" fontWeight="bold" fontSize="2xl" textAlign="center">
          ฿{total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
        </Text>
      </Box>
      <Button
        mt={2}
        colorScheme="orange"
        variant="solid"
        borderRadius="lg"
        w="full"
        fontWeight="bold"
        onClick={e => { e.stopPropagation(); onNotify(); }}
      >
        แจ้งเตือนชำระเงิน
      </Button>
    </Box>
  );
} 