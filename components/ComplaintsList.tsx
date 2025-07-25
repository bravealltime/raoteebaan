
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, getDocs } from 'firebase/firestore';
import { 
    Box, 
    Heading, 
    VStack, 
    HStack, 
    Text, 
    Badge, 
    Menu, 
    MenuButton, 
    MenuList, 
    MenuItem, 
    Button, 
    Icon, 
    useToast, 
    Spinner, 
    Center, 
    Flex, 
    Spacer
} from '@chakra-ui/react';
import { FaChevronDown, FaCommentMedical } from 'react-icons/fa';

interface Complaint {
    id: string;
    roomId: string;
    tenantName: string;
    subject: string;
    description: string;
    status: 'new' | 'in_progress' | 'resolved';
    createdAt: any;
}

interface ComplaintsListProps {
    currentUser: any;
    role: 'admin' | 'owner';
}

const statusColors: { [key: string]: string } = {
    new: 'blue',
    in_progress: 'orange',
    resolved: 'green',
};

const statusTexts: { [key: string]: string } = {
    new: 'เรื่องใหม่',
    in_progress: 'กำลังดำเนินการ',
    resolved: 'แก้ไขแล้ว',
};

const ComplaintsList = ({ currentUser, role }: ComplaintsListProps) => {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        if (!currentUser?.uid) return;

        setLoading(true);
        let complaintsQuery: any;

        const baseQuery = collection(db, 'complaints');

        if (role === 'admin') {
            complaintsQuery = query(baseQuery, orderBy('createdAt', 'desc'));
        } else if (role === 'owner') {
            // For owners, first get their rooms, then query complaints for those rooms.
            const getOwnerRooms = async () => {
                const roomsQuery = query(collection(db, 'rooms'), where('ownerId', '==', currentUser.uid));
                const roomsSnapshot = await getDocs(roomsQuery);
                const roomIds = roomsSnapshot.docs.map(doc => doc.id);

                if (roomIds.length > 0) {
                    complaintsQuery = query(baseQuery, where('roomId', 'in', roomIds), orderBy('createdAt', 'desc'));
                } else {
                    // No rooms, so no complaints to fetch
                    setComplaints([]);
                    setLoading(false);
                    return;
                }

                const unsubscribe = onSnapshot(complaintsQuery, (snapshot) => {
                    const complaintsData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Complaint[];
                    setComplaints(complaintsData);
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching complaints: ", error);
                    toast({ title: 'เกิดข้อผิดพลาดในการโหลดข้อมูล', status: 'error' });
                    setLoading(false);
                });

                return () => unsubscribe();
            };

            getOwnerRooms();
            return; // Exit useEffect early for owner role
        }

        const unsubscribe = onSnapshot(complaintsQuery, (snapshot) => {
            const complaintsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Complaint[];
            setComplaints(complaintsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching complaints: ", error);
            toast({ title: 'เกิดข้อผิดพลาดในการโหลดข้อมูล', status: 'error' });
            setLoading(false);
        });

        return () => unsubscribe();

    }, [currentUser, role, toast]);

    const handleStatusChange = async (id: string, status: 'new' | 'in_progress' | 'resolved') => {
        const complaintRef = doc(db, 'complaints', id);
        try {
            await updateDoc(complaintRef, { status });
            toast({
                title: 'อัปเดตสถานะสำเร็จ',
                status: 'success',
                duration: 2000,
            });
        } catch (error) {
            toast({
                title: 'อัปเดตสถานะไม่สำเร็จ',
                status: 'error',
                duration: 3000,
            });
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
        <Box bg="white" borderRadius="xl" p={{ base: 4, md: 6 }} boxShadow="md">
            <Flex align="center" mb={4}>
                <Icon as={FaCommentMedical} w={6} h={6} color="blue.500" />
                <Heading as="h3" size="md" ml={3} color="gray.700">
                    เรื่องร้องเรียนล่าสุด
                </Heading>
            </Flex>
            {complaints.length === 0 ? (
                <Center p={5} bg="gray.50" borderRadius="lg">
                    <Text color="gray.500">ไม่มีเรื่องร้องเรียนในขณะนี้</Text>
                </Center>
            ) : (
                <VStack spacing={4} align="stretch">
                    {complaints.map((c) => (
                        <Box key={c.id} p={4} bg="gray.50" borderRadius="lg" _hover={{ bg: 'gray.100' }}>
                            <HStack justify="space-between">
                                <Box>
                                    <Text fontWeight="bold" color="gray.800">{c.subject}</Text>
                                    <Text fontSize="sm" color="gray.600">ห้อง: {c.roomId} | ผู้แจ้ง: {c.tenantName}</Text>
                                    <Text fontSize="xs" color="gray.400">
                                        {c.createdAt?.toDate().toLocaleString('th-TH')}
                                    </Text>
                                </Box>
                                <Menu>
                                    <MenuButton as={Button} size="sm" rightIcon={<FaChevronDown />}
                                        colorScheme={statusColors[c.status]}>
                                        {statusTexts[c.status]}
                                    </MenuButton>
                                    <MenuList>
                                        <MenuItem onClick={() => handleStatusChange(c.id, 'new')}>เรื่องใหม่</MenuItem>
                                        <MenuItem onClick={() => handleStatusChange(c.id, 'in_progress')}>กำลังดำเนินการ</MenuItem>
                                        <MenuItem onClick={() => handleStatusChange(c.id, 'resolved')}>แก้ไขแล้ว</MenuItem>
                                    </MenuList>
                                </Menu>
                            </HStack>
                            <Text mt={3} fontSize="sm" color="gray.700" bg="white" p={3} borderRadius="md">
                                {c.description}
                            </Text>
                        </Box>
                    ))}
                </VStack>
            )}
        </Box>
    );
};

export default ComplaintsList;
