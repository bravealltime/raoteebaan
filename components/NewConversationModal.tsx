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
import { collection, getDocs, query, where } from "firebase/firestore";
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

  useEffect(() => {
    if (isOpen && currentUser) {
      const fetchUsers = async () => {
        setLoading(true);
        try {
          const querySnapshot = await getDocs(collection(db, "users"));
          const userList = querySnapshot.docs
            .map((doc) => ({ uid: doc.id, ...doc.data() } as User));

          let ownedTenantIds: Set<string> = new Set();
          if (currentUser.role === "owner") {
            const roomsSnapshot = await getDocs(query(collection(db, "rooms"), where("ownerId", "==", currentUser.uid)));
            roomsSnapshot.forEach(roomDoc => {
              const roomData = roomDoc.data();
              if (roomData.tenantId) {
                ownedTenantIds.add(roomData.tenantId);
              }
            });
          }

          const filteredUserList = userList.filter((user) => {
              if (!currentUser || user.uid === currentUser.uid) return false;

              if (currentUser.role === "tenant") {
                return user.role === "admin" || user.role === "juristic";
              } else if (currentUser.role === "owner") {
                return user.role === "admin" || user.role === "juristic" || ownedTenantIds.has(user.uid);
              }
              
              return true; // Admins and Juristic can see everyone
            });
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
                    <Avatar name={user.name} size="sm" />
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontWeight="medium">{user.name}</Text>
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