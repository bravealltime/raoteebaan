import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { Box, Heading, Text, Flex, Spinner, Table, Thead, Tbody, Tr, Th, Td, Button, Icon, VStack, Image, HStack, useToast, Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, useDisclosure, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, AlertDialogCloseButton, SimpleGrid, Badge, Divider, Center } from "@chakra-ui/react";
import { db, auth } from "../../lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { FaFileInvoice, FaArrowLeft, FaDownload, FaUpload, FaEye, FaTrash, FaCheckCircle } from "react-icons/fa";
import Script from "next/script";
import TenantLayout from "../../components/TenantLayout";
import MainLayout from "../../components/MainLayout";

export default function BillDetail() {
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
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Hardcode promptpay for now (replace with real data if available)
  const promptpay = "1209701702030";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setUserRole(snap.data().role);
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!roomId) return;
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
        
        let roomData: any = null;
        const roomSnap = await getDoc(doc(db, "rooms", String(roomId)));
        if (roomSnap.exists()) {
          roomData = roomSnap.data();
        }

        if (!snap.empty) {
          const d = snap.docs[0].data();
          
          const toDate = (firebaseDate: any): Date | null => {
            if (!firebaseDate) return null;
            if (firebaseDate.seconds) return new Date(firebaseDate.seconds * 1000);
            if (typeof firebaseDate === 'string') return new Date(firebaseDate);
            return null;
          };

          const billDate = toDate(d.date);
          const dueDate = toDate(d.dueDate);

          if (!billDate || !dueDate) {
            setBill(null);
            return;
          }

          const latestRent = roomData?.rent || d.rent || 0;
          const latestService = roomData?.service || d.service || 0;
          const latestExtraServices = roomData?.extraServices || d.extraServices || [];

          const elecLabel = `ค่าไฟฟ้า (${d.electricityUnit} หน่วย x ${d.electricityRate} บ.)`;
          const waterLabel = `ค่าน้ำ (${d.waterUnit} หน่วย x ${d.waterRate} บ.)`;

          const items = [
            { label: elecLabel, value: d.electricityTotal || 0 },
            { label: waterLabel, value: d.waterTotal || 0 },
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
            room: d.roomId,
            tenant: d.tenantName || roomData?.tenantName || "-",
            total,
            items,
            promptpay: promptpay,
            rent: latestRent,
            extraServices: latestExtraServices,
            area: roomData?.area || 0,
            status: roomData?.status || "vacant",
            overdueDays: overdueDays,
            billStatus: d.status || "unpaid",
            proofUrl: d.proofUrl || null,
            meterImageUrl: d.meterImageUrl || null,
            electricityImageUrl: d.electricityImageUrl || null,
            waterImageUrl: d.waterImageUrl || null,
          };

          setBill(finalBill);
          setProofUrl(d.proofUrl || null);
        } else {
          setBill(null);
        }
      } catch (err) {
        setBill(null);
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [roomId]);

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

  const handleExportPDF = async () => {
    if (!pdfRef.current) return;
    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf()
      .set({
        margin: 0.5,
        filename: `invoice_${bill.room}_${bill.date}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      })
      .from(pdfRef.current)
      .save();
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
      if (userRole === 'user') {
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
      if (userRole === 'user') {
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

  if (loading) return <Flex minH="100vh" align="center" justify="center"><Spinner size="xl" /></Flex>;
  if (!bill) return <Box p={8}><Text>ไม่พบข้อมูลบิล</Text></Box>;

  const renderContent = () => (
    <Box maxW="1200px" mx="auto" p={{ base: 2, md: 4 }}>
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }} gap={4}>
          <Box>
            <Heading size={{ base: "md", lg: "lg" }} color="gray.700">ใบแจ้งหนี้ - ห้อง {roomId}</Heading>
            <Text color="gray.500">สำหรับ {bill.tenant}</Text>
          </Box>
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
                  {userRole === "user" && (
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
    </Box>
  );

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.5.0/qrcode.min.js" strategy="afterInteractive" />
      <Script src="/scripts/promptpay.js" strategy="afterInteractive" />
      {userRole === 'user' ? (
        <TenantLayout currentUser={currentUser}>
          {renderContent()}
        </TenantLayout>
      ) : (
        <MainLayout role={userRole} currentUser={currentUser}>
          {renderContent()}
        </MainLayout>
      )}
    </>
  );
}
