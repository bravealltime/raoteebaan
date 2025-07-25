import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Flex,
  Spinner,
  Center,
  useDisclosure,
  Heading,
  useToast,
  Button,
  Grid,
  GridItem,
  Text,
  VStack,
  Icon,
  useBreakpointValue,
} from '@chakra-ui/react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import MainLayout from '../components/MainLayout';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import NewConversationModal from '../components/NewConversationModal';
import { FaPlus, FaComments } from 'react-icons/fa';
import { User, Conversation } from '../types/chat';

const Inbox = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const isDesktop = useBreakpointValue({ base: false, lg: true });
  const [onlineStatus, setOnlineStatus] = useState<Record<string, any>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUser({
            uid: user.uid,
            name: userData.name || user.displayName || '',
            email: userData.email || user.email || '',
            role: userData.role || '',
            photoURL: userData.avatar || user.photoURL || undefined,
            roomNumber: userData.roomNumber || undefined,
          } as User);
          setRole(userData.role);
        }
      } else {
        // Handle user not logged in
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', currentUser.uid),
        orderBy('updatedAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const convos = await Promise.all(
          snapshot.docs.map(async (docData) => {
            const conversationData = docData.data();
            const participants = await Promise.all(
              (conversationData.participants || []).map(async (uid: string) => {
                const userDoc = await getDoc(doc(db, "users", uid));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  return { uid: userDoc.id, ...userData, photoURL: userData.avatar || userData.photoURL } as User;
                }
                return { uid, name: "Unknown User", email: "", role: "" };
              })
            );
            return {
              id: docData.id,
              ...conversationData,
              participants,
            } as Conversation;
          })
        );
        setConversations(convos);
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  useEffect(() => {
    if (conversations.length > 0) {
      // Subscribe presence for all participants
      const unsubscribes = new Set<() => void>();
      const userIds = new Set<string>();
      conversations.forEach(convo => {
        convo.participants.forEach((p: any) => {
          if (typeof p === 'string') userIds.add(p);
          else if (p.uid) userIds.add(p.uid);
        });
      });
      userIds.forEach(uid => {
        const unsub = onSnapshot(doc(db, 'users', uid), (docSnap) => {
          if (docSnap.exists()) {
            setOnlineStatus(prev => ({ ...prev, [uid]: { state: docSnap.data().state } }));
          }
        });
        unsubscribes.add(unsub);
      });
      return () => { unsubscribes.forEach(unsub => unsub()); };
    }
  }, [conversations]);

  const handleSelectUser = useCallback(async (user: User) => {
    if (!currentUser) return;

    const existingConversation = conversations.find((convo) =>
      convo.participants.some((p) => p.uid === user.uid)
    );

    if (existingConversation) {
      setSelectedConversation(existingConversation);
      onClose();
      return;
    }

    try {
      const newConversationRef = doc(collection(db, "conversations"));
      
      const newConversationData = {
        participants: [currentUser.uid, user.uid],
        lastMessage: { text: "", senderId: currentUser.uid },
        updatedAt: serverTimestamp(),
      };

      await setDoc(newConversationRef, newConversationData);

      const newConversation = {
        id: newConversationRef.id,
        ...newConversationData,
        participants: [currentUser, user]
      } as Conversation;

      setSelectedConversation(newConversation);
      onClose();

    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Could not start a new conversation.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [currentUser, conversations, onClose, toast]);

  if (loading) {
    return (
      <MainLayout role={role} currentUser={currentUser} showSidebar={role !== 'user'}>
        <Center h="100vh"><Spinner /></Center>
      </MainLayout>
    );
  }

  if (!isDesktop) {
    // Mobile view - original logic
    return (
      <MainLayout role={role} currentUser={currentUser} showSidebar={role !== 'user'}>
        <Box h="calc(100vh - 110px)" bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              currentUser={currentUser}
              onClose={() => setSelectedConversation(null)}
            />
          ) : (
            <Flex direction="column" h="100%">
              <Flex
                justify="space-between"
                align="center"
                p={4}
                borderBottom="1px solid"
                borderColor="gray.200"
              >
                <Heading size="md">Messages</Heading>
                {(role === 'admin' || role === 'owner') && (
                  <Button
                    size="sm"
                    leftIcon={<FaPlus />}
                    onClick={onOpen}
                    colorScheme="blue"
                  >
                    New Conversation
                  </Button>
                )}
              </Flex>
              <Box flex="1" overflowY="auto">
                <ChatList
                  conversations={conversations}
                  currentUser={currentUser}
                  onSelectConversation={setSelectedConversation}
                  onlineStatus={onlineStatus}
                />
              </Box>
            </Flex>
          )}
        </Box>
        <NewConversationModal
          isOpen={isOpen}
          onClose={onClose}
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
        />
      </MainLayout>
    )
  }

  // Desktop view - 2-column layout
  return (
    <MainLayout role={role} currentUser={currentUser} showSidebar={role !== 'user'}>
      <Grid
        h="calc(100vh - 110px)"
        templateColumns="350px 1fr"
        gap={4}
        bg="gray.50"
        p={4}
      >
        <GridItem bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
           <Flex direction="column" h="100%">
            <Flex
              justify="space-between"
              align="center"
              p={4}
              borderBottom="1px solid"
              borderColor="gray.200"
              flexShrink={0}
            >
              <Heading size="md">Messages</Heading>
              {(role === 'admin' || role === 'owner') && (
                <Button
                  size="sm"
                  leftIcon={<FaPlus />}
                  onClick={onOpen}
                  colorScheme="blue"
                >
                  New
                </Button>
              )}
            </Flex>
            <Box flex="1" overflowY="auto">
              <ChatList
                conversations={conversations}
                currentUser={currentUser}
                onSelectConversation={setSelectedConversation}
                selectedConversationId={selectedConversation?.id}
                onlineStatus={onlineStatus}
              />
            </Box>
          </Flex>
        </GridItem>
        <GridItem bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              currentUser={currentUser}
              onClose={() => setSelectedConversation(null)} // This will be hidden on desktop
            />
          ) : (
            <Center h="100%">
              <VStack spacing={4}>
                <Icon as={FaComments} w={16} h={16} color="gray.300" />
                <Heading size="md" color="gray.500">Select a conversation</Heading>
                <Text color="gray.400">Choose from the list on the left to start chatting.</Text>
              </VStack>
            </Center>
          )}
        </GridItem>
      </Grid>
      <NewConversationModal
        isOpen={isOpen}
        onClose={onClose}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
      />
    </MainLayout>
  );
};

export default Inbox;
