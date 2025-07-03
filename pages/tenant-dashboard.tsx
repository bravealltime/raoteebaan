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
      <Box p={6} bg="gray.50" minH="100vh">
        <Heading size="lg" mb={6} color="brand.700">
          แดชบอร์ดผู้เช่า
        </Heading>

        {/* Personal Information Card */}
        <Card mb={6} boxShadow="md">
          <CardHeader>
            <Heading size="md" color="brand.600">
              <Icon as={FaUser} mr={2} />
              ข้อมูลส่วนตัว
            </Heading>
          </CardHeader>
          <CardBody>
            <Flex direction={["column", "row"]} align="center" gap={6}>
              <Avatar size="xl" src={userData?.avatar} name={userData?.name} />
              <VStack align="flex-start" spacing={2} flex={1}>
                <HStack>
                  <Text fontWeight="bold">ชื่อ:</Text>
                  <Text>{userData?.name}</Text>
                </HStack>
                <HStack>
                  <Text fontWeight="bold">อีเมล:</Text>
                  <Text>{userData?.email}</Text>
                </HStack>
                {userData?.phoneNumber && (
                  <HStack>
                    <Text fontWeight="bold">เบอร์โทรศัพท์:</Text>
                    <Text>{userData.phoneNumber}</Text>
                  </HStack>
                )}
                <HStack>
                  <Text fontWeight="bold">สถานะ:</Text>
                  <Badge colorScheme={userData?.status === "active" ? "green" : "red"}>
                    {userData?.status === "active" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                  </Badge>
                </HStack>
                {userData?.joinedDate && (
                  <HStack>
                    <Text fontWeight="bold">วันที่เข้าร่วม:</Text>
                    <Text>{new Date(userData.joinedDate).toLocaleDateString("th-TH")}</Text>
                  </HStack>
                )}
              </VStack>
            </Flex>
          </CardBody>
        </Card>

        {/* Room Information Card */}
        {roomData && (
          <Card mb={6} boxShadow="md">
            <CardHeader>
              <Heading size="md" color="brand.600">
                <Icon as={FaHome} mr={2} />
                ข้อมูลห้องพัก
              </Heading>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={[1, 2, 3]} spacing={4}>
                <Stat>
                  <StatLabel>หมายเลขห้อง</StatLabel>
                  <StatNumber>{roomData.id}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>ขนาดห้อง</StatLabel>
                  <StatNumber>{roomData.area} ตร.ม.</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>ค่าเช่า</StatLabel>
                  <StatNumber>{roomData.rent.toLocaleString()} บาท</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>ค่าบริการ</StatLabel>
                  <StatNumber>{roomData.service.toLocaleString()} บาท</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>สถานะบิล</StatLabel>
                  <StatNumber>
                    <Badge colorScheme={getStatusColor(roomData.billStatus)}>
                      {getStatusText(roomData.billStatus)}
                    </Badge>
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>ยอดรวมล่าสุด</StatLabel>
                  <StatNumber>{roomData.latestTotal.toLocaleString()} บาท</StatNumber>
                </Stat>
              </SimpleGrid>
            </CardBody>
          </Card>
        )}

        {/* Bill History Card */}
        <Card boxShadow="md">
          <CardHeader>
            <Flex justify="space-between" align="center">
              <Heading size="md" color="brand.600">
                <Icon as={FaFileInvoice} mr={2} />
                ประวัติการชำระเงิน
              </Heading>
              {userData?.roomId && (
                <Button
                  size="sm"
                  colorScheme="brand"
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
                  <Box key={bill.id} p={4} border="1px" borderColor="gray.200" borderRadius="md">
                    <Flex justify="space-between" align="center" mb={2}>
                      <Text fontWeight="bold">
                        {bill.month} {bill.year}
                      </Text>
                      <Badge colorScheme={getStatusColor(bill.status)}>
                        {getStatusText(bill.status)}
                      </Badge>
                    </Flex>
                    <HStack justify="space-between">
                      <Text>ยอดรวม: {bill.totalAmount.toLocaleString()} บาท</Text>
                      <Text fontSize="sm" color="gray.500">
                        {bill.status === "paid" && bill.paidDate
                          ? `ชำระเมื่อ: ${new Date(bill.paidDate).toLocaleDateString("th-TH")}`
                          : `ครบกำหนด: ${new Date(bill.dueDate).toLocaleDateString("th-TH")}`}
                      </Text>
                    </HStack>
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
        <Card mt={6} boxShadow="md">
          <CardHeader>
            <Heading size="md" color="brand.600">
              เมนูด่วน
            </Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={[1, 2, 4]} spacing={4}>
              <Button leftIcon={<FaFileInvoice />} colorScheme="brand" onClick={() => router.push("/inbox")}>
                ข้อความ
              </Button>
              <Button leftIcon={<FaCreditCard />} colorScheme="green" onClick={() => roomData?.id && router.push(`/bill/${roomData.id}`)}>
                ชำระเงิน
              </Button>
              <Button leftIcon={<FaCalendarAlt />} colorScheme="purple" onClick={() => roomData?.id && router.push(`/history/${roomData.id}`)}>
                ประวัติ
              </Button>
              <Button leftIcon={<FaUser />} colorScheme="gray" onClick={() => router.push("/profile")}>
                แก้ไขข้อมูล
              </Button>
            </SimpleGrid>
          </CardBody>
        </Card>
      </Box>
    </MainLayout>
  );
}
