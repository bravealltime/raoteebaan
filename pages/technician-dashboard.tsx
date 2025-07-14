import { Box, Heading, Text, Flex, Avatar, VStack, Icon, Badge, Card, CardHeader, CardBody, SimpleGrid, useToast, Button, Spinner, Center, Table, Thead, Tbody, Tr, Th, Td, TableContainer, useDisclosure } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, getDocs, orderBy, limit, updateDoc, Timestamp } from "firebase/firestore";
import MainLayout from "../components/MainLayout";
import { FaTools, FaUser, FaBell } from "react-icons/fa";
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
  description: string;
  status: "pending" | "in_progress" | "resolved";
  reportedAt: any;
}

function TechnicianDashboard() {
  const router = useRouter();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const handleUpdateClick = (issue: Issue) => {
    setSelectedIssue(issue);
    onOpen();
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        onSnapshot(userDocRef, (doc) => {
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
      } else {
        router.replace("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    const issuesQuery = query(
      collection(db, "issues"),
      orderBy("reportedAt", "desc")
    );

    const unsubscribe = onSnapshot(issuesQuery, (snapshot) => {
      const issuesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Issue));
      setIssues(issuesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching issues:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลการแจ้งซ่อมได้",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast]);

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
      <MainLayout currentUser={currentUser}>
        <Center h="50vh">
          <Spinner size="xl" color="brand.500" />
        </Center>
      </MainLayout>
    );
  }

  return (
    <MainLayout currentUser={currentUser}>
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
            </Flex>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>ห้อง</Th>
                    <Th>ปัญหา</Th>
                    <Th>วันที่แจ้ง</Th>
                    <Th>สถานะ</Th>
                    <Th>จัดการ</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {issues.length > 0 ? (
                    issues.map((issue) => (
                      <Tr key={issue.id}>
                        <Td>{issue.roomId}</Td>
                        <Td>{issue.description}</Td>
                        <Td>{issue.reportedAt?.toDate().toLocaleDateString('th-TH')}</Td>
                        <Td>
                          <Badge colorScheme={getStatusColor(issue.status)} px={2} py={1} borderRadius="md">
                            {getStatusText(issue.status)}
                          </Badge>
                        </Td>
                        <Td>
                          <Button size="xs" colorScheme="blue" onClick={() => handleUpdateClick(issue)}>อัปเดตสถานะ</Button>
                        </Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr>
                      <Td colSpan={5} textAlign="center">
                        <Text color="gray.500" py={8}>ยังไม่มีรายการแจ้งซ่อม</Text>
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      </Box>

      {selectedIssue && (
        <UpdateIssueStatusModal
          isOpen={isOpen}
          onClose={onClose}
          issue={selectedIssue}
        />
      )}
    </MainLayout>
  );
}

export default TechnicianDashboard;
