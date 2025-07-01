import { Box, Button } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaHome, FaInbox, FaBox, FaUserFriends } from "react-icons/fa";

interface SidebarProps {
  role: string | null;
}

export default function Sidebar({ role }: SidebarProps) {
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
      {/* admin เห็นทุกปุ่ม */}
      {role === "admin" && <>
        <Link href="/dashboard" passHref legacyBehavior>
          <Button as="a" leftIcon={<FaHome />} colorScheme="blue" variant={router.pathname === "/dashboard" ? "solid" : "ghost"} borderRadius="xl" fontWeight="bold" mb={2} w="full" justifyContent="flex-start">
            Dashboard
          </Button>
        </Link>
        <Link href="/" passHref legacyBehavior>
          <Button as="a" leftIcon={<FaHome />} colorScheme="blue" variant={router.pathname === "/" ? "solid" : "ghost"} borderRadius="xl" fontWeight="bold" mb={2} w="full" justifyContent="flex-start">
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
      </>}
      {/* owner เห็นเฉพาะ 3 ปุ่ม */}
      {role === "owner" && <>
        <Link href="/" passHref legacyBehavior>
          <Button as="a" leftIcon={<FaHome />} colorScheme="blue" variant={router.pathname === "/" ? "solid" : "ghost"} borderRadius="xl" fontWeight="bold" mb={2} w="full" justifyContent="flex-start">
            Rooms
          </Button>
        </Link>
        <Link href="/inbox" passHref legacyBehavior>
          <Button as="a" leftIcon={<FaInbox />} colorScheme="gray" variant={router.pathname === "/inbox" ? "solid" : "ghost"} borderRadius="xl" mb={2} w="full" justifyContent="flex-start">
            Inbox
          </Button>
        </Link>
        <Link href="/parcel" passHref legacyBehavior>
          <Button as="a" leftIcon={<FaBox />} colorScheme="gray" variant={router.pathname === "/parcel" ? "solid" : "ghost"} borderRadius="xl" mb={8} w="full" justifyContent="flex-start">
            Parcel
          </Button>
        </Link>
      </>}
      {/* user (tenant) sees Rooms, Inbox, and Parcel */}
      {role === "user" && <>
        <Link href="/" passHref legacyBehavior>
          <Button as="a" leftIcon={<FaHome />} colorScheme="blue" variant={router.pathname === "/" ? "solid" : "ghost"} borderRadius="xl" fontWeight="bold" mb={2} w="full" justifyContent="flex-start">
            My Room
          </Button>
        </Link>
        <Link href="/inbox" passHref legacyBehavior>
          <Button as="a" leftIcon={<FaInbox />} colorScheme="gray" variant={router.pathname === "/inbox" ? "solid" : "ghost"} borderRadius="xl" mb={2} w="full" justifyContent="flex-start">
            Inbox
          </Button>
        </Link>
        <Link href="/parcel" passHref legacyBehavior>
          <Button as="a" leftIcon={<FaBox />} colorScheme="gray" variant={router.pathname === "/parcel" ? "solid" : "ghost"} borderRadius="xl" mb={8} w="full" justifyContent="flex-start">
            Parcel
          </Button>
        </Link>
      </>}
    </Box>
  );
} 