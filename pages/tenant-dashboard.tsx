import { Box, Heading, Text, Flex, Avatar, VStack, Icon, Badge, Card, CardHeader, CardBody, SimpleGrid, useToast, Button, Spinner, Center, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, AlertDialogCloseButton, useDisclosure, Table, Thead, Tbody, Tr, Th, Td, TableContainer, Image, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, IconButton, Spacer, Tooltip, Skeleton } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, getDocs, orderBy, limit, updateDoc, Timestamp, startAfter, endBefore, limitToLast } from "firebase/firestore";
import TenantLayout from "../components/TenantLayout";
import { FaUser, FaHome, FaCalendarAlt, FaCreditCard, FaFileInvoice, FaBoxOpen, FaTools, FaBullhorn, FaPhone, FaLine, FaCopy, FaComments, FaQrcode, FaBolt, FaTint, FaCheckCircle, FaSpinner, FaClock, FaMoneyBillWave, FaArrowRight, FaImage, FaArrowLeft } from "react-icons/fa";
import ReportIssueModal from '../components/ReportIssueModal';

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
  contractStart?: string;
  contractEnd?: string;
  depositAmount?: number;
}

interface BillHistory {
  id: string;
  month: string;
  year: number;
  totalAmount: number;
  status: string;
  dueDate: string;
  paidDate?: string;
  electricity?: number;
  water?: number;
}

interface Parcel {
    id: string;
    recipient: string;
    sender: string;
    status: "pending" | "received" | "delivered";
    receivedDate: Timestamp;
    imageUrl?: string;
}

interface Issue {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "resolved";
  reportedAt: Timestamp;
  tenantName: string;
  imageUrls?: string[];
}

// @ts-ignore
declare global {
  interface Window { ThaiQRCode: any }
}

