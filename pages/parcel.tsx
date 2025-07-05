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
  Timestamp,
  onSnapshot
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
  VStack,
  HStack,
  Divider,
  SimpleGrid
} from "@chakra-ui/react";
import { 
  FaBox, 
  FaCheckCircle, 
  FaClock, 
  FaExclamationTriangle, 
  FaPlus, 
  FaEye,
  FaEdit
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
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const toast = useToast();

  // Add Parcel form state
  const [newParcel, setNewParcel] = useState({
    roomId: "",
    recipient: "",
    sender: "",
    description: "",
    trackingNumber: "",
    notes: ""
  });

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
        role: userRole
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

  const createSampleData = async () => {
    if (!currentUser || rooms.length === 0) {
      toast({
        title: "ไม่สามารถสร้างข้อมูลตัวอย่างได้",
        description: "ต้องมีห้องในระบบก่อน",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const sampleParcels = [
        {
          roomId: rooms[0].id,
          roomNumber: rooms[0].id,
          tenantName: rooms[0].tenantName,
          recipient: rooms[0].tenantName,
          sender: "Shopee",
          description: "เสื้อผ้า 2 ชิ้น",
          status: "received",
          receivedDate: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
          trackingNumber: "TH123456789",
          notes: "ขนาดกล่องกลาง สีน้ำเงิน"
        },
        {
          roomId: rooms.length > 1 ? rooms[1].id : rooms[0].id,
          roomNumber: rooms.length > 1 ? rooms[1].id : rooms[0].id,
          tenantName: rooms.length > 1 ? rooms[1].tenantName : rooms[0].tenantName,
          recipient: rooms.length > 1 ? rooms[1].tenantName : rooms[0].tenantName,
          sender: "Lazada",
          description: "อุปกรณ์ครัว",
          status: "pending",
          receivedDate: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
          trackingNumber: "LZ987654321",
          notes: ""
        }
      ];

      for (const parcel of sampleParcels) {
        await addDoc(collection(db, "parcels"), {
          ...parcel,
          createdBy: currentUser.uid,
          createdAt: Timestamp.now()
        });
      }

      toast({
        title: "สร้างข้อมูลตัวอย่างสำเร็จ",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error creating sample data:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างข้อมูลตัวอย่างได้",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleRoomClick = (room: Room) => {
    const roomParcelsData = parcels.filter(p => p.roomId === room.id);
    setSelectedRoom(room);
    setRoomParcels(roomParcelsData);
    onOpen();
  };

  const handleCreateParcelForRoom = (room: Room) => {
    setNewParcel({
      roomId: room.id,
      recipient: room.tenantName !== "-" ? room.tenantName : "",
      sender: "",
      description: "",
      trackingNumber: "",
      notes: ""
    });
    // Keep room details modal open and open add parcel modal
    onAddOpen(); // Open add parcel modal
  };

  const handleAddParcel = async () => {
    if (!newParcel.roomId || !newParcel.recipient || !newParcel.sender || !newParcel.description) {
      toast({
        title: "กรุณากรอกข้อมูลให้ครบถ้วน",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
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

      toast({
        title: "เพิ่มพัสดุสำเร็จ",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      setNewParcel({
        roomId: "",
        recipient: "",
        sender: "",
        description: "",
        trackingNumber: "",
        notes: ""
      });
      onAddClose();
    } catch (error) {
      console.error("Error adding parcel:", error);
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
    
    if (roomFilter === "with-parcels") {
      return allRoomsWithData.filter(room => room.parcelCount > 0);
    }
    
    return allRoomsWithData;
  };

  if (role === null || loading) return <Center minH="100vh"><Spinner color="blue.400" /></Center>;
  if (!["admin", "owner", "user"].includes(role)) return null;

  const roomsWithParcels = getRoomsWithParcels();
  const filteredRooms = getFilteredRooms();

  return (
    <MainLayout role={role}>
      <Box p={[4, 6]} maxW="1400px" mx="auto">
        {/* Header */}
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg" color="blue.700" display="flex" alignItems="center" gap={2}>
            <Icon as={FaBox} />
            จัดการพัสดุ
          </Heading>
          <HStack>
            {(role === "admin" || role === "owner") && parcels.length === 0 && (
              <Button variant="outline" colorScheme="blue" onClick={createSampleData}>
                สร้างข้อมูลตัวอย่าง
              </Button>
            )}
            {(role === "admin" || role === "owner") && (
              <Button leftIcon={<FaPlus />} colorScheme="blue" onClick={onAddOpen}>
                เพิ่มพัสดุ
              </Button>
            )}
          </HStack>
        </Flex>

        {/* Stats Summary */}
        <SimpleGrid columns={[2, 2, 4, 5]} spacing={4} mb={8}>
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
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="md" color="gray.700">
              {roomFilter === "all" ? `ห้องทั้งหมด (${filteredRooms.length})` : `ห้องที่มีพัสดุรอ (${filteredRooms.length})`}
            </Heading>
            
            <Select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value as "all" | "with-parcels")}
              w="250px"
              bg="white"
              borderColor="gray.300"
            >
              <option value="all">แสดงห้องทั้งหมด</option>
              <option value="with-parcels">แสดงเฉพาะห้องที่มีพัสดุ</option>
            </Select>
          </Flex>
          
          {filteredRooms.length === 0 ? (
            <Box bg="white" borderRadius="xl" p={8} textAlign="center" boxShadow="sm">
              <Icon as={FaBox} fontSize="4xl" color="gray.300" mb={4} />
              <Text color="gray.500" fontSize="lg">
                {roomFilter === "all" ? "ไม่มีห้องในระบบ" : "ไม่มีพัสดุที่รอส่งมอบ"}
              </Text>
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
        <Modal isOpen={isOpen} onClose={onClose} size="4xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <Flex justify="space-between" align="center">
                <Flex align="center" gap={2}>
                  <Icon as={FaBox} color="blue.500" />
                  พัสดุของห้อง {selectedRoom?.id} - {selectedRoom?.tenantName}
                </Flex>
                {(role === "admin" || role === "owner") && selectedRoom && (
                  <Button
                    leftIcon={<FaPlus />}
                    colorScheme="blue"
                    size="sm"
                    onClick={() => handleCreateParcelForRoom(selectedRoom)}
                  >
                    เพิ่มพัสดุ
                  </Button>
                )}
              </Flex>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              {roomParcels.length === 0 ? (
                <Center py={8}>
                  <VStack spacing={4}>
                    <Text color="gray.500">ไม่มีพัสดุในห้องนี้</Text>
                    {(role === "admin" || role === "owner") && selectedRoom && (
                      <Button
                        leftIcon={<FaPlus />}
                        colorScheme="blue"
                        variant="outline"
                        onClick={() => handleCreateParcelForRoom(selectedRoom)}
                      >
                        เพิ่มพัสดุสำหรับห้องนี้
                      </Button>
                    )}
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
                      {(role === "admin" || role === "owner") && <Th>จัดการ</Th>}
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
                        {(role === "admin" || role === "owner") && (
                          <Td>
                            <Select
                              size="sm"
                              value={parcel.status}
                              onChange={(e) => handleUpdateParcelStatus(parcel.id, e.target.value as any)}
                              w="120px"
                            >
                              <option value="pending">รอรับ</option>
                              <option value="received">รับแล้ว</option>
                              <option value="delivered">ส่งมอบแล้ว</option>
                            </Select>
                          </Td>
                        )}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* Add Parcel Modal */}
        <Modal isOpen={isAddOpen} onClose={onAddClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <Flex align="center" gap={2}>
                <Icon as={FaPlus} color="blue.500" />
                {newParcel.roomId ? `เพิ่มพัสดุสำหรับห้อง ${newParcel.roomId}` : "เพิ่มพัสดุใหม่"}
              </Flex>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                <Box w="full">
                  <Text mb={2} fontWeight="medium">ห้อง</Text>
                  <Select
                    placeholder="เลือกห้อง"
                    value={newParcel.roomId}
                    onChange={(e) => setNewParcel({ ...newParcel, roomId: e.target.value })}
                    isDisabled={!!newParcel.roomId} // Disable if roomId is pre-filled
                  >
                    {rooms.filter(room => room.status === "occupied").map((room) => (
                      <option key={room.id} value={room.id}>
                        ห้อง {room.id} - {room.tenantName}
                      </option>
                    ))}
                  </Select>
                  {newParcel.roomId && (
                    <Text fontSize="xs" color="blue.600" mt={1}>
                      * ห้องถูกเลือกไว้แล้ว
                    </Text>
                  )}
                </Box>

                <Box w="full">
                  <Text mb={2} fontWeight="medium">ชื่อผู้รับ</Text>
                  <Input
                    value={newParcel.recipient}
                    onChange={(e) => setNewParcel({ ...newParcel, recipient: e.target.value })}
                    placeholder="ชื่อผู้รับพัสดุ"
                  />
                </Box>

                <Box w="full">
                  <Text mb={2} fontWeight="medium">ผู้ส่ง/บริษัท</Text>
                  <Input
                    value={newParcel.sender}
                    onChange={(e) => setNewParcel({ ...newParcel, sender: e.target.value })}
                    placeholder="ชื่อผู้ส่งหรือบริษัท"
                  />
                </Box>

                <Box w="full">
                  <Text mb={2} fontWeight="medium">รายละเอียดพัสดุ</Text>
                  <Input
                    value={newParcel.description}
                    onChange={(e) => setNewParcel({ ...newParcel, description: e.target.value })}
                    placeholder="รายละเอียดสินค้าหรือพัสดุ"
                  />
                </Box>

                <Box w="full">
                  <Text mb={2} fontWeight="medium">หมายเลขติดตาม (ถ้ามี)</Text>
                  <Input
                    value={newParcel.trackingNumber}
                    onChange={(e) => setNewParcel({ ...newParcel, trackingNumber: e.target.value })}
                    placeholder="หมายเลขติดตาม"
                  />
                </Box>

                <Box w="full">
                  <Text mb={2} fontWeight="medium">หมายเหตุ (ถ้ามี)</Text>
                  <Input
                    value={newParcel.notes}
                    onChange={(e) => setNewParcel({ ...newParcel, notes: e.target.value })}
                    placeholder="หมายเหตุเพิ่มเติม"
                  />
                </Box>

                <Divider />

                <HStack w="full" spacing={3}>
                  <Button variant="outline" onClick={onAddClose} flex={1}>
                    ยกเลิก
                  </Button>
                  <Button colorScheme="blue" onClick={handleAddParcel} flex={1}>
                    เพิ่มพัสดุ
                  </Button>
                </HStack>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    </MainLayout>
  );
} 