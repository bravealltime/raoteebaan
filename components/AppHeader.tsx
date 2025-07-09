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
} from "@chakra-ui/react";
import { FaCog, FaBell, FaEnvelope, FaSignOutAlt } from "react-icons/fa";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { collection, query, onSnapshot, where } from "firebase/firestore";

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
}

export default function AppHeader({ currentUser }: AppHeaderProps) {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [profile, setProfile] = useState<{ name: string; avatar?: string; greeting?: string }>({ name: currentUser?.name || "xxx", avatar: currentUser?.photoURL });
  const [role, setRole] = useState<string | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    if (currentUser) {
      setProfile({
        name: currentUser.name || "xxx",
        avatar: currentUser.photoURL,
        greeting: new Date().toLocaleString("th-TH", { dateStyle: "full", timeStyle: "short" }),
      });
      setRole(currentUser.role);
    } else {
      setProfile({
        name: "xxx",
        avatar: undefined,
        greeting: new Date().toLocaleString("th-TH", { dateStyle: "full", timeStyle: "short" }),
      });
      setRole(null);
    }
  }, [currentUser]);

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
        // Check if there is a last message, if the user is not the sender, and if it's unread
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
      onClose();
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({ title: "Logout Failed", description: error.message, status: "error" });
    }
  };

  return (
    <>
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
        <Spacer />
        <Flex align="center" gap={3}>
          <Avatar
            size="md"
            name={profile.name || ""}
            src={profile.avatar}
            border="2.5px solid white"
            boxShadow="md"
            bg="blue.100"
            color="blue.700"
            cursor="pointer"
            onClick={() => router.push("/profile")}
          />
          <Box textAlign="left" cursor="pointer" onClick={() => router.push("/profile")}>
            <Text fontWeight="bold" fontSize="md" color="gray.800">
              สวัสดีคุณ {profile.name || "xxx"}
            </Text>
            <Text fontSize="xs" color="gray.400">
              {profile.greeting || "อาทิตย์ 21 มิ.ย. 2568"}
            </Text>
          </Box>
          {role === "admin" && (
            <IconButton
              aria-label="Settings"
              icon={<FaCog />}
              variant="ghost"
              fontSize="xl"
              color="blue.500"
              _hover={{ bg: "blue.50", color: "blue.600" }}
              borderRadius="full"
              onClick={() => router.push("/admin-users")}
            />
          )}
          <Box position="relative">
            <IconButton
              aria-label="Inbox"
              icon={<FaEnvelope />}
              variant="ghost"
              fontSize="xl"
              color="blue.500"
              _hover={{ bg: "blue.50", color: "blue.600" }}
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
                px="2"
                fontSize="0.7em"
              >
                {unreadMessageCount}
              </Badge>
            )}
          </Box>
          <IconButton
            aria-label="Notifications"
            icon={<FaBell />}
            variant="ghost"
            fontSize="xl"
            color="blue.500"
            _hover={{ bg: "blue.50", color: "blue.600" }}
            borderRadius="full"
          />
          <IconButton
            aria-label="Logout"
            icon={<FaSignOutAlt />}
            variant="ghost"
            fontSize="xl"
            color="red.500"
            _hover={{ bg: "red.50", color: "red.600" }}
            borderRadius="full"
            onClick={onOpen}
          />
        </Flex>
      </Flex>

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
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
              <Button ref={cancelRef} onClick={onClose}>
                ยกเลิก
              </Button>
              <Button colorScheme="red" onClick={handleLogout} ml={3}>
                ออกจากระบบ
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
} 