
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
        bgGradient="linear(135deg, #262c36 0%, #23272f 100%)"
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
        bgGradient="linear(135deg, #262c36 0%, #23272f 100%)"
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
        bgGradient="linear(135deg, #262c36 0%, #23272f 100%)"
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
          <Box display="flex" alignItems="center" justifyContent="space-between" p={4} borderBottom="1px solid #e2e8f0">
            <Text color="white" fontWeight="bold" fontSize="xl">
              {selectedConversation ? 'แชทกับ ' + (selectedConversation.participants.find(p => p.uid !== currentUser?.uid)?.name || '') : 'ข้อความ'}
            </Text>
            <Box as="button" onClick={() => {
              if (selectedConversation) setSelectedConversation(null);
              else setIsOpen(false);
            }} color="white" fontSize="2xl" _hover={{ color: '#6c38ff' }}>
              ×
            </Box>
          </Box>
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              currentUser={currentUser}
              onClose={() => setSelectedConversation(null)}
              containerHeight={480}
            />
          ) : (
            <ChatList
              conversations={conversations}
              currentUser={currentUser}
              onSelectConversation={setSelectedConversation}
              containerHeight={480}
            />
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box position="fixed" bottom={{ base: 10, md: 6 }} right={0} zIndex="1600" p={2}
      bgGradient="linear(135deg, #262c36 0%, #23272f 100%)"
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
        bg="rgba(255,255,255,0.07)"
        boxShadow="2xl"
        borderRadius="28px"
        display="flex"
        flexDirection="row"
        alignItems="center"
        gap={4}
        overflow="auto"
        backdropFilter="blur(6px)"
        cursor="pointer"
        onClick={() => setIsOpen(true)}
      >
        {/* ไอคอน + badge */}
        <Box position="relative" mr={1}>
          <FaComments color="white" size={22} />
          {unreadCount > 0 && (
            <Circle
              size="18px"
              bg="red.500"
              color="white"
              fontSize="xs"
              fontWeight="bold"
              position="absolute"
              top="-8px"
              left="12px"
              border="2px solid #23272f"
            >
              {unreadCount}
            </Circle>
          )}
        </Box>
        {/* ข้อความ */}
        <Text color="white" fontWeight="bold" fontSize="md" mr={2}>
          ข้อความ
        </Text>
        {/* โปรไฟล์ + วงแหวน */}
        <Box
          ml="auto"
          border="3px solid #6c38ff"
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
