import { Flex, Box } from "@chakra-ui/react";
import AppHeader from "./AppHeader";
import Sidebar from "./Sidebar";
import { AnimatePresence, motion } from "framer-motion";

interface MainLayoutProps {
  children: React.ReactNode;
  role: string | null;
  currentUser?: any | null; // Change to currentUser object
  showSidebar?: boolean; // Optional parameter to control sidebar visibility
}

export default function MainLayout({ children, role, currentUser, showSidebar = true }: MainLayoutProps) {
  return (
    <Box minH="100vh">
      <AppHeader currentUser={currentUser} />
      <Flex minH="100vh" p={0}>
        {showSidebar && <Sidebar role={role} />}
        <AnimatePresence mode="wait">
          <motion.div
            key={typeof window !== 'undefined' ? window.location.pathname : 'static'}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            style={{ flex: 1 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </Flex>
    </Box>
  );
} 