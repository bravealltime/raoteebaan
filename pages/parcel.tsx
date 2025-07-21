import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { auth, db, storage } from "../lib/firebase";
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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
  IconButton,
  Image,
  AspectRatio
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
  FaSearch,
  FaCamera
} from "react-icons/fa";
import { onAuthStateChanged } from "firebase/auth";
import MainLayout from "../components/MainLayout";

const StatBox = ({ icon, label, value, color }) => (
  <Stat bg="white" p={5} borderRadius="xl" boxShadow="sm">
    <Flex alignItems="center">
      <Icon as={icon} fontSize="2xl" color={color} mr={4} />
      <Box>
        <StatLabel color="gray.500">{label}</StatLabel>
        <StatNumber color={color}>{value}</StatNumber>
      </Box>
    </Flex>
  </Stat>
);

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
  imageUrl?: string;
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [roomParcels, setRoomParcels] = useState<Parcel[]>([]);
  const [roomFilter, setRoomFilter] = useState<"all" | "with-parcels">("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const { isOpen: isImageOpen, onOpen: onImageOpen, onClose: onImageClose } = useDisclosure();
  const toast = useToast();
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Add Parcel form state
  const [newParcels, setNewParcels] = useState([{
    roomId: "",
    recipient: "",
    sender: "",
    description: "",
    trackingNumber: "",
    notes: "",
    imageFile: null as File | null
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
      
      if (!["admin", "owner"].includes(userRole)) {
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

  // Recalculate stats every minute to update overdue count
  useEffect(() => {
    const calculateStats = () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const newStats: ParcelStats = {
        total: parcels.length,
        pending: parcels.filter(p => p.status === "pending").length,
        received: parcels.filter(p => p.status === "received").length,
        delivered: parcels.filter(p => p.status === "delivered").length,
        overdue: parcels.filter(p => 
          p.status === "received" && 
          p.receivedDate?.toDate && 
          p.receivedDate.toDate() < threeDaysAgo
        ).length
      };
      setStats(newStats);
    };

    calculateStats(); // Initial calculation
    const intervalId = setInterval(calculateStats, 60 * 1000); // Recalculate every minute

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [parcels]);

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
      notes: "",
      imageFile: null
    }]);
    onAddOpen();
  };

  const handleParcelFormChange = (index, field, value) => {
    const updatedParcels = [...newParcels];
    if (field === 'imageFile') {
      updatedParcels[index][field] = value.target.files[0];
    } else {
      updatedParcels[index][field] = value;
    }
    setNewParcels(updatedParcels);
  };

  const handleAddNewParcelForm = () => {
    setNewParcels([...newParcels, {
      roomId: "",
      recipient: "",
      sender: "",
      description: "",
      trackingNumber: "",
      notes: "",
      imageFile: null
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
        
        const docRef = await addDoc(collection(db, "parcels"), {
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
          createdBy: currentUser.uid,
          imageUrl: ""
        });

        let imageUrl = "";
        if (newParcel.imageFile) {
          const imageRef = ref(storage, `parcels/${docRef.id}/${newParcel.imageFile.name}`);
          await uploadBytes(imageRef, newParcel.imageFile);
          imageUrl = await getDownloadURL(imageRef);
          await updateDoc(docRef, { imageUrl });
        }
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
        notes: "",
        imageFile: null
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
    
    return filteredRooms.sort((a, b) => a.id.localeCompare(b.id));
  };

  if (role === null || loading) return <Center minH="100vh"><Spinner color="blue.400" /></Center>;
  if (!["admin", "owner", "user"].includes(role)) return null;

  const roomsWithParcels = getRoomsWithParcels();
  const filteredRooms = getFilteredRooms();

  return (
    <MainLayout role={role} currentUser={currentUser}>
      <Box p={{ base: 2, md: 4 }} maxW="1600px" mx="auto">
        {/* Header */}
        <Flex justify="space-between" align="center" mb={6} direction={{ base: "column", md: "row" }} gap={4}>
          <Heading size={{ base: "md", md: "lg" }} color="gray.700" display="flex" alignItems="center" gap={2}>
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
                    notes: "",
                    imageFile: null
                  }]);
                  onAddOpen();
                }}
                w={{ base: "full", md: "auto" }}
              >
                เพิ่มพัสดุใหม่
              </Button>
            )}
        </Flex>

        {/* Stats Summary */}
        <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(5, 1fr)" }} gap={{ base: 3, md: 6 }} mb={8}>
          <StatBox icon={FaBox} label="ทั้งหมด" value={stats.total} color="blue.600" />
          <StatBox icon={FaClock} label="รอรับ" value={stats.pending} color="orange.500" />
          <StatBox icon={FaCheckCircle} label="รับแล้ว" value={stats.received} color="teal.500" />
          <StatBox icon={FaCheckCircle} label="ส่งมอบแล้ว" value={stats.delivered} color="green.500" />
          <StatBox icon={FaExclamationTriangle} label="เกินกำหนด" value={stats.overdue} color="red.500" />
        </Grid>

        {/* Room Cards with Parcels */}
        <Box bg="white" p={{ base: 4, md: 6 }} borderRadius="xl" boxShadow="sm">
          <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} mb={4} direction={{ base: "column", md: "row" }} gap={4}>
            <Heading size="md" color="gray.700">
              {roomFilter === "all" ? `ห้องทั้งหมด (${filteredRooms.length})` : `ห้องที่มีพัสดุรอ (${filteredRooms.length})`}
            </Heading>
            
            <HStack spacing={2} w={{ base: "full", md: "auto" }}>
              <InputGroup w={{ base: "full", md: "250px" }}>
                <InputLeftElement pointerEvents="none">
                  <Icon as={FaSearch} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="ค้นหาห้อง หรือ ชื่อผู้เช่า..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  bg="gray.50"
                  borderRadius="lg"
                />
              </InputGroup>
              <Select
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value as "all" | "with-parcels")}
                w={{ base: "full", md: "200px" }}
                bg="gray.50"
                borderRadius="lg"
              >
                <option value="all">แสดงห้องทั้งหมด</option>
                <option value="with-parcels">เฉพาะห้องที่มีพัสดุ</option>
              </Select>
            </HStack>
          </Flex>
          
          {filteredRooms.length === 0 ? (
            <Center p={10}>
              <VStack>
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
              </VStack>
            </Center>
          ) : (
            <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" }} gap={6}>
              {filteredRooms.map((room) => (
                <Box
                  key={room.id}
                  bg="gray.50"
                  borderRadius="xl"
                  p={4}
                  borderWidth="1px"
                  borderColor="gray.200"
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{ boxShadow: "md", transform: "translateY(-2px)", borderColor: "blue.300" }}
                  onClick={() => handleRoomClick(room)}
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
        <Modal isOpen={isOpen} onClose={onClose} size={{ base: "full", md: "6xl" }} isCentered>
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
                      <Th>หลักฐาน</Th>
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
                          {parcel.imageUrl ? (
                            <Image 
                              src={parcel.imageUrl} 
                              alt="หลักฐานพัสดุ" 
                              boxSize="50px" 
                              objectFit="cover" 
                              borderRadius="md"
                              cursor="pointer"
                              onClick={() => { setSelectedImage(parcel.imageUrl); onImageOpen(); }}
                            />
                          ) : (
                            <Text fontSize="xs" color="gray.400">ไม่มีรูป</Text>
                          )}
                        </Td>
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
                  <Box key={index} w="full" p={5} borderWidth={1} borderRadius="xl" position="relative" bg="white" shadow="sm">
                    <VStack spacing={4} align="stretch">
                      <HStack w="full" justify="space-between" pb={2} borderBottomWidth={1} borderColor="gray.100">
                        <Text fontWeight="bold" color="blue.700" fontSize="lg">พัสดุชิ้นที่ {index + 1}</Text>
                        {newParcels.length > 1 && (
                          <IconButton
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            aria-label="Remove parcel form"
                            icon={<FaTrash />}
                            onClick={() => handleRemoveParcelForm(index)}
                          />
                        )}
                      </HStack>
                      
                      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
                        <Box>
                          <Text mb={1} fontSize="sm" fontWeight="medium" color="gray.600">ห้อง*</Text>
                          <Select
                            placeholder="เลือกห้อง"
                            value={parcel.roomId}
                            onChange={(e) => handleParcelFormChange(index, 'roomId', e.target.value)}
                            bg="gray.50"
                          >
                            {rooms.filter(room => room.status === "occupied").map((room) => (
                              <option key={room.id} value={room.id}>
                                ห้อง {room.id} - {room.tenantName}
                              </option>
                            ))}
                          </Select>
                        </Box>
                        <Box>
                          <Text mb={1} fontSize="sm" fontWeight="medium" color="gray.600">ชื่อผู้รับ*</Text>
                          <Input
                            value={parcel.recipient}
                            onChange={(e) => handleParcelFormChange(index, 'recipient', e.target.value)}
                            placeholder="ชื่อผู้รับพัสดุ"
                            bg="gray.50"
                          />
                        </Box>
                      </Grid>

                      <Box>
                        <Text mb={1} fontSize="sm" fontWeight="medium" color="gray.600">ผู้ส่ง/บริษัท*</Text>
                        <Input
                          value={parcel.sender}
                          onChange={(e) => handleParcelFormChange(index, 'sender', e.target.value)}
                          placeholder="ชื่อผู้ส่งหรือบริษัท"
                          bg="gray.50"
                        />
                      </Box>
                      
                      <Box>
                        <Text mb={1} fontSize="sm" fontWeight="medium" color="gray.600">รายละเอียดพัสดุ*</Text>
                        <Input
                          value={parcel.description}
                          onChange={(e) => handleParcelFormChange(index, 'description', e.target.value)}
                          placeholder="รายละเอียดสินค้าหรือพัสดุ"
                          bg="gray.50"
                        />
                      </Box>

                      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
                        <Box>
                          <Text mb={1} fontSize="sm" fontWeight="medium" color="gray.600">หมายเลขติดตาม (ถ้ามี)</Text>
                          <Input
                            value={parcel.trackingNumber}
                            onChange={(e) => handleParcelFormChange(index, 'trackingNumber', e.target.value)}
                            placeholder="หมายเลขติดตาม"
                            bg="gray.50"
                          />
                        </Box>
                        <Box>
                          <Text mb={1} fontSize="sm" fontWeight="medium" color="gray.600">หมายเหตุ (ถ้ามี)</Text>
                          <Input
                            value={parcel.notes}
                            onChange={(e) => handleParcelFormChange(index, 'notes', e.target.value)}
                            placeholder="หมายเหตุเพิ่มเติม"
                            bg="gray.50"
                          />
                        </Box>
                      </Grid>

                      <Box>
                        <Text mb={2} fontSize="sm" fontWeight="medium" color="gray.600">รูปภาพหลักฐาน (ถ้ามี)</Text>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleParcelFormChange(index, 'imageFile', e)}
                          ref={(el) => { fileInputRefs.current[index] = el; }}
                          style={{ display: 'none' }}
                        />
                        <HStack spacing={4}>
                          <Button
                            leftIcon={<FaCamera />}
                            onClick={() => fileInputRefs.current[index]?.click()}
                            variant="outline"
                            colorScheme="blue"
                          >
                            เลือกรูปภาพ
                          </Button>
                          {parcel.imageFile && (
                            <HStack spacing={2} align="center">
                              <Icon as={FaCheckCircle} color="green.500" />
                              <Text fontSize="sm" color="gray.700" noOfLines={1}>
                                {parcel.imageFile.name}
                              </Text>
                            </HStack>
                          )}
                        </HStack>
                      </Box>
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

        {/* Image Preview Modal */}
        <Modal isOpen={isImageOpen} onClose={onImageClose} size="xl" isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>รูปภาพหลักฐาน</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Center>
                <Image src={selectedImage || ""} alt="หลักฐานพัสดุ" maxH="80vh" />
              </Center>
            </ModalBody>
          </ModalContent>
        </Modal>

      </Box>
    </MainLayout>
  );
} 