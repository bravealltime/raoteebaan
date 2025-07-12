
import { VStack, HStack, Avatar, Text, Box, Circle, Spinner } from "@chakra-ui/react";
import { Conversation, User } from "../types/chat";

interface ChatListProps {
  conversations: Conversation[];
  onSelectConversation: (conversation: Conversation) => void;
  currentUser: User;
}

const ChatList: React.FC<ChatListProps> = ({ conversations, onSelectConversation, currentUser }) => {
  if (!conversations) {
    return <Spinner />;
  }

  return (
    <VStack spacing={2} align="stretch" p={2}>
      {conversations.map((convo) => {
        const otherParticipant = convo.participants.find(p => p.uid !== currentUser.uid);
        if (!otherParticipant) return null;

        const isUnread = convo.lastMessage && convo.lastMessage.senderId !== currentUser.uid && !convo.lastMessage.isRead;

        return (
          <HStack
            key={convo.id}
            p={2}
            borderRadius="md"
            cursor="pointer"
            bg={isUnread ? "blue.50" : "transparent"}
            _hover={{ bg: "gray.100" }}
            onClick={() => onSelectConversation(convo)}
          >
            <Avatar size="sm" name={otherParticipant.name} src={otherParticipant.photoURL} />
            <VStack align="start" spacing={0} flex={1}>
              <Text fontWeight={isUnread ? "bold" : "normal"}>{otherParticipant.name}</Text>
              <Text fontSize="xs" color="gray.500" noOfLines={1}>
                {convo.lastMessage?.text || "..."}
              </Text>
            </VStack>
            {isUnread && <Circle size="10px" bg="blue.500" />}
          </HStack>
        );
      })}
    </VStack>
  );
};

export default ChatList;
