import { Box, Button, Text, VStack, Flex, Avatar, Heading, Spacer, Divider, useDisclosure, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay } from "@chakra-ui/react";
import Link from "next/link";
import useLogout from '../hooks/useLogout';
import { useRouter } from "next/router";
import { FaHome, FaInbox, FaBox, FaUserFriends, FaTachometerAlt, FaSignOutAlt, FaBell } from "react-icons/fa";
import { motion } from "framer-motion";
import { useRef } from "react";

interface SidebarProps {
  role: string | null;
  currentUser?: any | null;
  onCloseMobileSidebar?: () => void;
  onProfileOpen: () => void;
}

const NavItem = ({ href, icon, children, onCloseMobileSidebar }) => {
  const router = useRouter();
  const isActive = router.pathname === href || (href !== "/" && router.pathname.startsWith(href));

  return (
    <Link href={href || "#"} style={{ textDecoration: 'none', width: '100%' }}>
      <Flex
        align="center"
        onClick={onCloseMobileSidebar}
        p="3"
        mx="0"
        borderRadius="md"
        role="group"
        cursor="pointer"
        bg={isActive ? "blue.500" : "transparent"}
        color={isActive ? "white" : "gray.700"}
        _hover={{
          bg: isActive ? "blue.600" : "gray.100",
          color: isActive ? "white" : "gray.800",
        }}
      >
        {icon && (
          <Box as="span" mr={2}>
            {icon}
          </Box>
        )}
        <Text fontWeight="medium" ml={2}>{children}</Text>
      </Flex>
    </Link>
  );
};

export default function Sidebar({ role, currentUser, onCloseMobileSidebar, onProfileOpen }: SidebarProps) {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef(null);

  const { logout, isLoading: isLogoutLoading } = useLogout();

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const adminNavItems = [
    { href: "/dashboard", icon: <FaTachometerAlt />, label: "ภาพรวม" },
    { href: "/", icon: <FaHome />, label: "ห้องพัก" },
    { href: "/inbox", icon: <FaInbox />, label: "ข้อความ" },
    { href: "/parcel", icon: <FaBox />, label: "พัสดุ" },
    { href: "/admin-users", icon: <FaUserFriends />, label: "จัดการผู้ใช้" },
  ];

  const ownerNavItems = [
    { href: "/owner-dashboard", icon: <FaTachometerAlt />, label: "ภาพรวม" },
    { href: "/", icon: <FaHome />, label: "ห้องพัก" },
    { href: "/inbox", icon: <FaInbox />, label: "ข้อความ" },
    { href: "/parcel", icon: <FaBox />, label: "พัสดุ" },
  ];

  const employeeNavItems = [
    { href: "/technician-dashboard", icon: <FaTachometerAlt />, label: "แดชบอร์ดช่าง" },
    { href: "/inbox", icon: <FaInbox />, label: "ข้อความ" },
  ];

  const userNavItems = [
    { href: "/tenant-dashboard", icon: <FaTachometerAlt />, label: "แดชบอร์ด" },
    { href: "/bill/my-room", icon: <FaHome />, label: "ห้องของฉัน" }, // Assuming dynamic route from user data
    { href: "/inbox", icon: <FaInbox />, label: "ข้อความ" },
    { href: "/parcel", icon: <FaBox />, label: "พัสดุ" },
  ];

  let navItems = [];
  if (role === "admin") {
    navItems = adminNavItems;
  } else if (role === "owner") {
    navItems = ownerNavItems;
  } else if (role === "employee") {
    navItems = employeeNavItems;
  } else if (role === "user") {
    // Adjust for dynamic room ID
    const myRoomHref = currentUser?.roomId ? `/bill/${currentUser.roomId}` : '/tenant-dashboard';
    userNavItems[1].href = myRoomHref;
    navItems = userNavItems;
  }

  console.log("Sidebar received role:", role);
  console.log("Sidebar received currentUser:", currentUser);
  console.log("Sidebar navItems:", navItems);

  return (
    <Flex
      as="nav"
      direction="column"
      w={{ base: "full", md: "260px" }}
      bg="white"
      boxShadow="md"
      p={4}
      position="sticky"
      top={0}
      h="100vh"
    >
      <Heading size="md" color="blue.600" mb={8} mt={2} alignSelf="center">{role === "admin" ? "TeeRao Admin" : "TeeRao"}</Heading>

      <VStack spacing={2} align="stretch" flex={1}>
        {navItems.map((item) => (
          <NavItem key={item.href} href={item.href} icon={item.icon} onCloseMobileSidebar={onCloseMobileSidebar}>
            {item.label}
          </NavItem>
        ))}
      </VStack>

      <Spacer />

      <Divider my={4} />

      <VStack spacing={4} align="stretch">
        <Flex align="center" p={2} borderRadius="md" _hover={{ bg: "gray.100" }} cursor="pointer" onClick={onProfileOpen}>
          <Avatar size="sm" name={currentUser?.name} src={currentUser?.photoURL} />
          <Box ml={3}>
            <Text fontWeight="bold" fontSize="sm">{currentUser?.name || "User"}</Text>
            <Text fontSize="xs" color="gray.500">{role}</Text>
          </Box>
        </Flex>
        <Button
          leftIcon={<FaSignOutAlt />}
          onClick={onOpen}
          variant="ghost"
          colorScheme="red"
          justifyContent="flex-start"
        >
          ออกจากระบบ
        </Button>
      </VStack>

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              ยืนยันการออกจากระบบ
            </AlertDialogHeader>

            <AlertDialogBody>
              คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                ยกเลิก
              </Button>
              <Button colorScheme="red" onClick={handleLogout} ml={3} isLoading={isLogoutLoading}>
                ออกจากระบบ
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Flex>
  );
}