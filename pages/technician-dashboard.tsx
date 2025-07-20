import { Box, Heading, Text, Flex, Avatar, VStack, Icon, Badge, Card, CardHeader, CardBody, SimpleGrid, useToast, Button, Spinner, Center, Table, Thead, Tbody, Tr, Th, Td, TableContainer, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, Image, IconButton, HStack, Container } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useState, useCallback } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, getDocs, orderBy, limit, updateDoc, Timestamp, startAfter, endBefore, limitToLast } from "firebase/firestore";
import TenantLayout from "../components/TenantLayout";
import { FaTools, FaUser, FaBell, FaImage, FaArrowLeft, FaArrowRight, FaExclamationTriangle } from "react-icons/fa";
import UpdateIssueStatusModal from '../components/UpdateIssueStatusModal';

interface UserData {
  name: string;
  email: string;
  avatar: string;
  role: string;
  status: string;
}

interface Issue {
  id: string;
  roomId: string;
  tenantName: string; 
  description: string;
  status: "pending" | "in_progress" | "resolved";
  reportedAt: any;
  imageUrls?: string[];
  updates?: Array<{ notes: string; status: string; updatedAt: any; updatedBy: string }>;
}

function TechnicianDashboard() {
  const router = useRouter();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [firstVisible, setFirstVisible] = useState<any>(null);
  const [page, setPage] = useState(1);
  const ISSUES_PER_PAGE = 10;

  const { isOpen: isUpdateModalOpen, onOpen: onUpdateModalOpen, onClose: onUpdateModalClose } = useDisclosure();
  const { isOpen: isImageModalOpen, onOpen: onImageModalOpen, onClose: onImageModalClose } = useDisclosure();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>("pending");

  const handleUpdateClick = (issue: Issue) => {
    setSelectedIssue(issue);
    onUpdateModalOpen();
  };

  const handleImageClick = (imageUrls: string[]) => {
    setSelectedImageUrls(imageUrls);
    setCurrentImageIndex(0);
    onImageModalOpen();
  };

  const handlePrevImage = () => {
    setCurrentImageIndex(prev => (prev === 0 ? selectedImageUrls.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prev => (prev === selectedImageUrls.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data();
            if (userData.role !== 'technician') {
              router.replace('/login');
            } else {
              setCurrentUser({ uid: user.uid, ...userData });
            }
          } else {
            router.replace('/login');
          }
        });
        return () => unsubscribeSnapshot();
      } else {
        router.replace("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchIssues = useCallback(async (pageDirection: 'first' | 'next' | 'prev' = 'first') => {
    if (!currentUser) return;
    setLoading(true);
    try {
      let issuesQuery;
      const baseConditions = [
        where("status", "==", filterStatus),
        orderBy("reportedAt", "desc"),
      ];

      if (pageDirection === 'first') {
        issuesQuery = query(collection(db, "issues"), ...baseConditions, limit(ISSUES_PER_PAGE));
      } else if (pageDirection === 'next' && lastVisible) {
        issuesQuery = query(collection(db, "issues"), ...baseConditions, startAfter(lastVisible), limit(ISSUES_PER_PAGE));
      } else if (pageDirection === 'prev' && firstVisible) {
        issuesQuery = query(collection(db, "issues"), ...baseConditions, endBefore(firstVisible), limitToLast(ISSUES_PER_PAGE));
      } else {
        setLoading(false);
        return;
      }

      const documentSnapshots = await getDocs(issuesQuery);
      const issuesData = documentSnapshots.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Issue, 'id'>)
      }) as Issue);

      if (documentSnapshots.empty) {
        if (pageDirection === 'first') setIssues([]);
        if (pageDirection === 'next') setLastVisible(null);
        toast({
          title: "ไม่มีข้อมูล",
          description: "ไม่มีรายการแจ้งซ่อมเพิ่มเติม",
          status: "info",
          duration: 2000,
          isClosable: true,
        });
      } else {
        setIssues(issuesData);
        setFirstVisible(documentSnapshots.docs[0]);
        setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
        if (pageDirection === 'next') setPage(p => p + 1);
        if (pageDirection === 'prev' && page > 1) setPage(p => p - 1);
      }
    } catch (error) {
      console.error("Error fetching issues:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลการแจ้งซ่อมได้",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
    setLoading(false);
  }, [currentUser, filterStatus, lastVisible, firstVisible, toast]);

  useEffect(() => {
    if (currentUser) {
      setLastVisible(null);
      setFirstVisible(null);
      setPage(1);
      fetchIssues('first');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, filterStatus]);

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
  }

  const fetchNextPage = () => fetchIssues('next');
  const fetchPrevPage = () => fetchIssues('prev');

  const getStatusColor = (status: string) => ({
    "pending": "red",
    "in_progress": "yellow",
    "resolved": "green"
  }[status] || "gray");

  const getStatusText = (status: string) => ({
    "pending": "รอรับเรื่อง",
    "in_progress": "กำลังดำเนินการ",
    "resolved": "แก้ไขแล้ว"
  }[status] || "ไม่ทราบสถานะ");

  if (loading && issues.length === 0) {
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
      <Container maxW="container.xl" py={{ base: 4, md: 6 }}>
        <VStack spacing={6} align="stretch">
          <Heading size={{ base: "lg", md: "xl" }} color="gray.700">
            แดชบอร์ดช่าง
          </Heading>

          <Card boxShadow="md" borderRadius="lg" bg="white" p={{ base: 4, md: 6 }}>
            <CardHeader pb={2}>
              <Heading size="md" color="blue.600">
                <Icon as={FaUser} mr={2} /> ข้อมูลส่วนตัว
              </Heading>
            </CardHeader>
            <CardBody>
              <Flex direction={{ base: "column", md: "row" }} align="center" gap={6}>
                <Avatar size="xl" src={currentUser?.avatar} name={currentUser?.name} boxShadow="md" />
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
                      <Text fontWeight="bold" color="gray.500" fontSize="sm">บทบาท</Text>
                      <Text color="gray.800" fontSize="md">{currentUser?.role}</Text>
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

          <Card boxShadow="2xl" borderRadius="2xl" bg="white" px={{ base: 2, md: 4 }} py={{ base: 4, md: 6 }}>
            <CardHeader>
              <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'stretch', md: 'center' }} gap={{ base: 3, md: 2 }}>
                <Heading size="md" color="brand.600" letterSpacing="wide" textAlign={{ base: 'center', md: 'left' }}>
                  <Icon as={FaBell} mr={3} verticalAlign="middle" />
                  รายการแจ้งซ่อม
                </Heading>
                <HStack spacing={2} justify={{ base: 'center', md: 'flex-end' }} wrap="wrap">
                  <Button size="sm" colorScheme={filterStatus === 'pending' ? 'red' : 'gray'} variant={filterStatus === 'pending' ? 'solid' : 'outline'} onClick={() => handleFilterChange('pending')}>งานใหม่</Button>
                  <Button size="sm" colorScheme={filterStatus === 'in_progress' ? 'yellow' : 'gray'} variant={filterStatus === 'in_progress' ? 'solid' : 'outline'} onClick={() => handleFilterChange('in_progress')}>กำลังดำเนินการ</Button>
                  <Button size="sm" colorScheme={filterStatus === 'resolved' ? 'green' : 'gray'} variant={filterStatus === 'resolved' ? 'solid' : 'outline'} onClick={() => handleFilterChange('resolved')}>เสร็จสิ้น</Button>
                </HStack>
              </Flex>
            </CardHeader>
            <CardBody>
              {loading && <Center my={4}><Spinner /></Center>}
              {!loading && issues.length === 0 ? (
                <Center py={8}>
                  <Text color="gray.500">ยังไม่มีรายการแจ้งซ่อมสำหรับสถานะ "{getStatusText(filterStatus)}"</Text>
                </Center>
              ) : (
                <Flex wrap="wrap" gap={6} justify="center" mt={4}>
                  {issues.map((issue) => (
                    <Card 
                      key={issue.id} 
                      p={4} 
                      borderRadius="lg" 
                      boxShadow="md" 
                      bg="gray.50"
                      w={{ base: '100%', sm: 'calc(50% - 1.5rem)', md: 'calc(33.33% - 1.5rem)' }}
                      display="flex"
                      flexDirection="column"
                      justifyContent="space-between"
                      transition="all 0.2s"
                      _hover={{ transform: 'translateY(-4px)', boxShadow: 'lg' }}
                    >
                      <VStack align="stretch" spacing={3} flex="1">
                        <Flex justify="space-between" align="center">
                          <Text fontWeight="bold" fontSize="lg" color="blue.600">ห้อง {issue.roomId}</Text>
                          <Badge colorScheme={getStatusColor(issue.status)} px={2} py={1} borderRadius="md">
                            {getStatusText(issue.status)}
                          </Badge>
                        </Flex>
                        <Text fontSize="sm" color="gray.600">ผู้แจ้ง: {issue.tenantName}</Text>
                        <Text fontSize="md" fontWeight="medium" noOfLines={2} minH="40px">{issue.description}</Text>
                        <Text fontSize="xs" color="gray.500">แจ้งเมื่อ: {issue.reportedAt && new Date(issue.reportedAt.seconds * 1000).toLocaleDateString('th-TH')}</Text>

                        {issue.status === 'pending' && (new Date().getTime() - new Date(issue.reportedAt.seconds * 1000).getTime()) > 3 * 24 * 60 * 60 * 1000 && (
                          <HStack mt={1} color="red.500">
                            <Icon as={FaExclamationTriangle} />
                            <Text fontSize="xs">ค้างเกิน 3 วัน</Text>
                          </HStack>
                        )}
                      </VStack>

                      <Flex mt={4} gap={2} justify="flex-end" wrap="wrap">
                        {issue.imageUrls && issue.imageUrls.length > 0 && (
                          <Button 
                            leftIcon={<FaImage />} 
                            size="sm"
                            onClick={() => handleImageClick(issue.imageUrls!)}
                            variant="outline"
                            flex={{ base: "1", md: "auto" }}
                          >
                            รูปภาพ ({issue.imageUrls.length})
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          colorScheme="blue" 
                          onClick={() => handleUpdateClick(issue)} 
                          flex={{ base: "1", md: "auto" }}
                        >
                          อัปเดตสถานะ
                        </Button>
                      </Flex>
                    </Card>
                  ))}
                </Flex>
              )}
              <Flex justify="space-between" align="center" mt={6}>
                <Button onClick={fetchPrevPage} isDisabled={page <= 1 || loading} leftIcon={<FaArrowLeft />}>ก่อนหน้า</Button>
                <Text>หน้า {page}</Text>
                <Button onClick={fetchNextPage} isDisabled={!lastVisible || issues.length < ISSUES_PER_PAGE || loading} rightIcon={<FaArrowRight />}>ถัดไป</Button>
              </Flex>
            </CardBody>
          </Card>
        </VStack>
      </Container>

      {selectedIssue && (
        <UpdateIssueStatusModal
          isOpen={isUpdateModalOpen}
          onClose={() => {
            onUpdateModalClose();
            fetchIssues('first');
          }}
          issue={selectedIssue}
          technicianName={currentUser?.name || 'ช่าง'}
        />
      )}

      <Modal isOpen={isImageModalOpen} onClose={onImageModalClose} size="4xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader textAlign="center">รูปภาพปัญหา ({currentImageIndex + 1} / {selectedImageUrls.length})</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex align="center" justify="center" position="relative">
              {selectedImageUrls.length > 1 && (
                <IconButton
                  icon={<FaArrowLeft />}
                  aria-label="Previous image"
                  onClick={handlePrevImage}
                  position="absolute"
                  left={2}
                  zIndex={1}
                  size="lg"
                  isRound
                />
              )}
              <Image 
                src={selectedImageUrls[currentImageIndex] || ""} 
                alt={`Issue Image ${currentImageIndex + 1}`}
                maxH="70vh"
                maxW="full"
                objectFit="contain"
                borderRadius="md"
              />
              {selectedImageUrls.length > 1 && (
                <IconButton
                  icon={<FaArrowRight />}
                  aria-label="Next image"
                  onClick={handleNextImage}
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
    </TenantLayout>
  );
}

export default TechnicianDashboard;
