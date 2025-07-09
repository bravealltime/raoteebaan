import { Box, Heading, Text, Flex, Avatar, VStack, Icon, Badge, Card, CardHeader, CardBody, SimpleGrid, useToast, Button, Spinner, Center, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, AlertDialogCloseButton, useDisclosure, Table, Thead, Tbody, Tr, Th, Td, TableContainer } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, getDocs, orderBy, limit, updateDoc } from "firebase/firestore";
import MainLayout from "../components/MainLayout";
import { FaUser, FaHome, FaCalendarAlt, FaCreditCard, FaFileInvoice } from "react-icons/fa";

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

export default function TenantDashboard() {
  const router = useRouter();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [billHistory, setBillHistory] = useState<BillHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const { isOpen: isAlertOpen, onOpen: onAlertOpen, onClose: onAlertClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [alertRoomId, setAlertRoomId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "users", user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, async (userDoc) => {
          if (userDoc.exists()) {
            const currentUserData = userDoc.data();
            const userDataPayload: UserData = {
              name: currentUserData.name || user.displayName || "Unknown",
              email: currentUserData.email || user.email || "",
              avatar: currentUserData.avatar || user.photoURL || "",
              role: currentUserData.role || "user",
              status: currentUserData.status || "active",
              roomId: currentUserData.roomId,
              tenantId: user.uid,
              phoneNumber: currentUserData.phoneNumber,
              joinedDate: currentUserData.createdAt?.toDate().toLocaleDateString("th-TH"),
            };
            setUserData(userDataPayload);
            setRole(currentUserData.role || "user");

            // Query for the room using the user's ID as the tenantId
            const roomsQuery = query(collection(db, "rooms"), where("tenantId", "==", user.uid), limit(1));
            const roomsSnapshot = await getDocs(roomsQuery);

            if (!roomsSnapshot.empty) {
              const roomDoc = roomsSnapshot.docs[0];
              const currentRoomData = roomDoc.data();
              setRoomData({
                id: roomDoc.id,
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
              // Now fetch history with the correct room id
              fetchBillHistory(roomDoc.id);
            } else {
              setRoomData(null);
              setBillHistory([]);
            }
          }
          setLoading(false);
        });
        
        return () => unsubscribeUser();
      } else {
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

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
      <MainLayout role={role} currentUser={currentUser}>
        <Center h="50vh">
          <Spinner size="xl" color="brand.500" />
        </Center>
      </MainLayout>
    );
  }

  if (role !== "user") {
    return (
      <MainLayout role={role} currentUser={currentUser}>
        <Center h="50vh">
          <Text color="red.500">Access denied. This page is for tenants only.</Text>
        </Center>
      </MainLayout>
    );
  }

  return (
    <MainLayout role={role} currentUser={currentUser} showSidebar={false}>
      <Box p={{ base: 4, md: 6 }} bgGradient="linear(to-b, gray.50, white)" minH="100vh">
        <Heading size={{ base: "md", md: "lg" }} mb={8} color="brand.700" letterSpacing="wide">
          แดชบอร์ดผู้เช่า
        </Heading>

        {/* Personal Information Card */}
        <Card mb={8} boxShadow="2xl" borderRadius="2xl" bg="white" px={{ base: 4, md: 8 }} py={6}>
          <CardHeader pb={2}>
            <Heading size="md" color="brand.600" letterSpacing="wide">
              <Icon as={FaUser} mr={2} /> ข้อมูลส่วนตัว
            </Heading>
          </CardHeader>
          <CardBody>
            <Flex direction={{ base: "column", md: "row" }} align="center" gap={10}>
              <Avatar size="2xl" src={userData?.avatar} name={userData?.name} boxShadow="lg" border="4px solid #fff" />
              <VStack align="flex-start" spacing={0} flex={1} fontSize="lg" w="100%">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacingY={1} spacingX={8} w="100%">
                  <Box>
                    <Text fontWeight="bold" color="gray.600" fontSize="md">ชื่อ</Text>
                    <Text color="gray.800" fontSize="lg">{userData?.name}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" color="gray.600" fontSize="md">อีเมล</Text>
                    <Text color="gray.800" fontSize="lg">{userData?.email}</Text>
                  </Box>
                  {userData?.phoneNumber && (
                    <Box>
                      <Text fontWeight="bold" color="gray.600" fontSize="md">เบอร์โทรศัพท์</Text>
                      <Text color="gray.800" fontSize="lg">{userData.phoneNumber}</Text>
                    </Box>
                  )}
                  <Box>
                    <Text fontWeight="bold" color="gray.600" fontSize="md">สถานะ</Text>
                    <Badge fontSize="md" px={3} py={1} borderRadius="md" colorScheme={userData?.status === "active" ? "green" : "red"}>
                      {userData?.status === "active" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                    </Badge>
                  </Box>
                  {userData?.joinedDate && (
                    <Box>
                      <Text fontWeight="bold" color="gray.600" fontSize="md">วันที่เข้าร่วม</Text>
                      <Text color="gray.800" fontSize="lg">{userData.joinedDate}</Text>
                    </Box>
                  )}
                </SimpleGrid>
              </VStack>
            </Flex>
          </CardBody>
        </Card>

        {/* Room Information Card */}
        {roomData ? (
          <Card mb={8} boxShadow="2xl" borderRadius="2xl" bg="white" px={{ base: 4, md: 8 }} py={6}>
          <CardHeader pb={2}>
            <Heading size="md" color="brand.600" letterSpacing="wide">
              <Icon as={FaHome} mr={2} /> ข้อมูลห้องพัก
            </Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                <Box>
                  <Text fontWeight="bold" color="gray.600" fontSize="md">หมายเลขห้อง</Text>
                  <Text color="gray.800" fontSize="xl">{roomData.id}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" color="gray.600" fontSize="md">ขนาดห้อง</Text>
                  <Text color="gray.800" fontSize="xl">{roomData.area} ตร.ม.</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" color="gray.600" fontSize="md">ค่าเช่า</Text>
                  <Text color="gray.800" fontSize="xl">{roomData.rent.toLocaleString()} บาท</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" color="gray.600" fontSize="md">ค่าบริการ</Text>
                  <Text color="gray.800" fontSize="xl">{roomData.service.toLocaleString()} บาท</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" color="gray.600" fontSize="md">สถานะบิลล่าสุด</Text>
                  <Badge fontSize="md" px={3} py={1} borderRadius="md" colorScheme={getStatusColor(roomData.billStatus)}>
                    {getStatusText(roomData.billStatus)}
                  </Badge>
                </Box>
                {roomData.billStatus === 'unpaid' && (
                <Box>
                  <Text fontWeight="bold" color="gray.600" fontSize="md">ยอดค้างชำระ</Text>
                  <Text color="red.500" fontSize="xl" fontWeight="bold">{roomData.latestTotal.toLocaleString()} บาท</Text>
                </Box>
                )}
              </SimpleGrid>
            </CardBody>
          </Card>
        ) : (
          <Card mb={8} boxShadow="2xl" borderRadius="2xl" bg="white" p={8}>
            <Center>
              <VStack>
                <Icon as={FaHome} boxSize={12} color="gray.300" />
                <Text color="gray.500">คุณยังไม่มีข้อมูลห้องพัก</Text>
              </VStack>
            </Center>
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
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
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
                leftIcon={<FaFileInvoice size={22} />}
                colorScheme="blue"
                size="lg"
                borderRadius="xl"
                variant="solid"
                _hover={{ boxShadow: "md", transform: "scale(1.05)" }}
                onClick={() => router.push("/inbox")}
              >
                กล่องข้อความ
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
    </MainLayout>
  );
}
