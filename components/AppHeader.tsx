import {
  Flex,
  Box,
  Text,
  Avatar,
  IconButton,
  Spacer,
  Badge,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  Heading,
  HStack,
} from "@chakra-ui/react";
import { FaEnvelope, FaBars } from "react-icons/fa";
import NotificationBell from './NotificationBell';
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { collection, query, onSnapshot, where, doc } from "firebase/firestore";
import ProfileModal from './ProfileModal'; // Import the new modal

interface User {
  uid: string;
  name: string;
  email: string;
  role: string;
  photoURL?: string;
  roomNumber?: string;
}

interface AppHeaderProps {
  currentUser?: User | null;
  onOpenMobileSidebar?: () => void; // New prop
  onProfileOpen?: () => void;
}

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case "/":
      return "ห้องพัก";
    case "/dashboard":
      return "ภาพรวม";
    case "/owner-dashboard":
      return "ภาพรวม";
    case "/tenant-dashboard":
      return "แดชบอร์ด";
    case "/inbox":
      return "ข้อความ";
    case "/parcel":
      return "พัสดุ";
    case "/admin-users":
      return "จัดการผู้ใช้";
    // case "/profile": // No longer a page
    //   return "โปรไฟล์";
    default:
      if (pathname.startsWith("/bill/")) return "รายละเอียดบิล";
      if (pathname.startsWith("/history/")) return "ประวัติ";
      return "TeeRao";
  }
};

export default function AppHeader({ currentUser, onOpenMobileSidebar }: AppHeaderProps) {
  const router = useRouter();
  const { isOpen: isLogoutOpen, onOpen: onLogoutOpen, onClose: onLogoutClose } = useDisclosure();
  const { isOpen: isProfileOpen, onOpen: onProfileOpen, onClose: onProfileClose } = useDisclosure(); // New disclosure for Profile Modal
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [profile, setProfile] = useState<{ name: string; avatar?: string; greeting?: string }>({ name: currentUser?.name || "xxx", avatar: currentUser?.photoURL });
  const [role, setRole] = useState<string | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [pageTitle, setPageTitle] = useState("");

  useEffect(() => {
    if (currentUser) {
      const unsub = onSnapshot(doc(db, "users", currentUser.uid), (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          setProfile({
            name: userData.name || currentUser.name || "xxx",
            avatar: userData.avatar || currentUser.photoURL,
            greeting: new Date().toLocaleString("th-TH", { dateStyle: "full", timeStyle: "short" }),
          });
          setRole(userData.role);
        }
      });
      return () => unsub();
    }
  }, [currentUser]);

  useEffect(() => {
    setPageTitle(getPageTitle(router.pathname));
  }, [router.pathname]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let unreadCount = 0;
      snapshot.forEach((doc) => {
        const convo = doc.data();
        if (convo.lastMessage && convo.lastMessage.senderId !== currentUser.uid && !convo.lastMessage.isRead) {
          unreadCount++;
        }
      });
      setUnreadMessageCount(unreadCount);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/login');
      onLogoutClose();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <>
      <Flex
        as="header"
        align="center"
        w="full"
        p={4}
        mb={6}
        bg="transparent"
      >
        <IconButton
          aria-label="Open Menu"
          icon={<FaBars />}
          variant="ghost"
          fontSize="xl"
          color="gray.600"
          _hover={{ bg: "gray.200" }}
          borderRadius="full"
          onClick={onOpenMobileSidebar}
          display={{ base: "flex", md: "none" }}
        />
        <Heading size="lg" color="gray.700">{pageTitle}</Heading>
        <Spacer />
        <HStack spacing={4}>
          <NotificationBell currentUser={currentUser} />
          <Box position="relative">
            <IconButton
              aria-label="Inbox"
              icon={<FaEnvelope />}
              variant="ghost"
              fontSize="xl"
              color="gray.600"
              _hover={{ bg: "gray.200" }}
              borderRadius="full"
              onClick={() => router.push("/inbox")}
            />
            {unreadMessageCount > 0 && (
              <Badge
                position="absolute"
                top="-1px"
                right="-1px"
                colorScheme="red"
                borderRadius="full"
                px="1.5"
                fontSize="0.6em"
              >
                {unreadMessageCount}
              </Badge>
            )}
          </Box>
          <Avatar 
            size="sm" 
            name={profile.name} 
            src={profile.avatar} 
            cursor="pointer"
            onClick={onProfileOpen} // Open modal on click
          />
        </HStack>
      </Flex>

      <AlertDialog
        isOpen={isLogoutOpen}
        leastDestructiveRef={cancelRef}
        onClose={onLogoutClose}
        isCentered
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
              <Button ref={cancelRef} onClick={onLogoutClose}>
                ยกเลิก
              </Button>
              <Button colorScheme="red" onClick={handleLogout} ml={3}>
                ออกจากระบบ
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      
      {/* Render the ProfileModal */}
      <ProfileModal isOpen={isProfileOpen} onClose={onProfileClose} />
    </>
  );
} 