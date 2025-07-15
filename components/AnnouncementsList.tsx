
import { useState, useEffect } from 'react';
import { Box, Card, CardHeader, Heading, CardBody, VStack, Text, Flex, IconButton, useToast, Spinner, Center, Icon, Button, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure } from '@chakra-ui/react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FaBullhorn, FaTrash, FaUserShield, FaUserTie, FaUserCog } from 'react-icons/fa';

interface Announcement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  authorId: string;
  createdAt: any;
}

interface AnnouncementsListProps {
  currentUser: {
    uid: string;
    role: string;
  } | null;
}

const RoleIcon = ({ role }: { role: string }) => {
    switch (role) {
        case 'admin':
            return <Icon as={FaUserShield} color="red.500" title="Admin" />;
        case 'owner':
            return <Icon as={FaUserCog} color="blue.500" title="Owner" />;
        case 'employee':
            return <Icon as={FaUserTie} color="green.500" title="Employee" />;
        default:
            return null;
    }
}

export default function AnnouncementsList({ currentUser }: AnnouncementsListProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const announcementsData: Announcement[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        announcementsData.push({
          id: doc.id,
          title: data.title,
          content: data.content,
          authorName: data.authorName,
          authorRole: data.authorRole,
          authorId: data.authorId,
          createdAt: data.createdAt?.toDate(),
        });
      });
      setAnnouncements(announcementsData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching announcements: ", error);
        toast({ title: 'Failed to load announcements', status: 'error' });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleDeleteClick = (id: string) => {
    setSelectedAnnouncementId(id);
    onOpen();
  };

  const confirmDelete = async () => {
    if (!selectedAnnouncementId) return;

    try {
      await deleteDoc(doc(db, 'announcements', selectedAnnouncementId));
      toast({ title: 'ลบประกาศสำเร็จ', status: 'success' });
    } catch (error) {
      toast({ title: 'เกิดข้อผิดพลาดในการลบ', status: 'error' });
    } finally {
      onClose();
      setSelectedAnnouncementId(null);
    }
  };

  if (loading) {
    return (
        <Center p={10}>
            <Spinner />
        </Center>
    );
  }

  return (
    <Card borderRadius="xl" boxShadow="lg" bg="white">
      <CardHeader>
        <Heading size="md" color="brand.700">
          <Icon as={FaBullhorn} mr={2} />
          ประกาศ/ข่าวสาร
        </Heading>
      </CardHeader>
      <CardBody>
        {announcements.length === 0 ? (
          <Text color="gray.500">ยังไม่มีประกาศในขณะนี้</Text>
        ) : (
          <VStack align="stretch" spacing={4}>
            {announcements.map((item) => (
              <Box key={item.id} p={4} bg="gray.50" borderRadius="lg" position="relative">
                <Flex align="center" mb={1}>
                    <RoleIcon role={item.authorRole} />
                    <Text fontWeight="bold" color="brand.800" ml={2}>{item.title}</Text>
                    <Text fontSize="xs" color="gray.400" ml="auto">
                        {item.createdAt?.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </Text>
                </Flex>
                <Text color="gray.600" fontSize="sm" whiteSpace="pre-wrap">{item.content}</Text>
                <Flex justify="flex-end" align="center" mt={2}>
                    <Text fontSize="xs" color="gray.500">โดย: {item.authorName}</Text>
                </Flex>
                {(currentUser?.role === 'admin' || currentUser?.uid === item.authorId) && (
                    <IconButton 
                        aria-label="Delete announcement"
                        icon={<FaTrash />}
                        size="xs"
                        colorScheme="red"
                        variant="ghost"
                        position="absolute"
                        bottom={1}
                        right={1}
                        onClick={() => handleDeleteClick(item.id)}
                    />
                )}
              </Box>
            ))}
          </VStack>
        )}
      </CardBody>

      <AlertDialog isOpen={isOpen} onClose={onClose} leastDestructiveRef={undefined}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              ยืนยันการลบ
            </AlertDialogHeader>
            <AlertDialogBody>
              คุณแน่ใจหรือไม่ว่าต้องการลบประกาศนี้? การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button onClick={onClose}>ยกเลิก</Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                ลบ
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Card>
  );
}
