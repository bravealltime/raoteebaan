import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Input,
  Text,
  Avatar,
  Spinner,
  IconButton,
  InputGroup,
  InputRightElement,
  Image,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  Circle,
} from '@chakra-ui/react';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, setDoc, writeBatch } from 'firebase/firestore';
import { getDatabase, ref as dbRef, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { FaPaperPlane, FaImage, FaArrowLeft, FaTimes } from 'react-icons/fa';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Conversation, User, Message } from '../types/chat';

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User | null;
  onClose: () => void;
  onCloseWidget: () => void;
  containerHeight?: number;
  borderRadius?: string | number;
}

const ChatWindow = ({
  conversation,
  currentUser,
  onClose,
  onCloseWidget,
  containerHeight,
  borderRadius,
}: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const toast = useToast();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  const otherParticipant = conversation.participants.find(p => p.uid !== currentUser?.uid);

  useEffect(() => {
    if (!otherParticipant?.uid) return;

    const dbRealtime = getDatabase();
    const userStatusRef = dbRef(dbRealtime, 'status/' + otherParticipant.uid);

    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      const status = snapshot.val();
      setIsOnline(status?.state === 'online');
    });

    return () => unsubscribe();
  }, [otherParticipant?.uid]);

  useEffect(() => {
    const q = query(collection(db, 'conversations', conversation.id, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);

      const batch = writeBatch(db);
      let messagesToMarkAsRead = 0;
      msgs.forEach((msg) => {
        if (msg.senderId !== currentUser?.uid && !msg.isRead) {
          const messageRef = doc(db, "conversations", conversation.id, "messages", msg.id);
          batch.update(messageRef, { isRead: true });
          messagesToMarkAsRead++;
        }
      });

      if (messagesToMarkAsRead > 0) {
        await batch.commit();
        const convoRef = doc(db, "conversations", conversation.id);
        await setDoc(convoRef, { lastMessage: { isRead: true } }, { merge: true });
      }
    });
    return () => unsubscribe();
  }, [conversation.id, currentUser?.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (imageUrl?: string) => {
    if ((!newMessage.trim() && !imageUrl) || !currentUser) return;

    const messageData = {
      text: newMessage,
      senderId: currentUser.uid,
      timestamp: serverTimestamp(),
      isRead: false,
      imageUrl: imageUrl || null,
    };

    await addDoc(collection(db, 'conversations', conversation.id, 'messages'), messageData);

    await setDoc(doc(db, 'conversations', conversation.id), {
      lastMessage: { text: newMessage || 'Image', senderId: currentUser.uid, isRead: false },
      updatedAt: serverTimestamp(),
    }, { merge: true });

    setNewMessage('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    if (!currentUser) return;

    setIsImageUploading(true);
    try {
      const storage = getStorage();
      const imageRef = storageRef(storage, `chat_images/${conversation.id}/${currentUser.uid}/${file.name}_${Date.now()}`);
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

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setIsImageModalOpen(false);
  };

  if (!otherParticipant) {
    return <Flex h="100%" justify="center" align="center"><Spinner /></Flex>;
  }

  return (
    <Flex direction="column" h={containerHeight || '100%'} bg="white" borderRadius={borderRadius} boxShadow="lg" overflow="hidden">
      {/* Header */}
      <HStack p={3} bg="blue.500" color="white" borderTopRadius={borderRadius as string | number}>
        <IconButton aria-label="Back to list" icon={<FaArrowLeft />} onClick={onClose} variant="ghost" color="white" _hover={{bg: 'blue.600'}} />
        <Avatar src={otherParticipant?.photoURL} size="sm" name={otherParticipant.name} />
        <VStack align="start" spacing={0} ml={2}>
          <Text fontWeight="bold" fontSize="md">{otherParticipant?.name}</Text>
          <HStack spacing={1.5} align="center">
            <Circle size="8px" bg={isOnline ? "green.300" : "gray.400"} />
            <Text fontSize="xs" color="gray.200">{isOnline ? "Online" : "Offline"}</Text>
          </HStack>
        </VStack>
        <Box flex={1} />
        <IconButton aria-label="Close chat" icon={<FaTimes />} onClick={onCloseWidget} variant="ghost" color="white" _hover={{bg: 'blue.600'}} />
      </HStack>
      {/* Messages */}
      <VStack flex={1} px={4} py={3} spacing={2} overflowY="auto" bg="gray.50" align="stretch"
        css={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#E2E8F0 #F7FAFC',
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-thumb': { background: '#E2E8F0', borderRadius: '8px' }
        }}>
        {messages.map((msg) => (
          <Flex key={msg.id} w="100%" justify={msg.senderId === currentUser?.uid ? 'flex-end' : 'flex-start'}>
            <Box
              bg={msg.senderId === currentUser?.uid ? 'blue.500' : 'gray.100'}
              color={msg.senderId === currentUser?.uid ? 'white' : 'gray.800'}
              px={4}
              py={2}
              borderRadius="xl"
              maxW="80%"
            >
              {msg.text && <Text>{msg.text}</Text>}
              {msg.imageUrl && (
                <Image
                  src={msg.imageUrl}
                  borderRadius="md"
                  mt={msg.text ? 2 : 0}
                  maxW="200px"
                  cursor="pointer"
                  onClick={() => openImageModal(msg.imageUrl!)}
                />
              )}
            </Box>
          </Flex>
        ))}
        <div ref={messagesEndRef} />
      </VStack>
      {/* Input */}
      <Box p={3} bg="white" borderTop="1px solid" borderColor="gray.100">
        <HStack spacing={2}>
          <IconButton
            aria-label="Upload Image"
            icon={<FaImage />}
            onClick={() => imageInputRef.current?.click()}
            isLoading={isImageUploading}
            variant="ghost"
            color="gray.500"
          />
          <InputGroup>
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              borderRadius="full"
              bg="gray.100"
              border="none"
              _focus={{ bg: 'gray.200' }}
            />
            <InputRightElement>
              <IconButton
                aria-label="Send Message"
                icon={<FaPaperPlane />}
                onClick={() => handleSendMessage()}
                colorScheme="blue"
                isRound
                size="sm"
                isDisabled={!newMessage.trim() && !isImageUploading}
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
      <Modal isOpen={isImageModalOpen} onClose={closeImageModal} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalBody p={0}>
            {selectedImage && <Image src={selectedImage} w="full" />}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
};

export default ChatWindow;
