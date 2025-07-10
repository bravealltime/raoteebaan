import { Flex, Box, Modal, ModalOverlay, ModalContent, ModalCloseButton, ModalBody, Image, Text, useToast, useBreakpointValue } from "@chakra-ui/react";
import AppHeader from "./AppHeader";
import Sidebar from "./Sidebar";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Conversation } from "../types/chat";

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
  const toast = useToast();
  const notificationSoundRef = useRef<HTMLAudioElement>(null);
  const prevConversationsRef = useRef<Conversation[]>([]);
  const isInitialLoad = useRef(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false });

  const onCloseMobileSidebar = () => setIsMobileSidebarOpen(false);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos: Conversation[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));

      if (isInitialLoad.current) {
        prevConversationsRef.current = convos;
        isInitialLoad.current = false;
        return;
      }

      const selectedConversationId = router.query.conversationId;

      convos.forEach(newConvo => {
        const oldConvo = prevConversationsRef.current.find(c => c.id === newConvo.id);
        if (newConvo.lastMessage && newConvo.lastMessage.text &&
            (!oldConvo || JSON.stringify(newConvo.lastMessage) !== JSON.stringify(oldConvo.lastMessage)) &&
            newConvo.lastMessage.senderId !== currentUser?.uid &&
            newConvo.id !== selectedConversationId) {
          
          const playPromise = notificationSoundRef.current?.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error("Audio play failed:", error);
              toast({
                title: "ไม่สามารถเล่นเสียงแจ้งเตือน",
                description: "เบราว์เซอร์อาจบล็อกเสียงอัตโนมัติ คลิกบนหน้าจอเพื่อเปิดใช้งาน",
                status: "info",
                duration: 5000,
                isClosable: true,
              });
            });
          }
        }
      });

      prevConversationsRef.current = convos;
    });

    return () => {
      unsubscribe();
      isInitialLoad.current = true;
    }
  }, [currentUser, router.query.conversationId, toast]);

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

  

  
  return (
    <Flex minH="100vh" bg="gray.100">
      {showSidebar && !isMobile && <Sidebar role={role} currentUser={currentUser} />}
      <Box flex={1} p={{ base: 4, md: 6 }}>
        {currentUser && <AppHeader currentUser={currentUser} onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)} />}
        <AnimatePresence mode="wait">
          <motion.div
            key={router.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            style={{ flex: 1 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* Mobile Sidebar Modal */}
      <Modal isOpen={isMobileSidebarOpen} onClose={onCloseMobileSidebar} size="full" motionPreset="slideInLeft">
        <ModalOverlay />
        <ModalContent maxW="300px" ml={0} h="100vh" borderRadius="none">
          <ModalCloseButton />
          <ModalBody p={0}>
            <Sidebar role={role} currentUser={currentUser} onCloseMobileSidebar={onCloseMobileSidebar} />
          </ModalBody>
        </ModalContent>
      </Modal>

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
      <audio ref={notificationSoundRef} src="/sounds/notification.mp3" preload="auto" />
    </Flex>
  );
}