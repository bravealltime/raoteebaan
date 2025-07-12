
import { useState, useEffect, useRef } from 'react';
import { Box, Flex, Text, Input, IconButton, VStack, Avatar, HStack, Spinner, Button } from '@chakra-ui/react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Conversation, Message } from '../types/chat';
import { FaPaperPlane, FaArrowLeft } from 'react-icons/fa';

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User;
  onClose: () => void; // This will now be used as a "back" button
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, currentUser, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const otherParticipant = conversation.participants.find(p => p.uid !== currentUser.uid);

  console.log("ChatWindow: otherParticipant", otherParticipant);

  useEffect(() => {
    console.log("ChatWindow: Setting up onSnapshot listener for conversation ID:", conversation.id);
    const q = query(
      collection(db, 'conversations', conversation.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Message[];
      setMessages(msgs);
      console.log("ChatWindow: Fetched messages:", msgs);

      // Mark messages as read
      const batch = writeBatch(db);
      let messagesToMarkAsRead = 0;
      msgs.forEach((msg) => {
        if (msg.senderId !== currentUser.uid && !msg.isRead) {
          const messageRef = doc(db, "conversations", conversation.id, "messages", msg.id);
          batch.update(messageRef, { isRead: true });
          messagesToMarkAsRead++;
        }
      });

      if (messagesToMarkAsRead > 0) {
        await batch.commit();
        console.log("ChatWindow: Marked", messagesToMarkAsRead, "messages as read.");
        // Also update the lastMessage in the conversation
        const convoRef = doc(db, "conversations", conversation.id);
        await setDoc(convoRef, { lastMessage: { isRead: true } }, { merge: true });
      }
    }, (error) => {
      console.error("ChatWindow: Error fetching messages:", error);
    });

    return () => {
      console.log("ChatWindow: Unsubscribing from messages listener.");
      unsubscribe();
    };
  }, [conversation.id, currentUser.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;

    const messageData = {
      senderId: currentUser.uid,
      text: newMessage,
      timestamp: serverTimestamp(),
      isRead: false,
    };

    try {
      await addDoc(collection(db, 'conversations', conversation.id, 'messages'), messageData);
      console.log("ChatWindow: Message sent successfully.");

      await setDoc(doc(db, 'conversations', conversation.id), {
        lastMessage: { text: newMessage, senderId: currentUser.uid, isRead: false },
        updatedAt: serverTimestamp(),
      }, { merge: true });
      console.log("ChatWindow: Conversation updated with last message.");

    } catch (error) {
      console.error("ChatWindow: Error sending message:", error);
    }

    setNewMessage('');
  };

  if (!otherParticipant) {
    console.log("ChatWindow: No other participant, showing spinner.");
    return <Spinner />;
  }

  console.log("ChatWindow: Rendering with otherParticipant:", otherParticipant);
  console.log("ChatWindow: Current messages:", messages);

  return (
    <Flex direction="column" h="100%">
        <Button leftIcon={<FaArrowLeft />} onClick={onClose} variant="ghost" size="sm" m={2} align-self="flex-start">
            Back to list
        </Button>
      <VStack flex={1} p={4} spacing={4} overflowY="auto" bg="gray.50">
        {messages.map((msg) => (
          <Flex
            key={msg.id}
            w="full"
            justify={msg.senderId === currentUser.uid ? 'flex-end' : 'flex-start'}
          >
            <Box
              bg={msg.senderId === currentUser.uid ? 'blue.500' : 'gray.200'}
              color={msg.senderId === currentUser.uid ? 'white' : 'black'}
              px={3}
              py={1}
              borderRadius="lg"
              maxW="80%"
            >
              {msg.text}
            </Box>
          </Flex>
        ))}
        <div ref={messagesEndRef} />
      </VStack>

      <HStack p={3} borderTop="1px solid" borderColor="gray.200">
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <IconButton
          aria-label="Send message"
          icon={<FaPaperPlane />}
          onClick={handleSendMessage}
          colorScheme="blue"
          isDisabled={!newMessage.trim()}
        />
      </HStack>
    </Flex>
  );
};

export default ChatWindow;
