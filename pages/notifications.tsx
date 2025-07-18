
import { Box, Heading, VStack, Spinner, Text, Flex, Button, Icon, HStack, IconButton, Tooltip, Container } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  writeBatch
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { getDoc } from "firebase/firestore";
import TimeAgo from 'react-timeago';
import thStrings from 'react-timeago/lib/language-strings/th';
import buildFormatter from 'react-timeago/lib/formatters/buildFormatter';
import { FaArrowLeft, FaBell, FaCheckCircle } from "react-icons/fa";
import MainLayout from "../components/MainLayout";
import TenantLayout from "../components/TenantLayout";

const formatter = buildFormatter(thStrings);

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: Timestamp;
  link?: string;
  type: 'bill' | 'payment' | 'message' | 'system';
}

// Custom hook to get user and full user data
function useAuth() {
  const [user, loading, error] = useAuthState(auth);
  const [userData, setUserData] = useState<any | null>(null);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserData({ uid: user.uid, ...docSnap.data() });
        } else {
          setUserData(null);
        }
      });
      return () => unsubscribe();
    } else {
      setUserData(null);
    }
  }, [user]);

  return { user, userData, loading, error };
}

export default function NotificationsPage() {
  const { user, userData, loading: loadingAuth } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const role = userData?.role;

  useEffect(() => {
    if (loadingAuth) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, loadingAuth, router]);

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.link) {
      router.push(notification.link);
    }
    if (!notification.isRead) {
      const notifRef = doc(db, "notifications", notification.id);
      await updateDoc(notifRef, { isRead: true });
    }
  };

  const handleMarkAllAsRead = async () => {
    const batch = writeBatch(db);
    const unreadNotifs = notifications.filter(n => !n.isRead);
    unreadNotifs.forEach(notif => {
        const notifRef = doc(db, "notifications", notif.id);
        batch.update(notifRef, { isRead: true });
    });
    await batch.commit();
  };

  if (loading || loadingAuth) {
    const Layout = (role === 'admin' || role === 'owner') ? MainLayout : TenantLayout;
    return <Layout role={role} currentUser={userData}><Flex justify="center" align="center" h="100vh"><Spinner /></Flex></Layout>;
  }

  const Layout = (role === 'admin' || role === 'owner') ? MainLayout : TenantLayout;

  return (
    <Layout role={role} currentUser={userData}>
      <Container maxW="container.lg" py={6}>
        <VStack align="stretch" spacing={6}>
          <Flex justify="space-between" align="center">
              <HStack spacing={4}>
                  <Tooltip label="ย้อนกลับ" placement="bottom">
                      <IconButton 
                          aria-label="Go back" 
                          icon={<FaArrowLeft />} 
                          onClick={() => router.back()} 
                          isRound
                          variant="ghost"
                      />
                  </Tooltip>
                  <Heading>การแจ้งเตือนทั้งหมด</Heading>
              </HStack>
              <Button onClick={handleMarkAllAsRead} leftIcon={<FaCheckCircle/>}>ทำเครื่องหมายว่าอ่านแล้วทั้งหมด</Button>
          </Flex>
          
          {notifications.length === 0 ? (
            <Text>ไม่มีการแจ้งเตือน</Text>
          ) : (
            <VStack align="stretch" spacing={3}>
              {notifications.map((notif) => (
                <Flex
                  key={notif.id}
                  p={4}
                  bg={notif.isRead ? "white" : "blue.50"}
                  borderRadius="md"
                  boxShadow="sm"
                  cursor="pointer"
                  onClick={() => handleNotificationClick(notif)}
                  _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
                  transition="all 0.2s"
                  align="center"
                >
                  <Icon as={FaBell} color={notif.isRead ? "gray.400" : "blue.500"} boxSize={6} mr={4}/>
                  <Box>
                      <Text>{notif.message}</Text>
                      <Text fontSize="sm" color="gray.500">
                          <TimeAgo date={notif.createdAt.toDate()} formatter={formatter} />
                      </Text>
                  </Box>
                </Flex>
              ))}
            </VStack>
          )}
        </VStack>
      </Container>
    </Layout>
  );
}
