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
import { FaPlus } from 'react-icons/fa';
import { User, Conversation } from '../types/chat';

const Inbox = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

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
      <MainLayout role={role} currentUser={currentUser} showSidebar={false}>
        <Center h="100vh"><Spinner /></Center>
      </MainLayout>
    );
  }

  return (
    <MainLayout role={role} currentUser={currentUser} showSidebar={false}>
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
  );
};

export default Inbox;
