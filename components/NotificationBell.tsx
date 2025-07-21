
import {
  Box,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Text,
  Badge,
  VStack,
  Flex,
  Spinner,
  Button,
} from "@chakra-ui/react";
import { FaBell } from "react-icons/fa";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import TimeAgo from 'react-timeago';
import thStrings from 'react-timeago/lib/language-strings/th';
import buildFormatter from 'react-timeago/lib/formatters/buildFormatter';

const formatter = buildFormatter(thStrings);

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: Timestamp;
  link?: string;
  type: 'bill' | 'payment' | 'message' | 'system';
}

interface NotificationBellProps {
  currentUser?: {
    uid: string;
  } | null;
  showViewAllLink?: boolean;
}

export default function NotificationBell({ currentUser, showViewAllLink = true }: NotificationBellProps) {
  // Defensive check: If currentUser is null or undefined, don't render anything.
  if (!currentUser) {
    return null;
  }

  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || !currentUser.uid) {
      setLoading(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
      
      const unread = notifs.filter(n => !n.isRead).length;
      setUnreadCount(unread);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

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
    const unreadNotifs = notifications.filter(n => !n.isRead);
    for (const notif of unreadNotifs) {
        const notifRef = doc(db, "notifications", notif.id);
        await updateDoc(notifRef, { isRead: true });
    }
  };

  return (
    <Box position="relative">
      <Menu>
        <MenuButton
          as={IconButton}
          aria-label="Notifications"
          icon={<FaBell />}
          variant="ghost"
          fontSize="xl"
          color="gray.600"
          _hover={{ bg: "gray.200" }}
          borderRadius="full"
        />
        {unreadCount > 0 && (
          <Badge
            position="absolute"
            top="-1px"
            right="-1px"
            colorScheme="red"
            borderRadius="full"
            px="1.5"
            fontSize="0.6em"
          >
            {unreadCount}
          </Badge>
        )}
        <MenuList portal={true} zIndex={20000}>
          <Flex justify="space-between" align="center" px={3} py={2}>
            <Text fontWeight="bold">การแจ้งเตือน</Text>
            {unreadCount > 0 && (
                <Button size="xs" variant="link" colorScheme="blue" onClick={handleMarkAllAsRead}>
                    ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
                </Button>
            )}
          </Flex>
          <MenuDivider />
          {loading ? (
            <Flex justify="center" p={4}><Spinner /></Flex>
          ) : notifications.length === 0 ? (
            <MenuItem>ไม่มีการแจ้งเตือน</MenuItem>
          ) : (
            <VStack align="stretch" spacing={0}>
              {notifications.map((notif) => (
                <MenuItem
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  bg={notif.isRead ? "transparent" : "blue.50"}
                  _hover={{ bg: "gray.100" }}
                  whiteSpace="normal"
                  py={3}
                >
                  <VStack align="start" spacing={1}>
                    <Text>{notif.message}</Text>
                    <Text fontSize="xs" color="gray.500">
                        {notif.createdAt && typeof notif.createdAt.toDate === 'function' ? (
                            <TimeAgo date={notif.createdAt.toDate()} formatter={formatter} />
                        ) : (
                            <span>ไม่พบวันที่</span>
                        )}
                    </Text>
                  </VStack>
                </MenuItem>
              ))}
            </VStack>
          )}
          {showViewAllLink && (
            <>
              <MenuDivider />
              <MenuItem onClick={() => router.push('/notifications')}>
                ดูการแจ้งเตือนทั้งหมด
              </MenuItem>
            </>
          )}
        </MenuList>
      </Menu>
    </Box>
  );
}
