
import { Flex, Box, Text, Avatar, Menu, MenuButton, MenuList, MenuItem, MenuDivider, useToast, Image, Modal, ModalOverlay, ModalContent, ModalCloseButton, ModalBody, useDisclosure } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { Conversation } from "../types/chat";
import { FaSignOutAlt, FaUserCircle, FaInbox } from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";
import ProfileModal from './ProfileModal';

interface TenantLayoutProps {
  children: React.ReactNode;
  currentUser?: any | null;
  isProofModalOpen?: boolean;
  onProofModalClose?: () => void;
  proofImageUrl?: string | null;
}

export default function TenantLayout({ children, currentUser, isProofModalOpen, onProofModalClose, proofImageUrl }: TenantLayoutProps) {
  const router = useRouter();
  const toast = useToast();
  const notificationSoundRef = useRef<HTMLAudioElement>(null);
  const prevConversationsRef = useRef<Conversation[]>([]);
  const isInitialLoad = useRef(true);
  const { isOpen: isProfileOpen, onOpen: onProfileOpen, onClose: onProfileClose } = useDisclosure();

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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed", error);
      toast({
        title: "Logout Failed",
        description: "An error occurred while logging out.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Flex direction="column" minH="100vh" bg="gray.50">
      <Box
        as="header"
        w="full"
        px={{ base: 4, md: 8 }}
        py={3}
        bg="white"
        boxShadow="sm"
        position="sticky"
        top={0}
        zIndex={100}
      >
        <Flex justify="space-between" align="center" maxW="container.xl" mx="auto">
          <Text fontWeight="bold" fontSize="2xl" color="blue.600" onClick={() => router.push('/tenant-dashboard')} cursor="pointer">
            TeeRao
          </Text>
          {currentUser && (
            <Menu>
              <MenuButton as={Avatar} size="sm" name={currentUser.name} src={currentUser.photoURL} cursor="pointer" />
              <MenuList>
                <MenuItem onClick={onProfileOpen} icon={<FaUserCircle />}>
                  โปรไฟล์
                </MenuItem>
                <MenuItem onClick={() => router.push('/inbox')} icon={<FaInbox />}>
                  กล่องข้อความ
                </MenuItem>
                <MenuDivider />
                <MenuItem onClick={handleLogout} color="red.500" icon={<FaSignOutAlt />}>
                  ออกจากระบบ
                </MenuItem>
              </MenuList>
            </Menu>
          )}
        </Flex>
      </Box>
      
      <Box flex={1} w="full" maxW="container.xl" mx="auto" p={{ base: 4, md: 6 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={router.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </Box>

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
      <ProfileModal isOpen={isProfileOpen} onClose={onProfileClose} />
      <audio ref={notificationSoundRef} src="/sounds/notification.mp3" preload="auto" />
    </Flex>
  );
}
