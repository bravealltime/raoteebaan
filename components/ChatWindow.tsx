
import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Input,
  Button,
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
import { db } from '../lib/firebase';
import { FaPaperPlane, FaImage, FaArrowLeft } from 'react-icons/fa';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Conversation, User, Message } from '../types/chat';

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User | null;
  onClose: () => void;
  containerHeight?: number;
  height?: string | number;
  bg?: string;
  borderRadius?: string | number;
  boxShadow?: string;
  p?: number;
}

const ChatWindow = ({
  conversation,
  currentUser,
  onClose,
  containerHeight,
  height = '100%',
  bg = '#23272f',
  borderRadius = 20,
  boxShadow = '2xl',
  p = 0,
}: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const toast = useToast();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const otherParticipant = conversation.participants.find(p => p.uid !== currentUser?.uid);

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
    return <Spinner />;
  }

  return (
    <Flex direction="column" h={containerHeight || height} bg="#fff" borderRadius={borderRadius} boxShadow={boxShadow} overflow="hidden" p={p}>
      {/* Header */}
      <HStack p={4} bg="#2563eb" borderBottom="1px solid #e2e8f0">
        <Avatar src={otherParticipant?.photoURL} size="sm" />
        <Box>
          <Text color="white" fontWeight="bold" fontSize="md">{otherParticipant?.name}</Text>
          <HStack spacing={1}>
            <Circle size="8px" bg="green.400" />
            <Text color="white" fontSize="xs">Active now</Text>
          </HStack>
        </Box>
        <Box flex={1} />
        <IconButton aria-label="Close chat" icon={<FaArrowLeft />} onClick={onClose} variant="ghost" color="white" />
      </HStack>
      {/* Messages */}
      <VStack flex={1} px={3} py={2} spacing={1.5} overflowY="auto" bg="#f5f6fa" align="stretch"
        css={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#e2e8f0 #f5f6fa',
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-thumb': { background: '#e2e8f0', borderRadius: '8px' }
        }}>
        {messages.map((msg) => (
          <Flex key={msg.id} w="100%" justify={msg.senderId === currentUser?.uid ? 'flex-end' : 'flex-start'}>
            <Box
              bg={msg.senderId === currentUser?.uid ? '#2563eb' : '#f0f1f5'}
              color={msg.senderId === currentUser?.uid ? 'white' : '#23272f'}
              px={4}
              py={2}
              borderRadius="2xl"
              maxW="80%"
              fontSize="16px"
              mb={1.5}
              boxShadow={msg.senderId === currentUser?.uid ? 'md' : undefined}
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
      <Box p={3} bg="#fff" borderTop="1px solid #e2e8f0">
        <HStack spacing={2}>
          <IconButton
            aria-label="Upload Image"
            icon={<FaImage />}
            onClick={() => imageInputRef.current?.click()}
            isLoading={isImageUploading}
            variant="ghost"
            color="#2563eb"
          />
          <InputGroup>
            <Input
              placeholder="Message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              borderRadius="full"
              fontSize="16px"
              py={3}
              px={5}
              bg="#f5f6fa"
              color="#23272f"
              border="1px solid #e2e8f0"
              boxShadow="xs"
              _placeholder={{ color: '#aaa' }}
            />
            <InputRightElement top="50%" transform="translateY(-50%)">
              <IconButton
                aria-label="Send Message"
                icon={<FaPaperPlane />}
                onClick={() => handleSendMessage()}
                colorScheme="blue"
                isRound
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
      <Modal isOpen={isImageModalOpen} onClose={closeImageModal} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalBody p={0}>
            {selectedImage && <Image src={selectedImage} objectFit="contain" w="full" h="full" />}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
};

export default ChatWindow;
