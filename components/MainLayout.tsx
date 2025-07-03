import { Flex, Box, Modal, ModalOverlay, ModalContent, ModalCloseButton, ModalBody, Image } from "@chakra-ui/react";
import AppHeader from "./AppHeader";
import Sidebar from "./Sidebar";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useEffect } from "react";

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
  const router = useRouter();

  useEffect(() => {
    const tenantAllowedPaths = [
      '/tenant-dashboard',
      '/profile',
      '/inbox',
      '/bill/[roomId]', // Dynamic route
      '/history/[roomId]', // Dynamic route
    ];

    // Check if the current path matches any of the dynamic routes
    const isDynamicTenantPath = (path: string) => {
      return tenantAllowedPaths.some(allowedPath => {
        if (allowedPath.includes('[') && allowedPath.includes(']')) {
          const regex = new RegExp(allowedPath.replace(/\//g, '\\/').replace(/\[[^\]]+\]/g, '[^\\/]+'));
          return regex.test(path);
        }
        return false;
      });
    };

    if (role === 'user') {
      // If user is a tenant, check if they are on an allowed path
      if (!tenantAllowedPaths.includes(router.pathname) && !isDynamicTenantPath(router.pathname)) {
        router.replace('/tenant-dashboard');
      }
    } else if (router.pathname === '/tenant-dashboard' && role !== null) {
      // If a non-tenant user tries to access tenant-dashboard, redirect them
      // Assuming 'admin' or 'owner' would go to '/dashboard'
      // If no specific dashboard, redirect to login or a generic home
      if (role === 'admin' || role === 'owner') {
        router.replace('/dashboard');
      } else {
        router.replace('/login'); // Or a more appropriate default page
      }
    }
  }, [role, router.pathname, router]);

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