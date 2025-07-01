import {
  Avatar,
  Box,
  Button,
  Circle,
  Divider,
  Flex,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  Spinner,
  Text,
  VStack,
  useToast,
  IconButton,
} from "@chakra-ui/react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  ref as dbRef,
  onValue,
  onDisconnect,
  set,
  serverTimestamp as rtdbServerTimestamp,
} from "firebase/database";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { auth, db, rtdb } from "../lib/firebase";
import MainLayout from "../components/MainLayout";
import { FaPaperPlane } from "react-icons/fa";

interface User {
  uid: string;
  name: string;
  email: string;
  role: string;
}

interface Conversation {
  id: string;
  participants: User[];
  lastMessage: string;
  updatedAt: any;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
}

const Inbox = () => {
  const router = useRouter();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setCurrentUser({ uid: user.uid, ...userDoc.data() } as User);
        }
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (currentUser && rtdb) {
      const userStatusRef = dbRef(rtdb, `/status/${currentUser.uid}`);
      const isOfflineForDatabase = {
        state: 'offline',
        last_changed: rtdbServerTimestamp(),
      };
      const isOnlineForDatabase = {
        state: 'online',
        last_changed: rtdbServerTimestamp(),
      };

      onValue(dbRef(rtdb, '.info/connected'), (snapshot) => {
        if (snapshot.val() === false) {
          return;
        }
        onDisconnect(userStatusRef)
          .set(isOfflineForDatabase)
          .then(() => {
            set(userStatusRef, isOnlineForDatabase);
          });
      });
    }
  }, [currentUser, rtdb]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const convos = await Promise.all(
        snapshot.docs.map(async (docData) => {
          const conversationData = docData.data();
          const participantIds = conversationData.participants.filter(
            (p: string) => p !== currentUser.uid
          );
          const participants = await Promise.all(
            participantIds.map(async (id: string) => {
              const userDoc = await getDoc(doc(db, "users", id));
              return { uid: id, ...userDoc.data() } as User;
            })
          );
          return {
            id: docData.id,
            participants,
            ...conversationData,
          } as Conversation;
        })
      );
      setConversations(convos);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedConversation) return;

    const q = query(
      collection(
        db,
        "conversations",
        selectedConversation.id,
        "messages"
      ),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((docData) => ({
        id: docData.id,
        ...docData.data(),
      })) as Message[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
        const statusRef = dbRef(rtdb, "status");
    const unsubscribe = onValue(statusRef, (snapshot) => {
      setOnlineStatus(snapshot.val() || {});
    });
    return () => unsubscribe();
  }, []);

  const handleSendMessage = async () => {
    if (newMessage.trim() === "" || !selectedConversation || !currentUser)
      return;

    const messageData = {
      senderId: currentUser.uid,
      text: newMessage,
      timestamp: serverTimestamp(),
    };

    await addDoc(
      collection(
        db,
        "conversations",
        selectedConversation.id,
        "messages"
      ),
      messageData
    );

    await addDoc(doc(db, "conversations", selectedConversation.id), {
      lastMessage: newMessage,
      updatedAt: serverTimestamp(),
    });

    setNewMessage("");
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find((p) => p.uid !== currentUser?.uid);
  };

  if (loading) {
    return (
      <MainLayout role={currentUser?.role}>
        <Flex justify="center" align="center" h="100vh">
          <Spinner />
        </Flex>
      </MainLayout>
    );
  }

  return (
    <MainLayout role={currentUser?.role}>
      <Flex h="calc(100vh - 80px)">
        <VStack
          w="350px"
          borderRight="1px solid"
          borderColor="gray.200"
          p={4}
          spacing={4}
          align="stretch"
        >
          <Text fontSize="2xl" fontWeight="bold">
            Inbox
          </Text>
          <Divider />
          {conversations.map((convo) => {
            const otherUser = getOtherParticipant(convo);
            const isOnline = otherUser
              ? onlineStatus[otherUser.uid]?.state === "online"
              : false;
            return (
              <HStack
                key={convo.id}
                p={2}
                borderRadius="md"
                cursor="pointer"
                bg={
                  selectedConversation?.id === convo.id
                    ? "blue.100"
                    : "transparent"
                }
                _hover={{ bg: "gray.100" }}
                onClick={() => setSelectedConversation(convo)}
              >
                <Avatar name={otherUser?.name}>
                  <Circle
                    size="12px"
                    bg={isOnline ? "green.500" : "gray.400"}
                    border="2px solid white"
                    position="absolute"
                    bottom="0"
                    right="0"
                  />
                </Avatar>
                <VStack align="start" spacing={0} flex={1}>
                  <Text fontWeight="bold">{otherUser?.name}</Text>
                  <Text fontSize="sm" color="gray.500" noOfLines={1}>
                    {convo.lastMessage}
                  </Text>
                </VStack>
              </HStack>
            );
          })}
        </VStack>

        <Flex flex={1} direction="column">
          {selectedConversation ? (
            <>
              <HStack p={4} borderBottom="1px solid" borderColor="gray.200">
                <Avatar name={getOtherParticipant(selectedConversation)?.name} />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold">
                    {getOtherParticipant(selectedConversation)?.name}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    {onlineStatus[
                      getOtherParticipant(selectedConversation)?.uid || ""
                    ]?.state === "online"
                      ? "Online"
                      : "Offline"}
                  </Text>
                </VStack>
              </HStack>

              <VStack
                flex={1}
                p={4}
                spacing={4}
                overflowY="auto"
                bg="gray.50"
              >
                {messages.map((msg) => (
                  <Flex
                    key={msg.id}
                    w="full"
                    justify={
                      msg.senderId === currentUser?.uid ? "flex-end" : "flex-start"
                    }
                  >
                    <Box
                      bg={
                        msg.senderId === currentUser?.uid
                          ? "blue.500"
                          : "white"
                      }
                      color={
                        msg.senderId === currentUser?.uid
                          ? "white"
                          : "black"
                      }
                      px={4}
                      py={2}
                      borderRadius="lg"
                      maxW="70%"
                    >
                      {msg.text}
                    </Box>
                  </Flex>
                ))}
                <div ref={messagesEndRef} />
              </VStack>

              <HStack p={4}>
                <InputGroup>
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleSendMessage()
                    }
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label="Send"
                      icon={<FaPaperPlane />}
                      onClick={handleSendMessage}
                      size="sm"
                    />
                  </InputRightElement>
                </InputGroup>
              </HStack>
            </>
          ) : (
            <Flex
              flex={1}
              justify="center"
              align="center"
              direction="column"
              color="gray.400"
            >
              <FaPaperPlane size="4em" />
              <Text mt={4} fontSize="xl">
                Select a conversation to start messaging
              </Text>
            </Flex>
          )}
        </Flex>
      </Flex>
    </MainLayout>
  );
};

export default Inbox;