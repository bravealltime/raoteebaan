import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Button, Input, Image, FormControl, FormLabel, useToast, Box, Center, Text, VStack } from "@chakra-ui/react";
import { useState, useRef, DragEvent } from "react";
import { FaUpload } from "react-icons/fa";
import { db } from "../lib/firebase";
import { addDoc, collection, Timestamp } from "firebase/firestore";

interface UploadSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (file: File, amount: number) => void;
  roomName: string;
  ownerId: string;
  isCentered?: boolean;
  size?: string | object;
}

export default function UploadSlipModal({ isOpen, onClose, onConfirm, roomName, ownerId, isCentered, size }: UploadSlipModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast({ title: "Invalid file type", description: "Please upload an image.", status: "error" });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleConfirm = async () => {
    if (!selectedFile) {
      toast({ title: "Please select a file", status: "error" });
      return;
    }
    if (!amount || isNaN(parseFloat(amount))) {
      toast({ title: "Please enter a valid amount", status: "error" });
      return;
    }

    await addDoc(collection(db, "notifications"), {
        userId: ownerId,
        message: `ผู้เช่าห้อง ${roomName} ได้อัปโหลดสลิปการชำระเงินแล้ว`, 
        type: "payment",
        link: `/`,
        isRead: false,
        createdAt: Timestamp.now(),
    });

    onConfirm(selectedFile, parseFloat(amount));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered={isCentered} size={size}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Upload Payment Slip for Room {roomName}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Center
            p={10}
            borderWidth={2}
            borderRadius="md"
            borderColor={isDragging ? "blue.400" : "gray.300"}
            borderStyle="dashed"
            bg={isDragging ? "blue.50" : "gray.50"}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            cursor="pointer"
            textAlign="center"
          >
            <VStack spacing={4}>
              <FaUpload size="50px" color="gray.400" />
              <Text>Drag & drop your slip here, or click to select a file.</Text>
            </VStack>
            <Input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} p={1} display="none" />
          </Center>
          {previewUrl && <Image src={previewUrl} alt="Slip Preview" mt={4} borderRadius="md" />}
          <FormControl mt={4}>
            <FormLabel>Amount Paid</FormLabel>
            <Input placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleConfirm}>Confirm</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}