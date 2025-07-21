
import { VStack, HStack, Avatar, Text, Box, Circle, Badge } from '@chakra-ui/react';
import { Conversation, User } from '../types/chat';

interface ChatListProps {
  conversations: Conversation[];
  currentUser: User | null;
  onSelectConversation: (conversation: Conversation) => void;
  onlineStatus?: Record<string, any>;
  selectedConversationId?: string | null;
}

const ChatList = ({ conversations, currentUser, onSelectConversation, onlineStatus = {}, selectedConversationId }: ChatListProps) => {
  const getOtherParticipant = (conversation: Conversation) => {
    if (!conversation || !currentUser) {
      return undefined;
    }
    return conversation.participants.find((p) => p.uid !== currentUser.uid);
  };

  return (
    <VStack as="nav" spacing={1} align="stretch" p={2}>
      {conversations.map((convo) => {
        const otherUser = getOtherParticipant(convo);
        const isOnline = otherUser ? onlineStatus[otherUser.uid]?.state === 'online' : false;
        const isUnread = convo.lastMessage && convo.lastMessage.senderId !== currentUser?.uid && !convo.lastMessage.isRead;

        const isSelected = convo.id === selectedConversationId;

        return (
          <HStack
            key={convo.id}
            p={3}
            borderRadius="lg"
            cursor="pointer"
            bg={isSelected ? "blue.100" : isUnread ? "blue.50" : "white"}
            _hover={{ bg: isSelected ? "blue.200" : "gray.100" }}
            onClick={() => onSelectConversation(convo)}
            transition="background 0.2s"
            alignItems="center"
            spacing={3}
          >
            <Box position="relative">
              <Avatar size="md" name={otherUser?.name} src={otherUser?.photoURL} />
              <Circle
                size="12px"
                bg={isOnline ? "green.400" : "gray.300"}
                border="2px solid white"
                position="absolute"
                bottom={0}
                right={0}
              />
            </Box>
            <VStack align="start" spacing={0} flex={1} minW={0}>
              <Text fontWeight={isUnread ? "extrabold" : "bold"} fontSize="md" noOfLines={1}>
                {otherUser?.name}
              </Text>
              <Text fontSize="sm" color="gray.500" noOfLines={1}>
                {convo.lastMessage?.text || 'No messages yet'}
              </Text>
            </VStack>
            {isUnread && (
              <Badge colorScheme="red" borderRadius="full" fontSize="xs" px={2} py={0.5}>
                New
              </Badge>
            )}
          </HStack>
        );
      })}
    </VStack>
  );
};

export default ChatList;

