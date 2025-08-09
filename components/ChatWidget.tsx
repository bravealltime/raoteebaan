
import { useState, useEffect } from 'react';
import {
  Box,
  Spinner,
  Flex,
  IconButton,
  useDisclosure,
  ScaleFade,
  Circle,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { getDatabase, ref as dbRef, onValue } from 'firebase/database';
import { auth, db } from '../lib/firebase';
import { User, Conversation } from '../types/chat';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import { FaComments, FaTimes } from 'react-icons/fa';

const ChatWidget = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, any>>({});

  // Effect to get current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUser({
            uid: user.uid,
            name: userData.name || '',
            email: userData.email || '',
            role: userData.role || '',
            photoURL: userData.avatar || '',
          });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Effect to fetch conversations and check for unread messages
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let unreadFound = false;
      const convos = await Promise.all(
        snapshot.docs.map(async (docData) => {
          const conversationData = docData.data();
          if (
            conversationData.lastMessage &&
            conversationData.lastMessage.senderId !== currentUser.uid &&
            !conversationData.lastMessage.isRead
          ) {
            unreadFound = true;
          }

          const otherParticipantId = conversationData.participants.find((p: string) => p !== currentUser.uid);
          let otherParticipant: User | null = null;

          if (otherParticipantId) {
            const userDoc = await getDoc(doc(db, 'users', otherParticipantId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              otherParticipant = { uid: userDoc.id, ...userData, photoURL: userData.avatar } as User;
            }
          }

          return {
            id: docData.id,
            ...conversationData,
            updatedAt: conversationData.updatedAt,
            participants: [currentUser, otherParticipant].filter(Boolean),
          } as Conversation;
        })
      );
      setConversations(convos);
      setHasUnread(unreadFound);
      
      if (unreadFound && !isOpen) {
        setIsOpen(true);
      }

      // Fetch online status for all participants
      const unsubscribes = new Set<() => void>();
      const userIds = new Set<string>();
      convos.forEach(convo => {
        convo.participants.forEach((p: any) => {
          if (typeof p === 'string') userIds.add(p);
          else if (p.uid) userIds.add(p.uid);
        });
      });
      userIds.forEach(uid => {
        const unsub = onValue(dbRef(getDatabase(), 'status/' + uid), (snapshot) => {
          const status = snapshot.val();
          setOnlineStatus(prev => ({ ...prev, [uid]: { state: status?.state } }));
        });
        unsubscribes.add(unsub);
      });
      return () => { unsubscribes.forEach(unsub => unsub()); };
    });

    return () => unsubscribe();
  }, [currentUser, isOpen]);

  // Check for offline
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
  };
  
  const handleCloseWidget = () => {
    setSelectedConversation(null);
    setIsOpen(false);
  }

  if (loading) {
    return (
      <Box position="fixed" bottom={{ base: 10, md: 6 }} right={0} zIndex="1600" p={2}
        bgGradient="linear(135deg, blue.500 0%, blue.600 100%)"
        minH={{ base: "70vh", sm: "500px" }}
        borderRadius="2xl"
        boxShadow="2xl"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="xl" color="white" thickness="4px" speed="0.7s" />
      </Box>
    );
  }

  if (isOffline) {
    return (
      <Box position="fixed" bottom={{ base: 10, md: 6 }} right={0} zIndex="1600" p={2}>
        <ScaleFade initialScale={0.9} in={true}>
          <Box
            width={{ base: "90vw", sm: "320px" }}
            bg="white"
            boxShadow="2xl"
            borderRadius="lg"
            p={4}
            textAlign="center"
          >
            <Text color="red.500" fontWeight="bold">ไม่สามารถเชื่อมต่ออินเทอร์เน็ต</Text>
            <Text fontSize="sm" color="gray.500">กรุณาตรวจสอบการเชื่อมต่อของคุณ</Text>
          </Box>
        </ScaleFade>
      </Box>
    );
  }

  if (!currentUser) {
    return (
      <Box position="fixed" bottom={{ base: 10, md: 6 }} right={0} zIndex="1600" p={2}
        bgGradient="linear(135deg, blue.500 0%, blue.600 100%)"
        minH={{ base: "70vh", sm: "500px" }}
        borderRadius="2xl"
        boxShadow="2xl"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="white" fontWeight="bold" fontSize="lg">กรุณาเข้าสู่ระบบเพื่อใช้งานแชท</Text>
      </Box>
    );
  }

  // นับจำนวน unread จริง ๆ
  const unreadCount = conversations.filter(
    (c) => c.lastMessage && c.lastMessage.senderId !== currentUser?.uid && !c.lastMessage.isRead
  ).length;

  if (isOpen) {
    return (
      <Box position="fixed" bottom={{ base: 10, md: 6 }} right={0} zIndex="1600" p={2}
        bgGradient="linear(135deg, blue.500 0%, blue.600 100%)"
        width={{ base: "98vw", sm: "400px" }}
        maxW="400px"
        height={{ base: "560px", sm: "560px" }}
        borderRadius="24px"
        boxShadow="2xl"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
      >
        <Box
          width="100%"
          height="100%"
          bg="rgba(255,255,255,0.07)"
          boxShadow="2xl"
          borderRadius="24px"
          display="flex"
          flexDirection="column"
          overflow="hidden"
          backdropFilter="blur(6px)"
        >
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              currentUser={currentUser}
              onClose={() => setSelectedConversation(null)}
              onCloseWidget={() => setIsOpen(false)}
              containerHeight={560}
              borderRadius="24px"
            />
          ) : (
            <ChatList
              conversations={conversations}
              currentUser={currentUser}
              onSelectConversation={setSelectedConversation}
              onDeleteConversation={() => {}}
              onCloseWidget={() => setIsOpen(false)}
              containerHeight={560}
              showCloseButton={true}
              showNewChatButton={false}
              showTitle={true}
            />
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box position="fixed" bottom={{ base: 10, md: 6 }} right={0} zIndex="1600" p={2}
      bg="white"
      width={{ base: "90vw", sm: "320px" }}
      maxW="320px"
      height="64px"
      borderRadius="28px"
      boxShadow="2xl"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={6}
      py={0}
    >
      <Box
        width="100%"
        height="100%"
        display="flex"
        flexDirection="row"
        alignItems="center"
        gap={4}
        overflow="auto"
        cursor="pointer"
        onClick={() => setIsOpen(true)}
      >
        {/* ไอคอน + badge */}
        <Box position="relative" mr={1}>
          <FaComments color="blue.500" size={22} />
          {unreadCount > 0 && (
            <Circle
              size="18px"
              bg="blue.500"
              color="white"
              fontSize="xs"
              fontWeight="bold"
              position="absolute"
              top="-8px"
              left="12px"
              border="2px solid white"
            >
              {unreadCount}
            </Circle>
          )}
        </Box>
        {/* ข้อความ */}
        <Text color="gray.800" fontWeight="bold" fontSize="md" mr={2}>
          ข้อความ
        </Text>
        {/* โปรไฟล์ + วงแหวน */}
        <Box
          ml="auto"
          border="3px solid blue.500"
          borderRadius="full"
          p="1px"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Box
            as="img"
            src={currentUser?.photoURL || "/default-avatar.png"}
            alt="profile"
            width="32px"
            height="32px"
            borderRadius="full"
            objectFit="cover"
          />
        </Box>
      </Box>
    </Box>
  );
};

export default ChatWidget;
