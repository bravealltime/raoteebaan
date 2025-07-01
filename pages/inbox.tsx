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
  useDisclosure,
  Heading,
  Badge,
  Spacer,
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
  getDocs,
  setDoc,
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
import { FaPaperPlane, FaPlus } from "react-icons/fa";
import NewConversationModal from "../components/NewConversationModal";

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
  const [onlineStatus, setOnlineStatus] = useState<Record<string, any>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setCurrentUser({ uid: user.uid, ...userDoc.data() } as User);
        } else {
          router.push("/login");
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
        state: "offline",
        last_changed: rtdbServerTimestamp(),
      };
      const isOnlineForDatabase = {
        state: "online",
        last_changed: rtdbServerTimestamp(),
      };

      onValue(dbRef(rtdb, ".info/connected"), (snapshot) => {
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
      if (snapshot.empty) {
        setLoading(false);
      }
      const convos = await Promise.all(
        snapshot.docs.map(async (docData) => {
          const conversationData = docData.data();
          const allParticipantUids = conversationData.participants;

          const participants = await Promise.all(
            allParticipantUids.map(async (uid: string) => {
              const userDoc = await getDoc(doc(db, "users", uid));
              if (userDoc.exists()) {
                return { uid: userDoc.id, ...userDoc.data() } as User;
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

    await setDoc(
      doc(db, "conversations", selectedConversation.id),
      {
        lastMessage: newMessage,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    setNewMessage("");
  };

  const handleSelectUser = async (user: User) => {
    if (!currentUser) return;

    // Check if a conversation with this user already exists
    const existingConversation = conversations.find((convo) =>
      convo.participants.some((p) => p.uid === user.uid)
    );

    if (existingConversation) {
      setSelectedConversation(existingConversation);
      onClose(); // Close the modal
      return;
    }

    // Create a new conversation
    try {
      const newConversationRef = doc(collection(db, "conversations"));
      
      // Store participant UIDs in Firestore, not the whole objects
      const newConversationData = {
        participants: [currentUser.uid, user.uid],
        lastMessage: "",
        updatedAt: serverTimestamp(),
      };

      await setDoc(newConversationRef, newConversationData);

      // The real-time listener will automatically add the new conversation to the list.
      // We just need to close the modal.
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
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find((p) => p.uid !== currentUser?.uid);
  };

  const getRoleColorScheme = (role: string) => {
    switch (role) {
      case "admin":
        return "red";
      case "juristic":
        return "blue";
      case "tenant":
        return "green";
      default:
        return "gray";
    }
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
          bg="gray.50"
          borderRight="1px solid"
          borderColor="gray.200"
          p={4}
          spacing={4}
          align="stretch"
        >
          <Flex justify="space-between" align="center" mb={2}>
            <Heading size="lg">Inbox</Heading>
            <IconButton
              aria-label="New Conversation"
              icon={<FaPlus />}
              isRound
              size="sm"
              variant="ghost"
              onClick={onOpen}
            />
          </Flex>
          <VStack as="nav" spacing={1} align="stretch" overflowY="auto">
            {conversations.length > 0 ? (
              conversations.map((convo) => {
                const otherUser = getOtherParticipant(convo);
                const isOnline = otherUser
                  ? onlineStatus[otherUser.uid]?.state === "online"
                  : false;
                const isSelected =
                  selectedConversation?.id === convo.id;
                return (
                  <HStack
                    key={convo.id}
                    p={3}
                    borderRadius="lg"
                    cursor="pointer"
                    bg={isSelected ? "blue.500" : "transparent"}
                    color={isSelected ? "white" : "inherit"}
                    _hover={{ bg: isSelected ? "blue.600" : "gray.200" }}
                    onClick={() => setSelectedConversation(convo)}
                    transition="background 0.2s ease-in-out"
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
                      {otherUser?.roomNumber && (
                        <Text fontSize="xs" color={isSelected ? "gray.300" : "gray.500"}>
                          Room: {otherUser.roomNumber}
                        </Text>
                      )}
                      <Text
                        fontSize="sm"
                        color={isSelected ? "gray.200" : "gray.500"}
                        noOfLines={1}
                      >
                        {convo.lastMessage}
                      </Text>
                    </VStack>
                    <Badge colorScheme={getRoleColorScheme(otherUser?.role || "")}>
                      {otherUser?.role}
                    </Badge>
                  </HStack>
                );
              })
            ) : (
              <Text color="gray.500" textAlign="center" mt={10}>
                No conversations yet. Start one by clicking the + button.
              </Text>
            )}
          </VStack>
        </VStack>

        <Flex flex={1} direction="column" bg="white">
          {selectedConversation ? (
            <>
              <HStack
                p={4}
                borderBottom="1px solid"
                borderColor="gray.200"
                bg="gray.50"
              >
                <Avatar name={getOtherParticipant(selectedConversation)?.name} />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold">
                    {getOtherParticipant(selectedConversation)?.name}
                  </Text>
                  <HStack>
                    <Circle
                      size="10px"
                      bg={
                        onlineStatus[
                          getOtherParticipant(selectedConversation)?.uid || ""
                        ]?.state === "online"
                          ? "green.500"
                          : "gray.400"
                      }
                    />
                    <Text fontSize="sm" color="gray.500">
                      {onlineStatus[
                        getOtherParticipant(selectedConversation)?.uid || ""
                      ]?.state === "online"
                        ? "Online"
                        : "Offline"}
                    </Text>
                    {getOtherParticipant(selectedConversation)?.roomNumber && (
                      <Text fontSize="sm" color="gray.500">
                        · Room: {getOtherParticipant(selectedConversation)?.roomNumber}
                      </Text>
                    )}
                  </HStack>
                </VStack>
                <Spacer />
                <Badge colorScheme={getRoleColorScheme(getOtherParticipant(selectedConversation)?.role || "")}>
                  {getOtherParticipant(selectedConversation)?.role}
                </Badge>
              </HStack>

              <VStack
                flex={1}
                p={6}
                spacing={4}
                overflowY="auto"
                bg="gray.100"
              >
                {messages.map((msg) => (
                  <Flex
                    key={msg.id}
                    w="full"
                    justify={
                      msg.senderId === currentUser?.uid
                        ? "flex-end"
                        : "flex-start"
                    }
                  >
                    <Box
                      bg={
                        msg.senderId === currentUser?.uid
                          ? "blue.500"
                          : "white"
                      }
                      color={
                        msg.senderId === currentUser?.uid ? "white" : "black"
                      }
                      px={4}
                      py={2}
                      borderRadius="xl"
                      maxW="65%"
                      boxShadow="sm"
                    >
                      {msg.text}
                    </Box>
                  </Flex>
                ))}
                <div ref={messagesEndRef} />
              </VStack>

              <Box p={4} bg="gray.50">
                <InputGroup size="md">
                  <Input
                    variant="filled"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleSendMessage()
                    }
                    borderRadius="full"
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label="Send"
                      icon={<FaPaperPlane />}
                      onClick={handleSendMessage}
                      size="sm"
                      isRound
                      colorScheme="blue"
                      variant="solid"
                      isDisabled={newMessage.trim() === ""}
                    />
                  </InputRightElement>
                </InputGroup>
              </Box>
            </>
          ) : (
            <Flex
              flex={1}
              justify="center"
              align="center"
              direction="column"
              color="gray.400"
              bg="gray.50"
            >
              <FaPaperPlane size="4em" />
              <Heading mt={4} size="lg">
                Your Messages
              </Heading>
              <Text mt={2}>
                Select a conversation to see messages or start a new one.
              </Text>
            </Flex>
          )}
        </Flex>
      </Flex>
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
