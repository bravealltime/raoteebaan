
import { useState, useEffect } from 'react';
import { Box, Card, CardHeader, Heading, CardBody, VStack, Text, Flex, IconButton, useToast, Spinner, Center, Icon, Button, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure, HStack } from '@chakra-ui/react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'framer-motion';
import { FaBullhorn, FaTrash, FaUserShield, FaUserCog, FaUserTie } from 'react-icons/fa';

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
        const q = query(collection(db, 'announcements'), orderBy('createdAt', 'asc'));

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
    <Card borderRadius="xl" boxShadow="lg" bg="white" overflow="hidden">
      <CardHeader>
        <Heading size="md" color="brand.700">
          <Icon as={FaBullhorn} mr={2} />
          ประกาศ/ข่าวสาร
        </Heading>
      </CardHeader>
      <CardBody p={0}>
        {announcements.length === 0 ? (
          <Center p={4}>
            <Text color="gray.500">ยังไม่มีประกาศในขณะนี้</Text>
          </Center>
        ) : (
          <Box w="full" overflow="hidden" position="relative" h="130px">
            <motion.div
              style={{ width: 'max-content' }}
              animate={{
                x: ['0%', '-50%'],
              }}
              transition={{
                ease: 'linear',
                duration: announcements.length * 7, // Adjust speed here
                repeat: Infinity,
              }}
            >
              <HStack spacing={4} >
                {[...announcements, ...announcements].map((item, index) => (
                  <Box key={`${item.id}-${index}`} flexShrink={0} w="320px" p={2}>
                    <Box p={4} bg="gray.50" borderRadius="lg" position="relative" h="full">
                      <Flex align="center" mb={1}>
                        <RoleIcon role={item.authorRole} />
                        <Text fontWeight="bold" color="brand.800" ml={2} noOfLines={1}>{item.title}</Text>
                      </Flex>
                      <Text color="gray.600" fontSize="sm" noOfLines={2}>{item.content}</Text>
                      <Flex justify="space-between" align="center" mt={2}>
                        <Text fontSize="xs" color="gray.500">โดย: {item.authorName}</Text>
                        <Text fontSize="xs" color="gray.400" ml="auto">
                          {item.createdAt?.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </Text>
                      </Flex>
                      {(currentUser?.role === 'admin' || currentUser?.uid === item.authorId) && (
                        <IconButton
                          aria-label="Delete announcement"
                          icon={<FaTrash />}
                          size="xs"
                          colorScheme="red"
                          variant="ghost"
                          position="absolute"
                          top={1}
                          right={1}
                          onClick={() => handleDeleteClick(item.id)}
                        />
                      )}
                    </Box>
                  </Box>
                ))}
              </HStack>
            </motion.div>
          </Box>
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
