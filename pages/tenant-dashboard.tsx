import { Box, Heading, Text, Flex, Avatar, VStack, Icon, Badge, Card, CardHeader, CardBody, SimpleGrid, useToast, Button, Spinner, Center, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, AlertDialogCloseButton, useDisclosure, Table, Thead, Tbody, Tr, Th, Td, TableContainer, Image, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, getDocs, orderBy, limit, updateDoc, Timestamp } from "firebase/firestore";
import TenantLayout from "../components/TenantLayout";
import { FaUser, FaHome, FaCalendarAlt, FaCreditCard, FaFileInvoice, FaBoxOpen } from "react-icons/fa";

interface UserData {
  name: string;
  email: string;
  avatar: string;
  role: string;
  status: string;
  roomId?: string;
  tenantId?: string;
  phoneNumber?: string;
  joinedDate?: string;
}

interface RoomData {
  id: string;
  tenantName: string;
  area: number;
  rent: number;
  service: number;
  electricity: number;
  water: number;
  latestTotal: number;
  billStatus: string;
  overdueDays: number;
}

interface BillHistory {
  id: string;
  month: string;
  year: number;
  totalAmount: number;
  status: string;
  dueDate: string;
  paidDate?: string;
}

interface Parcel {
    id: string;
    recipient: string;
    sender: string;
    status: "pending" | "received" | "delivered";
    receivedDate: Timestamp;
    imageUrl?: string;
}

