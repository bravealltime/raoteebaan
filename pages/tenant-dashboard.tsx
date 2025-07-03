import { Box, Heading, Text, Flex, Avatar, VStack, HStack, Divider, Badge, Card, CardHeader, CardBody, SimpleGrid, Icon, Stat, StatLabel, StatNumber, StatHelpText, useToast, Button, Spinner, Center } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import MainLayout from "../components/MainLayout";
import { FaUser, FaHome, FaCalendarAlt, FaCreditCard, FaFileInvoice, FaWater, FaBolt, FaMoneyBillWave } from "react-icons/fa";

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        // Subscribe to user data changes
        const userDocRef = doc(db, "users", user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            setUserData({
              name: data.name || user.displayName || "Unknown",
              email: data.email || user.email || "",
              avatar: data.avatar || user.photoURL || "",
              role: data.role || "user",
              status: data.status || "active",
              roomId: data.roomId, // This is where roomId is set
              tenantId: data.tenantId,
              phoneNumber: data.phoneNumber,
              joinedDate: data.joinedDate || user.metadata?.creationTime?.split("T")[0],
            });
            setRole(data.role || "user");
            const userId = user.uid;
            
            let roomsQuery = query(collection(db, "rooms"), where("tenantId", "==", userId));
            const roomsSnapshot = getDocs(roomsQuery).then((snapshot) => {
                
                if (!snapshot.empty) {
                    const roomData = snapshot.docs[0].data();
                    setRoomData({
                    id: snapshot.docs[0].id,
                    tenantName: roomData.tenantName || "",
                    area: roomData.area || 0,
                    rent: roomData.rent || 0,
                    service: roomData.service || 0,
                    electricity: roomData.electricity || 0,
                    water: roomData.water || 0,
                    latestTotal: roomData.latestTotal || 0,
                    billStatus: roomData.billStatus || "pending",
                    overdueDays: roomData.overdueDays || 0,
                    });
                } else {
                    setRoomData(null);
                }

            });


            // If user has a roomId, fetch room data
            
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

  const fetchRoomData = async (roomId: string) => {
    try {
      const roomDocRef = doc(db, "rooms", roomId);
      const unsubscribeRoom = onSnapshot(roomDocRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setRoomData({
            id: doc.id,
            tenantName: data.tenantName || "",
            area: data.area || 0,
            rent: data.rent || 0,
            service: data.service || 0,
            electricity: data.electricity || 0,
            water: data.water || 0,
            latestTotal: data.latestTotal || 0,
            billStatus: data.billStatus || "pending",
            overdueDays: data.overdueDays || 0,
          });
        }
      });
      
      return () => unsubscribeRoom();
    } catch (error) {
      console.error("Error fetching room data:", error);
      toast({
        title: "Error",
        description: "Failed to load room data",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const fetchBillHistory = async (roomId: string) => {
    try {
      const billsQuery = query(
        collection(db, "bills"),
        where("roomId", "==", roomId),
        orderBy("year", "desc"),
        orderBy("month", "desc"),
        limit(6)
      );
      
      const snapshot = await getDocs(billsQuery);
      const bills: BillHistory[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        bills.push({
          id: doc.id,
          month: data.month || "",
          year: data.year || new Date().getFullYear(),
          totalAmount: data.totalAmount || 0,
          status: data.status || "pending",
          dueDate: data.dueDate || "",
          paidDate: data.paidDate,
        });
      });
      
      setBillHistory(bills);
    } catch (error) {
      console.error("Error fetching bill history:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "green";
      case "overdue":
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
      case "overdue":
        return "เกินกำหนด";
      case "pending":
        return "รอชำระ";
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

  // Check if user is tenant
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
      <Box p={[2, 6]} bgGradient="linear(to-b, gray.50, white)" minH="100vh">
        <Heading size="lg" mb={8} color="brand.700" letterSpacing="wide">
          แดชบอร์ดผู้เช่า
        </Heading>

        {/* Personal Information Card */}
        <Card mb={8} boxShadow="2xl" borderRadius="2xl" bg="white" px={[2, 8]} py={6}>
          <CardHeader pb={2}>
            <Heading size="md" color="brand.600" letterSpacing="wide">
              <Icon as={FaUser} mr={2} /> ข้อมูลส่วนตัว
            </Heading>
          </CardHeader>
          <CardBody>
            <Flex direction={['column', 'row']} align="center" gap={10}>
              <Avatar size="2xl" src={userData?.avatar} name={userData?.name} boxShadow="lg" border="4px solid #fff" />
              <VStack align="flex-start" spacing={0} flex={1} fontSize="lg" w="100%">
                <SimpleGrid columns={[1, 2]} spacingY={1} spacingX={8} w="100%">
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
                      <Text color="gray.800" fontSize="lg">{!isNaN(Date.parse(userData.joinedDate)) ? new Date(userData.joinedDate).toLocaleDateString("th-TH") : "-"}</Text>
                    </Box>
                  )}
                </SimpleGrid>
              </VStack>
            </Flex>
          </CardBody>
        </Card>

        {/* Room Information Card */}
        {roomData && (
          <Card mb={8} boxShadow="2xl" borderRadius="2xl" bg="white" px={[2, 8]} py={6}>
            <CardHeader pb={2}>
              <Heading size="md" color="brand.600" letterSpacing="wide">
                <Icon as={FaHome} mr={2} /> ข้อมูลห้องพัก
              </Heading>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={[1, 2, 3]} spacing={6}>
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
                  <Text fontWeight="bold" color="gray.600" fontSize="md">สถานะบิล</Text>
                  <Badge fontSize="md" px={3} py={1} borderRadius="md" colorScheme={getStatusColor(roomData.billStatus)}>
                    {getStatusText(roomData.billStatus)}
                  </Badge>
                </Box>
                <Box>
                  <Text fontWeight="bold" color="gray.600" fontSize="md">ยอดรวมล่าสุด</Text>
                  <Text color="gray.800" fontSize="xl">{roomData.latestTotal.toLocaleString()} บาท</Text>
                </Box>
              </SimpleGrid>
            </CardBody>
          </Card>
        )}

        {/* Bill History Card */}
        <Card boxShadow="2xl" borderRadius="2xl" bg="white" px={[2, 8]} py={6}>
          <CardHeader pb={2}>
            <Flex justify="space-between" align="center">
              <Heading size="md" color="brand.600" letterSpacing="wide">
                <Icon as={FaFileInvoice} mr={2} /> ประวัติการชำระเงิน
              </Heading>
              {userData?.roomId && (
                <Button
                  size="sm"
                  colorScheme="brand"
                  variant="outline"
                  borderRadius="md"
                  onClick={() => router.push(`/bill/${userData.roomId}`)}
                >
                  ดูบิลปัจจุบัน
                </Button>
              )}
            </Flex>
          </CardHeader>
          <CardBody>
            {billHistory.length > 0 ? (
              <VStack spacing={4} align="stretch">
                {billHistory.map((bill) => (
                  <Box key={bill.id} p={4} border="1px" borderColor="gray.200" borderRadius="lg" bg="gray.50">
                    <Flex justify="space-between" align="center" mb={2}>
                      <Text fontWeight="bold" fontSize="lg" color="brand.700">
                        {bill.month} {bill.year}
                      </Text>
                      <Badge fontSize="md" px={3} py={1} borderRadius="md" colorScheme={getStatusColor(bill.status)}>
                        {getStatusText(bill.status)}
                      </Badge>
                    </Flex>
                    <Divider my={2} />
                    <SimpleGrid columns={[1, 2]} spacingY={1} spacingX={8}>
                      <Text color="gray.700">ยอดรวม: <b>{bill.totalAmount.toLocaleString()} บาท</b></Text>
                      <Text fontSize="sm" color="gray.500">
                        {bill.status === "paid" && bill.paidDate
                          ? `ชำระเมื่อ: ${!isNaN(Date.parse(bill.paidDate)) ? new Date(bill.paidDate).toLocaleDateString("th-TH") : "-"}`
                          : `ครบกำหนด: ${!isNaN(Date.parse(bill.dueDate)) ? new Date(bill.dueDate).toLocaleDateString("th-TH") : "-"}`}
                      </Text>
                    </SimpleGrid>
                  </Box>
                ))}
              </VStack>
            ) : (
              <Text color="gray.500" textAlign="center">
                ไม่มีประวัติการชำระเงิน
              </Text>
            )}
          </CardBody>
        </Card>

        {/* Quick Actions */}
        <Card mt={10} boxShadow="2xl" borderRadius="2xl" bg="white" px={[2, 8]} py={6}>
          <CardHeader pb={2}>
            <Heading size="md" color="brand.600" letterSpacing="wide">
              เมนูด่วน
            </Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={[1, 2, 4]} spacing={6}>
              <Button
                leftIcon={<FaFileInvoice size={22} />}
                colorScheme="blue"
                size="lg"
                borderRadius="xl"
                variant="solid"
                _hover={{ boxShadow: "md", transform: "scale(1.05)" }}
                onClick={() => router.push("/inbox")}
              >
                ข้อความ
              </Button>
              <Button
                leftIcon={<FaCreditCard size={22} />}
                colorScheme="green"
                size="lg"
                borderRadius="xl"
                variant="solid"
                _hover={{ boxShadow: "md", transform: "scale(1.05)" }}
                onClick={() => roomData?.id && router.push(`/bill/${roomData.id}`)}
              >
                ชำระเงิน
              </Button>
              <Button
                leftIcon={<FaCalendarAlt size={22} />}
                colorScheme="purple"
                size="lg"
                borderRadius="xl"
                variant="solid"
                _hover={{ boxShadow: "md", transform: "scale(1.05)" }}
                onClick={() => roomData?.id && router.push(`/history/${roomData.id}`)}
              >
                ประวัติ
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
                แก้ไขข้อมูล
              </Button>
            </SimpleGrid>
          </CardBody>
        </Card>
      </Box>
    </MainLayout>
  );
}
