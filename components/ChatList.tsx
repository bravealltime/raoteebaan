
import { VStack, HStack, Avatar, Text, Box, Circle, Badge } from '@chakra-ui/react';
import { Conversation, User } from '../types/chat';

interface ChatListProps {
  conversations: Conversation[];
  currentUser: User | null;
  onSelectConversation: (conversation: Conversation) => void;
  onlineStatus?: Record<string, any>;
  selectedConversationId?: string | null;
  containerHeight?: number;
  bg?: string;
  borderRadius?: string | number;
  boxShadow?: string;
  avatarSize?: string;
  fontSizeName?: string;
  fontSizeMsg?: string;
  spacing?: number;
  px?: number;
  py?: number;
  mb?: number;
}

const ChatList = ({
  conversations,
  currentUser,
  onSelectConversation,
  onlineStatus = {},
  selectedConversationId,
  containerHeight,
  bg = "transparent",
  borderRadius = 0,
  boxShadow = "none",
  avatarSize = "40px",
  fontSizeName = "17px",
  fontSizeMsg = "15px",
  spacing = 2,
  px = 0,
  py = 0,
  mb = 2,
}: ChatListProps) => {
  const getOtherParticipant = (conversation: Conversation) => {
    if (!conversation || !currentUser) {
      return undefined;
    }
    return conversation.participants.find((p) => p.uid !== currentUser.uid);
  };

  return (
    <VStack as="nav" spacing={0} align="stretch" p={0} bg={bg} borderRadius={borderRadius} boxShadow={boxShadow} maxH={containerHeight} overflowY={containerHeight ? "auto" : undefined}>
      {conversations.map((convo) => {
        const otherUser = getOtherParticipant(convo);
        const isOnline = otherUser ? onlineStatus[otherUser.uid]?.state === 'online' : false;
        const isUnread = convo.lastMessage && convo.lastMessage.senderId !== currentUser?.uid && !convo.lastMessage.isRead;
        const isSelected = convo.id === selectedConversationId;

        return (
          <HStack
            key={convo.id}
            w="100%"
            px={px || 3}
            py={py || 3}
            mb={mb}
            borderRadius={borderRadius || 18}
            boxShadow={boxShadow || "md"}
            cursor="pointer"
            bg={isSelected ? "#e9e3ff" : "#fff"}
            border={isSelected ? "2px solid #a992ff" : "2px solid transparent"}
            _hover={{ bg: "#f0f1f5" }}
            onClick={() => onSelectConversation(convo)}
            alignItems="center"
            spacing={spacing || 3}
            transition="all 0.15s"
          >
            <Box position="relative">
              <Avatar
                size="lg"
                name={otherUser?.name}
                src={otherUser?.photoURL}
                boxSize={avatarSize}
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
            <VStack align="start" spacing={0} flex={1} minW={0}>
              <Text fontWeight="bold" fontSize={fontSizeName} color="#23272f" noOfLines={1}>
                {otherUser?.name}
              </Text>
              <Text fontSize={fontSizeMsg} color="#7c7f87" mt={2} noOfLines={1}>
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

