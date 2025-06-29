import { Flex, Text, Icon, Box } from "@chakra-ui/react";
import { FaHotel, FaUserCheck, FaDoorOpen } from "react-icons/fa";

export default function RoomStatusBar({ total = 6, occupied = 6, vacant = 0 }) {
  return (
    <Flex align="center" bg="transparent" py={2} px={4} gap={6}>
      <Flex align="center">
        <Icon as={FaHotel} color="blue.400" boxSize={6} mr={2} />
        <Text fontWeight="bold" fontSize="xl">ห้องพัก</Text>
      </Flex>
      <Box borderLeft="1px solid #444" h="24px" mx={3} />
      <Flex align="center" fontSize="md">
        <Icon as={FaHotel} mr={1} /> ทั้งหมด: <Text ml={1} fontWeight="bold">{total}</Text>
      </Flex>
      <Flex align="center" fontSize="md">
        <Icon as={FaUserCheck} color="green.400" mr={1} /> มีคนอยู่: <Text ml={1} fontWeight="bold">{occupied}</Text>
      </Flex>
      <Flex align="center" fontSize="md">
        <Icon as={FaDoorOpen} color="yellow.400" mr={1} /> ว่าง: <Text ml={1} fontWeight="bold">{vacant}</Text>
      </Flex>
    </Flex>
  );
} 