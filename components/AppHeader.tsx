import { Flex, Box, Text, Avatar, IconButton, Spacer } from "@chakra-ui/react";
import { FaCog, FaBell } from "react-icons/fa";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

interface AppHeaderProps {
  user?: {
    name: string;
    avatar?: string;
    greeting?: string;
  };
}

export default function AppHeader({ user }: AppHeaderProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<{ name: string; avatar?: string; greeting?: string }>({ name: user?.name || "xxx", avatar: user?.avatar, greeting: user?.greeting });

  useEffect(() => {
    const u = auth.currentUser;
    if (u) {
      setProfile({
        name: u.displayName || user?.name || "xxx",
        avatar: u.photoURL || user?.avatar,
        greeting: new Date().toLocaleString("th-TH", { dateStyle: "full", timeStyle: "short" }),
      });
    } else {
      setProfile({
        name: user?.name || "xxx",
        avatar: user?.avatar,
        greeting: new Date().toLocaleString("th-TH", { dateStyle: "full", timeStyle: "short" }),
      });
    }
  }, [user]);

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
      border="1.5px solid #e3f2fd"
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
        <IconButton
          aria-label="Settings"
          icon={<FaCog />}
          variant="ghost"
          fontSize="xl"
          color="blue.500"
          _hover={{ bg: "blue.50", color: "blue.600" }}
          borderRadius="full"
        />
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