import { Flex, Box, Modal, ModalOverlay, ModalContent, ModalCloseButton, ModalBody, Image, Text } from "@chakra-ui/react";
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

  const SimpleHeader = () => (
    <Flex
      as="header"
      w="full"
      px={[2, 4, 8]}
      py={[2, 3]}
      align="center"
      bg="whiteAlpha.800"
      borderRadius="2xl"
      boxShadow="0 4px 24px 0 rgba(33, 150, 243, 0.10)"
      mt={[2, 4]}
      mb={[4, 8]}
      maxW="100vw"
      minH="64px"
      position="relative"
      zIndex={10}
      style={{ backdropFilter: "blur(12px)" }}
      border="1.5px solid brand.50"
    >
      <Text fontWeight="extrabold" fontSize={["lg", "2xl"]} color="blue.500" mr={6} letterSpacing={1}>
        TeeRao
      </Text>
    </Flex>
  );

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

  
  return (

    <Box minH="100vh">
      {currentUser && currentUser.name ? (
        <AppHeader currentUser={currentUser} />
      ) : (
        <SimpleHeader />
      )}
      <Flex minH="100vh" p={{ base: 4, md: 8 }}>
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