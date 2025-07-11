import {
  Avatar,
  Box,
  Button,
  Circle,
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
  useBreakpointValue,
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
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import {
  ref as dbRef,
  onValue,
  onDisconnect,
  set,
  serverTimestamp as rtdbServerTimestamp,
} from "firebase/database";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { auth, db, rtdb } from "../lib/firebase";
import MainLayout from "../components/MainLayout";
import { FaPaperPlane, FaPlus, FaTrash, FaImage, FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import NewConversationModal from "../components/NewConversationModal";
import { User, Conversation, Message } from "../types/chat";

// Utility function to escape HTML characters
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>'"]/g, function(m) { return map[m]; });
}

const Inbox = () => {
  const router = useRouter();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const selectedConversation = useMemo(() => {
    return conversations.find(convo => convo.id === selectedConversationId);
  }, [conversations, selectedConversationId]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, any>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const { isOpen: isAlertDialogOpen, onOpen: onAlertDialogOpen, onClose: onAlertDialogClose } = useDisclosure();
  const { isOpen: isImageModalOpen, onOpen: onImageModalOpen, onClose: onImageModalClose } = useDisclosure();
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isMobile = useBreakpointValue({ base: true, md: false });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const firestoreData = userDoc.data();
          setCurrentUser({
            uid: user.uid,
            name: firestoreData.name || user.displayName || '',
            email: firestoreData.email || user.email || '',
            role: firestoreData.role || '',
            photoURL: firestoreData.avatar || user.photoURL || undefined,
            roomNumber: firestoreData.roomNumber || undefined,
          } as User);
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
    if (router.query.conversationId && typeof router.query.conversationId === 'string') {
      setSelectedConversationId(router.query.conversationId);
    }
  }, [router.query.conversationId]);

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
          
          const allParticipantUids = Array.isArray(conversationData.participants) ? conversationData.participants : [];

          const participants = await Promise.all(
            allParticipantUids.map(async (uid: string) => {
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

      // Calculate unread message count
      let unreadCount = 0;
      for (const convo of convos) {
        if (convo.lastMessage && convo.lastMessage.senderId !== currentUser?.uid && !convo.lastMessage.isRead) {
          unreadCount++;
        }
      }
      setUnreadMessageCount(unreadCount);

      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;

    const q = query(
      collection(
        db,
        "conversations",
        selectedConversationId,
        "messages"
      ),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map((docData) => ({
        id: docData.id,
        ...docData.data(),
      })) as Message[];

      setMessages(msgs);
      
      // Mark messages as read
      const batch = writeBatch(db);
      let messagesToMarkAsRead = 0;
      msgs.forEach((msg) => {
        if (msg.receiverId === currentUser?.uid && !msg.isRead) {
          const messageRef = doc(db, "conversations", selectedConversationId, "messages", msg.id);
          batch.update(messageRef, { isRead: true });
          messagesToMarkAsRead++;
        }
      });
      if (messagesToMarkAsRead > 0) {
        await batch.commit();
      }
    });

    return () => unsubscribe();
  }, [selectedConversationId, currentUser?.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isMobile && conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId, isMobile]);

  const setMyTypingStatus = useCallback((typing: boolean) => {
    if (!currentUser || !selectedConversationId) return;
    const typingRef = dbRef(rtdb, `typingStatus/${selectedConversationId}/${currentUser.uid}`);
    set(typingRef, typing);
  }, [currentUser, selectedConversationId, rtdb]);

  useEffect(() => {
    if (!currentUser || !selectedConversationId || !selectedConversation) return;

    const otherParticipant = getOtherParticipant(selectedConversation);
    if (!otherParticipant) return;

    const otherUserTypingRef = dbRef(rtdb, `typingStatus/${selectedConversationId}/${otherParticipant.uid}`);

    const unsubscribeTyping = onValue(otherUserTypingRef, (snapshot) => {
      setOtherUserTyping(snapshot.val() || false);
    });

    return () => {
      unsubscribeTyping();
      setMyTypingStatus(false);
    };
  }, [currentUser, selectedConversationId, rtdb, setMyTypingStatus, selectedConversation]);

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

    setMyTypingStatus(false);

    const messageData: Partial<Message> = {
      senderId: currentUser.uid,
      timestamp: serverTimestamp() as Timestamp,
    };

    if (newMessage.trim() !== "") {
      messageData.text = escapeHtml(newMessage);
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
        lastMessage: { text: escapeHtml(newMessage), senderId: currentUser.uid, isRead: false, receiverId: getOtherParticipant(selectedConversation)?.uid },
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

    setIsImageUploading(true);
    try {
      const storage = getStorage();
      const imageRef = storageRef(storage, `chat_images/${selectedConversation.id}/${currentUser.uid}/${file.name}_${Date.now()}`);
      const snapshot = await uploadBytes(imageRef, file);
      const imageUrl = await getDownloadURL(snapshot.ref);

      await handleSendMessage(imageUrl);
      e.target.value = "";
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
      setIsImageUploading(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!selectedConversation) return;

    onAlertDialogClose();

    try {
      const batch = writeBatch(db);

      const messagesRef = collection(db, "conversations", selectedConversation.id, "messages");
      const messageSnapshots = await getDocs(messagesRef);
      messageSnapshots.forEach((msgDoc) => {
        batch.delete(msgDoc.ref);
      });

      const conversationRef = doc(db, "conversations", selectedConversation.id);
      batch.delete(conversationRef);

      await batch.commit();

      setSelectedConversationId(null);
      setConversations(prev => prev.filter(convo => convo.id !== selectedConversation.id));

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
    }, 1500);
  }, [isTyping, setMyTypingStatus]);

  const handleSelectUser = async (user: User) => {
    if (!currentUser) return;

    const existingConversation = conversations.find((convo) =>
      convo.participants.some((p) => p.uid === user.uid)
    );

    if (existingConversation) {
      setSelectedConversationId(existingConversation.id);
      onClose();
      return;
    }

    try {
      const newConversationRef = doc(collection(db, "conversations"));
      
      const newConversationData = {
        participants: [currentUser.uid, user.uid],
        lastMessage: "",
        updatedAt: serverTimestamp(),
      };

      await setDoc(newConversationRef, newConversationData);

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

  const getOtherParticipant = (conversation: Conversation | undefined) => {
    if (!conversation || !currentUser) {
      return undefined;
    }

    const participants: User[] = conversation.participants || [];

    return participants.find((p) => p.uid !== currentUser.uid);
  };

  const getRoleColorScheme = (role: string) => {
    switch (role) {
      case "admin":
        return "yellow";
      case "juristic":
        return "purple";
      case "technician":
        return "orange";
      case "owner":
        return "green";
      case "user":
        return "blue";
      default:
        return "gray";
    }
  };

  if (loading) {
    return (
      <MainLayout role={currentUser?.role} currentUser={currentUser}>
        <Flex justify="center" align="center" h="100vh">
          <Spinner />
        </Flex>
      </MainLayout>
    );
  }

  // Start of Inbox component JSX
  return (
    <MainLayout role={currentUser?.role} currentUser={currentUser} showSidebar={false}>
      <Flex h="calc(100vh - 4rem)" bg="gray.50" borderRadius="lg" boxShadow="md" overflow="hidden">
        {/* Sidebar: แสดงเฉพาะ desktop หรือ mobile ที่ยังไม่ได้เลือกแชท */}
        {(!isMobile || !selectedConversationId) && (
          <VStack
            w={{ base: "100%", md: isSidebarExpanded ? "320px" : "80px" }}
            minW={{ base: "100%", md: isSidebarExpanded ? "320px" : "80px" }}
            maxW={{ base: "100%", md: isSidebarExpanded ? "320px" : "80px" }}
            h="100%"
            bg="white"
            borderRight={{ md: "1px solid" }}
            borderColor="gray.200"
            p={{ base: 2, md: 4 }}
            spacing={4}
            align="stretch"
            transition="width 0.2s, min-width 0.2s, max-width 0.2s"
            boxShadow={{ base: "md", md: "none" }}
            zIndex={2}
          >
            <Flex justify="space-between" align="center" mb={2}>
              <HStack spacing={2} align="center">
                {isSidebarExpanded && (
                  <Heading size="md" whiteSpace="nowrap">ข้อความ</Heading>
                )}
              </HStack>

              <HStack spacing={2}>
                {isSidebarExpanded && unreadMessageCount > 0 && (
                  <Badge colorScheme="red" borderRadius="full" px={2} py={0.5} fontSize="sm">
                    {unreadMessageCount}
                  </Badge>
                )}
                <IconButton
                  aria-label="ขยาย/ย่อ Sidebar"
                  icon={isSidebarExpanded ? <FaArrowLeft /> : <FaArrowRight />}
                  isRound
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                  display={{ base: "none", md: "inline-flex" }}
                />
                {isSidebarExpanded && (
                  <IconButton
                    aria-label="เริ่มแชทใหม่"
                    icon={<FaPlus />}
                    isRound
                    size="sm"
                    colorScheme="blue"
                    variant="solid"
                    onClick={onOpen}
                  />
                )}
              </HStack>
            </Flex>
            <VStack as="nav" spacing={1} align="stretch" overflowY="auto" pt={2} flex={1}>
              {conversations.length > 0 ? (
                conversations.map((convo) => {
                  if (!convo) return null;
                  const otherUser = getOtherParticipant(convo);
                  const isOnline = otherUser
                    ? onlineStatus[otherUser.uid]?.state === "online"
                    : false;
                  const isSelected =
                    selectedConversation?.id === convo.id;
                  const isUnread = convo.lastMessage && convo.lastMessage.senderId !== currentUser?.uid && !convo.lastMessage.isRead;
                  return (
                    <HStack
                      key={convo.id}
                      p={3}
                      borderRadius="lg"
                      cursor="pointer"
                      bg={isSelected ? "blue.500" : (isUnread ? "blue.50" : "transparent")}
                      color={isSelected ? "white" : "inherit"}
                      _hover={{ bg: isSelected ? "blue.600" : (isUnread ? "blue.100" : "gray.100") }}
                      onClick={() => setSelectedConversationId(convo.id)}
                      transition="background 0.2s"
                      justifyContent={isSidebarExpanded ? "flex-start" : "center"}
                      alignItems="center"
                      spacing={3}
                    >
                      <Box position="relative">
                        <Avatar size="sm" name={otherUser?.name} src={otherUser?.photoURL} />
                        <Circle
                          size="10px"
                          bg={isOnline ? "green.400" : "gray.300"}
                          border="2px solid white"
                          position="absolute"
                          bottom={0}
                          right={0}
                        />
                      </Box>
                      {isSidebarExpanded && (
                        <VStack align="start" spacing={0} flex={1} minW={0}>
                          <Text fontWeight={isUnread ? "extrabold" : "bold"} fontSize="sm" noOfLines={1}>{otherUser?.name}</Text>
                          <Text fontSize="xs" color={isSelected ? "gray.200" : "gray.500"} noOfLines={1}>
                            {convo.lastMessage?.text || "-"}
                          </Text>
                        </VStack>
                      )}
                      {isSidebarExpanded && isUnread && (
                        <Badge colorScheme="red" borderRadius="full" fontSize="xs" px={2} py={0.5}>ใหม่</Badge>
                      )}
                    </HStack>
                  );
                })
              ) : (
                <Box textAlign="center" color="gray.400" py={10}>
                  <Text fontSize="lg">ยังไม่มีแชท</Text>
                  <Text fontSize="sm">กดปุ่ม <b>+</b> เพื่อเริ่มแชทใหม่</Text>
                </Box>
              )}
            </VStack>
            <Flex pt={4} borderTop="1px solid" borderColor="gray.200">
                <Button leftIcon={<FaArrowLeft />} onClick={() => router.back()} variant="ghost" w="full" justifyContent={isSidebarExpanded ? "flex-start" : "center"}>
                    {isSidebarExpanded && <Text>ย้อนกลับ</Text>}
                </Button>
            </Flex>
          </VStack>
        )}
        {/* Chat Content: แสดงเสมอ แต่ mobile จะเต็มจอเมื่อเลือกแชท */}
        <Flex flex={1} direction="column" bg="gray.50" minH={0}>
          {/* ปุ่มย้อนกลับ: แสดงเฉพาะ mobile และเมื่อเลือกแชทแล้ว */}
          {isMobile && selectedConversationId && (
            <HStack p={4} borderBottom="1px solid" borderColor="gray.200" bg="white" spacing={2}>
              <IconButton
                aria-label="ย้อนกลับไปหน้ารายชื่อแชท"
                icon={<FaArrowLeft />}
                display={{ base: "inline-flex", md: "none" }}
                onClick={() => setSelectedConversationId(null)}
                variant="ghost"
                size="md"
                colorScheme="blue"
                mr={1}
              />
              <Text fontWeight="bold" fontSize="md">แชท</Text>
              <Spacer />
            </HStack>
          )}
          {selectedConversation ? (
            <>
              <HStack
                p={{ base: 2, md: 4 }}
                borderBottom="1px solid"
                borderColor="gray.200"
                bg="white"
                alignItems="center"
                spacing={3}
              >
                {/* Avatar & Info */}
                <Avatar size="md" name={getOtherParticipant(selectedConversation)?.name} src={getOtherParticipant(selectedConversation)?.photoURL} ml={1} />
                <VStack align="start" spacing={0.5} flex={1} minW={0}>
                  <HStack spacing={2} alignItems="center" minW={0}>
                    <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }} noOfLines={1} maxW={{ base: "120px", md: "200px" }}>
                      {getOtherParticipant(selectedConversation)?.name}
                    </Text>
                    <HStack spacing={1} alignItems="center">
                      <Circle
                        size="10px"
                        bg={onlineStatus[getOtherParticipant(selectedConversation)?.uid || ""]?.state === "online" ? "green.400" : "gray.300"}
                      />
                      <Text fontSize="xs" color={onlineStatus[getOtherParticipant(selectedConversation)?.uid || ""]?.state === "online" ? "green.500" : "gray.500"}>
                        {onlineStatus[getOtherParticipant(selectedConversation)?.uid || ""]?.state === "online"
                          ? "ออนไลน์"
                          : "ออฟไลน์"}
                      </Text>
                    </HStack>
                  </HStack>
                  {getOtherParticipant(selectedConversation)?.roomNumber && (
                    <Text fontSize="xs" color="gray.500" mt={0.5}>
                      ห้อง {getOtherParticipant(selectedConversation)?.roomNumber}
                    </Text>
                  )}
                  {otherUserTyping && (
                    <Text fontSize="xs" color="blue.500" fontStyle="italic" mt={0.5}>
                      กำลังพิมพ์...
                    </Text>
                  )}
                </VStack>
                <Spacer />
                <Badge colorScheme={getRoleColorScheme(getOtherParticipant(selectedConversation)?.role || "")}
                  fontSize="xs" px={2} py={0.5} borderRadius="full">
                  {getOtherParticipant(selectedConversation)?.role === "admin" ? "ผู้ดูแล" :
                    getOtherParticipant(selectedConversation)?.role === "juristic" ? "นิติ" :
                    getOtherParticipant(selectedConversation)?.role === "technician" ? "ช่าง" :
                    getOtherParticipant(selectedConversation)?.role === "owner" ? "เจ้าของห้อง" :
                    "ลูกบ้าน"}
                </Badge>
                <IconButton
                  aria-label="ลบแชทนี้"
                  icon={<FaTrash />}
                  onClick={handleDeleteClick}
                  size="sm"
                  colorScheme="red"
                  variant="ghost"
                  ml={2}
                />
              </HStack>
              <VStack
                flex={1}
                p={{ base: 2, md: 6 }}
                spacing={4}
                overflowY="auto"
                bg="gray.100"
                minH={0}
                align="stretch"
              >
                {messages.length === 0 ? (
                  <Box textAlign="center" color="gray.400" py={10}>
                    <Text fontSize="lg">ยังไม่มีข้อความ</Text>
                    <Text fontSize="sm">เริ่มต้นสนทนาได้เลย!</Text>
                  </Box>
                ) : (
                  messages.map((msg) => (
                    <Flex
                      key={msg.id}
                      w="full"
                      justify={msg.senderId === currentUser?.uid ? "flex-end" : "flex-start"}
                    >
                      <Box
                        bg={msg.senderId === currentUser?.uid ? "blue.500" : "white"}
                        color={msg.senderId === currentUser?.uid ? "white" : "black"}
                        px={4}
                        py={2}
                        borderRadius="xl"
                        maxW="70%"
                        boxShadow="sm"
                        fontSize="sm"
                        wordBreak="break-word"
                        position="relative"
                      >
                        {msg.text && <Text>{msg.text}</Text>}
                        {msg.imageUrl && (
                          <Image
                            src={msg.imageUrl}
                            maxW="200px"
                            borderRadius="md"
                            mt={msg.text ? 2 : 0}
                            cursor="pointer"
                            onClick={() => { setZoomImageUrl(msg.imageUrl || null); onImageModalOpen(); }}
                          />
                        )}
                      </Box>
                    </Flex>
                  ))
                )}
                <div ref={messagesEndRef} />
              </VStack>
              <Box p={4} bg="white" borderTop="1px solid" borderColor="gray.200">
                <HStack spacing={2}>
                  <IconButton
                    aria-label="แนบรูปภาพ"
                    icon={<FaImage />}
                    onClick={() => imageInputRef.current?.click()}
                    size="md"
                    isRound
                    colorScheme="gray"
                    variant="ghost"
                    isLoading={isImageUploading}
                    isDisabled={isImageUploading}
                  />
                  <InputGroup size="md">
                    <Input
                      variant="filled"
                      placeholder="พิมพ์ข้อความ..."
                      value={newMessage}
                      onChange={handleTyping}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      borderRadius="full"
                      fontSize="sm"
                      bg="gray.50"
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label="ส่งข้อความ"
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
                  <input
                    type="file"
                    accept="image/*"
                    ref={imageInputRef}
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                  />
                </HStack>
              </Box>
            </>
          ) : selectedConversationId ? (
            <Flex
              flex={1}
              justify="center"
              align="center"
              direction="column"
              color="gray.400"
              bg="gray.50"
            >
              <Spinner size="xl" color="blue.500" />
              <Text mt={4}>กำลังโหลดแชท...</Text>
            </Flex>
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
                กล่องข้อความ
              </Heading>
              <Text mt={2} fontSize="sm">
                เลือกแชทเพื่อดูข้อความ หรือเริ่มแชทใหม่
              </Text>
            </Flex>
          )}
        </Flex>
      </Flex>
      {/* ส่วนอื่น ๆ เช่น Modal, AlertDialog ... */}
      <NewConversationModal
        isOpen={isOpen}
        onClose={onClose}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
      />
      {/* ...Modal, AlertDialog, etc... */}

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