export default function TenantDashboard() {
  const router = useRouter();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [billHistory, setBillHistory] = useState<BillHistory[]>([]);
  const [undeliveredParcels, setUndeliveredParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { isOpen: isAlertOpen, onOpen: onAlertOpen, onClose: onAlertClose } = useDisclosure();
  const { isOpen: isImageModalOpen, onOpen: onImageModalOpen, onClose: onImageModalClose } = useDisclosure();
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [alertRoomId, setAlertRoomId] = useState<string | null>(null);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoading(true);

        const userDocRef = doc(db, "users", user.uid);
        const userUnsubscribe = onSnapshot(userDocRef, (userDoc) => {
          const firestoreData = userDoc.exists() ? userDoc.data() : {};
          const combinedUser = {
            uid: user.uid,
            name: firestoreData.name || user.displayName || "",
            email: user.email || "",
            role: firestoreData.role || "user",
            photoURL: firestoreData.avatar || user.photoURL || undefined,
            roomId: firestoreData.roomId,
          };
          setCurrentUser(combinedUser);
        });

        const roomsQuery = query(collection(db, "rooms"), where("tenantId", "==", user.uid), limit(1));
        const roomUnsubscribe = onSnapshot(roomsQuery, (snapshot) => {
          if (!snapshot.empty) {
            const roomDoc = snapshot.docs[0];
            const currentRoomData = roomDoc.data();
            const roomId = roomDoc.id;
            setRoomData({
              id: roomId,
              tenantName: currentRoomData.tenantName || "",
              area: currentRoomData.area || 0,
              rent: currentRoomData.rent || 0,
              service: currentRoomData.service || 0,
              electricity: currentRoomData.electricity || 0,
              water: currentRoomData.water || 0,
              latestTotal: currentRoomData.latestTotal || 0,
              billStatus: currentRoomData.billStatus || "pending",
              overdueDays: currentRoomData.overdueDays || 0,
            });
            fetchBillHistory(roomId);
            fetchUndeliveredParcels(roomId);
          } else {
            setRoomData(null);
            setBillHistory([]);
            setUndeliveredParcels([]);
          }
          setLoading(false);
        });

        return () => {
          userUnsubscribe();
          roomUnsubscribe();
        };
      } else {
        router.replace("/login");
      }
    });

    return () => authUnsubscribe();
  }, [router, toast]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("tenantId", "==", currentUser.uid),
      where("isRead", "==", false)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          const notification = change.doc.data();
          setAlertRoomId(notification.roomId);
          onAlertOpen();
          await updateDoc(doc(db, "notifications", change.doc.id), { isRead: true });
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser, onAlertOpen]);

  const fetchBillHistory = async (roomId: string) => {
    try {
      const billsQuery = query(
        collection(db, "bills"),
        where("roomId", "==", roomId),
        where("status", "==", "paid"),
        orderBy("paidAt", "desc"),
        limit(12)
      );
      
      const snapshot = await getDocs(billsQuery);
      const bills = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          month: data.month || "",
          year: data.year || new Date().getFullYear(),
          totalAmount: data.total || 0,
          status: "paid",
          dueDate: data.dueDate?.toDate().toLocaleDateString('th-TH') || "-",
          paidDate: data.paidAt?.toDate().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) || "-",
        };
      });
      
      setBillHistory(bills as BillHistory[]);
    } catch (error) {
      console.error("Error fetching bill history:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดประวัติการชำระเงินได้",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const fetchUndeliveredParcels = (roomId: string) => {
    const parcelsQuery = query(
        collection(db, "parcels"),
        where("roomId", "==", roomId),
        where("status", "!=", "delivered"),
        orderBy("status"),
        orderBy("receivedDate", "desc")
    );

    const unsubscribe = onSnapshot(parcelsQuery, (snapshot) => {
        const parcelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Parcel);
        setUndeliveredParcels(parcelsData);
    }, (error) => {
        console.error("Error fetching parcels:", error);
        toast({
            title: "เกิดข้อผิดพลาด",
            description: "ไม่สามารถโหลดข้อมูลพัสดุได้",
            status: "error",
            duration: 3000,
            isClosable: true,
        });
    });

    return unsubscribe;
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    onImageModalOpen();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "green";
      case "unpaid":
        return "red";
      case "pending":
        return "yellow";
      default:
        return "gray";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "ชำระแล้ว";
      case "unpaid":
        return "ค้างชำระ";
      case "pending":
        return "รอตรวจสอบ";
      default:
        return "ไม่ทราบสถานะ";
    }
  };

  if (loading) {
    return (
      <TenantLayout currentUser={currentUser}>
        <Center h="50vh">
          <Spinner size="xl" color="brand.500" />
        </Center>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout currentUser={currentUser}>
      <Box p={{ base: 2, md: 4 }} bg="gray.50" minH="100vh">
        <Heading size={{ base: "lg", md: "xl" }} mb={6} color="gray.700">
          แดชบอร์ดผู้เช่า
        </Heading>

        {/* Personal Information Card */}
        <Card mb={6} boxShadow="md" borderRadius="lg" bg="white" p={{ base: 4, md: 6 }}>
          <CardHeader pb={2}>
            <Heading size="md" color="blue.600">
              <Icon as={FaUser} mr={2} /> ข้อมูลส่วนตัว
            </Heading>
          </CardHeader>
          <CardBody>
            <Flex direction={{ base: "column", md: "row" }} align="center" gap={6}>
              <Avatar size="xl" src={currentUser?.photoURL} name={currentUser?.name} boxShadow="md" />
              <VStack align={{ base: "center", md: "flex-start" }} spacing={1} flex={1} w="100%">
                <SimpleGrid columns={{ base: 1, sm: 2 }} spacingY={2} spacingX={6} w="100%">
                  <Box>
                    <Text fontWeight="bold" color="gray.500" fontSize="sm">ชื่อ</Text>
                    <Text color="gray.800" fontSize="md">{currentUser?.name}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" color="gray.500" fontSize="sm">อีเมล</Text>
                    <Text color="gray.800" fontSize="md">{currentUser?.email}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" color="gray.500" fontSize="sm">สถานะ</Text>
                    <Badge fontSize="sm" px={2} py={0.5} borderRadius="md" colorScheme={currentUser?.status === "active" ? "green" : "red"}>
                      {currentUser?.status === "active" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                    </Badge>
                  </Box>
                </SimpleGrid>
              </VStack>
            </Flex>
          </CardBody>
        </Card>

        {/* Room Information Card */}
        {roomData ? (
          <Card mb={6} boxShadow="md" borderRadius="lg" bg="white" p={{ base: 4, md: 6 }}>
          <CardHeader pb={2}>
            <Heading size="md" color="blue.600">
              <Icon as={FaHome} mr={2} /> ข้อมูลห้องพัก
            </Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={5}>
                <Box>
                  <Text fontWeight="bold" color="gray.500" fontSize="sm">หมายเลขห้อง</Text>
                  <Text color="gray.800" fontSize="lg">{roomData.id}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" color="gray.500" fontSize="sm">ขนาดห้อง</Text>
                  <Text color="gray.800" fontSize="lg">{roomData.area} ตร.ม.</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" color="gray.500" fontSize="sm">ค่าเช่า</Text>
                  <Text color="gray.800" fontSize="lg">{roomData.rent.toLocaleString()} บาท</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" color="gray.500" fontSize="sm">ค่าบริการ</Text>
                  <Text color="gray.800" fontSize="lg">{roomData.service.toLocaleString()} บาท</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" color="gray.500" fontSize="sm">สถานะบิลล่าสุด</Text>
                  <Badge fontSize="md" px={3} py={1} borderRadius="md" colorScheme={getStatusColor(roomData.billStatus)}>
                    {getStatusText(roomData.billStatus)}
                  </Badge>
                </Box>
                {roomData.billStatus === 'unpaid' && (
                <Box>
                  <Text fontWeight="bold" color="red.500" fontSize="sm">ยอดค้างชำระ</Text>
                  <Text color="red.500" fontSize="xl" fontWeight="bold">{roomData.latestTotal.toLocaleString()} บาท</Text>
                </Box>
                )}
              </SimpleGrid>
            </CardBody>
          </Card>
        ) : (
          <Card mb={6} boxShadow="md" borderRadius="lg" bg="white" p={6}>
            <Center>
              <VStack>
                <Icon as={FaHome} boxSize={10} color="gray.300" />
                <Text color="gray.500">คุณยังไม่มีข้อมูลห้องพัก</Text>
              </VStack>
            </Center>
          </Card>
        )}

        {/* Undelivered Parcels Card */}
        {undeliveredParcels.length > 0 && (
            <Card mb={6} boxShadow="md" borderRadius="lg" bg="white" p={{ base: 4, md: 6 }}>
                <CardHeader pb={4}>
                    <Heading size="md" color="blue.600">
                        <Icon as={FaBoxOpen} mr={2} /> พัสดุที่ยังไม่ได้รับ ({undeliveredParcels.length})
                    </Heading>
                </CardHeader>
                <CardBody>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                        {undeliveredParcels.map((parcel) => (
                            <Box key={parcel.id} p={4} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="gray.50">
                                <Flex spacing={4}>
                                    {parcel.imageUrl && (
                                        <Image
                                            src={parcel.imageUrl}
                                            alt="Parcel image"
                                            boxSize="100px"
                                            objectFit="cover"
                                            borderRadius="md"
                                            mr={4}
                                            cursor="pointer"
                                            onClick={() => handleImageClick(parcel.imageUrl!)}
                                        />
                                    )}
                                    <VStack align="flex-start" spacing={1} flex="1">
                                        <Text fontWeight="bold">จาก: {parcel.sender}</Text>
                                        <Text fontSize="sm" color="gray.600">
                                            วันที่มาถึง: {parcel.receivedDate.toDate().toLocaleDateString('th-TH')}
                                        </Text>
                                        <Badge colorScheme={parcel.status === 'received' ? 'blue' : 'orange'}>
                                            {parcel.status === 'received' ? 'รอรับที่นิติ' : 'รอรับ'}
                                        </Badge>
                                    </VStack>
                                </Flex>
                            </Box>
                        ))}
                    </SimpleGrid>
                </CardBody>
            </Card>
        )}

        {/* Bill History Card */}
        <Card boxShadow="2xl" borderRadius="2xl" bg="white" px={{ base: 2, md: 4 }} py={{ base: 4, md: 6 }}>
          <CardHeader>
            <Flex justify="space-between" align="center">
              <Heading size="md" color="brand.600" letterSpacing="wide">
                <Icon as={FaFileInvoice} mr={3} verticalAlign="middle" />
                ประวัติการชำระเงิน
              </Heading>
              {roomData?.id && (
                <Button
                  size="sm"
                  colorScheme="brand"
                  variant="outline"
                  onClick={() => router.push(`/history/${roomData.id}`)}
                >
                  ดูประวัติทั้งหมด
                </Button>
              )}
            </Flex>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>รอบบิล</Th>
                    <Th>วันที่ชำระ</Th>
                    <Th isNumeric>ยอดชำระ (บาท)</Th>
                    <Th>สถานะ</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {billHistory.length > 0 ? (
                    billHistory.map((bill) => (
                      <Tr key={bill.id}>
                        <Td>{bill.month} {bill.year}</Td>
                        <Td>{bill.paidDate}</Td>
                        <Td isNumeric>{bill.totalAmount.toLocaleString()}</Td>
                        <Td>
                          <Badge colorScheme="green" px={2} py={1} borderRadius="md">
                            ชำระแล้ว
                          </Badge>
                        </Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr>
                      <Td colSpan={4} textAlign="center">
                        <Text color="gray.500" py={8}>ยังไม่มีประวัติการชำระเงินที่ยืนยันแล้ว</Text>
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>

        {/* Quick Actions */}
        <Card mt={10} boxShadow="2xl" borderRadius="2xl" bg="white" px={{ base: 4, md: 8 }} py={{ base: 4, md: 6 }}>
          <CardHeader pb={2}>
            <Heading size="md" color="brand.600" letterSpacing="wide">
              เมนูด่วน
            </Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              <Button
                leftIcon={<FaCreditCard size={22} />}
                colorScheme="green"
                size="lg"
                borderRadius="xl"
                variant="solid"
                isDisabled={!roomData || roomData.billStatus !== 'unpaid'}
                _hover={{ boxShadow: "md", transform: "scale(1.05)" }}
                onClick={() => roomData?.id && router.push(`/bill/${roomData.id}`)}
              >
                ชำระบิลล่าสุด
              </Button>
              <Button
                leftIcon={<FaCalendarAlt size={22} />}
                colorScheme="purple"
                size="lg"
                borderRadius="xl"
                variant="solid"
                isDisabled={!roomData}
                _hover={{ boxShadow: "md", transform: "scale(1.05)" }}
                onClick={() => roomData?.id && router.push(`/history/${roomData.id}`)}
              >
                ประวัติบิลทั้งหมด
              </Button>
              <Button
                leftIcon={<FaUser size={22} />}
                colorScheme="gray"
                size="lg"
                borderRadius="xl"
                variant="outline"
                _hover={{ boxShadow: "md", transform: "scale(1.05)", bg: "gray.100" }}
                onClick={() => router.push("/profile")}
              >
                โปรไฟล์ของฉัน
              </Button>
            </SimpleGrid>
          </CardBody>
        </Card>
      </Box>
      <AlertDialog
        isOpen={isAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={onAlertClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent m={{ base: 4, md: "auto" }}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              แจ้งเตือนยอดค้างชำระ
            </AlertDialogHeader>

            <AlertDialogBody>
              ห้อง {alertRoomId} ของคุณมียอดค้างชำระ กรุณาตรวจสอบและชำระเงินโดยเร็วที่สุด
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onAlertClose}>
                ปิด
              </Button>
              <Button colorScheme="blue" onClick={() => {
                onAlertClose();
                router.push(`/bill/${alertRoomId}`);
              }} ml={3}>
                ไปที่หน้าชำระเงิน
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

        <Modal isOpen={isImageModalOpen} onClose={onImageModalClose} size="xl" isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>รูปภาพพัสดุ</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Center>
                        <Image src={selectedImageUrl || ""} alt="Parcel Image" maxH="80vh" />
                    </Center>
                </ModalBody>
            </ModalContent>
        </Modal>
    </TenantLayout>
  );
}
