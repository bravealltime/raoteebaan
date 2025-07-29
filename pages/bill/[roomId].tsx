import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { Container, Box, Heading, Text, Flex, Spinner, Table, Thead, Tbody, Tr, Th, Td, Button, Icon, VStack, Image, HStack, useToast, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, useDisclosure, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, AlertDialogCloseButton, SimpleGrid, Badge, Divider, Center, IconButton } from "@chakra-ui/react";
import { db, auth } from "../../lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { FaFileInvoice, FaArrowLeft, FaDownload, FaUpload, FaEye, FaTrash, FaCheckCircle } from "react-icons/fa";
import Script from "next/script";
import TenantLayout from "../../components/TenantLayout";
import MainLayout from "../../components/MainLayout";

export default function BillDetail({ currentUser }: { currentUser: any }) {
  const router = useRouter();
  const toast = useToast();
  const { roomId } = router.query;
  const [bill, setBill] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const { isOpen: isProofModalOpen, onOpen: onProofModalOpen, onClose: onProofModalClose } = useDisclosure();
  const [currentProofImageUrl, setCurrentProofImageUrl] = useState<string | null>(null);
  const [isConfirmAlertOpen, setIsConfirmAlertOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Hardcode promptpay for now (replace with real data if available)
  const promptpay = "1209701702030";

  useEffect(() => {
    if (!roomId || !currentUser) return;

    const fetchBill = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "bills"),
          where("roomId", "==", String(roomId)),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          toast({ title: "ไม่พบข้อมูลบิล", status: "error" });
          setBill(null);
          setLoading(false);
          router.back();
          return;
        }

        const billData = snap.docs[0].data();
        const roomSnap = await getDoc(doc(db, "rooms", String(roomId)));
        const roomData = roomSnap.exists() ? roomSnap.data() : {};

        // Permission Check
        const { role, uid } = currentUser;
        const ownerId = roomData?.ownerId;
        const tenantId = roomData?.tenantId;

        if (role !== 'admin' && role !== 'owner' && role !== 'user') {
            toast({ title: "ไม่มีสิทธิ์เข้าถึง", status: "error" });
            router.replace('/login');
            return;
        }

        if (role === 'owner' && ownerId !== uid) {
          toast({ title: "ไม่มีสิทธิ์เข้าถึง", description: "คุณไม่ใช่เจ้าของห้องนี้", status: "error" });
          router.replace('/');
          return;
        }

        if (role === 'user' && tenantId !== uid) {
          toast({ title: "ไม่มีสิทธิ์เข้าถึง", description: "นี่ไม่ใช่บิลของคุณ", status: "error" });
          router.replace('/tenant-dashboard');
          return;
        }
        
        const toDate = (firebaseDate: any): Date | null => {
          if (!firebaseDate) return null;
          if (firebaseDate.seconds) return new Date(firebaseDate.seconds * 1000);
          if (typeof firebaseDate === 'string') return new Date(firebaseDate);
          return null;
        };

        const billDate = toDate(billData.date);
        const dueDate = toDate(billData.dueDate);

        if (!billDate || !dueDate) {
          setBill(null);
          setLoading(false);
          return;
        }

        const latestRent = roomData?.rent || billData.rent || 0;
        const latestService = roomData?.service || billData.service || 0;
        const latestExtraServices = roomData?.extraServices || billData.extraServices || [];

        const elecLabel = `ค่าไฟฟ้า (${billData.electricityUnit} หน่วย x ${billData.electricityRate} บ.)`;
        const waterLabel = `ค่าน้ำ (${billData.waterUnit} หน่วย x ${billData.waterRate} บ.)`;

        const items = [
          { label: elecLabel, value: billData.electricityTotal || 0 },
          { label: waterLabel, value: billData.waterTotal || 0 },
          { label: "ค่าเช่า", value: latestRent },
          { label: "ค่าบริการ", value: latestService },
          ...(Array.isArray(latestExtraServices)
            ? latestExtraServices.map((svc: any) => ({ label: svc.label || "ค่าบริการเสริม", value: svc.value || 0 }))
            : [])
        ].filter(item => item.value > 0);
        
        const total = items.reduce((sum, i) => sum + Number(i.value), 0);

        const calculateOverdueDays = (due: Date) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          due.setHours(0, 0, 0, 0);
          if (today > due) {
            const diffTime = Math.abs(today.getTime() - due.getTime());
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
          return 0;
        };

        const overdueDays = calculateOverdueDays(dueDate);
        
        const formatDate = (dateObj: Date) => dateObj.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const finalBill = {
          id: snap.docs[0].id,
          date: formatDate(billDate),
          dueDate: formatDate(dueDate),
          room: billData.roomId,
          tenant: billData.tenantName || roomData?.tenantName || "-",
          total: total + (billData.broughtForward || 0),
          items,
          promptpay: promptpay,
          rent: latestRent,
          extraServices: latestExtraServices,
          area: roomData?.area || 0,
          status: roomData?.status || "vacant",
          overdueDays: overdueDays,
          billStatus: billData.status || "unpaid",
          proofUrl: billData.proofUrl || null,
          meterImageUrl: billData.meterImageUrl || null,
          electricityImageUrl: billData.electricityImageUrl || null,
          waterImageUrl: billData.waterImageUrl || null,
          broughtForward: billData.broughtForward || 0,
          ownerId: roomData?.ownerId,
          tenantId: roomData?.tenantId,
          paidAt: billData.paidAt || null,
        };

        setBill(finalBill);
        setProofUrl(billData.proofUrl || null);

      } catch (err) {
        console.error("Error fetching bill:", err);
        toast({ title: "เกิดข้อผิดพลาดในการโหลดบิล", status: "error" });
        setBill(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
  }, [roomId, currentUser, router, toast]);

  

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ThaiQRCode && bill?.promptpay && bill?.total) {
      try {
        const qrData = (window as any).ThaiQRCode.generate(bill.promptpay, { amount: bill.total });
        setQr(qrData);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }
  }, [bill?.promptpay, bill?.total]);

  useEffect(() => {
    const checkAndGenerateQR = () => {
      if (typeof window !== "undefined" && (window as any).ThaiQRCode && bill?.promptpay && bill?.total && !qr) {
        try {
          const qrData = (window as any).ThaiQRCode.generate(bill.promptpay, { amount: bill.total });
          setQr(qrData);
        } catch (error) {
          console.error('Error in retry QR generation:', error);
        }
      }
    };

    checkAndGenerateQR();
    
    const timer = setTimeout(checkAndGenerateQR, 1000);
    
    return () => clearTimeout(timer);
  }, [bill?.promptpay, bill?.total, qr]);

  // เพิ่มฟังก์ชัน generatePromptPayQR
  function generatePromptPayQR(promptpay: string, amount: number) {
    if (typeof window !== 'undefined' && (window as any).ThaiQRCode) {
      try {
        return (window as any).ThaiQRCode.generate(promptpay, { amount });
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // ย้ายและเปลี่ยนเป็น function declaration
  function renderPDFContent(qrOverride?: string | null) {
    if (!bill) return null;
    const isPaid = bill.billStatus === 'paid';
    const a4Width = "794px";
    const a4Height = "1122px";

    return (
      <Box 
        bg="white" 
        borderRadius="xl" 
        p={10} 
        m={0} 
        boxShadow="md" 
        minH={a4Height} 
        minW={a4Width} 
        maxW={a4Width} 
        style={{ fontFamily: 'Kanit, sans-serif' }}
      >
        <VStack spacing={6} align="stretch" w="full">
          {/* Header */}
          <HStack justify="space-between" align="center" mb={2}>
            <HStack spacing={3} align="center">
              <Icon as={FaFileInvoice} w={10} h={10} color={isPaid ? "green.500" : "blue.500"} />
              <Heading size="xl" color={isPaid ? "green.700" : "blue.700"} letterSpacing="wide">
                {isPaid ? 'ใบเสร็จรับเงิน' : 'ใบแจ้งหนี้'}
              </Heading>
            </HStack>
            <Badge 
              colorScheme={isPaid ? 'green' : (bill.billStatus === 'pending' ? 'yellow' : 'red')} 
              fontSize="lg" 
              px={6} 
              py={2} 
              borderRadius="full"
            >
              {isPaid ? 'ชำระแล้ว' : (bill.billStatus === 'pending' ? 'รอตรวจสอบ' : 'ค้างชำระ')}
            </Badge>
          </HStack>
          
          <Divider />

          {/* Bill Details */}
          <SimpleGrid columns={2} spacing={6} mt={2}>
            <VStack align="start" spacing={1} fontSize="md">
              <Text><b>ห้อง:</b> {bill.room}</Text>
              <Text><b>ผู้เช่า:</b> {bill.tenant}</Text>
              <Text><b>วันที่ออกเอกสาร:</b> {bill.date}</Text>
            </VStack>
            <VStack align="end" spacing={1} fontSize="md">
              <Text><b>เลขที่เอกสาร:</b> {bill.id}</Text>
              {!isPaid && (
                <Text><b>วันครบกำหนด:</b> <span style={{ color: '#e53e3e', fontWeight: 600 }}>{bill.dueDate}</span></Text>
              )}
              {isPaid && bill.paidAt && (
                <Text><b>วันที่ชำระ:</b> {new Date(bill.paidAt.seconds * 1000).toLocaleDateString('th-TH')}</Text>
              )}
            </VStack>
          </SimpleGrid>

          <Divider mt={4} />

          {/* Items Table */}
          <Box mt={4}>
            <Table variant="simple" size="md" w="full" borderWidth={1} borderColor="#e2e8f0">
              <Thead bg="#f1f5f9">
                <Tr>
                  <Th fontSize="md" color="gray.700" borderColor="#e2e8f0">รายการ</Th>
                  <Th fontSize="md" color="gray.700" borderColor="#e2e8f0" isNumeric>จำนวนเงิน (บาท)</Th>
                </Tr>
              </Thead>
              <Tbody>
                {bill.items.map((item: any, idx: number) => (
                  <Tr key={idx}>
                    <Td borderColor="#e2e8f0">{item.label}</Td>
                    <Td borderColor="#e2e8f0" isNumeric>{item.value.toLocaleString()}</Td>
                  </Tr>
                ))}
                <Tr>
                  <Td fontWeight="bold" fontSize="lg" borderColor="#e2e8f0">ยอดรวมสุทธิ</Td>
                  <Td fontWeight="bold" fontSize="lg" borderColor="#e2e8f0" isNumeric color={isPaid ? "green.700" : "blue.700"}>
                    {bill.total.toLocaleString()}
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </Box>

          <Divider mt={4} />

          {/* Footer */}
          <HStack align="flex-end" justify="space-between" mt={8}>
            <VStack align="start" spacing={2}>
              {isPaid ? (
                <Text fontSize="md" color="green.600">ขอขอบคุณที่ใช้บริการ</Text>
              ) : (
                <>
                  <Text fontSize="md" color="gray.600">* กรุณาชำระเงินภายในวันครบกำหนด มิฉะนั้นจะมีค่าปรับตามเงื่อนไข</Text>
                  {bill.overdueDays > 0 && (
                    <Text fontSize="md" color="red.500">เลยกำหนด {bill.overdueDays} วัน</Text>
                  )}
                </>
              )}
            </VStack>
            {!isPaid && (
              <VStack align="center" spacing={2}>
                {(qrOverride || qr) && (
                  <Image src={qrOverride || qr} alt="PromptPay QR Code" boxSize="140px" borderRadius="md" border="1px solid #e2e8f0" />
                )}
                <Text fontSize="sm" color="gray.500">PromptPay: {bill.promptpay}</Text>
                <Text fontSize="sm" color="gray.500">ยอดเงิน: {bill.total.toLocaleString()} บาท</Text>
              </VStack>
            )}
          </HStack>
        </VStack>
      </Box>
    );
  }

  const handleExportPDF = async () => {
    if (!bill || !pdfRef.current) {
        toast({
            title: "Error",
            description: "Bill data is not available for PDF export.",
            status: "error",
            duration: 3000,
            isClosable: true,
        });
        return;
    }

    const html2pdf = (await import('html2pdf.js')).default;
    const element = pdfRef.current;

    const isPaid = bill.billStatus === 'paid';
    const filename = isPaid 
      ? `receipt_${bill.room}_${bill.date}.pdf` 
      : `invoice_${bill.room}_${bill.date}.pdf`;

    html2pdf().from(element).set({
        margin: 0,
        filename: filename,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
    }).save();
  };

  const handleUploadProof = async () => {
    if (!proofFile || !bill) return;

    setUploadingProof(true);
    try {
      const storage = getStorage();
      const storageRefPath = `proofs/${bill.room}/${bill.id}_${Date.now()}_${proofFile.name}`;
      const fileRef = storageRef(storage, storageRefPath);
      await uploadBytes(fileRef, proofFile);
      const downloadURL = await getDownloadURL(fileRef);

      const billDocRef = doc(db, "bills", bill.id);
      await updateDoc(billDocRef, {
        proofUrl: downloadURL,
        status: "pending",
      });

      if (bill.room) {
        const roomDocRef = doc(db, "rooms", bill.room);
        await updateDoc(roomDocRef, { billStatus: "pending" });
      }

      setProofUrl(downloadURL);
      setProofFile(null);
      toast({
        title: "อัปโหลดหลักฐานสำเร็จ",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      if (currentUser.role === 'user') {
        router.push("/tenant-dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error uploading proof:", error);
      toast({
        title: "อัปโหลดหลักฐานไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการอัปโหลดหลักฐาน",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUploadingProof(false);
    }
  };

  const handleDeleteProof = async () => {
    if (!proofUrl || !bill) return;

    setUploadingProof(true);
    try {
      const storage = getStorage();
      const fileRef = storageRef(storage, proofUrl);
      await deleteObject(fileRef);

      const billDocRef = doc(db, "bills", bill.id);
      await updateDoc(billDocRef, {
        proofUrl: null,
        status: "unpaid",
      });

      if (bill.room) {
        const roomDocRef = doc(db, "rooms", bill.room);
        await updateDoc(roomDocRef, { billStatus: "unpaid" });
      }

      setProofUrl(null);
      toast({
        title: "ลบหลักฐานสำเร็จ",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      if (currentUser.role === 'user') {
        router.push("/tenant-dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error deleting proof:", error);
      toast({
        title: "ลบหลักฐานไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการลบหลักฐาน",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUploadingProof(false);
    }
  };

  const handleConfirmProof = async () => {
    setIsConfirmAlertOpen(true);
  };

  const confirmMarkAsPaid = async () => {
    setIsConfirmAlertOpen(false);
    if (!bill) return;

    setUploadingProof(true);
    try {
      const billDocRef = doc(db, "bills", bill.id);
      await updateDoc(billDocRef, {
        proofUrl: null,
        status: "paid",
      });

      if (bill.room) {
        const roomDocRef = doc(db, "rooms", bill.room);
        await updateDoc(roomDocRef, { billStatus: "paid" });
      }

      setProofUrl(null);
      toast({
        title: "ยืนยันหลักฐานสำเร็จ",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      router.push("/dashboard");
    } catch (error) {
      console.error("Error confirming proof:", error);
      toast({
        title: "ยืนยันหลักฐานไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการยืนยันหลักฐาน",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUploadingProof(false);
    }
  };

  if (loading || !currentUser) return <Flex minH="100vh" align="center" justify="center"><Spinner size="xl" /></Flex>;
  if (!bill) return <Box p={8}><Text>ไม่พบข้อมูลบิล</Text></Box>;

  const renderContent = () => (
    <Container maxW="container.xl" py={{ base: 4, md: 8 }}>
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap={4} pt={8}>
          <HStack spacing={4} align="center">
            <IconButton
              icon={<FaArrowLeft />}
              aria-label="ย้อนกลับ"
              colorScheme="teal"
              variant="ghost"
              borderRadius="md"
              onClick={() => router.back()}
            />
            <Box>
              <Heading size={{ base: "md", lg: "lg" }} color="gray.700">ใบแจ้งหนี้ - ห้อง {roomId}</Heading>
              <Text color="gray.500">สำหรับ {bill.tenant}</Text>
            </Box>
          </HStack>
          <Badge colorScheme={
            bill.billStatus === 'paid' ? 'green' :
            bill.billStatus === 'pending' ? 'yellow' : 'red'
          } p={{ base: 2, md: 3 }} borderRadius="full" fontSize={{ base: "sm", md: "md" }}>
            สถานะ: {
              bill.billStatus === 'paid' ? 'ชำระแล้ว' :
              bill.billStatus === 'pending' ? 'รอตรวจสอบ' : 'ค้างชำระ'
            }
          </Badge>
        </Flex>

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 4, md: 6 }}>
          <Box bg="white" p={{ base: 4, md: 6 }} borderRadius="xl" boxShadow="sm">
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Text fontWeight="bold" color="gray.600">วันที่ออกบิล:</Text>
                <Text>{bill.date}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontWeight="bold" color="gray.600">วันครบกำหนด:</Text>
                <Text color="red.500" fontWeight="bold">{bill.dueDate}</Text>
              </HStack>
              <Divider />
              {bill.broughtForward > 0 && (
                <HStack justify="space-between" color="orange.500">
                  <Text fontWeight="bold">ยอดยกมาจากเดือนก่อน</Text>
                  <Text>{bill.broughtForward.toLocaleString()} บาท</Text>
                </HStack>
              )}
              {bill.items.map((item: any, index: number) => (
                <HStack key={index} justify="space-between">
                  <VStack align="start" spacing={0}>
                    <Text>{item.label}</Text>
                  </VStack>
                  <Text>{item.value.toLocaleString()} บาท</Text>
                </HStack>
              ))}
              <Divider />
              <HStack justify="space-between" fontSize={{ base: "lg", md: "xl" }} fontWeight="bold" color="blue.800">
                <Text>ยอดรวมสุทธิ</Text>
                <Text>{bill.total.toLocaleString()} บาท</Text>
              </HStack>
            </VStack>
          </Box>

          <Box bg="white" p={{ base: 4, md: 6 }} borderRadius="xl" boxShadow="sm">
            <VStack spacing={6} align="stretch">
              <Heading size="md" color="blue.700" textAlign="center">ช่องทางการชำระเงิน</Heading>
              {bill.billStatus === 'unpaid' && (
                <>
                  <Center>
                    {qr ? (
                      <Image src={qr} alt="PromptPay QR Code" boxSize={{ base: "150px", md: "200px" }} />
                    ) : (
                      <Spinner />
                    )}
                  </Center>
                  <Text textAlign="center" color="gray.600">สแกน QR Code เพื่อชำระเงินผ่าน PromptPay</Text>
                  <Divider />
                  {currentUser.role === "user" && (
                    !proofUrl ? (
                      <VStack spacing={4}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setProofFile(e.target.files ? e.target.files[0] : null)}
                          style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "md", width: "100%" }}
                        />
                        <Button
                          colorScheme="green"
                          onClick={handleUploadProof}
                          isLoading={uploadingProof}
                          isDisabled={!proofFile || uploadingProof}
                          leftIcon={<Icon as={FaUpload} />}
                          w="full"
                          size="lg"
                        >
                          {uploadingProof ? "กำลังอัปโหลด..." : "อัปโหลดสลิป"}
                        </Button>
                      </VStack>
                    ) : (
                      <VStack spacing={4}>
                        <Text fontWeight="bold" color="green.600" fontSize="lg">หลักฐานการชำระเงินถูกอัปโหลดแล้ว</Text>
                        <Image src={proofUrl} alt="Payment Proof" maxW="250px" borderRadius="md" boxShadow="md" />
                        <HStack spacing={3}>
                          <Button
                            colorScheme="teal"
                            onClick={() => {
                              setCurrentProofImageUrl(proofUrl);
                              onProofModalOpen();
                            }}
                            leftIcon={<Icon as={FaEye} />}
                            size="md"
                          >
                            ดูหลักฐาน
                          </Button>
                          <Button
                            colorScheme="red"
                            onClick={handleDeleteProof}
                            isLoading={uploadingProof}
                            isDisabled={uploadingProof}
                            leftIcon={<Icon as={FaTrash} />}
                            size="md"
                          >
                            ลบหลักฐาน
                          </Button>
                        </HStack>
                      </VStack>
                    )
                  )}
                </>
              )}
              {bill.billStatus === 'pending' && (
                <VStack spacing={4}>
                  <Icon as={FaCheckCircle} w={12} h={12} color="yellow.400" />
                  <Heading size="md">รอการตรวจสอบ</Heading>
                  <Text>เราได้รับสลิปของคุณแล้วและกำลังตรวจสอบ</Text>
                  {bill.proofUrl && <Image src={bill.proofUrl} alt="Uploaded Slip" maxH="150px" borderRadius="md" />}
                </VStack>
              )}
              {bill.billStatus === 'paid' && (
                <VStack spacing={4}>
                  <Icon as={FaCheckCircle} w={12} h={12} color="green.400" />
                  <Heading size="md">ชำระเงินเรียบร้อย</Heading>
                  {bill.proofUrl && <Image src={bill.proofUrl} alt="Payment Slip" maxH="150px" borderRadius="md" />}
                </VStack>
              )}
            </VStack>
          </Box>
        </SimpleGrid>

        <Box mt={8} p={{ base: 4, md: 6 }} borderWidth="1px" borderRadius="xl" borderColor="gray.200" bg="gray.50">
          <Heading size="md" mb={4} color="gray.700">รูปภาพมิเตอร์</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <Box>
              <Text fontWeight="semibold" mb={2} fontSize={{ base: "md", md: "lg" }}>รูปภาพมิเตอร์ไฟฟ้า</Text>
              {bill.electricityImageUrl ? (
                <Image src={bill.electricityImageUrl} alt="รูปมิเตอร์ไฟฟ้า" borderRadius="md" maxW="100%" boxShadow="sm" />
              ) : (
                <Text color="gray.500">ไม่มีรูปมิเตอร์ไฟฟ้า</Text>
              )}
            </Box>
            <Box>
              <Text fontWeight="semibold" mb={2} fontSize={{ base: "md", md: "lg" }}>รูปภาพมิเตอร์น้ำ</Text>
              {bill.waterImageUrl ? (
                <Image src={bill.waterImageUrl} alt="รูปมิเตอร์น้ำ" borderRadius="md" maxW="100%" boxShadow="sm" />
              ) : (
                <Text color="gray.500">ไม่มีรูปมิเตอร์น้ำ</Text>
              )}
            </Box>
          </SimpleGrid>
        </Box>

        <Button
          leftIcon={<FaDownload />}
          colorScheme="green"
          w={{ base: "full", md: "auto" }}
          maxW="320px"
          fontSize={{ base: "md", md: "lg" }}
          onClick={handleExportPDF}
          mt={4}
          size="lg"
        >
          ดาวน์โหลด PDF
        </Button>
      </VStack>
    </Container>
  );

  return (
    <>
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        <div ref={pdfRef}>
            {bill && renderPDFContent(qr)}
        </div>
      </div>
      <Script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.5.0/qrcode.min.js" strategy="afterInteractive" />
      <Script src="/scripts/promptpay.js" strategy="afterInteractive" />
      {currentUser.role === 'user' ? (
        <TenantLayout currentUser={currentUser}>
          {renderContent()}
        </TenantLayout>
      ) : (
        <MainLayout role={currentUser.role} currentUser={currentUser}>
          {renderContent()}
        </MainLayout>
      )}

      <Modal isOpen={isProofModalOpen} onClose={onProofModalClose} isCentered size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>หลักฐานการชำระเงิน</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {currentProofImageUrl && <Image src={currentProofImageUrl} alt="Proof of Payment" w="full" />}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
