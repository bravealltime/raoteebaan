import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  addDoc,
  deleteDoc,
  Timestamp,
  onSnapshot,
  deleteField
} from "firebase/firestore";
import { 
  Box, 
  Flex, 
  Heading, 
  Text, 
  Center, 
  Spinner, 
  Grid, 
  Badge, 
  Stat, 
  StatLabel, 
  StatNumber, 
  StatHelpText, 
  Button, 
  Icon, 
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalCloseButton, 
  ModalBody, 
  Table, 
  Thead, 
  Tbody, 
  Tr, 
  Th, 
  Td, 
  useDisclosure, 
  useToast,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  VStack,
  HStack,
  Divider,
  SimpleGrid,
  IconButton
} from "@chakra-ui/react";
import { 
  FaBox, 
  FaCheckCircle, 
  FaClock, 
  FaExclamationTriangle, 
  FaPlus, 
  FaEye,
  FaEdit,
  FaTrash,
  FaSearch
} from "react-icons/fa";
import { onAuthStateChanged } from "firebase/auth";
import MainLayout from "../components/MainLayout";

interface Parcel {
  id: string;
  roomId: string;
  roomNumber: string;
  tenantName: string;
  recipient: string;
  sender: string;
  description: string;
  status: "pending" | "received" | "delivered";
  receivedDate: Timestamp;
  deliveredDate?: Timestamp;
  notes?: string;
  trackingNumber?: string;
}

interface Room {
  id: string;
  status: "occupied" | "vacant";
  tenantName: string;
  tenantId?: string;
}

interface ParcelStats {
  total: number;
  pending: number;
  received: number;
  delivered: number;
  overdue: number;
}

