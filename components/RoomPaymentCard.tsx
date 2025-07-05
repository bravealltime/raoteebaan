import { Box, Flex, Text, Badge, Button, Avatar } from "@chakra-ui/react";
import { FaDoorOpen } from "react-icons/fa";

interface RoomPaymentCardProps {
  id: string;
  status: "pending" | "unpaid";
  total: number;
  electricity: number;
  water: number;
  rent: number;
  onNotify: () => void;
}

const statusMap = {
  pending: { label: "Pending", color: "orange.500" },
  unpaid: { label: "Unpaid", color: "red.500" },
};

export default function RoomPaymentCard({ id, status, total, electricity, water, rent, onNotify }: RoomPaymentCardProps) {
  const statusInfo = statusMap[status];
  return (
    <Box
      bg="white"
      borderRadius="2xl"
      boxShadow="sm"
      p={6}
      mb={4}
      w="100%"
      maxW="420px"
      mx="auto"
      display="flex"
      flexDirection="column"
      gap={3}
    >
      <Flex align="center" gap={4} mb={2}>
        <Avatar icon={<FaDoorOpen />} bg="blue.100" color="blue.600" size="md" />
        <Box>
          <Flex align="center" gap={3}>
            <Text fontWeight="bold" fontSize="lg" color="gray.700">Room {id}</Text>
            <Text fontWeight="bold" fontSize="md" color={statusInfo.color}>{statusInfo.label}</Text>
          </Flex>
        </Box>
      </Flex>
      <Flex align="center" gap={6} mt={2} mb={2}>
        <Box>
          <Text fontSize="sm" color="gray.500">Electric bill</Text>
          <Text fontWeight="bold" color="yellow.500">{electricity}</Text>
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.500">Water bill</Text>
          <Text fontWeight="bold" color="blue.400">{water}</Text>
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.500">Room bill</Text>
          <Text fontWeight="bold" color="gray.700">{rent}</Text>
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.500">Total</Text>
          <Text fontWeight="bold" color="red.500">{total}</Text>
        </Box>
      </Flex>
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