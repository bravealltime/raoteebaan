import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { Box, Heading, Text, Flex, Spinner, Table, Thead, Tbody, Tr, Th, Td, Button, Icon, VStack, Image, HStack, useToast, Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, useDisclosure, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, AlertDialogCloseButton, SimpleGrid } from "@chakra-ui/react";
import { db, auth } from "../../lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { FaFileInvoice, FaArrowLeft, FaDownload, FaUpload, FaEye, FaTrash, FaCheckCircle } from "react-icons/fa";
import Script from "next/script";
import AppHeader from "../../components/AppHeader";

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

  const user = {
    name: "xxx",
    avatar: "/avatar.png",
    greeting: "อาทิตย์ 21 มิ.ย. 2568"
  };

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
        console.log('[DEBUG] roomId:', roomId);
        const q = query(
          collection(db, "bills"),
          where("roomId", "==", String(roomId)),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snap = await getDocs(q);
        console.log(`[DEBUG] Query for roomId ${roomId} returned ${snap.docs.length} documents.`);
        if (snap.empty) {
          console.log(`[DEBUG] No bill found for roomId: ${roomId}`);
        }
        let roomData: any = null;
        const roomSnap = await getDoc(doc(db, "rooms", String(roomId)));
        if (roomSnap.exists()) {
          roomData = roomSnap.data();
          console.log(`[DEBUG] Room data for ${roomId}:`, roomData);
        } else {
          console.log(`[DEBUG] No room data found for roomId: ${roomId}`);
        }

        if (!snap.empty) {
          const d = snap.docs[0].data();
          console.log('[DEBUG] bill doc from Firestore:', d);

          // Helper to convert Firestore Timestamp or ISO string to JS Date
          const toDate = (firebaseDate: any): Date | null => {
            if (!firebaseDate) return null;
            if (firebaseDate.seconds) return new Date(firebaseDate.seconds * 1000);
            if (typeof firebaseDate === 'string') return new Date(firebaseDate);
            return null;
          };

          const billDate = toDate(d.date);
          const dueDate = toDate(d.dueDate);

          if (!billDate || !dueDate) {
            console.error("Invalid date format in bill:", d);
            setBill(null); // Or handle as an error
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
          ].filter(item => item.value > 0); // Filter out items with 0 value
          
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
            id: snap.docs[0].id, // Add the bill document ID here
            date: formatDate(billDate),
            dueDate: formatDate(dueDate),
            room: d.roomId,
            tenant: d.tenantName || roomData?.tenantName || "-",
            total,
            items,
            promptpay: promptpay, // Use the hardcoded one for now
            rent: latestRent,
            extraServices: latestExtraServices,
            area: roomData?.area || 0,
            status: roomData?.status || "vacant",
            overdueDays: overdueDays,
            billStatus: d.status || "unpaid",
            proofUrl: d.proofUrl || null, // Fetch existing proof URL
            meterImageUrl: d.meterImageUrl || null, // Fetch meter image URL
            electricityImageUrl: d.electricityImageUrl || null,
            waterImageUrl: d.waterImageUrl || null,
          };

          console.log('[DEBUG] mapped bill for setBill:', finalBill);
          setBill(finalBill);
          setProofUrl(d.proofUrl || null); // Set proofUrl state
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

  // Additional useEffect to retry QR generation after scripts are loaded
  useEffect(() => {
    const checkAndGenerateQR = () => {
      if (typeof window !== "undefined" && (window as any).ThaiQRCode && bill?.promptpay && bill?.total && !qr) {
        console.log('Retrying QR generation...');
        try {
          const qrData = (window as any).ThaiQRCode.generate(bill.promptpay, { amount: bill.total });
          setQr(qrData);
        } catch (error) {
          console.error('Error in retry QR generation:', error);
        }
      }
    };

    // Check immediately
    checkAndGenerateQR();
    
    // Also check after a short delay to ensure scripts are loaded
    const timer = setTimeout(checkAndGenerateQR, 1000);
    
    return () => clearTimeout(timer);
  }, [bill?.promptpay, bill?.total, qr]);

  useEffect(() => {
    console.log('window.qrcode:', typeof window !== "undefined" ? (window as any).qrcode : undefined);
  }, []);

  const handleExportPDF = async () => {
    if (!pdfRef.current) return;
    // โหลด html2pdf เฉพาะฝั่ง client
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

    console.log("handleUploadProof: bill object:", bill);
    console.log("handleUploadProof: bill.id:", bill.id);

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
        status: "pending", // Change bill status to pending after proof upload
      });

      // Update room billStatus to 'pending'
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
        router.push("/tenant-dashboard"); // Redirect to tenant dashboard
      } else {
        router.push("/dashboard"); // Redirect to admin/owner dashboard
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

    setUploadingProof(true); // Use the same loading state for delete operation
    try {
      const storage = getStorage();
      const fileRef = storageRef(storage, proofUrl); // Create ref from URL
      await deleteObject(fileRef);

      const billDocRef = doc(db, "bills", bill.id);
      await updateDoc(billDocRef, {
        proofUrl: null,
        status: "unpaid", // Change bill status back to unpaid after proof delete
      });

      // Update room billStatus to 'unpaid'
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
        router.push("/tenant-dashboard"); // Redirect to tenant dashboard
      } else {
        router.push("/dashboard"); // Redirect to admin/owner dashboard
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
    setIsConfirmAlertOpen(true); // Open the confirmation alert
  };

  const confirmMarkAsPaid = async () => {
    setIsConfirmAlertOpen(false); // Close the alert
    if (!bill) return;

    setUploadingProof(true);
    try {
      const billDocRef = doc(db, "bills", bill.id);
      await updateDoc(billDocRef, {
        proofUrl: null,
        status: "paid", // Mark bill as paid
      });

      // Update room billStatus to 'paid'
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
      router.push("/dashboard"); // Redirect to dashboard after successful confirmation
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

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.5.0/qrcode.min.js" strategy="afterInteractive" />
      <Script src="/scripts/promptpay.js" strategy="afterInteractive" />
      <AppHeader currentUser={currentUser} />
      <Flex minH="100vh" align="center" justify="center" bgGradient="linear(to-br, brand.50, brand.100)" p={[1, 2, 4]}>
        <Box w="full" display="flex" flexDirection="column" alignItems="center">
          <Button
            leftIcon={<FaArrowLeft />}
            mb={4}
            variant="ghost"
            colorScheme="blue"
            onClick={() => router.back()}
            fontSize={["md", "md", "lg"]}
            px={[2, 4]}
          >
            กลับหน้าหลัก
          </Button>
          <Box
            bg="white"
            borderRadius="2xl"
            boxShadow="2xl"
            p={[4, 6, 8]}
            maxW={["98vw", "98vw", "800px"]}
            minW={["0", "320px", "400px"]}
            w="full"
            color="gray.800"
            overflowX="auto"
            mb={4}
          >
            <div ref={pdfRef}>
              <VStack spacing={1} mb={6}>
                <Icon as={FaFileInvoice} w={[8, 10]} h={[8, 10]} color="green.500" />
                <Heading fontWeight="extrabold" fontSize={["2xl", "3xl"]} color="green.700" textAlign="center">
                  ใบแจ้งค่าใช้จ่าย
                </Heading>
                <Text color="gray.500" fontSize={["sm", "md"]} textAlign="center">
                  วันที่ออกใบแจ้งหนี้: {bill.date}
                </Text>
              </VStack>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={6}>
                <Box>
                  <Text fontSize={["md", "lg"]}>ห้อง: <Text as="b" color="blue.600">{bill.room}</Text></Text>
                  <Text fontSize={["md", "lg"]}>ชื่อผู้เช่า: <Text as="b" color="blue.600">{bill.tenant}</Text></Text>
                </Box>
                <Box textAlign={{ base: "left", md: "right" }}>
                  <Text fontSize={["md", "lg"]}>รอบบิล: <Text as="b" color="blue.600">{bill.date}</Text></Text>
                  <Text fontSize={["md", "lg"]}>วันครบกำหนด: <Text as="b" color="red.500">{bill.dueDate}</Text></Text>
                  {bill.overdueDays > 0 && (
                    <Text fontSize={["md", "lg"]} color="red.600" fontWeight="bold">
                      (เกินกำหนด {bill.overdueDays} วัน)
                    </Text>
                  )}
                </Box>
              </SimpleGrid>

              <Box bg="green.50" p={4} borderRadius="lg" mb={6} textAlign="center">
                <Text fontSize={["3xl", "4xl"]} color="green.700" fontWeight="extrabold">
                  ยอดรวม: ฿{bill.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </Text>
              </Box>

              <Box mb={6} overflowX="auto">
                <Heading size="md" mb={3} color="gray.700">รายละเอียดค่าใช้จ่าย</Heading>
                <Table size="md" variant="simple" minW="320px">
                  <Thead bg="gray.100">
                    <Tr>
                      <Th fontSize={["sm", "md"]}>รายการ</Th>
                      <Th isNumeric fontSize={["sm", "md"]}>จำนวนเงิน (บาท)</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {bill.items.map((item: any, index: number) => (
                      <Tr key={index}>
                        <Td fontSize={["sm", "md"]}>{item.label}</Td>
                        <Td isNumeric fontSize={["sm", "md"]}>{item.value.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Td>
                      </Tr>
                    ))}
                    <Tr fontWeight="bold" bg="green.50">
                      <Td fontSize={["md", "lg"]}>รวมทั้งสิ้น</Td>
                      <Td isNumeric fontSize={["md", "lg"]}>{bill.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Td>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>

              {bill.promptpay && (
                <Box mb={6} p={4} bg="blue.50" borderRadius="lg" textAlign="center">
                  <Heading size="md" mb={3} color="blue.700">ชำระผ่านพร้อมเพย์</Heading>
                  <VStack spacing={3} align="center">
                    {qr && (
                      <Box
                        as="span"
                        display="inline-block"
                        width={["160px", "200px"]}
                        height={["160px", "200px"]}
                        mb={2}
                        border="2px solid"
                        borderColor="gray.200"
                        borderRadius="md"
                        overflow="hidden"
                      >
                        <img
                          src={qr}
                          alt="QR พร้อมเพย์"
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "block",
                            margin: "0 auto"
                          }}
                        />
                      </Box>
                    )}
                    {!qr && (
                      <Box p={4} bg="gray.100" borderRadius="md" mb={2}>
                        <Text fontSize="sm" color="gray.600">กำลังสร้าง QR Code...</Text>
                      </Box>
                    )}
                    <Text fontSize={["md", "lg"]} color="gray.700" wordBreak="break-all" whiteSpace="break-spaces">
                      PromptPay ID: <Text as="b" color="blue.800">{bill.promptpay}</Text>
                    </Text>
                    <Text fontSize={["md", "lg"]} color="gray.700">
                      ยอดเงิน: <Text as="b" color="blue.800">{bill.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</Text>
                    </Text>
                  </VStack>
                </Box>
              )}

              <Box bg="yellow.50" borderRadius="lg" p={[3, 4]} color="yellow.800" fontSize={["sm", "md"]} mb={6}>
                <Heading size="sm" mb={2} color="yellow.700">วิธีการชำระเงิน</Heading>
                <ul style={{ marginLeft: 20, listStyleType: "disc" }}>
                  <li>กรุณาชำระเงินภายในวันที่ <Text as="b" color="red.600">{bill.dueDate}</Text></li>
                  <li>ช่องทางการชำระเงิน: โอนบัญชีธนาคาร/พร้อมเพย์/เงินสด</li>
                  <li>แจ้งสลิปหรือหลักฐานการชำระเงินกับผู้ดูแล</li>
                </ul>
              </Box>

              {/* Meter Images Section */}
              <Box mt={8} p={4} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="gray.50" mb={6}>
                <Heading size="md" mb={4} color="gray.700">รูปภาพมิเตอร์</Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <Box>
                    <Text fontWeight="semibold" mb={2} fontSize={["md", "lg"]}>รูปภาพมิเตอร์ไฟฟ้า</Text>
                    {bill.electricityImageUrl ? (
                      <Image src={bill.electricityImageUrl} alt="รูปมิเตอร์ไฟฟ้า" borderRadius="md" maxW="100%" boxShadow="sm" />
                    ) : (
                      <Text color="gray.500">ไม่มีรูปมิเตอร์ไฟฟ้า</Text>
                    )}
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" mb={2} fontSize={["md", "lg"]}>รูปภาพมิเตอร์น้ำ</Text>
                    {bill.waterImageUrl ? (
                      <Image src={bill.waterImageUrl} alt="รูปมิเตอร์น้ำ" borderRadius="md" maxW="100%" boxShadow="sm" />
                    ) : (
                      <Text color="gray.500">ไม่มีรูปมิเตอร์น้ำ</Text>
                    )}
                  </Box>
                </SimpleGrid>
              </Box>

              <Box p={4} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="gray.50">
                <Heading size="md" mb={4} color="blue.700">อัปโหลดหลักฐานการชำระเงิน</Heading>
                {userRole === "user" ? (
                  !proofUrl ? (
                    <VStack spacing={4}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProofFile(e.target.files ? e.target.files[0] : null)}
                        style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "md", width: "100%" }}
                      />
                      <Button
                        colorScheme="blue"
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
                ) : (userRole === "owner" || userRole === "admin") && proofUrl ? (
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
                        colorScheme="green"
                        onClick={handleConfirmProof}
                        isLoading={uploadingProof}
                        isDisabled={uploadingProof}
                        leftIcon={<Icon as={FaCheckCircle} />}
                        size="md"
                      >
                        ยืนยันหลักฐาน
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
                ) : (
                  <Text color="gray.500" fontSize="md">ไม่มีหลักฐานการชำระเงิน</Text>
                )}
              </Box>
            </div>
          </Box>
          <Button
            leftIcon={<FaDownload />}
            colorScheme="green"
            w={["100%", "auto"]}
            maxW="320px"
            fontSize={["md", "lg"]}
            onClick={handleExportPDF}
            mt={4}
            size="lg"
          >
            ดาวน์โหลด PDF
          </Button>
        </Box>
      </Flex>

      {/* Proof Image Modal */}
      <Modal isOpen={isProofModalOpen} onClose={onProofModalClose} isCentered size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalBody p={4}>
            {currentProofImageUrl && (
              <Image src={currentProofImageUrl} alt="Payment Proof" maxW="full" maxH="80vh" objectFit="contain" />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Confirmation AlertDialog for Marking as Paid */}
      <AlertDialog
        isOpen={isConfirmAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsConfirmAlertOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              ยืนยันการชำระเงิน
            </AlertDialogHeader>

            <AlertDialogBody>
              คุณแน่ใจหรือไม่ว่าต้องการยืนยันว่าบิลนี้ชำระแล้ว?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setIsConfirmAlertOpen(false)}>
                ยกเลิก
              </Button>
              <Button colorScheme="green" onClick={confirmMarkAsPaid} ml={3}>
                ยืนยัน
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}