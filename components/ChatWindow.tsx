
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
}

const ChatWindow = ({ conversation, currentUser, onClose }: ChatWindowProps) => {
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
    <Flex direction="column" h="100%">
      <HStack p={4} borderBottom="1px solid" borderColor="gray.200" bg="white">
        <IconButton
          aria-label="Back to conversations"
          icon={<FaArrowLeft />}
          onClick={onClose}
          mr={2}
        />
        <Avatar name={otherParticipant?.name} src={otherParticipant?.photoURL} />
        <Text fontWeight="bold">{otherParticipant?.name}</Text>
      </HStack>
      <VStack flex={1} p={6} spacing={4} overflowY="auto" bg="gray.50">
        {messages.map((msg) => (
          <Flex key={msg.id} w="full" justify={msg.senderId === currentUser?.uid ? 'flex-end' : 'flex-start'}>
            <Box
              bg={msg.senderId === currentUser?.uid ? 'blue.500' : 'white'}
              color={msg.senderId === currentUser?.uid ? 'white' : 'black'}
              px={4}
              py={2}
              borderRadius="lg"
              maxW="70%"
            >
              {msg.text && <Text>{msg.text}</Text>}
              {msg.imageUrl && (
                <Image
                  src={msg.imageUrl}
                  maxW="200px"
                  borderRadius="md"
                  mt={msg.text ? 2 : 0}
                  cursor="pointer"
                  onClick={() => openImageModal(msg.imageUrl!)}
                />
              )}
            </Box>
          </Flex>
        ))}
        <div ref={messagesEndRef} />
      </VStack>
      <Box p={4} bg="white" borderTop="1px solid" borderColor="gray.200">
        <HStack spacing={3}>
          <IconButton
            aria-label="Upload Image"
            icon={<FaImage />}
            onClick={() => imageInputRef.current?.click()}
            isLoading={isImageUploading}
          />
          <InputGroup>
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              borderRadius="full"
            />
            <InputRightElement>
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