function TenantDashboard() {
  console.log("TenantDashboard component rendering...");
  const router = useRouter();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [billHistory, setBillHistory] = useState<BillHistory[]>([]);
  const [undeliveredParcels, setUndeliveredParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Array<{ title: string; content: string; createdAt: string }>>([]);
  const [contactInfo] = useState({
    phone: "081-234-5678",
    line: "@teeraoniti",
    lineUrl: "https://line.me/R/ti/p/@teeraoniti"
  });
  
  const { isOpen: isAlertOpen, onOpen: onAlertOpen, onClose: onAlertClose } = useDisclosure();
  const { isOpen: isImageModalOpen, onOpen: onImageModalOpen, onClose: onImageModalClose } = useDisclosure();
  const { isOpen: isReportModalOpen, onOpen: onReportModalOpen, onClose: onReportModalClose } = useDisclosure();
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [alertRoomId, setAlertRoomId] = useState<string | null>(null);
  const { isOpen: isProfileOpen, onOpen: onProfileOpen, onClose: onProfileClose } = useDisclosure();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [issueHistory, setIssueHistory] = useState<Issue[]>([]);
  const [issuePage, setIssuePage] = useState(1);
  const [lastIssueVisible, setLastIssueVisible] = useState<any>(null);
  const [firstIssueVisible, setFirstIssueVisible] = useState<any>(null);
  const ISSUES_PER_PAGE = 2;
  const [selectedIssueImageUrls, setSelectedIssueImageUrls] = useState<string[]>([]);
  const { isOpen: isIssueImageModalOpen, onOpen: onIssueImageModalOpen, onClose: onIssueImageModalClose } = useDisclosure();
  const [currentIssueImageIndex, setCurrentIssueImageIndex] = useState(0);

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
            status: firestoreData.status || "active",
            photoURL: firestoreData.avatar || user.photoURL || undefined,
            roomId: firestoreData.roomId,
          };
          setCurrentUser(combinedUser);
          console.log("Current User Loaded:", combinedUser);
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
            console.log("Room Data Loaded:", { id: roomId, ...currentRoomData });
            fetchBillHistory(roomId);
            fetchUndeliveredParcels(roomId);
          } else {
            setRoomData(null);
            setBillHistory([]);
            setUndeliveredParcels([]);
            console.log("No Room Data Found for user:", user.uid);
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
    if (currentUser && currentUser.role && !["user", "tenant"].includes(currentUser.role)) {
      router.replace("/login");
    }
  }, [currentUser, router]);

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

  useEffect(() => {
    // Mock ประกาศ/ข่าวสาร
    setAnnouncements([
      {
        title: "แจ้งปิดปรับปรุงระบบน้ำ",
        content: "วันที่ 10-12 ก.ค. จะมีการปิดปรับปรุงระบบน้ำประปาในอาคาร กรุณากักตุนสำรองน้ำไว้ล่วงหน้า",
        createdAt: "2024-07-09",
      },
      {
        title: "ขอความร่วมมือไม่จอดรถขวางทางเข้าออก",
        content: "โปรดจอดรถในพื้นที่ที่กำหนดเท่านั้น เพื่อความสะดวกของทุกท่าน",
        createdAt: "2024-07-07",
      },
    ]);
  }, []);

  useEffect(() => {
    if (roomData && roomData.latestTotal > 0 && typeof window !== 'undefined' && window.ThaiQRCode) {
      const url = window.ThaiQRCode.generateSync(promptpayNumber, { amount: roomData.latestTotal });
      setQrDataUrl(url);
    } else {
      setQrDataUrl(null);
    }
  }, [roomData]);

  useEffect(() => {
    // Fetch issue history for this room
    if (roomData && roomData.id) {
      fetchIssueHistory('first');
    }
  }, [roomData]);

  const fetchIssueHistory = async (direction: 'first' | 'next' | 'prev') => {
    if (!roomData?.id) return;

    let q;
    const baseQuery = [
        collection(db, "issues"), 
        where("roomId", "==", roomData.id), 
        orderBy("reportedAt", "desc")
    ];

    if (direction === 'first') {
        q = query(collection(db, "issues"), where("roomId", "==", roomData.id), orderBy("reportedAt", "desc"), limit(ISSUES_PER_PAGE));
        setIssuePage(1);
    } else if (direction === 'next' && lastIssueVisible) {
        q = query(collection(db, "issues"), where("roomId", "==", roomData.id), orderBy("reportedAt", "desc"), startAfter(lastIssueVisible), limit(ISSUES_PER_PAGE));
    } else if (direction === 'prev' && firstIssueVisible) {
        q = query(collection(db, "issues"), where("roomId", "==", roomData.id), orderBy("reportedAt", "desc"), endBefore(firstIssueVisible), limitToLast(ISSUES_PER_PAGE));
    } else {
        return; // No more pages or invalid direction
    }

    const snapshot = await getDocs(q);
    const issues = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        description: d.description || "-",
        status: d.status || "pending",
        reportedAt: d.reportedAt?.toDate ? Timestamp.fromDate(d.reportedAt.toDate()) : Timestamp.now(),
        tenantName: d.tenantName || "",
        imageUrls: d.imageUrls || [],
      } as Issue;
    });

    if (issues.length > 0) {
        setIssueHistory(issues);
        setFirstIssueVisible(snapshot.docs[0]);
        setLastIssueVisible(snapshot.docs[snapshot.docs.length - 1]);
        if (direction === 'next') setIssuePage(p => p + 1);
        if (direction === 'prev') setIssuePage(p => p - 1);
    } else {
        if (direction === 'first') {
            setIssueHistory([]);
        }
        toast({ title: "ไม่มีข้อมูลเพิ่มเติม", status: "info", duration: 2000 });
    }
  };

  // เพิ่ม field สัญญาเช่า mock ถ้ายังไม่มี
  useEffect(() => {
    if (roomData && !roomData.contractStart) {
      setRoomData(prev => prev && {
        ...prev,
        contractStart: "2024-01-01",
        contractEnd: "2024-12-31",
        depositAmount: 5000,
      });
    }
  }, [roomData]);

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
          electricity: data.electricity || 0,
          water: data.water || 0,
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

  const promptpayNumber = "0812345678";

  if (loading) {
    return (
      <TenantLayout currentUser={currentUser} isProfileOpen={isProfileOpen} onProfileOpen={onProfileOpen} onProfileClose={onProfileClose}>
        <Center h="50vh">
          <Spinner size="xl" color="brand.500" />
        </Center>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout currentUser={currentUser} isProfileOpen={isProfileOpen} onProfileOpen={onProfileOpen} onProfileClose={onProfileClose}>
      <Box p={{ base: 4, md: 6 }} bg="gray.50" minH="100vh">
        {/* Section 1: Header */}
        <Flex mb={6} justify="space-between" align="center">
          <Flex align="center">
            <Avatar size="lg" src={currentUser?.photoURL} name={currentUser?.name} mr={4} />
            <Box>
              <Heading size="md" color="gray.700">สวัสดี, {currentUser?.name || 'ผู้เช่า'}</Heading>
              <Text color="gray.500">ยินดีต้อนรับสู่แดชบอร์ดของคุณ</Text>
            </Box>
          </Flex>
          <Flex gap={3}>
            <Button leftIcon={<FaTools />} colorScheme="orange" variant="solid" onClick={onReportModalOpen} isDisabled={!roomData}>
              แจ้งปัญหา
            </Button>
            <Button leftIcon={<FaUser />} colorScheme="gray" variant="outline" onClick={onProfileOpen}>
              โปรไฟล์
            </Button>
          </Flex>
        </Flex>

        {/* Section 2: Billing Hub */}
        {roomData ? (
          <Card 
            mb={6} 
            borderRadius="xl" 
            boxShadow="xl" 
            p={{ base: 4, md: 6 }}
            bg={roomData.billStatus === 'unpaid' ? "red.50" : "white"}
            borderWidth="1px"
            borderColor={roomData.billStatus === 'unpaid' ? "red.200" : "gray.200"}
          >
            <CardHeader>
              <Flex justify="space-between" align="center">
                <Heading size="lg" color={roomData.billStatus === 'unpaid' ? "red.700" : "brand.700"}>
                  <Icon as={FaFileInvoice} mr={3} />
                  สถานะบิลล่าสุด
                </Heading>
                <Badge fontSize="lg" px={4} py={1.5} borderRadius="full" colorScheme={getStatusColor(roomData.billStatus)}>
                  {getStatusText(roomData.billStatus)}
                </Badge>
              </Flex>
            </CardHeader>
            <CardBody>
              {roomData.billStatus === 'unpaid' ? (
                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} align="center">
                  <VStack align={{ base: 'center', lg: 'flex-start' }} spacing={4}>
                    <Text fontSize="lg" color="gray.600">ยอดเงินที่ต้องชำระ:</Text>
                    <Text fontSize="5xl" fontWeight="bold" color="red.600" lineHeight="1">
                      {roomData.latestTotal.toLocaleString()}
                      <Text as="span" fontSize="2xl" fontWeight="medium" ml={2}>บาท</Text>
                    </Text>
                    {roomData.overdueDays > 0 && (
                      <Text color="red.500" fontWeight="bold">
                        เกินกำหนดชำระ {roomData.overdueDays} วัน
                      </Text>
                    )}
                    <Button 
                      mt={4}
                      size="lg" 
                      colorScheme="red" 
                      rightIcon={<FaArrowRight />}
                      onClick={() => router.push(`/bill/${roomData.id}`)}
                    >
                      ชำระเงินทันที
                    </Button>
                  </VStack>
                  <Center>
                    {qrDataUrl ? (
                      <VStack>
                        <Image src={qrDataUrl} alt="PromptPay QR" boxSize="180px" borderRadius="lg" bg="white" p={2} boxShadow="md" />
                        <Text color="gray.600" fontSize="sm">สแกนเพื่อชำระเงิน</Text>
                        <Flex align="center" gap={2} mt={2}>
                          <Text color="gray.700" fontSize="md">{promptpayNumber}</Text>
                          <Tooltip label="คัดลอกพร้อมเพย์" hasArrow><IconButton aria-label="คัดลอกพร้อมเพย์" icon={<FaCopy />} colorScheme="gray" size="xs" isRound onClick={() => {navigator.clipboard.writeText(promptpayNumber)}} /></Tooltip>
                        </Flex>
                      </VStack>
                    ) : <Spinner />}
                  </Center>
                </SimpleGrid>
              ) : (
                <Center flexDirection="column" p={4}>
                   <Icon as={FaCheckCircle} boxSize={12} color="green.500" mb={3} />
                   <Heading size="md" color="green.700">ยอดล่าสุดชำระเรียบร้อยแล้ว</Heading>
                   <Text color="gray.500" mt={1}>ไม่มีบิลค้างชำระในขณะนี้</Text>
                   <Button mt={6} colorScheme="brand" variant="outline" onClick={() => router.push(`/history/${roomData.id}`)}>
                     ดูประวัติการชำระเงิน
                   </Button>
                </Center>
              )}
            </CardBody>
          </Card>
        ) : (
          <Card mb={6} borderRadius="xl" boxShadow="lg" p={6}>
            <Center>
              <VStack>
                <Icon as={FaHome} boxSize={10} color="gray.300" />
                <Text color="gray.500">คุณยังไม่มีข้อมูลห้องพักในระบบ</Text>
              </VStack>
            </Center>
          </Card>
        )}

        {/* Section 3: Main Grid */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} alignItems="flex-start">
          {/* Left Column */}
          <VStack spacing={6} align="stretch">
            {/* Announcements */}
            <Card borderRadius="xl" boxShadow="lg" bg="white">
              <CardHeader>
                <Heading size="md" color="brand.700"><Icon as={FaBullhorn} mr={2} />ประกาศ/ข่าวสาร</Heading>
              </CardHeader>
              <CardBody>
                {loading ? <Skeleton height="40px" /> : announcements.length === 0 ? (
                  <Text color="gray.500">ไม่มีประกาศใหม่</Text>
                ) : (
                  <VStack align="stretch" spacing={4}>
                    {announcements.map((a, idx) => (
                      <Box key={idx} p={3} bg="gray.50" borderRadius="lg">
                        <Flex align="center" mb={1}>
                          <Text fontWeight="bold" color="brand.800">{a.title}</Text>
                          <Text fontSize="xs" color="gray.400" ml="auto">{a.createdAt}</Text>
                        </Flex>
                        <Text color="gray.600" fontSize="sm">{a.content}</Text>
                      </Box>
                    ))}
                  </VStack>
                )}
              </CardBody>
            </Card>
            
            {/* Room Details */}
            {roomData && (
              <Card borderRadius="xl" boxShadow="lg" bg="white">
                <CardHeader>
                  <Heading size="md" color="brand.700"><Icon as={FaHome} mr={2} />ข้อมูลห้องพักและสัญญา</Heading>
                </CardHeader>
                <CardBody>
                  <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                    <Box><Text fontWeight="bold" color="gray.500">หมายเลขห้อง</Text><Text fontSize="lg">{roomData.id}</Text></Box>
                    <Box><Text fontWeight="bold" color="gray.500">ขนาด</Text><Text fontSize="lg">{roomData.area} ตร.ม.</Text></Box>
                    <Box><Text fontWeight="bold" color="gray.500">ค่าเช่า</Text><Text fontSize="lg">{roomData.rent.toLocaleString()} บาท/เดือน</Text></Box>
                    <Box><Text fontWeight="bold" color="gray.500">ค่าบริการ</Text><Text fontSize="lg">{roomData.service.toLocaleString()} บาท/เดือน</Text></Box>
                    <Box><Text fontWeight="bold" color="gray.500">สัญญาเริ่มต้น</Text><Text fontSize="lg">{roomData.contractStart}</Text></Box>
                    <Box><Text fontWeight="bold" color="gray.500">สัญญาหมดอายุ</Text><Text fontSize="lg">{roomData.contractEnd}</Text></Box>
                    <Box><Text fontWeight="bold" color="gray.500">เงินมัดจำ</Text><Text fontSize="lg">{roomData.depositAmount?.toLocaleString()} บาท</Text></Box>
                  </SimpleGrid>
                </CardBody>
              </Card>
            )}
          </VStack>

          {/* Right Column */}
          <VStack spacing={6} align="stretch">
            {/* Recent Payment History */}
            {billHistory.length > 0 && (
            <Card borderRadius="xl" boxShadow="lg" bg="white">
              <CardHeader>
                <Flex justify="space-between" align="center">
                  <Heading size="md" color="brand.700"><Icon as={FaFileInvoice} mr={2} />ประวัติชำระล่าสุด</Heading>
                  {roomData?.id && (
                    <Button size="sm" variant="link" colorScheme="brand" onClick={() => router.push(`/history/${roomData.id}`)}>
                      ดูทั้งหมด
                    </Button>
                  )}
                </Flex>
              </CardHeader>
              <CardBody>
                <VStack align="stretch" spacing={3}>
                  {billHistory.slice(0, 3).map((bill) => (
                    <Flex key={bill.id} justify="space-between" align="center" p={3} bg="gray.50" borderRadius="lg">
                      <Box>
                        <Text fontWeight="bold" color="gray.700">{bill.month} {bill.year}</Text>
                        <Text fontSize="sm" color="gray.500">ชำระวันที่: {bill.paidDate}</Text>
                      </Box>
                      <Text fontWeight="bold" color="green.600">{bill.totalAmount.toLocaleString()} บาท</Text>
                    </Flex>
                  ))}
                </VStack>
              </CardBody>
            </Card>
            )}

            {/* Parcels */}
            <Card borderRadius="xl" boxShadow="lg" bg="white">
              <CardHeader>
                <Flex>
                  <Heading size="md" color="brand.700"><Icon as={FaBoxOpen} mr={2} />พัสดุ</Heading>
                  {undeliveredParcels.length > 0 && <Badge colorScheme="blue" ml={3}>{undeliveredParcels.length} รายการ</Badge>}
                </Flex>
              </CardHeader>
              <CardBody>
                {undeliveredParcels.length > 0 ? (
                  <VStack align="stretch" spacing={4}>
                    {undeliveredParcels.map((parcel) => (
                      <Flex key={parcel.id} p={3} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="gray.50" align="center">
                        {parcel.imageUrl && (
                          <Image src={parcel.imageUrl} alt="Parcel" boxSize="60px" objectFit="cover" borderRadius="md" mr={4} cursor="pointer" onClick={() => handleImageClick(parcel.imageUrl!)} />
                        )}
                        <VStack align="flex-start" spacing={0} flex={1}>
                          <Text fontWeight="bold">จาก: {parcel.sender}</Text>
                          <Text fontSize="sm" color="gray.600">มาถึงวันที่: {parcel.receivedDate.toDate().toLocaleDateString('th-TH')}</Text>
                        </VStack>
                        <Badge colorScheme={parcel.status === 'received' ? 'green' : 'orange'}>
                          {parcel.status === 'received' ? 'รอรับ' : 'รอจัดส่ง'}
                        </Badge>
                      </Flex>
                    ))}
                  </VStack>
                ) : (
                  <Text color="gray.500">ไม่มีพัสดุที่ยังไม่ได้รับ</Text>
                )}
              </CardBody>
            </Card>

            {/* Issue History */}
            {roomData && (
              <Card borderRadius="xl" boxShadow="lg" bg="white">
                <CardHeader>
                  <Flex justify="space-between" align="center">
                    <Heading size="md" color="brand.700"><Icon as={FaTools} mr={2} />ประวัติการแจ้งปัญหา</Heading>
                    <Text fontSize="sm" color="gray.500">หน้า {issuePage}</Text>
                  </Flex>
                </CardHeader>
                <CardBody>
                  {issueHistory.length > 0 ? (
                    <VStack align="stretch" spacing={3}>
                      {issueHistory.map((issue) => ( 
                        <Flex key={issue.id} align="center" bg="gray.50" borderRadius="md" p={3} gap={4}>
                          <Box flex="1">
                            <Text color="gray.800" noOfLines={1}>{issue.description}</Text>
                            <Text color="gray.500" fontSize="sm">{issue.reportedAt.toDate().toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                          </Box>
                          {issue.imageUrls && issue.imageUrls.length > 0 && (
                            <Button 
                              leftIcon={<Icon as={FaImage} />} 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setSelectedIssueImageUrls(issue.imageUrls!);
                                setCurrentIssueImageIndex(0);
                                onIssueImageModalOpen();
                              }}
                            >
                              {issue.imageUrls.length}
                            </Button>
                          )}
                          <Badge colorScheme={issue.status === 'resolved' ? 'green' : issue.status === 'in_progress' ? 'blue' : 'yellow'}>
                            {issue.status === 'pending' && 'รอดำเนินการ'}
                            {issue.status === 'in_progress' && 'กำลังซ่อม'}
                            {issue.status === 'resolved' && 'เสร็จสิ้น'}
                          </Badge>
                        </Flex>
                      ))}
                    </VStack>
                  ) : (
                    <Text color="gray.500">ยังไม่มีประวัติการแจ้งปัญหา</Text>
                  )}
                </CardBody>
                <Flex justify="center" align="center" p={4} borderTopWidth="1px" borderColor="gray.100">
                    <Button onClick={() => fetchIssueHistory('prev')} isDisabled={issuePage <= 1} size="sm" leftIcon={<FaArrowLeft />}>ก่อนหน้า</Button>
                    <Spacer />
                    <Button onClick={() => fetchIssueHistory('next')} isDisabled={issueHistory.length < ISSUES_PER_PAGE} size="sm" rightIcon={<FaArrowRight />}>ถัดไป</Button>
                </Flex>
              </Card>
            )}
          </VStack>
        </SimpleGrid>

        {/* Section 4: Contact Channels */}
        <Card borderRadius="xl" boxShadow="lg" bg="white" mt={6}>
          <CardHeader>
            <Heading size="md" color="brand.700"><Icon as={FaComments} mr={2} />ช่องทางติดต่อ</Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Flex align="center" p={3} bg="gray.50" borderRadius="lg">
                <Icon as={FaPhone} mr={4} color="gray.600" boxSize={5} />
                <Text flex="1" fontWeight="medium" color="gray.800">{contactInfo.phone}</Text>
                <Button size="sm" onClick={() => {
                  navigator.clipboard.writeText(contactInfo.phone);
                  toast({ title: "คัดลอกเบอร์โทรศัพท์แล้ว", status: "success", duration: 2000 });
                }}>คัดลอก</Button>
              </Flex>
              <Flex align="center" p={3} bg="gray.50" borderRadius="lg">
                <Icon as={FaLine} mr={4} color="green.500" boxSize={6} />
                <Text flex="1" fontWeight="medium" color="gray.800">{contactInfo.line}</Text>
                <Button as="a" href={contactInfo.lineUrl} target="_blank" colorScheme="green" size="sm">เพิ่มเพื่อน</Button>
              </Flex>
            </SimpleGrid>
          </CardBody>
        </Card>
      </Box>

      {/* Modals and Alerts */}
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

      {/* Issue Image Gallery Modal */}
      <Modal isOpen={isIssueImageModalOpen} onClose={onIssueImageModalClose} size="4xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader textAlign="center">รูปภาพปัญหา ({currentIssueImageIndex + 1} / {selectedIssueImageUrls.length})</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex align="center" justify="center" position="relative">
              {selectedIssueImageUrls.length > 1 && (
                <IconButton
                  icon={<Icon as={FaArrowLeft} />}
                  aria-label="Previous image"
                  onClick={() => setCurrentIssueImageIndex(prev => (prev === 0 ? selectedIssueImageUrls.length - 1 : prev - 1))}
                  position="absolute"
                  left={2}
                  zIndex={1}
                  size="lg"
                  isRound
                />
              )}
              <Image 
                src={selectedIssueImageUrls[currentIssueImageIndex] || ""} 
                alt={`Issue Image ${currentIssueImageIndex + 1}`}
                maxH="70vh"
                maxW="full"
                objectFit="contain"
                borderRadius="md"
              />
              {selectedIssueImageUrls.length > 1 && (
                <IconButton
                  icon={<Icon as={FaArrowRight} />}
                  aria-label="Next image"
                  onClick={() => setCurrentIssueImageIndex(prev => (prev === selectedIssueImageUrls.length - 1 ? 0 : prev + 1))}
                  position="absolute"
                  right={2}
                  zIndex={1}
                  size="lg"
                  isRound
                />
              )}
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>

      {roomData && currentUser && (
        <ReportIssueModal 
          isOpen={isReportModalOpen} 
          onClose={onReportModalClose} 
          roomId={roomData.id} 
          tenantId={currentUser.uid}
          tenantName={currentUser.name}
        />
      )}
    </TenantLayout>
  );
}

export default TenantDashboard;
