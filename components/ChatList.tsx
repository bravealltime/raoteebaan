import { VStack, HStack, Avatar, Text, Box, Circle, Heading, IconButton, Tooltip, Flex, Button } from '@chakra-ui/react';
import { FaTrash, FaTimes, FaPlus } from 'react-icons/fa';
import { Conversation, User } from '../types/chat';

interface ChatListProps {
  conversations: Conversation[];
  currentUser: User | null;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversationId: string) => void;
  onCloseWidget: () => void;
  onlineStatus?: Record<string, any>;
  selectedConversationId?: string | null;
  containerHeight?: number;
  showCloseButton?: boolean;
  showNewChatButton?: boolean;
  onNewChat?: () => void;
  showTitle?: boolean;
}

const ChatList = ({
  conversations,
  currentUser,
  onSelectConversation,
  onDeleteConversation,
  onCloseWidget,
  onlineStatus = {},
  selectedConversationId,
  showCloseButton = true,
  showNewChatButton = false,
  onNewChat,
  showTitle = true,
}: ChatListProps) => {
  const getOtherParticipant = (conversation: Conversation) => {
    if (!conversation || !currentUser) {
      return undefined;
    }
    return conversation.participants.find((p) => p.uid !== currentUser.uid);
  };

  return (
    <VStack h="100%" spacing={0} bg="white" borderRadius="24px" overflow="hidden">
      <Flex w="100%" p={4} justify="space-between" align="center" borderBottom="1px solid" borderColor="gray.100">
        {showTitle && <Heading size="md" color="gray.700">Messages</Heading>}
        {showNewChatButton && onNewChat && (
          <Button
            size="sm"
            leftIcon={<FaPlus />}
            onClick={onNewChat}
            colorScheme="blue"
          >
            New Chat
          </Button>
        )}
        {showCloseButton && (
          <IconButton
            aria-label="Close widget"
            icon={<FaTimes />}
            size="sm"
            variant="ghost"
            onClick={onCloseWidget}
          />
        )}
      </Flex>
      
      

      {/* List */}
      <VStack
        flex="1"
        w="100%"
        spacing={0}
        align="stretch"
        p={2}
        overflowY="auto"
        css={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'gray.200 white',
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-thumb': { background: 'gray.200', borderRadius: '8px' }
        }}
      >
        {conversations.map((convo) => {
          const otherUser = getOtherParticipant(convo);
          const isOnline = otherUser ? onlineStatus[otherUser.uid]?.state === 'online' : false;
          const isUnread = convo.lastMessage && convo.lastMessage.senderId !== currentUser?.uid && !convo.lastMessage.isRead;
          const isSelected = convo.id === selectedConversationId;

          return (
            <HStack
              key={convo.id}
              w="100%"
              px={3}
              py={3}
              mb={1}
              borderRadius={12}
              cursor="pointer"
              bg={isSelected ? "blue.50" : "transparent"}
              _hover={{ bg: "gray.50" }}
              onClick={() => onSelectConversation(convo)}
              alignItems="center"
              spacing={3}
              transition="background 0.2s"
            >
              <Box position="relative">
                <Avatar
                  size="md"
                  name={otherUser?.name}
                  src={otherUser?.photoURL}
                />
                {isOnline && (
                  <Circle
                    size="12px"
                    bg="green.400"
                    border="2px solid white"
                    position="absolute"
                    bottom="-1px"
                    right="-1px"
                  />
                )}
              </Box>
              <VStack align="start" spacing={0} flex={1} minW={0}>
                <Text fontWeight="bold" fontSize="md" color="gray.800" noOfLines={1}>
                  {otherUser?.name}
                </Text>
                <Text fontSize="sm" color={isUnread ? "gray.800" : "gray.500"} fontWeight={isUnread ? "bold" : "normal"} noOfLines={1}>
                  {convo.lastMessage?.text || '...'}
                </Text>
              </VStack>
              <Tooltip label="Delete Conversation" placement="top" fontSize="sm">
                <IconButton
                  aria-label="Delete chat"
                  icon={<FaTrash />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(convo.id);
                  }}
                  variant="ghost"
                  color="gray.400"
                  size="sm"
                  _hover={{ bg: 'red.50', color: 'red.500' }}
                />
              </Tooltip>
              {isUnread && (
                <Circle
                  size="10px"
                  bg="blue.500"
                />
              )}
            </HStack>
          );
        })}
      </VStack>
    </VStack>
  );
};

export default ChatList;