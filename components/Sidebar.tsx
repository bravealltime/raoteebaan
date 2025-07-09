import { Box, Button, Text, VStack } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FaHome, FaInbox, FaBox, FaUserFriends, FaTachometerAlt } from "react-icons/fa";
import { motion } from "framer-motion";

interface SidebarProps {
  role: string | null;
}

const NavItem = ({ href, icon, children }) => {
  const router = useRouter();
  const isActive = router.pathname === href;

  return (
    <Link href={href} passHref legacyBehavior>
      <motion.a
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{ textDecoration: "none", width: "100%" }}
      >
        <Button
          as="div"
          leftIcon={icon}
          colorScheme={isActive ? "blue" : "gray"}
          variant={isActive ? "solid" : "ghost"}
          borderRadius="lg"
          fontWeight="bold"
          w="full"
          justifyContent="flex-start"
          px={4}
          py={6}
          bg={isActive ? "blue.500" : "transparent"}
          color={isActive ? "white" : "gray.600"}
          _hover={{
            bg: isActive ? "blue.600" : "blue.50",
          }}
        >
          <Text display={["none", "block"]} ml={2}>{children}</Text>
        </Button>
      </motion.a>
    </Link>
  );
};

const sidebarVariants = {
  hidden: { x: -220 },
  visible: {
    x: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: { x: 0, opacity: 1 },
};

export default function Sidebar({ role }: SidebarProps) {
  const adminNavItems = [
    { href: "/dashboard", icon: <FaTachometerAlt />, label: "Dashboard" },
    { href: "/", icon: <FaHome />, label: "Rooms" },
    { href: "/inbox", icon: <FaInbox />, label: "Inbox" },
    { href: "/parcel", icon: <FaBox />, label: "Parcel" },
    { href: "/admin-users", icon: <FaUserFriends />, label: "Users" },
  ];

  const ownerNavItems = [
    { href: "/owner-dashboard", icon: <FaTachometerAlt />, label: "Dashboard" },
    { href: "/", icon: <FaHome />, label: "Rooms" },
    { href: "/inbox", icon: <FaInbox />, label: "Inbox" },
    { href: "/parcel", icon: <FaBox />, label: "Parcel" },
  ];

  const userNavItems = [
    { href: "/tenant-dashboard", icon: <FaTachometerAlt />, label: "Dashboard" },
    { href: "/", icon: <FaHome />, label: "My Room" },
    { href: "/inbox", icon: <FaInbox />, label: "Inbox" },
    { href: "/parcel", icon: <FaBox />, label: "Parcel" },
  ];

  let navItems = [];
  if (role === "admin") {
    navItems = adminNavItems;
  } else if (role === "owner") {
    navItems = ownerNavItems;
  } else if (role === "user") {
    navItems = userNavItems;
  }

  return (
    <motion.div variants={sidebarVariants} initial="hidden" animate="visible">
      <Box
        w={["80px", "240px"]}
        minH="calc(100vh - 64px)"
        bg="white"
        borderRight="1px solid #E2E8F0"
        px={[2, 4]}
        py={6}
        as={VStack}
        spacing={3}
        align="stretch"
      >
        {navItems.map((item) => (
          <motion.div key={item.href} variants={itemVariants}>
            <NavItem href={item.href} icon={item.icon}>
              {item.label}
            </NavItem>
          </motion.div>
        ))}
      </Box>
    </motion.div>
  );
}