
import { VStack, HStack, Avatar, Text, Box, Circle, Badge } from '@chakra-ui/react';
import { Conversation, User } from '../types/chat';

interface ChatListProps {
  conversations: Conversation[];
  currentUser: User | null;
  onSelectConversation: (conversation: Conversation) => void;
  onlineStatus?: Record<string, any>;
  selectedConversationId?: string | null;
  containerHeight?: number;
}

const ChatList = ({ conversations, currentUser, onSelectConversation, onlineStatus = {}, selectedConversationId, containerHeight = 480 }: ChatListProps) => {
  const getOtherParticipant = (conversation: Conversation) => {
    if (!conversation || !currentUser) {
      return undefined;
    }
    return conversation.participants.find((p) => p.uid !== currentUser.uid);
  };

  return (
    <VStack as="nav" spacing={1.5} align="stretch" p={3} bg="#fff" borderRadius="20px" boxShadow="sm" maxH={containerHeight} overflowY="auto">
      {conversations.map((convo) => {
        const otherUser = getOtherParticipant(convo);
        const isOnline = otherUser ? onlineStatus[otherUser.uid]?.state === 'online' : false;
        const isUnread = convo.lastMessage && convo.lastMessage.senderId !== currentUser?.uid && !convo.lastMessage.isRead;
        const isSelected = convo.id === selectedConversationId;

        return (
          <HStack
            key={convo.id}
            p={2.5}
            borderRadius="20px"
            boxShadow="sm"
            mb={2}
            cursor="pointer"
            bg={isSelected ? "#e9e3ff" : "#fff"}
            border={isSelected ? "2px solid #a992ff" : "2px solid transparent"}
            _hover={{ bg: isSelected ? "#d6cfff" : "#f5f6fa" }}
            onClick={() => onSelectConversation(convo)}
            transition="all 0.15s"
            alignItems="center"
            spacing={2}
          >
            <Box position="relative">
              <Avatar
                size="md"
                name={otherUser?.name}
                src={otherUser?.photoURL}
                boxSize="40px"
                border={isSelected ? "2px solid #a992ff" : "2px solid #e2e8f0"}
                borderColor={isSelected ? "#a992ff" : "#e2e8f0"}
                bg={otherUser?.photoURL ? undefined : "#bdb2ff"}
                color="#23272f"
                fontWeight="bold"
                fontSize="xl"
              />
              <Circle
                size="10px"
                bg={isOnline ? "green.400" : "gray.300"}
                border="2px solid white"
                position="absolute"
                bottom={0}
                right={0}
              />
              {isUnread && (
                <Circle
                  size="9px"
                  bg="red.400"
                  position="absolute"
                  top={-2}
                  right={-2}
                  border="2px solid #fff"
                />
              )}
            </Box>
            <VStack align="start" spacing={0.5} flex={1} minW={0}>
              <Text fontWeight={isUnread ? "extrabold" : "bold"} fontSize="17px" color="#23272f" noOfLines={1}>
                {otherUser?.name}
              </Text>
              <Text fontSize="15px" color="#7c7f87" noOfLines={1}>
                {convo.lastMessage?.text || 'No messages yet'}
              </Text>
            </VStack>
          </HStack>
        );
      })}
    </VStack>
  );
};

export default ChatList;

