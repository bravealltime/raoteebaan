import { Flex, Box, Modal, ModalOverlay, ModalContent, ModalCloseButton, ModalBody, Image } from "@chakra-ui/react";
import AppHeader from "./AppHeader";
import Sidebar from "./Sidebar";
import { AnimatePresence, motion } from "framer-motion";

interface MainLayoutProps {
  children: React.ReactNode;
  role: string | null;
  currentUser?: any | null;
  showSidebar?: boolean;
  isProofModalOpen?: boolean;
  onProofModalClose?: () => void;
  proofImageUrl?: string | null;
}

export default function MainLayout({ children, role, currentUser, showSidebar = true, isProofModalOpen, onProofModalClose, proofImageUrl }: MainLayoutProps) {
  console.log("[DEBUG] MainLayout props:", { isProofModalOpen, proofImageUrl });
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

      {/* Proof Image Modal */}
      <Modal isOpen={isProofModalOpen || false} onClose={onProofModalClose || (() => {})} isCentered size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalBody p={4}>
            {proofImageUrl && (
              <Image src={proofImageUrl} alt="Payment Proof" maxW="full" maxH="80vh" objectFit="contain" />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
} 