
import { useState } from 'react';
import { Box, Card, CardHeader, Heading, CardBody, FormControl, FormLabel, Input, Textarea, Button, useToast, Icon } from '@chakra-ui/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FaBullhorn } from 'react-icons/fa';

interface AddAnnouncementCardProps {
  currentUser: {
    uid: string;
    name: string;
    role: string;
  };
}

export default function AddAnnouncementCard({ currentUser }: AddAnnouncementCardProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!title || !content) {
      toast({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกหัวข้อและเนื้อหาของประกาศ',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        title,
        content,
        authorId: currentUser.uid,
        authorName: currentUser.name,
        authorRole: currentUser.role,
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'เพิ่มประกาศสำเร็จ',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      setTitle('');
      setContent('');
    } catch (error) {
      console.error("Error adding announcement: ", error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเพิ่มประกาศได้',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card borderRadius="xl" boxShadow="lg" bg="white">
      <CardHeader>
        <Heading size="md" color="brand.700">
          <Icon as={FaBullhorn} mr={2} />
          เพิ่มประกาศใหม่
        </Heading>
      </CardHeader>
      <CardBody>
        <FormControl mb={4}>
          <FormLabel>หัวข้อประกาศ</FormLabel>
          <Input 
            placeholder="เช่น แจ้งปิดปรับปรุง..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </FormControl>
        <FormControl mb={4}>
          <FormLabel>เนื้อหา</FormLabel>
          <Textarea 
            placeholder="รายละเอียดของประกาศ..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
          />
        </FormControl>
        <Button 
          colorScheme="brand"
          onClick={handleSubmit}
          isLoading={isLoading}
          w="full"
        >
          เพิ่มประกาศ
        </Button>
      </CardBody>
    </Card>
  );
}