export default function Parcel() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<ParcelStats>({ total: 0, pending: 0, received: 0, delivered: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomParcels, setRoomParcels] = useState<Parcel[]>([]);
  const [roomFilter, setRoomFilter] = useState<"all" | "with-parcels">("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const toast = useToast();

  // Add Parcel form state
  const [newParcels, setNewParcels] = useState([{
    roomId: "",
    recipient: "",
    sender: "",
    description: "",
    trackingNumber: "",
    notes: ""
  }]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      const snap = await getDoc(doc(db, "users", u.uid));
      const userData = snap.exists() ? snap.data() : null;
      const userRole = userData?.role || "user";
      
      setCurrentUser({
        uid: u.uid,
        ...userData,
        role: userRole,
        photoURL: userData?.avatar || u.photoURL || undefined,
      });
      setRole(userRole);
      
      if (!["admin", "owner", "user"].includes(userRole)) {
        router.replace("/login");
      }
    });
    return () => unsub();
  }, []);

  // Fetch rooms and parcels
  useEffect(() => {
    if (!currentUser || !role) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch rooms based on role
        let roomsQuery;
        if (role === 'admin') {
          roomsQuery = collection(db, "rooms");
        } else if (role === 'owner') {
          roomsQuery = query(collection(db, "rooms"), where("ownerId", "==", currentUser.uid));
        } else {
          roomsQuery = query(collection(db, "rooms"), where("tenantId", "==", currentUser.uid));
        }

        const roomsSnapshot = await getDocs(roomsQuery);
        const roomsData: Room[] = roomsSnapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            status: data.status || "occupied",
            tenantName: data.tenantName || "-",
            tenantId: data.tenantId || null,
          };
        });
        setRooms(roomsData);

        // Reset parcels and stats if no rooms
        if (roomsData.length === 0) {
          setParcels([]);
          setStats({ total: 0, pending: 0, received: 0, delivered: 0, overdue: 0 });
          setLoading(false);
          return;
        }

        // Fetch parcels for these rooms
        const roomIds = roomsData.map(room => room.id);
        if (roomIds.length > 0) {
          // Handle Firestore 'IN' limitation of 30 values by batching queries
          const batchSize = 30;
          const unsubscribeFunctions: (() => void)[] = [];
          let allParcels: Parcel[] = [];

          const processBatch = (batchRoomIds: string[]) => {
            const parcelsQuery = query(
              collection(db, "parcels"),
              where("roomId", "in", batchRoomIds)
              // Removed orderBy to avoid requiring composite index
            );
            
            const unsubscribe = onSnapshot(parcelsQuery, (snapshot) => {
              const batchParcelsData: Parcel[] = snapshot.docs.map(doc => {
                const data = doc.data() as any;
                return {
                  id: doc.id,
                  ...data,
                  roomNumber: roomsData.find(room => room.id === data.roomId)?.id || data.roomId
                } as Parcel;
              });
              
              // Remove previous data from this batch and add new data
              allParcels = allParcels.filter(p => !batchRoomIds.includes(p.roomId));
              allParcels = [...allParcels, ...batchParcelsData];
              
              // Sort by receivedDate descending after fetching (client-side sorting)
              allParcels.sort((a, b) => {
                const aTime = a.receivedDate?.toMillis ? a.receivedDate.toMillis() : 0;
                const bTime = b.receivedDate?.toMillis ? b.receivedDate.toMillis() : 0;
                return bTime - aTime;
              });
              
              setParcels(allParcels);
              
              // Calculate stats
              const now = new Date();
              const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
              
              const stats: ParcelStats = {
                total: allParcels.length,
                pending: allParcels.filter(p => p.status === "pending").length,
                received: allParcels.filter(p => p.status === "received").length,
                delivered: allParcels.filter(p => p.status === "delivered").length,
                overdue: allParcels.filter(p => 
                  p.status === "received" && 
                  p.receivedDate?.toDate && 
                  p.receivedDate.toDate() < threeDaysAgo
                ).length
              };
              setStats(stats);
            }, (error) => {
              console.error("Error in parcel snapshot listener:", error);
              // Don't show error to user for missing collection, just continue with empty data
              if (error.code !== 'failed-precondition') {
                toast({
                  title: "Error",
                  description: "Failed to load parcel updates",
                  status: "error",
                  duration: 3000,
                  isClosable: true,
                });
              }
            });

            unsubscribeFunctions.push(unsubscribe);
          };

          // Process rooms in batches of 30
          for (let i = 0; i < roomIds.length; i += batchSize) {
            const batch = roomIds.slice(i, i + batchSize);
            processBatch(batch);
          }

          // Return cleanup function for all listeners
          return () => {
            unsubscribeFunctions.forEach(unsub => unsub());
          };
        } else {
          // No rooms found, reset state
          setParcels([]);
          setStats({ total: 0, pending: 0, received: 0, delivered: 0, overdue: 0 });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load parcel data",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    const cleanup = fetchData();
    return () => {
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(cleanupFn => {
          if (cleanupFn && typeof cleanupFn === 'function') {
            cleanupFn();
          }
        });
      }
    };
  }, [currentUser, role, toast]);

  // Auto-refresh room parcels when global parcels change
  useEffect(() => {
    if (selectedRoom) {
      const updatedRoomParcels = parcels.filter(p => p.roomId === selectedRoom.id);
      setRoomParcels(updatedRoomParcels);
    }
  }, [parcels, selectedRoom]);

  const handleRoomClick = (room: Room) => {
    const roomParcelsData = parcels.filter(p => p.roomId === room.id);
    setSelectedRoom(room);
    setRoomParcels(roomParcelsData);
    onOpen();
  };

  const handleCreateParcelForRoom = (room: Room) => {
    setNewParcels([{
      roomId: room.id,
      recipient: room.tenantName !== "-" ? room.tenantName : "",
      sender: "",
      description: "",
      trackingNumber: "",
      notes: ""
    }]);
    onAddOpen();
  };

  const handleParcelFormChange = (index, field, value) => {
    const updatedParcels = [...newParcels];
    updatedParcels[index][field] = value;
    setNewParcels(updatedParcels);
  };

  const handleAddNewParcelForm = () => {
    setNewParcels([...newParcels, {
      roomId: "",
      recipient: "",
      sender: "",
      description: "",
      trackingNumber: "",
      notes: ""
    }]);
  };

  const handleRemoveParcelForm = (index) => {
    const updatedParcels = [...newParcels];
    updatedParcels.splice(index, 1);
    setNewParcels(updatedParcels);
  };

  const handleAddParcel = async () => {
    for (const newParcel of newParcels) {
      if (!newParcel.roomId || !newParcel.recipient || !newParcel.sender || !newParcel.description) {
        toast({
          title: "กรุณากรอกข้อมูลให้ครบถ้วน",
          description: `สำหรับพัสดุของผู้รับ: ${newParcel.recipient || 'N/A'}`,
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
    }

    try {
      for (const newParcel of newParcels) {
        const selectedRoomData = rooms.find(room => room.id === newParcel.roomId);
        
        await addDoc(collection(db, "parcels"), {
          roomId: newParcel.roomId,
          roomNumber: newParcel.roomId,
          tenantName: selectedRoomData?.tenantName || "-",
          recipient: newParcel.recipient,
          sender: newParcel.sender,
          description: newParcel.description,
          trackingNumber: newParcel.trackingNumber || "",
          notes: newParcel.notes || "",
          status: "received",
          receivedDate: Timestamp.now(),
          createdBy: currentUser.uid
        });
      }

      toast({
        title: "เพิ่มพัสดุทั้งหมดสำเร็จ",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      setNewParcels([{
        roomId: "",
        recipient: "",
        sender: "",
        description: "",
        trackingNumber: "",
        notes: ""
      }]);
      onAddClose();
    } catch (error) {
      console.error("Error adding parcels:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มพัสดุได้",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleUpdateParcelStatus = async (parcelId: string, newStatus: "pending" | "received" | "delivered") => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "delivered") {
        updateData.deliveredDate = Timestamp.now();
      } else if (newStatus === "received") {
        updateData.deliveredDate = deleteField();
      }

      await updateDoc(doc(db, "parcels", parcelId), updateData);
      
      toast({
        title: "อัปเดตสถานะสำเร็จ",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error updating parcel status:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะได้",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteParcel = async (parcelId: string) => {
    const confirmed = confirm("คุณแน่ใจหรือไม่ที่จะลบพัสดุนี้? การกระทำนี้ไม่สามารถยกเลิกได้");
    
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "parcels", parcelId));
      
      toast({
        title: "ลบพัสดุสำเร็จ",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error deleting parcel:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบพัสดุได้",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "orange";
      case "received": return "blue";
      case "delivered": return "green";
      default: return "gray";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "รอรับ";
      case "received": return "รับแล้ว";
      case "delivered": return "ส่งมอบแล้ว";
      default: return status;
    }
  };

  const getRoomsWithParcels = () => {
    const roomsWithParcels = rooms.filter(room => {
      const roomParcelsCount = parcels.filter(p => 
        p.roomId === room.id && p.status !== "delivered"
      ).length;
      return roomParcelsCount > 0;
    });

    return roomsWithParcels.map(room => {
      const roomParcelsData = parcels.filter(p => 
        p.roomId === room.id && p.status !== "delivered"
      );
      const pendingCount = roomParcelsData.filter(p => p.status === "pending").length;
      const receivedCount = roomParcelsData.filter(p => p.status === "received").length;
      
      return {
        ...room,
        parcelCount: roomParcelsData.length,
        pendingCount,
        receivedCount
      };
    });
  };

  const getAllRoomsWithParcelData = () => {
    return rooms.map(room => {
      const roomParcelsData = parcels.filter(p => 
        p.roomId === room.id && p.status !== "delivered"
      );
      const pendingCount = roomParcelsData.filter(p => p.status === "pending").length;
      const receivedCount = roomParcelsData.filter(p => p.status === "received").length;
      
      return {
        ...room,
        parcelCount: roomParcelsData.length,
        pendingCount,
        receivedCount
      };
    });
  };

  const getFilteredRooms = () => {
    const allRoomsWithData = getAllRoomsWithParcelData();
    
    let filteredRooms = allRoomsWithData;
    
    // Filter by parcel status
    if (roomFilter === "with-parcels") {
      filteredRooms = filteredRooms.filter(room => room.parcelCount > 0);
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filteredRooms = filteredRooms.filter(room => 
        room.id.toLowerCase().includes(searchLower) ||
        room.tenantName.toLowerCase().includes(searchLower)
      );
    }
    
    return filteredRooms;
  };

  if (role === null || loading) return <Center minH="100vh"><Spinner color="blue.400" /></Center>;
  if (!["admin", "owner", "user"].includes(role)) return null;

  const roomsWithParcels = getRoomsWithParcels();
  const filteredRooms = getFilteredRooms();

  return (
    <MainLayout role={role} currentUser={currentUser}>
      <Box p={{ base: 4, md: 6 }} maxW="1400px" mx="auto">
        {/* Header */}
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size={{ base: "md", md: "lg" }} color="blue.700" display="flex" alignItems="center" gap={2}>
            <Icon as={FaBox} />
            จัดการพัสดุ
          </Heading>
          {["admin", "owner"].includes(role) && (
              <Button
                leftIcon={<FaPlus />}
                colorScheme="blue"
                onClick={() => {
                  setNewParcels([{
                    roomId: "",
                    recipient: "",
                    sender: "",
                    description: "",
                    trackingNumber: "",
                    notes: ""
                  }]);
                  onAddOpen();
                }}
              >
                เพิ่มพัสดุใหม่
              </Button>
            )}
        </Flex>

        {/* Stats Summary */}
        <SimpleGrid columns={{ base: 2, md: 2, lg: 4, xl: 5 }} spacing={{ base: 4, md: 6 }} mb={8}>
          <Stat bg="white" p={4} borderRadius="xl" boxShadow="sm">
            <StatLabel color="gray.600">ทั้งหมด</StatLabel>
            <StatNumber color="blue.600">{stats.total}</StatNumber>
            <StatHelpText>พัสดุทั้งหมด</StatHelpText>
          </Stat>
          <Stat bg="white" p={4} borderRadius="xl" boxShadow="sm">
            <StatLabel color="gray.600">รอรับ</StatLabel>
            <StatNumber color="orange.600">{stats.pending}</StatNumber>
            <StatHelpText>ยังไม่ได้รับ</StatHelpText>
          </Stat>
          <Stat bg="white" p={4} borderRadius="xl" boxShadow="sm">
            <StatLabel color="gray.600">รับแล้ว</StatLabel>
            <StatNumber color="blue.600">{stats.received}</StatNumber>
            <StatHelpText>รอส่งมอบ</StatHelpText>
          </Stat>
          <Stat bg="white" p={4} borderRadius="xl" boxShadow="sm">
            <StatLabel color="gray.600">ส่งมอบแล้ว</StatLabel>
            <StatNumber color="green.600">{stats.delivered}</StatNumber>
            <StatHelpText>เสร็จสิ้น</StatHelpText>
          </Stat>
          <Stat bg="white" p={4} borderRadius="xl" boxShadow="sm">
            <StatLabel color="gray.600">เกินกำหนด</StatLabel>
            <StatNumber color="red.600">{stats.overdue}</StatNumber>
            <StatHelpText>เก็บเกิน 3 วัน</StatHelpText>
          </Stat>
        </SimpleGrid>

        {/* Room Cards with Parcels */}
        <Box>
          <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} mb={4} direction={{ base: "column", md: "row" }}>
            <Heading size="md" color="gray.700" mb={{ base: 4, md: 0 }}>
              {roomFilter === "all" ? `ห้องทั้งหมด (${filteredRooms.length})` : `ห้องที่มีพัสดุรอ (${filteredRooms.length})`}
            </Heading>
            
            <HStack spacing={3} direction={{ base: "column", md: "row" }} w={{ base: "full", md: "auto" }}>
              <InputGroup w={{ base: "full", md: "300px" }}>
                <InputLeftElement pointerEvents="none">
                  <Icon as={FaSearch} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="ค้นหาห้อง หรือ ชื่อผู้เช่า..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  bg="white"
                  borderColor="gray.300"
                  size="md"
                />
              </InputGroup>
              <Select
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value as "all" | "with-parcels")}
                w={{ base: "full", md: "250px" }}
                bg="white"
                borderColor="gray.300"
              >
                <option value="all">แสดงห้องทั้งหมด</option>
                <option value="with-parcels">แสดงเฉพาะห้องที่มีพัสดุ</option>
              </Select>
            </HStack>
          </Flex>
          
          {filteredRooms.length === 0 ? (
            <Box bg="white" borderRadius="xl" p={8} textAlign="center" boxShadow="sm">
              <Icon as={FaBox} fontSize="4xl" color="gray.300" mb={4} />
              <Text color="gray.500" fontSize="lg">
                {searchTerm.trim() 
                  ? `ไม่พบห้องที่ตรงกับ "${searchTerm}"`
                  : roomFilter === "all" 
                    ? "ไม่มีห้องในระบบ" 
                    : "ไม่มีพัสดุที่รอส่งมอบ"
                }
              </Text>
              {searchTerm.trim() && (
                <Text color="gray.400" fontSize="sm" mt={2}>
                  ลองค้นหาด้วยหมายเลขห้องหรือชื่อผู้เช่า
                </Text>
              )}
            </Box>
          ) : (
            <Grid templateColumns={["1fr", "repeat(2, 1fr)", "repeat(3, 1fr)", "repeat(4, 1fr)"]} gap={4}>
              {filteredRooms.map((room) => (
                <Box
                  key={room.id}
                  bg="white"
                  borderRadius="xl"
                  p={4}
                  boxShadow="sm"
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
                  onClick={() => handleRoomClick(room)}
                  opacity={room.parcelCount === 0 ? 0.7 : 1}
                >
                  <Flex justify="space-between" align="center" mb={3}>
                    <Text fontWeight="bold" color="blue.700" fontSize="lg">
                      ห้อง {room.id}
                    </Text>
                    {room.parcelCount > 0 ? (
                      <Badge colorScheme="blue" borderRadius="full">
                        {room.parcelCount} ชิ้น
                      </Badge>
                    ) : (
                      <Badge colorScheme="gray" borderRadius="full">
                        ไม่มีพัสดุ
                      </Badge>
                    )}
                  </Flex>
                  
                  <Text color="gray.600" fontSize="sm" mb={3} noOfLines={1}>
                    {room.tenantName}
                  </Text>

                  {room.parcelCount > 0 ? (
                    <HStack spacing={2} mb={3}>
                      {room.pendingCount > 0 && (
                        <Badge colorScheme="orange" size="sm">
                          รอรับ {room.pendingCount}
                        </Badge>
                      )}
                      {room.receivedCount > 0 && (
                        <Badge colorScheme="blue" size="sm">
                          รับแล้ว {room.receivedCount}
                        </Badge>
                      )}
                    </HStack>
                  ) : (
                    <Box mb={3} h="24px">
                      <Text fontSize="xs" color="gray.400">
                        ไม่มีพัสดุรอส่งมอบ
                      </Text>
                    </Box>
                  )}

                  <Button
                    size="sm"
                    leftIcon={<FaEye />}
                    colorScheme={room.parcelCount > 0 ? "blue" : "gray"}
                    variant="outline"
                    w="full"
                  >
                    ดูรายละเอียด
                  </Button>
                </Box>
              ))}
            </Grid>
          )}
        </Box>

        {/* Room Parcel Details Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size={{ base: "full", md: "4xl" }} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <Flex justify="space-between" align="center">
                <Flex align="center" gap={2}>
                  <Icon as={FaBox} color="blue.500" />
                  พัสดุของห้อง {selectedRoom?.id} - {selectedRoom?.tenantName}
                </Flex>
              </Flex>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              {roomParcels.length === 0 ? (
                <Center py={8}>
                  <VStack spacing={4}>
                    <Text color="gray.500">ไม่มีพัสดุในห้องนี้</Text>
                  </VStack>
                </Center>
              ) : (
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>ผู้รับ</Th>
                      <Th>ผู้ส่ง</Th>
                      <Th>รายละเอียด</Th>
                      <Th>วันที่รับ</Th>
                      <Th>สถานะ</Th>
                      <Th>การกระทำ</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {roomParcels.map((parcel) => (
                      <Tr key={parcel.id}>
                        <Td>
                          <Text fontWeight="medium">{parcel.recipient}</Text>
                          {parcel.trackingNumber && (
                            <Text fontSize="xs" color="gray.500">
                              {parcel.trackingNumber}
                            </Text>
                          )}
                        </Td>
                        <Td>{parcel.sender}</Td>
                        <Td>
                          <Text noOfLines={2}>{parcel.description}</Text>
                          {parcel.notes && (
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              หมายเหตุ: {parcel.notes}
                            </Text>
                          )}
                        </Td>
                        <Td>
                          <Text fontSize="sm">
                            {parcel.receivedDate?.toDate ? 
                              parcel.receivedDate.toDate().toLocaleDateString('th-TH') : 
                              'ไม่ระบุ'
                            }
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {parcel.receivedDate?.toDate ? 
                              parcel.receivedDate.toDate().toLocaleTimeString('th-TH', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }) :
                              ''
                            }
                          </Text>
                        </Td>
                        <Td>
                          <Badge colorScheme={getStatusColor(parcel.status)}>
                            {getStatusLabel(parcel.status)}
                          </Badge>
                        </Td>
                        <Td>
                          <HStack spacing={2}>
                            {parcel.status !== "delivered" && (
                              <Button
                                size="xs"
                                colorScheme="green"
                                onClick={() => handleUpdateParcelStatus(parcel.id, "delivered")}
                              >
                                ส่งมอบแล้ว
                              </Button>
                            )}
                            {parcel.status === "delivered" && (
                              <Button
                                size="xs"
                                colorScheme="orange"
                                onClick={() => handleUpdateParcelStatus(parcel.id, "received")}
                              >
                                ย้อนกลับ
                              </Button>
                            )}
                            <IconButton
                              size="xs"
                              colorScheme="red"
                              aria-label="Delete parcel"
                              icon={<FaTrash />}
                              onClick={() => handleDeleteParcel(parcel.id)}
                            />
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* Add Parcel Modal */}
        <Modal isOpen={isAddOpen} onClose={onAddClose} size={{ base: "full", md: "4xl" }} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <Flex align="center" gap={2}>
                <Icon as={FaPlus} color="blue.500" />
                เพิ่มพัสดุใหม่
              </Flex>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={6} maxH="60vh" overflowY="auto" p={1}>
                {newParcels.map((parcel, index) => (
                  <Box key={index} w="full" p={4} borderWidth={1} borderRadius="lg" position="relative">
                    <VStack spacing={4}>
                      <HStack w="full" justify="space-between">
                        <Text fontWeight="bold" color="gray.600">พัสดุชิ้นที่ {index + 1}</Text>
                        {newParcels.length > 1 && (
                          <IconButton
                            size="xs"
                            colorScheme="red"
                            aria-label="Remove parcel form"
                            icon={<FaTrash />}
                            onClick={() => handleRemoveParcelForm(index)}
                          />
                        )}
                      </HStack>
                      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4} w="full">
                        <Box>
                          <Text mb={1} fontSize="sm" fontWeight="medium">ห้อง*</Text>
                          <Select
                            placeholder="เลือกห้อง"
                            value={parcel.roomId}
                            onChange={(e) => handleParcelFormChange(index, 'roomId', e.target.value)}
                          >
                            {rooms.filter(room => room.status === "occupied").map((room) => (
                              <option key={room.id} value={room.id}>
                                ห้อง {room.id} - {room.tenantName}
                              </option>
                            ))}
                          </Select>
                        </Box>
                        <Box>
                          <Text mb={1} fontSize="sm" fontWeight="medium">ชื่อผู้รับ*</Text>
                          <Input
                            value={parcel.recipient}
                            onChange={(e) => handleParcelFormChange(index, 'recipient', e.target.value)}
                            placeholder="ชื่อผู้รับพัสดุ"
                          />
                        </Box>
                        <Box>
                          <Text mb={1} fontSize="sm" fontWeight="medium">ผู้ส่ง/บริษัท*</Text>
                          <Input
                            value={parcel.sender}
                            onChange={(e) => handleParcelFormChange(index, 'sender', e.target.value)}
                            placeholder="ชื่อผู้ส่งหรือบริษัท"
                          />
                        </Box>
                        <Box>
                          <Text mb={1} fontSize="sm" fontWeight="medium">รายละเอียดพัสดุ*</Text>
                          <Input
                            value={parcel.description}
                            onChange={(e) => handleParcelFormChange(index, 'description', e.target.value)}
                            placeholder="รายละเอียดสินค้าหรือพัสดุ"
                          />
                        </Box>
                        <Box>
                          <Text mb={1} fontSize="sm" fontWeight="medium">หมายเลขติดตาม (ถ้ามี)</Text>
                          <Input
                            value={parcel.trackingNumber}
                            onChange={(e) => handleParcelFormChange(index, 'trackingNumber', e.target.value)}
                            placeholder="หมายเลขติดตาม"
                          />
                        </Box>
                        <Box>
                          <Text mb={1} fontSize="sm" fontWeight="medium">หมายเหตุ (ถ้ามี)</Text>
                          <Input
                            value={parcel.notes}
                            onChange={(e) => handleParcelFormChange(index, 'notes', e.target.value)}
                            placeholder="หมายเหตุเพิ่มเติม"
                          />
                        </Box>
                      </Grid>
                    </VStack>
                  </Box>
                ))}
              </VStack>

              <Button
                mt={4}
                leftIcon={<FaPlus />}
                onClick={handleAddNewParcelForm}
                colorScheme="gray"
                variant="dashed"
                w="full"
              >
                เพิ่มรายการพัสดุอีก
              </Button>

              <Divider my={6} />

              <HStack w="full" spacing={3}>
                <Button variant="outline" onClick={onAddClose} flex={1}>
                  ยกเลิก
                </Button>
                <Button colorScheme="blue" onClick={handleAddParcel} flex={1}>
                  {`เพิ่มพัสดุทั้งหมด (${newParcels.length} ชิ้น)`}
                </Button>
              </HStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    </MainLayout>
  );
} 