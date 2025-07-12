
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
  const { isOpen, onToggle, onClose } = useDisclosure();
  const [isOffline, setIsOffline] = useState(false);

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
        onToggle();
      }
    });

    return () => unsubscribe();
  }, [currentUser, isOpen, onToggle]);

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
    onClose();
  }

  if (loading) {
    return null; 
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
    return null; 
  }

  return (
    <Box position="fixed" bottom={{ base: 10, md: 6 }} right={0} zIndex="1600" p={2}>
      <ScaleFade initialScale={0.9} in={isOpen}>
        <Box
          width={{ base: "95vw", sm: "340px" }}
          maxW="100vw"
          height={{ base: "65vh", sm: "480px" }}
          bg="white"
          boxShadow="2xl"
          borderRadius="lg"
          display="flex"
          flexDirection="column"
          overflow="hidden"
        >
          <Flex p={3} borderBottom="1px solid" borderColor="gray.200" alignItems="center" bg="blue.500" color="white">
            <Text fontWeight="bold">
              {selectedConversation && selectedConversation.participants && selectedConversation.participants.length > 1
                ? `Chat with ${selectedConversation.participants.find((p) => p.uid !== currentUser.uid)?.name}`
                : 'Messages'}
            </Text>
            <IconButton
              aria-label="Close chat"
              icon={<FaTimes />}
              size="sm"
              isRound
              variant="ghost"
              _hover={{ bg: 'blue.600' }}
              ml="auto"
              onClick={handleCloseWidget}
            />
          </Flex>

          {selectedConversation && currentUser ? (
            <ChatWindow
              conversation={selectedConversation}
              currentUser={currentUser}
              onClose={handleBackToList} 
            />
          ) : (
            <ChatList
              conversations={conversations}
              currentUser={currentUser}
              onSelectConversation={handleSelectConversation}
            />
          )}
        </Box>
      </ScaleFade>

      {!isOpen && (
        <Tooltip label="กล่องข้อความ" aria-label="กล่องข้อความ" placement="left" hasArrow>
          <IconButton
            aria-label="Open chat"
            icon={<FaComments />}
            isRound
            size="lg"
            colorScheme="blue"
            boxShadow="lg"
            onClick={onToggle}
            position="absolute"
            right={0}
            bottom={0}
            m={1}
            zIndex={1700}
          >
            {hasUnread && (
              <Circle
                size="10px"
                bg="red.500"
                position="absolute"
                top="2px"
                right="2px"
                border="2px solid white"
              />
            )}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default ChatWidget;
