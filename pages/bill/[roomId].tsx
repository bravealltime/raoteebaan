import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { Box, Heading, Text, Flex, Spinner, Table, Thead, Tbody, Tr, Th, Td, Button, Icon } from "@chakra-ui/react";
import { db } from "../../lib/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { FaFileInvoice, FaArrowLeft, FaDownload } from "react-icons/fa";
import Script from "next/script";
import AppHeader from "../../components/AppHeader";

const mockBill = {
  date: "25/12/2024",
  dueDate: "31/12/2024",
  room: "101",
  tenant: "สมชาย ใจร้าย",
  total: 10201.5,
  items: [
    { label: "ค่าไฟฟ้า", value: 1552.5 },
    { label: "ค่าน้ำ", value: 0 },
    { label: "ค่าเช่า", value: 5000 },
    { label: "ค่าที่จอดรถ", value: 3000 },
    { label: "ค่าเน็ต", value: 649 },
  ],
};

export default function BillDetail() {
  const router = useRouter();
  const { roomId } = router.query;
  const [bill, setBill] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  // Hardcode promptpay for now (replace with real data if available)
  const promptpay = "1209701702030";

  const user = {
    name: "xxx",
    avatar: "/avatar.png",
    greeting: "อาทิตย์ 21 มิ.ย. 2568"
  };

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
        if (!snap.empty) {
          const d = snap.docs[0].data();
          console.log('[DEBUG] bill doc from Firestore:', d);
          const items = [
            { label: "ค่าไฟฟ้า", value: d.electricityTotal || 0 },
            { label: "ค่าน้ำ", value: d.waterTotal || 0 },
            { label: "ค่าเช่า", value: d.rent || 0 },
            { label: "ค่าบริการ", value: d.service || 0 },
            ...(Array.isArray(d.extraServices)
              ? d.extraServices.map((svc: any) => ({ label: svc.label || "ค่าบริการเสริม", value: svc.value || 0 }))
              : [])
          ];
          const total = items.reduce((sum, i) => sum + Number(i.value), 0);
          console.log('[DEBUG] mapped bill for setBill:', {
            date: d.date,
            dueDate: d.dueDate,
            room: d.roomId,
            tenant: d.tenantName || "-",
            total,
            items,
            promptpay: d.promptpay || promptpay,
            rent: d.rent || 0,
            service: d.service || 0,
            extraServices: d.extraServices || [],
          });
          setBill({
            date: d.date,
            dueDate: d.dueDate,
            room: d.roomId,
            tenant: d.tenantName || "-",
            total,
            items,
            promptpay: d.promptpay || promptpay,
            rent: d.rent || 0,
            service: d.service || 0,
            extraServices: d.extraServices || [],
          });
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
    console.log('QR Generation useEffect triggered:', {
      window: typeof window !== "undefined",
      ThaiQRCode: typeof window !== "undefined" ? !!(window as any).ThaiQRCode : false,
      promptpay: bill?.promptpay,
      total: bill?.total,
      qr: qr
    });
    
    if (typeof window !== "undefined" && (window as any).ThaiQRCode && bill?.promptpay && bill?.total) {
      try {
        const ThaiQRCode = (window as any).ThaiQRCode;
        console.log('Generating QR code for:', bill.promptpay, 'amount:', bill.total);
        const qrData = ThaiQRCode.generate(bill.promptpay, { amount: bill.total });
        console.log('QR code generated:', qrData ? 'success' : 'failed');
        setQr(qrData);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    } else {
      console.log('QR generation conditions not met:', {
        hasWindow: typeof window !== "undefined",
        hasThaiQRCode: typeof window !== "undefined" ? !!(window as any).ThaiQRCode : false,
        hasPromptpay: !!bill?.promptpay,
        hasTotal: !!bill?.total
      });
    }
  }, [bill?.promptpay, bill?.total]);

  // Additional useEffect to retry QR generation after scripts are loaded
  useEffect(() => {
    const checkAndGenerateQR = () => {
      if (typeof window !== "undefined" && (window as any).ThaiQRCode && bill?.promptpay && bill?.total && !qr) {
        console.log('Retrying QR generation...');
        try {
          const ThaiQRCode = (window as any).ThaiQRCode;
          const qrData = ThaiQRCode.generate(bill.promptpay, { amount: bill.total });
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

  useEffect(() => {
    // โหลด qrcode-generator ก่อน
    const script1 = document.createElement('script');
    script1.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.5.0/qrcode.min.js';
    script1.async = false;
    script1.onload = () => {
      // eslint-disable-next-line no-console
      console.log('qrcode-generator loaded', typeof (window as any).qrcode);
      // โหลด promptpay.js หลังจาก qrcode-generator โหลดเสร็จ
      const script2 = document.createElement('script');
      script2.src = '/scripts/promptpay.js';
      script2.async = false;
      script2.onload = () => {
        // eslint-disable-next-line no-console
        console.log('promptpay.js loaded', typeof (window as any).ThaiQRCode);
      };
      document.body.appendChild(script2);
    };
    document.body.appendChild(script1);

    return () => {
      document.body.removeChild(script1);
    };
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

  if (loading) return <Flex minH="100vh" align="center" justify="center"><Spinner size="xl" /></Flex>;
  if (!bill) return <Box p={8}><Text>ไม่พบข้อมูลบิล</Text></Box>;

  return (
    <>
      <AppHeader user={user} />
      <Flex minH="100vh" align="center" justify="center" bgGradient="linear(to-br, #e3f2fd, #bbdefb)" p={[1, 2, 4]}>
        <Box w="full" display="flex" flexDirection="column" alignItems="center">
          <Button
            leftIcon={<FaArrowLeft />}
            mb={4}
            variant="ghost"
            colorScheme="blue"
            onClick={() => router.push("/dashboard")}
            fontSize={["md", "md", "lg"]}
            px={[2, 4]}
          >
            กลับหน้าหลัก
          </Button>
          <Box
            bg="white"
            borderRadius="2xl"
            boxShadow="2xl"
            p={[2, 4, 8]}
            maxW={["98vw", "98vw", "800px"]}
            minW={["0", "320px", "400px"]}
            w="full"
            color="gray.800"
            overflowX="auto"
            mb={4}
          >
            <div ref={pdfRef}>
              <Flex direction="column" align="center" mb={4}>
                <Icon as={FaFileInvoice} w={[6, 8]} h={[6, 8]} color="green.500" mb={2} />
                <Heading fontWeight="bold" fontSize={["xl", "2xl"]} color="green.600" mb={1} textAlign="center">
                  ใบแจ้งค่าใช้จ่าย
                </Heading>
                <Text color="gray.500" fontSize={["xs", "sm"]} textAlign="center">
                  วันที่ออกใบแจ้งหนี้: {bill.date}
                </Text>
              </Flex>
              <Flex justify="space-between" mb={2} flexDir={["column", "row"]} gap={[2, 0]}>
                <Box mb={[2, 0]}>
                  <Text fontSize={["sm", "md"]}>ห้อง: <b>{bill.room}</b></Text>
                  <Text fontSize={["sm", "md"]}>ชื่อผู้เช่า: <b>{bill.tenant}</b></Text>
                </Box>
                <Box textAlign={["left", "right"]}>
                  <Text fontSize={["sm", "md"]}>รอบบิล: <b>{bill.date}</b></Text>
                  <Text fontSize={["sm", "md"]}>วันครบกำหนด: <b>{bill.dueDate}</b></Text>
                </Box>
              </Flex>
              <Text textAlign="center" fontSize={["2xl", "3xl"]} color="green.500" fontWeight="extrabold" my={4}>
                ฿{bill.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </Text>
              <Box mb={4} overflowX="auto">
                <Text fontWeight="bold" mb={2} fontSize={["sm", "md"]}>รายละเอียดค่าใช้จ่าย</Text>
                <Table size="sm" variant="simple" minW="320px">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th fontSize={["xs", "sm"]}>รายการ</Th>
                      <Th isNumeric fontSize={["xs", "sm"]}>จำนวนเงิน (บาท)</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {/* ค่าไฟฟ้า */}
                    <Tr>
                      <Td fontSize={["xs", "sm"]}>ค่าไฟฟ้า</Td>
                      <Td isNumeric fontSize={["xs", "sm"]}>{(bill.rent !== undefined ? bill.items[0]?.value : 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Td>
                    </Tr>
                    {/* ค่าน้ำ */}
                    <Tr>
                      <Td fontSize={["xs", "sm"]}>ค่าน้ำ</Td>
                      <Td isNumeric fontSize={["xs", "sm"]}>{(bill.rent !== undefined ? bill.items[1]?.value : 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Td>
                    </Tr>
                    {/* ค่าเช่า */}
                    <Tr>
                      <Td fontSize={["xs", "sm"]}>ค่าเช่า</Td>
                      <Td isNumeric fontSize={["xs", "sm"]}>{bill.rent?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Td>
                    </Tr>
                    {/* ค่าบริการ (รวม addon) */}
                    <Tr>
                      <Td fontSize={["xs", "sm"]}>ค่าบริการ</Td>
                      <Td isNumeric fontSize={["xs", "sm"]}>{Array.isArray(bill.extraServices)
                        ? bill.extraServices.reduce((sum, svc) => sum + Number(svc.value || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })
                        : "0.00"}</Td>
                    </Tr>
                    {/* extraServices แยกรายการ */}
                    {Array.isArray(bill.extraServices) && bill.extraServices.map((svc: any, idx: number) => (
                      <Tr key={"extra-"+idx}>
                        <Td fontSize={["xs", "sm"]}>{svc.label || "ค่าบริการเสริม"}</Td>
                        <Td isNumeric fontSize={["xs", "sm"]}>{svc.value?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Td>
                      </Tr>
                    ))}
                    <Tr fontWeight="bold">
                      <Td fontSize={["xs", "sm"]}>รวมทั้งสิ้น</Td>
                      <Td isNumeric fontSize={["xs", "sm"]}>{bill.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Td>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
              {bill.promptpay && (
                <Box mb={4} textAlign="center">
                  <Text fontWeight="bold" mb={2} color="green.700" fontSize={["md", "lg"]}>ชำระผ่านพร้อมเพย์</Text>
                  <Flex direction="column" align="center" justify="center" w="100%">
                    {qr && (
                      <Box
                        as="span"
                        display="inline-block"
                        width={["140px", "180px"]}
                        height={["140px", "180px"]}
                        mb={2}
                      >
                        <img
                          src={qr}
                          alt="QR พร้อมเพย์"
                          style={{
                            width: "100%",
                            height: "100%",
                            maxWidth: 180,
                            maxHeight: 180,
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
                    <Text fontSize={["sm", "md"]} color="gray.700" wordBreak="break-all" whiteSpace="break-spaces">
                      PromptPay: <b>{bill.promptpay}</b>
                    </Text>
                    <Text fontSize={["sm", "md"]} color="gray.700">
                      ยอดเงิน: <b>{bill.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</b>
                    </Text>
                  </Flex>
                </Box>
              )}
              <Box bg="yellow.50" borderRadius="md" p={[2, 3]} color="yellow.800" fontSize={["xs", "sm"]} mb={2} mt={4}>
                <b>วิธีการชำระเงิน</b>
                <ul style={{ marginLeft: 16 }}>
                  <li>กรุณาชำระเงินภายในวันที่ <b>{bill.dueDate}</b></li>
                  <li>ช่องทางการชำระเงิน: โอนบัญชีธนาคาร/พร้อมเพย์/เงินสด</li>
                  <li>แจ้งสลิปหรือหลักฐานการชำระเงินกับผู้ดูแล</li>
                </ul>
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
            mb={2}
          >
            ดาวน์โหลด PDF
          </Button>
        </Box>
      </Flex>
    </>
  );
} 