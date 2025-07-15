
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Textarea,
  useToast,
  VStack,
  Input,
  HStack,
  Text,
  Box,
  Image,
  IconButton,
  Center,
  Icon
} from "@chakra-ui/react";
import { useState, useRef } from "react";
import { db, storage } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FaPaperclip, FaTimesCircle, FaCamera } from "react-icons/fa";


interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  tenantId: string;
  tenantName: string;
}

const ReportIssueModal = ({ isOpen, onClose, roomId, tenantId, tenantName }: ReportIssueModalProps) => {
  const [description, setDescription] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setImageFiles(prev => [...prev, ...newFiles]);

      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    // Also revoke the object URL to free up memory
    URL.revokeObjectURL(imagePreviews[index]);
  };

  const resetForm = () => {
    setDescription("");
    imagePreviews.forEach(url => URL.revokeObjectURL(url)); // Clean up memory
    setImageFiles([]);
    setImagePreviews([]);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const handleClose = () => {
    resetForm();
    onClose();
  }

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: "กรุณากรอกรายละเอียด",
        description: "โปรดอธิบายปัญหาที่คุณพบ",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    const imageUrls: string[] = [];

    try {
      // 1. Upload all images if they exist
      if (imageFiles.length > 0) {
        const uploadPromises = imageFiles.map(file => {
          const imageRef = ref(storage, `issues/${Date.now()}_${file.name}`);
          return uploadBytes(imageRef, file).then(snapshot => getDownloadURL(snapshot.ref));
        });
        const urls = await Promise.all(uploadPromises);
        imageUrls.push(...urls);
      }

      // 2. Add issue document to Firestore
      const issueRef = await addDoc(collection(db, "issues"), {
        roomId: roomId,
        tenantId: tenantId,
        tenantName: tenantName,
        description: description,
        status: "pending",
        reportedAt: serverTimestamp(),
        imageUrls: imageUrls, // Add array of image URLs
      });

      // 3. Create notifications for all technicians
      const techniciansQuery = query(collection(db, "users"), where("role", "==", "technician"));
      const techniciansSnapshot = await getDocs(techniciansQuery);
      
      const notificationPromises = techniciansSnapshot.docs.map(technicianDoc => {
        return addDoc(collection(db, "notifications"), {
          userId: technicianDoc.id,
          message: `มีงานแจ้งซ่อมใหม่ที่ห้อง ${roomId}: ${description}`,
          type: "issue",
          link: `/technician-dashboard?issueId=${issueRef.id}`,
          isRead: false,
          createdAt: serverTimestamp(),
        });
      });

      await Promise.all(notificationPromises);

      toast({
        title: "แจ้งปัญหาสำเร็จ",
        description: "เราได้รับเรื่องของคุณแล้ว ช่างจะติดต่อกลับโดยเร็วที่สุด",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      handleClose();
    } catch (error) {
      console.error("Error reporting issue: ", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแจ้งปัญหาได้ในขณะนี้",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered>
      <ModalOverlay />
      <ModalContent mx={{ base: 4, md: "auto" }}>
        <ModalHeader>แจ้งปัญหา/ซ่อมแซม</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel htmlFor="roomInfo">ข้อมูลผู้แจ้ง</FormLabel>
              <HStack>
                <Input id="roomInfo" value={`ห้อง: ${roomId}`} isReadOnly bg="gray.100" />
                <Input value={`ผู้แจ้ง: ${tenantName}`} isReadOnly bg="gray.100" />
              </HStack>
            </FormControl>
            <FormControl isRequired>
              <FormLabel htmlFor="description">รายละเอียดปัญหา</FormLabel>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="เช่น แอร์ไม่เย็น, น้ำรั่ว, ไฟดับ, อินเทอร์เน็ตใช้ไม่ได้"
                rows={5}
                focusBorderColor="blue.500"
              />
            </FormControl>

            {/* Image Upload Section */}
            <FormControl>
              <FormLabel>แนบรูปภาพ (ได้หลายรูป)</FormLabel>
              {/* Gallery for selected images */}
              {imagePreviews.length > 0 && (
                <HStack spacing={4} overflowX="auto" py={2}>
                  {imagePreviews.map((preview, index) => (
                    <Box key={index} position="relative" flexShrink={0}>
                      <Image src={preview} alt={`Preview ${index + 1}`} boxSize="100px" objectFit="cover" borderRadius="md" />
                      <IconButton
                        icon={<FaTimesCircle />}
                        size="xs"
                        colorScheme="red"
                        isRound
                        position="absolute"
                        top={-1}
                        right={-1}
                        onClick={() => removeImage(index)}
                        aria-label={`Remove image ${index + 1}`}
                      />
                    </Box>
                  ))}
                </HStack>
              )}

              <Button 
                leftIcon={<FaCamera />} 
                mt={imagePreviews.length > 0 ? 4 : 0}
                w="100%" 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                ถ่ายภาพ / เลือกจากอัลบั้ม
              </Button>
              <Input
                type="file"
                accept="image/*"
                capture="environment" // Use 'user' for front camera
                multiple // Allow multiple files
                ref={fileInputRef}
                onChange={handleFileChange}
                hidden
              />
            </FormControl>

            <Box w="100%" p={3} bg="gray.50" borderRadius="md">
                <Text fontSize="sm" color="gray.600">
                    เมื่อกดส่งเรื่องแล้ว ช่างจะได้รับข้อมูลและจะติดต่อกลับเพื่อยืนยันและนัดหมายเข้าตรวจสอบโดยเร็วที่สุด
                </Text>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isLoading}
            isDisabled={!description.trim()}
          >
            ส่งเรื่อง
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ReportIssueModal;
