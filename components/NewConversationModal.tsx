import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  Text,
  HStack,
  Avatar,
  Spinner,
  useToast,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Badge,
} from "@chakra-ui/react";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { FaSearch } from "react-icons/fa";

interface User {
  uid: string;
  name: string;
  email: string;
  role: string;
  roomNumber?: string;
  tenantId?: string;
  ownerId?: string;
  photoURL?: string;
  hasUnreadMessages?: boolean; // Added to indicate unread messages
}

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSelectUser: (user: User) => void;
}

const NewConversationModal = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
}: NewConversationModalProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const toast = useToast();

  const checkUnreadMessages = async (currentUserId: string, otherUserId: string): Promise<boolean> => {
    try {
      const q = query(
        collection(db, "messages"),
        where("receiverId", "==", currentUserId),
        where("senderId", "==", otherUserId),
        where("isRead", "==", false),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking unread messages:", error);
      return false;
    }
  };

  useEffect(() => {
    if (isOpen && currentUser) {
      const fetchUsers = async () => {
        setLoading(true);
        try {
          console.log("Current User:", currentUser);
          const querySnapshot = await getDocs(collection(db, "users"));
          const userList = await Promise.all(
            querySnapshot.docs.map(async (doc) => {
              const userData = doc.data();
              const user: User = { uid: doc.id, ...userData, photoURL: userData.avatar || userData.photoURL };
              const hasUnreadMessages = await checkUnreadMessages(
                currentUser.uid,
                user.uid
              );
              return { ...user, hasUnreadMessages };
            })
          );
          console.log("All Users (userList):", userList);

          let ownedTenantIds: Set<string> = new Set();
          if (currentUser.role === "owner") {
            const roomsSnapshot = await getDocs(query(collection(db, "rooms"), where("ownerId", "==", currentUser.uid)));
            console.log("Rooms Snapshot for owner:", roomsSnapshot.docs.map(doc => doc.data()));
            roomsSnapshot.forEach(roomDoc => {
              const roomData = roomDoc.data();
              if (roomData.tenantId) {
                ownedTenantIds.add(roomData.tenantId);
              }
            });
            console.log("Owned Tenant IDs:", ownedTenantIds);
          }

          const filteredUserList = userList.filter((user) => {
              const isCurrentUser = !currentUser || user.uid === currentUser.uid;
              if (isCurrentUser) {
                console.log(`Filtering out current user: ${user.name}`);
                return false;
              }

              let shouldInclude = false;
              if (currentUser.role === "tenant") {
                shouldInclude = user.role === "admin" || user.role === "juristic";
                console.log(`Tenant filtering for ${user.name} (role: ${user.role}): ${shouldInclude}`);
              } else if (currentUser.role === "owner") {
                shouldInclude = user.role === "admin" || user.role === "juristic" || ownedTenantIds.has(user.uid);
                console.log(`Owner filtering for ${user.name} (role: ${user.role}, uid: ${user.uid}, ownedTenantIds.has(user.uid): ${ownedTenantIds.has(user.uid)}): ${shouldInclude}`);
              } else {
                shouldInclude = true; // Admins and Juristic can see everyone
                console.log(`Admin/Juristic filtering for ${user.name} (role: ${user.role}): ${shouldInclude}`);
              }
              return shouldInclude;
            });
          console.log("Final Filtered User List:", filteredUserList);
          setUsers(filteredUserList);
        } catch (error) {
          console.error("Error fetching users:", error);
          toast({
            title: "Error",
            description: "Could not fetch users.",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        } finally {
          setLoading(false);
        }
      };
      fetchUsers();
    }
  }, [isOpen, currentUser, toast, db]);

  const handleUserSelect = (user: User) => {
    onSelectUser(user);
    onClose();
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColorScheme = (role: string) => {
    switch (role) {
      case "admin":
        return "red";
      case "juristic":
        return "blue";
      case "tenant":
        return "green";
      default:
        return "gray";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Start a new conversation</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <InputGroup mb={4}>
            <InputLeftElement pointerEvents="none">
              <FaSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search for a user by name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          {loading ? (
            <Flex justify="center" align="center" h="200px">
              <Spinner />
            </Flex>
          ) : (
            <VStack spacing={2} align="stretch">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <HStack
                    key={user.uid}
                    p={3}
                    borderRadius="md"
                    _hover={{ bg: "gray.100" }}
                    cursor="pointer"
                    onClick={() => handleUserSelect(user)}
                  >
                    <Avatar name={user.name} size="sm" src={user.photoURL} />
                    
                    <VStack align="start" spacing={0} flex={1}>
                      <Text
                        fontWeight={user.hasUnreadMessages ? "bold" : "medium"}
                        color={user.hasUnreadMessages ? "black" : undefined}
                      >
                        {user.name}
                      </Text>
                      {user.roomNumber && (
                        <Text fontSize="xs" color="gray.500">
                          Room: {user.roomNumber}
                        </Text>
                      )}
                    </VStack>
                    <Badge colorScheme={getRoleColorScheme(user.role)}>
                      {user.role}
                    </Badge>
                  </HStack>
                ))
              ) : (
                <Text color="gray.500" textAlign="center" py={10}>
                  No users available to chat.
                </Text>
              )}
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default NewConversationModal;