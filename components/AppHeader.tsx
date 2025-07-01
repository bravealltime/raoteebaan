import { Flex, Box, Text, Avatar, IconButton, Spacer, Badge } from "@chakra-ui/react";
import { FaCog, FaBell, FaEnvelope } from "react-icons/fa";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { collection, query, orderBy, limit, getDocs, doc, getDoc, onSnapshot, where } from "firebase/firestore";
import { db } from "../lib/firebase";

interface AppHeaderProps {
  user?: {
    name: string;
    avatar?: string;
    greeting?: string;
  };
  currentUserUid?: string | null; // Add currentUserUid prop
}

export default function AppHeader({ user, currentUserUid }: AppHeaderProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<{ name: string; avatar?: string; greeting?: string }>({ name: user?.name || "xxx", avatar: user?.avatar, greeting: user?.greeting });
  const [role, setRole] = useState<string | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    const u = auth.currentUser;
    if (u) {
      setProfile({
        name: u.displayName || user?.name || "xxx",
        avatar: u.photoURL || user?.avatar,
        greeting: new Date().toLocaleString("th-TH", { dateStyle: "full", timeStyle: "short" }),
      });
      // Fetch role from Firestore
      getDoc(doc(db, "users", u.uid)).then(snap => {
        setRole(snap.exists() ? snap.data().role : "user");
      });
    } else {
      setProfile({
        name: user?.name || "xxx",
        avatar: user?.avatar,
        greeting: new Date().toLocaleString("th-TH", { dateStyle: "full", timeStyle: "short" }),
      });
      setRole(null);
    }
  }, [user]);

  useEffect(() => {
    if (!currentUserUid) return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUserUid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let unreadCount = 0;
      snapshot.docs.forEach((docData) => {
        const convo = docData.data();
        if (convo.lastMessage && convo.lastMessage.senderId !== currentUserUid && !convo.lastMessage.isRead) {
          unreadCount++;
        }
      });
      setUnreadMessageCount(unreadCount);
    });

    return () => unsubscribe();
  }, [currentUserUid]);

  return (
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
      </Flex>
    </Flex>
  );
} 