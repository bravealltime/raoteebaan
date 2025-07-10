import { Box, Button, Text, VStack, Flex, Avatar, Heading, Spacer, Divider } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaHome, FaInbox, FaBox, FaUserFriends, FaTachometerAlt, FaSignOutAlt } from "react-icons/fa";
import { motion } from "framer-motion";

interface SidebarProps {
  role: string | null;
  currentUser?: any | null;
  onCloseMobileSidebar?: () => void; // New prop
}

const NavItem = ({ href, icon, children, onCloseMobileSidebar }) => {
  const router = useRouter();
  const isActive = router.pathname === href || (href !== "/" && router.pathname.startsWith(href));

  return (
    <Link href={href} passHref legacyBehavior>
      <motion.a
        whileHover={{ x: 2 }}
        style={{ textDecoration: "none", width: "100%" }}
        onClick={onCloseMobileSidebar} // Close sidebar on navigation
      >
        <Button
          as="div"
          leftIcon={icon}
          colorScheme={isActive ? "blue" : "gray"}
          variant={isActive ? "solid" : "ghost"}
          borderRadius="md"
          fontWeight="medium"
          w="full"
          justifyContent="flex-start"
          px={4}
          py={6}
          bg={isActive ? "blue.500" : "transparent"}
          color={isActive ? "white" : "gray.700"}
          _hover={{
            bg: isActive ? "blue.600" : "gray.100",
          }}
        >
          <Text ml={2}>{children}</Text>
        </Button>
      </motion.a>
    </Link>
  );
};

export default function Sidebar({ role, currentUser, onCloseMobileSidebar }: SidebarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    // Implement logout logic here
    router.push("/login");
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
  } else if (role === "user") {
    // Adjust for dynamic room ID
    const myRoomHref = currentUser?.roomId ? `/bill/${currentUser.roomId}` : '/tenant-dashboard';
    userNavItems[1].href = myRoomHref;
    navItems = userNavItems;
  }

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
      <Heading size="md" color="blue.600" mb={8} mt={2} alignSelf="center">TeeRao</Heading>
      
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
        <Flex align="center" p={2} borderRadius="md" _hover={{ bg: "gray.100" }} cursor="pointer" onClick={() => router.push('/profile')}>
          <Avatar size="sm" name={currentUser?.name} src={currentUser?.photoURL} />
          <Box ml={3}>
            <Text fontWeight="bold" fontSize="sm">{currentUser?.name || "User"}</Text>
            <Text fontSize="xs" color="gray.500">{role}</Text>
          </Box>
        </Flex>
        <Button 
          leftIcon={<FaSignOutAlt />} 
          onClick={handleLogout} 
          variant="ghost" 
          colorScheme="red"
          justifyContent="flex-start"
        >
          ออกจากระบบ
        </Button>
      </VStack>
    </Flex>
  );
}