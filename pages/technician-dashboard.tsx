import { Box, Heading, Text, Flex, Avatar, VStack, Icon, Badge, Card, CardHeader, CardBody, SimpleGrid, useToast, Button, Spinner, Center, Table, Thead, Tbody, Tr, Th, Td, TableContainer, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, Image, IconButton, HStack } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useState, useCallback } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, getDocs, orderBy, limit, updateDoc, Timestamp, startAfter, endBefore, limitToLast } from "firebase/firestore";
import TenantLayout from "../components/TenantLayout";
import { FaTools, FaUser, FaBell, FaImage, FaArrowLeft, FaArrowRight } from "react-icons/fa";
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

  const handleModalClose = () => {
    onUpdateModalClose();
    // Re-fetch issues to update the list after modal closes
    fetchIssues('first'); 
  };

  const handleImageClick = (imageUrls: string[]) => {
    setSelectedImageUrls(imageUrls);
    setCurrentImageIndex(0); // Reset index when opening new gallery
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
        setPage(1);
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
        if (pageDirection === 'first') {
          setIssues([]);
        }
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
  }, [currentUser, filterStatus, lastVisible, firstVisible, page]);

  useEffect(() => {
    if (currentUser) {
      setLastVisible(null);
      setFirstVisible(null);
      setPage(1);
      fetchIssues('first');
    }
  }, [currentUser, filterStatus]);

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    // fetchIssues will be called by the useEffect that depends on filterStatus
  }

  const fetchNextPage = () => {
    fetchIssues('next');
  };

  const fetchPrevPage = () => {
    fetchIssues('prev');
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "red";
      case "in_progress":
        return "yellow";
      case "resolved":
        return "green";
      default:
        return "gray";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "รอรับเรื่อง";
      case "in_progress":
        return "กำลังดำเนินการ";
      case "resolved":
        return "แก้ไขแล้ว";
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
          แดชบอร์ดช่าง
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

        {/* Issues List Card */}
        <Card boxShadow="2xl" borderRadius="2xl" bg="white" px={{ base: 2, md: 4 }} py={{ base: 4, md: 6 }}>
          <CardHeader>
            <Flex justify="space-between" align="center">
              <Heading size="md" color="brand.600" letterSpacing="wide">
                <Icon as={FaBell} mr={3} verticalAlign="middle" />
                รายการแจ้งซ่อม
              </Heading>
              <Flex>
                <Button size="sm" colorScheme={filterStatus === 'pending' ? 'red' : 'gray'} onClick={() => handleFilterChange('pending')}>งานใหม่</Button>
                <Button size="sm" colorScheme={filterStatus === 'in_progress' ? 'yellow' : 'gray'} onClick={() => handleFilterChange('in_progress')} mx={2}>กำลังดำเนินการ</Button>
                <Button size="sm" colorScheme={filterStatus === 'resolved' ? 'green' : 'gray'} onClick={() => handleFilterChange('resolved')}>เสร็จสิ้น</Button>
              </Flex>
            </Flex>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>ห้อง</Th>
                    <Th>ผู้แจ้ง</Th> 
                    <Th>ปัญหา</Th>
                    <Th>รูปภาพ</Th>
                    <Th>วันที่แจ้ง</Th>
                    <Th>สถานะ</Th>
                    <Th>อัปเดตล่าสุด</Th>
                    <Th>จัดการ</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {issues.length > 0 ? (
                    issues.map((issue) => (
                      <Tr key={issue.id}>
                        <Td>{issue.roomId}</Td>
                        <Td>{issue.tenantName}</Td> 
                        <Td><Text noOfLines={2}>{issue.description}</Text></Td>
                        <Td>
                          {issue.imageUrls && issue.imageUrls.length > 0 ? (
                            <Button 
                              leftIcon={<FaImage />} 
                              aria-label="View images" 
                              size="sm"
                              onClick={() => handleImageClick(issue.imageUrls!)}
                              variant="outline"
                            >
                              {issue.imageUrls.length}
                            </Button>
                          ) : (
                            <Text color="gray.400">-</Text>
                          )}
                        </Td>
                        <Td>{issue.reportedAt && new Date(issue.reportedAt.seconds * 1000).toLocaleDateString('th-TH')}</Td>
                        <Td>
                          <Badge colorScheme={getStatusColor(issue.status)} px={2} py={1} borderRadius="md">
                            {getStatusText(issue.status)}
                          </Badge>
                        </Td>
                        <Td>
                          {issue.updates && issue.updates.length > 0 ? (
                            <Text fontSize="sm" noOfLines={2}>
                              {issue.updates[issue.updates.length - 1].notes}
                            </Text>
                          ) : (
                            <Text fontSize="sm" color="gray.500">ไม่มีการอัปเดต</Text>
                          )}
                        </Td>
                        <Td>
                          <Button size="xs" colorScheme="blue" onClick={() => handleUpdateClick(issue)}>อัปเดตสถานะ</Button>
                        </Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr>
                      <Td colSpan={7} textAlign="center">
                        <Text color="gray.500" py={8}>ยังไม่มีรายการแจ้งซ่อมสำหรับสถานะ "{getStatusText(filterStatus)}"</Text>
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </TableContainer>
            <Flex justify="space-between" align="center" mt={4}>
              <Button onClick={fetchPrevPage} isDisabled={page <= 1} leftIcon={<FaArrowLeft />}>ก่อนหน้า</Button>
              <Text>หน้า {page}</Text>
              <Button onClick={fetchNextPage} isDisabled={!lastVisible || issues.length < ISSUES_PER_PAGE} rightIcon={<FaArrowRight />}>ถัดไป</Button>
            </Flex>
          </CardBody>
        </Card>
      </Box>

      <Modal isOpen={isUpdateModalOpen} onClose={onUpdateModalClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>อัปเดตสถานะการแจ้งซ่อม</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {selectedIssue && (
                <UpdateIssueStatusModal
                  isOpen={isUpdateModalOpen}
                  onClose={() => {
                    onUpdateModalClose();
                    fetchIssues('first'); // Refetch issues after closing the modal
                  }}
                  issue={selectedIssue}
                  technicianName={currentUser?.name || 'ช่าง'}
                />
              )}
            </ModalBody>
          </ModalContent>
        </Modal>

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
