import { Box, Button } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaHome, FaInbox, FaBox, FaUserFriends } from "react-icons/fa";

export default function Sidebar() {
  const router = useRouter();
  return (
    <Box
      w={["70px", "220px"]}
      minH="calc(100vh - 64px)"
      bg="white"
      borderRight="1.5px solid #e3f2fd"
      boxShadow="0 2px 16px 0 rgba(33,150,243,0.06)"
      px={[1, 4]}
      py={6}
      display="flex"
      flexDirection="column"
      gap={4}
      zIndex={2}
    >
      <Link href="/dashboard" passHref legacyBehavior>
        <Button as="a" leftIcon={<FaHome />} colorScheme="blue" variant={router.pathname === "/dashboard" ? "solid" : "ghost"} borderRadius="xl" fontWeight="bold" mb={2} w="full" justifyContent="flex-start">
          Dashboard
        </Button>
      </Link>
      <Link href="/rooms" passHref legacyBehavior>
        <Button as="a" leftIcon={<FaHome />} colorScheme="blue" variant={router.pathname === "/rooms" ? "solid" : "ghost"} borderRadius="xl" fontWeight="bold" mb={2} w="full" justifyContent="flex-start">
          Rooms
        </Button>
      </Link>
      <Link href="/inbox" passHref legacyBehavior>
        <Button as="a" leftIcon={<FaInbox />} colorScheme="gray" variant={router.pathname === "/inbox" ? "solid" : "ghost"} borderRadius="xl" mb={2} w="full" justifyContent="flex-start">
          Inbox
        </Button>
      </Link>
      <Link href="/parcel" passHref legacyBehavior>
        <Button as="a" leftIcon={<FaBox />} colorScheme="gray" variant={router.pathname === "/parcel" ? "solid" : "ghost"} borderRadius="xl" mb={2} w="full" justifyContent="flex-start">
          Parcel
        </Button>
      </Link>
      <Link href="/employee" passHref legacyBehavior>
        <Button as="a" leftIcon={<FaUserFriends />} colorScheme="gray" variant={router.pathname === "/employee" ? "solid" : "ghost"} borderRadius="xl" mb={8} w="full" justifyContent="flex-start">
          Employee
        </Button>
      </Link>
    </Box>
  );
} 