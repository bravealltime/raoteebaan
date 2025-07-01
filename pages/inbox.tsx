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
  Image,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogCloseButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
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
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import {
  ref as dbRef,
  onValue,
  onDisconnect,
  set,
  serverTimestamp as rtdbServerTimestamp,
} from "firebase/database";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, useCallback } from "react";
import { auth, db, rtdb } from "../lib/firebase";
import MainLayout from "../components/MainLayout";
import { FaPaperPlane, FaPlus, FaTrash, FaImage } from "react-icons/fa";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import NewConversationModal from "../components/NewConversationModal";

interface User {
  uid: string;
  name: string;
  email: string;
  role: string;
  photoURL?: string;
  roomNumber?: string;
}

interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: { text: string; senderId: string; };
  updatedAt: any;
}

interface Message {
  id: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  timestamp: any;
}

const Inbox = () => {
  const router = useRouter();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const prevConversationsRef = useRef<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, any>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notificationSoundRef = useRef<HTMLAudioElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isAlertDialogOpen, onOpen: onAlertDialogOpen, onClose: onAlertDialogClose } = useDisclosure();
  const { isOpen: isImageModalOpen, onOpen: onImageModalOpen, onClose: onImageModalClose } = useDisclosure();
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setCurrentUser({ uid: user.uid, ...userDoc.data() } as User);
          console.log("Current User:", { uid: user.uid, ...userDoc.data() } as User);
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

      // Notification sound logic
      convos.forEach(newConvo => {
        const oldConvo = prevConversationsRef.current.find(c => c.id === newConvo.id);

        if (newConvo.lastMessage && newConvo.lastMessage.text &&
            (!oldConvo || !oldConvo.lastMessage || newConvo.lastMessage.text !== oldConvo.lastMessage.text || newConvo.lastMessage.senderId !== oldConvo.lastMessage.senderId) &&
            newConvo.lastMessage.senderId !== currentUser?.uid &&
            newConvo.id !== selectedConversation?.id) {
          notificationSoundRef.current?.play();
          console.log(`Playing notification sound for new message in conversation ${newConvo.id}`);
        }
      });

      prevConversationsRef.current = convos; // Update ref for next comparison
      setConversations(convos);
      if (convos.length > 0 && !selectedConversation) {
        setSelectedConversation(convos[0]);
      }
      console.log("Conversations:", convos);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, selectedConversation]);

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
      console.log("Selected Conversation Messages:", msgs);
    });

    return () => unsubscribe();
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const setMyTypingStatus = useCallback((typing: boolean) => {
    if (!currentUser || !selectedConversation) return;
    const typingRef = dbRef(rtdb, `typingStatus/${selectedConversation.id}/${currentUser.uid}`);
    set(typingRef, typing);
    console.log(`Setting typing status for ${currentUser.uid} to ${typing} in conversation ${selectedConversation.id}`);
  }, [currentUser, selectedConversation, rtdb]);

  useEffect(() => {
    if (!currentUser || !selectedConversation) return;

    const otherParticipant = getOtherParticipant(selectedConversation);
    if (!otherParticipant) return;

    const otherUserTypingRef = dbRef(rtdb, `typingStatus/${selectedConversation.id}/${otherParticipant.uid}`);

    const unsubscribeTyping = onValue(otherUserTypingRef, (snapshot) => {
      setOtherUserTyping(snapshot.val() || false);
      console.log(`Other user ${otherParticipant.name} typing status: ${snapshot.val() || false}`);
    });

    return () => {
      unsubscribeTyping();
      setMyTypingStatus(false); // Clear my typing status when conversation changes or unmounts
    };
  }, [currentUser, selectedConversation, rtdb, setMyTypingStatus]);

  useEffect(() => {
    const statusRef = dbRef(rtdb, "status");
    const unsubscribe = onValue(statusRef, (snapshot) => {
      setOnlineStatus(snapshot.val() || {});
    });
    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (imageUrl?: string) => {
    if ((newMessage.trim() === "" && !imageUrl) || !selectedConversation || !currentUser)
      return;

    setMyTypingStatus(false); // Clear typing status on message send

    const messageData: Partial<Message> = {
      senderId: currentUser.uid,
      timestamp: serverTimestamp(),
    };

    if (newMessage.trim() !== "") {
      messageData.text = newMessage;
    }
    if (imageUrl) {
      messageData.imageUrl = imageUrl;
    }

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
        lastMessage: { text: newMessage, senderId: currentUser.uid },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    setNewMessage("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    if (!currentUser || !selectedConversation) {
      toast({
        title: "Error",
        description: "Please select a conversation and be logged in to send images.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    console.log("Current User before upload:", currentUser); // Add this line

    setLoading(true); // Indicate loading for image upload
    try {
      const storage = getStorage();
      const imageRef = storageRef(storage, `chat_images/${selectedConversation.id}/${currentUser.uid}/${file.name}_${Date.now()}`);
      const snapshot = await uploadBytes(imageRef, file);
      const imageUrl = await getDownloadURL(snapshot.ref);

      await handleSendMessage(imageUrl);
      e.target.value = ""; // Clear the file input
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Could not upload image.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!selectedConversation) return;

    onAlertDialogClose(); // Close the alert dialog

    try {
      const batch = writeBatch(db);

      // Delete all messages in the subcollection
      const messagesRef = collection(db, "conversations", selectedConversation.id, "messages");
      const messageSnapshots = await getDocs(messagesRef);
      messageSnapshots.forEach((msgDoc) => {
        batch.delete(msgDoc.ref);
      });

      // Delete the conversation document
      const conversationRef = doc(db, "conversations", selectedConversation.id);
      batch.delete(conversationRef);

      await batch.commit();

      setSelectedConversation(null); // Deselect the conversation
      setConversations(prev => prev.filter(convo => convo.id !== selectedConversation.id)); // Remove from local state

      toast({
        title: "Conversation Deleted",
        description: "The conversation and all its messages have been deleted.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Error",
        description: "Could not delete conversation.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteClick = () => {
    onAlertDialogOpen();
  };

  const handleTyping = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      setMyTypingStatus(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setMyTypingStatus(false);
    }, 1500); // 1.5 seconds debounce
  }, [isTyping, setMyTypingStatus]);

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
                    <Avatar name={otherUser?.name} src={otherUser?.photoURL}>
                      
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
                        {convo.lastMessage?.text}
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
                <Avatar name={getOtherParticipant(selectedConversation)?.name} src={getOtherParticipant(selectedConversation)?.photoURL} />
                
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
                  {otherUserTyping && (
                    <Text fontSize="sm" color="blue.500" fontStyle="italic">
                      {getOtherParticipant(selectedConversation)?.name} is typing...
                    </Text>
                  )}
                </VStack>
                <Spacer />
                <Badge colorScheme={getRoleColorScheme(getOtherParticipant(selectedConversation)?.role || "")}>
                  {getOtherParticipant(selectedConversation)?.role}
                </Badge>
                <IconButton
                  aria-label="Delete Conversation"
                  icon={<FaTrash />}
                  onClick={handleDeleteClick}
                  size="sm"
                  colorScheme="red"
                  variant="ghost"
                />
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
                      {msg.text && <Text>{msg.text}</Text>}
                      {msg.imageUrl && <Image src={msg.imageUrl} maxW="200px" borderRadius="md" mt={msg.text ? 2 : 0} cursor="pointer" onClick={() => { setZoomImageUrl(msg.imageUrl || null); onImageModalOpen(); }} />}
                    </Box>
                  </Flex>
                ))}
                <div ref={messagesEndRef} />
              </VStack>

              <Box p={4} bg="gray.50">
                <HStack>
                  <IconButton
                    aria-label="Upload Image"
                    icon={<FaImage />}
                    onClick={() => imageInputRef.current?.click()}
                    size="md"
                    isRound
                    colorScheme="gray"
                    variant="ghost"
                  />
                  <InputGroup size="md">
                    <Input
                      variant="filled"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={handleTyping}
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleSendMessage()
                      }
                      borderRadius="full"
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label="Send"
                        icon={<FaPaperPlane />}
                        onClick={() => handleSendMessage()}
                        size="sm"
                        isRound
                        colorScheme="blue"
                        variant="solid"
                        isDisabled={newMessage.trim() === ""}
                      />
                    </InputRightElement>
                  </InputGroup>
                </HStack>
                <input
                  type="file"
                  accept="image/*"
                  ref={imageInputRef}
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />
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
      <audio ref={notificationSoundRef} src="/sounds/notification.mp3" preload="auto" />

      <AlertDialog
        isOpen={isAlertDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={onAlertDialogClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              ลบการสนทนา
            </AlertDialogHeader>

            <AlertDialogBody>
              คุณแน่ใจหรือไม่ว่าต้องการลบการสนทนานี้? ข้อความทั้งหมดจะถูกลบอย่างถาวร
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onAlertDialogClose}>
                ยกเลิก
              </Button>
              <Button colorScheme="red" onClick={onConfirmDelete} ml={3}>
                ลบ
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <Modal isOpen={isImageModalOpen} onClose={onImageModalClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent bg="transparent" boxShadow="none">
          <ModalCloseButton color="white" />
          <ModalBody p={0}>
            {zoomImageUrl && <Image src={zoomImageUrl} maxW="full" maxH="90vh" objectFit="contain" />}
          </ModalBody>
        </ModalContent>
      </Modal>
    </MainLayout>
  );
};

export default Inbox;
