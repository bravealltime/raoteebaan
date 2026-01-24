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



  const handleExportPDF = () => {
    if (!bill) {
      toast({ title: "ไม่พบข้อมูลบิล", status: "error" });
      return;
    }

    const isPaid = bill.billStatus === 'paid';
    const statusColor = isPaid ? '#22c55e' : (bill.billStatus === 'pending' ? '#eab308' : '#ef4444');
    const statusText = isPaid ? 'ชำระแล้ว' : (bill.billStatus === 'pending' ? 'รอตรวจสอบ' : 'ค้างชำระ');
    const noteText = isPaid ? 'ใบเสร็จรับเงินฉบับนี้สมบูรณ์เมื่อบริษัทได้รับเงินเรียบร้อยแล้ว' : 'กรุณาชำระเงินตามยอดที่ระบุภายในวันครบกำหนดชำระ';

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ใบเสร็จ/ใบแจ้งหนี้ - ${bill.room}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Sarabun', sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: #1a202c;
            font-size: 14px;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #e2e8f0;
            padding: 40px;
            position: relative;
          }
          .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
          }
          .logo-section h1 {
            margin: 0;
            font-size: 24px;
            color: ${isPaid ? '#15803d' : '#1d4ed8'};
          }
          .logo-section p {
            margin: 5px 0 0;
            color: #64748b;
          }
          .status-badge {
            background-color: ${statusColor};
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            height: fit-content;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .info-box h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
            color: #334155;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .info-label {
            font-weight: 500;
            color: #64748b;
          }
          .info-value {
            font-weight: 600;
            text-align: right;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background-color: #f8fafc;
            padding: 12px;
            text-align: left;
            border-bottom: 2px solid #e2e8f0;
            color: #475569;
            font-weight: bold;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          .col-amount {
            text-align: right;
          }
          .total-row td {
            border-top: 2px solid #e2e8f0;
            font-weight: bold;
            font-size: 18px;
            color: #0f172a;
            background-color: #f8fafc;
          }
          .footer {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .payment-info {
            font-size: 12px;
            color: #64748b;
            max-width: 60%;
          }
          .signature-section {
            text-align: center;
            width: 200px;
          }
          .signature-line {
            border-bottom: 1px solid #94a3b8;
            margin: 40px 0 10px;
          }
          @media print {
            body { padding: 0; }
            .container { border: none; padding: 0; }
            -webkit-print-color-adjust: exact;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-section">
              <h1>${isPaid ? 'ใบเสร็จรับเงิน' : 'ใบแจ้งหนี้'} (Receipt/Invoice)</h1>
              <p>ห้องพักรายเดือน • Monthly Room Rental</p>
            </div>
            <div class="status-badge">
              ${statusText}
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <h3>ข้อมูลผู้เช่า (Tenant)</h3>
              <div class="info-row">
                <span class="info-label">ห้องเลขที่:</span>
                <span class="info-value">${bill.room}</span>
              </div>
              <div class="info-row">
                <span class="info-label">ชื่อผู้เช่า:</span>
                <span class="info-value">${bill.tenant}</span>
              </div>
              <div class="info-row">
                <span class="info-label">ขนาดห้อง:</span>
                <span class="info-value">${bill.area} ตร.ม.</span>
              </div>
            </div>
            <div class="info-box">
              <h3>ข้อมูลเอกสาร (Document)</h3>
              <div class="info-row">
                <span class="info-label">เลขที่เอกสาร:</span>
                <span class="info-value">${bill.id.substring(0, 8).toUpperCase()}...</span>
              </div>
              <div class="info-row">
                <span class="info-label">วันที่ออกเอกสาร:</span>
                <span class="info-value">${bill.date}</span>
              </div>
              <div class="info-row">
                <span class="info-label">วันครบกำหนด:</span>
                <span class="info-value" style="color: ${bill.overdueDays > 0 ? '#ef4444' : 'inherit'}">${bill.dueDate}</span>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%">#</th>
                <th style="width: 65%">รายการ (Description)</th>
                <th style="width: 30%; text-align: right;">จำนวนเงิน (Amount)</th>
              </tr>
            </thead>
            <tbody>
              ${bill.broughtForward > 0 ? `
              <tr>
                <td>-</td>
                <td>ยอดยกมาจากเดือนก่อน (Brought Forward)</td>
                <td class="col-amount">${bill.broughtForward.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
              </tr>` : ''}
              
              ${bill.items.map((item: any, index: number) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.label}</td>
                <td class="col-amount">${Number(item.value).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
              </tr>
              `).join('')}
              
              <tr class="total-row">
                <td colspan="2" style="text-align: right;">ยอดรวมสุทธิ (Grand Total)</td>
                <td class="col-amount">${bill.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <div class="payment-info">
              <p style="margin: 0; font-weight: bold;">หมายเหตุ:</p>
              <p style="margin: 5px 0;">${noteText}</p>
              ${!isPaid && bill.promptpay ? `<p style="margin-top: 10px;">ชำระเงินผ่าน PromptPay: <b>${bill.promptpay}</b></p>` : ''}
            </div>
            
            <div class="signature-section">
              <div class="signature-line"></div>
              <p>ผู้รับเงิน / Collector</p>
              <p style="font-size: 12px; color: #94a3b8;">${new Date().toLocaleDateString('th-TH')}</p>
            </div>
          </div>
          
          ${!isPaid && qr ? `
          <div style="text-align: center; margin-top: 20px; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 8px;">
            <p style="margin-bottom: 10px; font-weight: bold;">สแกนจ่ายด้วย PromptPay</p>
            <img src="${qr}" style="width: 120px; height: 120px;" />
          </div>` : ''}

        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      toast({ title: "Pop-up ถูกบล็อก", description: "กรุณาอนุญาต Pop-up เพื่อพิมพ์เอกสาร", status: "warning" });
    }
  };

  const handleUploadProof = async () => {
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
