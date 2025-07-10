import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Box, Text, Flex, Table, Thead, Tbody, Tr, Th, Td, Button, Icon, useToast, Center } from "@chakra-ui/react";
import { FaFileInvoice, FaDownload } from "react-icons/fa";
import { useRef, useEffect, useState } from "react";
import Script from "next/script";

interface InvoiceItem {
  label: string;
  value: number;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: {
    date: string;
    dueDate: string;
    room: string;
    tenant: string;
    total: number;
    items: InvoiceItem[];
    promptpay?: string; // หมายเลขพร้อมเพย์
    area: number;
    status: "occupied" | "vacant";
    overdueDays: number;
    billStatus: "paid" | "unpaid" | "pending" | "complete";
    slipUrl?: string; // เพิ่ม slipUrl ที่นี่
  };
}

export default function InvoiceModal({ isOpen, onClose, bill }: InvoiceModalProps) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const [qr, setQr] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ThaiQRCode && bill.promptpay && bill.total) {
      const ThaiQRCode = (window as any).ThaiQRCode;
      const qrData = ThaiQRCode.generate(bill.promptpay, { amount: bill.total });
      setQr(qrData);
    }
  }, [bill.promptpay, bill.total, isOpen]);

  const handleExportPDF = async () => {
    console.log("handleExportPDF called");
    try {
      if (!pdfRef.current) {
        console.log("pdfRef.current is null");
        return;
      }
      setIsGeneratingPDF(true);
      // dynamic import html2pdf.js only on client
      const html2pdf = (await import('html2pdf.js')).default;
      if (!html2pdf) {
        console.error("html2pdf.js failed to load.");
        setIsGeneratingPDF(false);
        toast({
          title: "Export PDF ไม่สำเร็จ",
          description: "ไลบรารี PDF ไม่สามารถโหลดได้",
          status: "error",
        });
        return;
      }
      console.log("html2pdf.js imported successfully");
    
    // Create a clone of the content for PDF generation
    const pdfContent = pdfRef.current.cloneNode(true) as HTMLElement;
    
    // Add Google Fonts link
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap';
    
    // Add PDF-specific CSS with embedded fonts
    const pdfStyle = document.createElement('style');
    pdfStyle.textContent = `
      @font-face {
        font-family: 'Kanit';
        src: url('/Kanit-Regular.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }
      * {
        font-family: 'Kanit', 'Sarabun', 'Noto Sans Thai', sans-serif !important;
      }
      body {
        font-family: 'Kanit', 'Sarabun', 'Noto Sans Thai', sans-serif !important;
        margin: 0;
        padding: 0;
      }
      table {
        font-family: 'Kanit', 'Sarabun', 'Noto Sans Thai', sans-serif !important;
      }
      th, td {
        font-family: 'Kanit', 'Sarabun', 'Noto Sans Thai', sans-serif !important;
      }
    `;
    
    // Create a temporary container
    const tempContainer = document.createElement('div');
    tempContainer.appendChild(fontLink);
    tempContainer.appendChild(pdfStyle);
    tempContainer.appendChild(pdfContent);
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    document.body.appendChild(tempContainer);
    
    // Wait a bit for fonts to load
    setTimeout(() => {
      html2pdf()
        .set({
          margin: 0.5,
          filename: `invoice_${bill.room}_${bill.date}.pdf`,
          html2canvas: { 
            scale: 2,
            useCORS: true,
            allowTaint: true
          },
          jsPDF: { 
            unit: "mm", 
            format: "a4", 
            orientation: "portrait",
            compress: true
          },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        })
        .from(tempContainer)
        .save()
        .then(() => {
          console.log("PDF saved successfully");
          // Clean up
          document.body.removeChild(tempContainer);
          setIsGeneratingPDF(false);
          toast({ title: "ดาวน์โหลด PDF สำเร็จ", status: "success" });
        })
        .catch((error: any) => {
          console.error('PDF generation error:', error);
          // Clean up
          document.body.removeChild(tempContainer);
          setIsGeneratingPDF(false);
          toast({ 
            title: "Export PDF ไม่สำเร็จ", 
            description: error.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ", 
            status: "error" 
          });
        });
    }, 3000); // Increased wait time to 3 seconds for fonts to load and rendering
    } catch (syncError: any) {
      console.error("Synchronous PDF generation error:", syncError);
      setIsGeneratingPDF(false);
      toast({
        title: "Export PDF ไม่สำเร็จ",
        description: syncError.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ",
        status: "error",
      });
    }
  };

  return (
    <>
      <Script src="/scripts/promptpay.js" strategy="beforeInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.5.0/qrcode.min.js" strategy="beforeInteractive" />
      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="2xl" p={2}>
          <ModalHeader display="flex" alignItems="center" gap={2} color="green.500" fontWeight="bold">
            <Icon as={FaFileInvoice} /> ใบแจ้งค่าใช้จ่าย
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody onClick={() => console.log("ModalBody clicked")}>
            <Box ref={pdfRef} bg="white" borderRadius="xl" p={6} color="gray.800">
              <Flex direction="column" align="center" mb={4}>
                <Icon as={FaFileInvoice} w={8} h={8} color="green.500" mb={2} />
                <Text fontWeight="bold" fontSize="2xl" color="green.600">ใบแจ้งค่าใช้จ่าย</Text>
                <Text color="gray.500" fontSize="sm">วันที่ออกใบแจ้งหนี้: {bill.date}</Text>
              </Flex>
              <Flex justify="space-between" mb={2}>
                <Box>
                  <Text>ห้อง: <b>{bill.room}</b></Text>
                  <Text>ชื่อผู้เช่า: <b>{bill.tenant}</b></Text>
                  <Text fontSize="sm" color="gray.500">ขนาด: {bill.area} ตร.ม.</Text>
                </Box>
                <Box textAlign="right">
                  <Text>สถานะห้อง: <b>{bill.status === "occupied" ? "มีคนอยู่" : "ว่าง"}</b></Text>
                  <Text>รอบบิล: <b>{bill.date}</b></Text>
                  <Text>วันครบกำหนด: <b>{bill.dueDate}</b></Text>
                  {bill.overdueDays > 0 && (
                    <Text color="red.500" fontWeight="bold">เกินกำหนด {bill.overdueDays} วัน</Text>
                  )}
                  <Text>สถานะบิล: <b>{bill.billStatus}</b></Text>
                </Box>
              </Flex>
              <Text textAlign="center" fontSize="3xl" color="green.500" fontWeight="extrabold" my={4}>
                ฿{bill.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </Text>
              <Box mb={4}>
                <Text fontWeight="bold" mb={2}>รายละเอียดค่าใช้จ่าย</Text>
                <Table size="sm" variant="simple">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>รายการ</Th>
                      <Th isNumeric>จำนวนเงิน (บาท)</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {bill.items.map((item, idx) => (
                      <Tr key={idx}>
                        <Td>{item.label}</Td>
                        <Td isNumeric>{item.value.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Td>
                      </Tr>
                    ))}
                    <Tr fontWeight="bold">
                      <Td>รวมทั้งสิ้น</Td>
                      <Td isNumeric>{bill.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Td>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
              {bill.promptpay && (
                <Box mb={4} p={4} border="1px solid" borderColor="gray.200" borderRadius="md" className="qr-code-section">
                  <Text fontWeight="bold" mb={3} color="brand.700" textAlign="center" fontSize="lg">สแกนเพื่อชำระเงิน (PromptPay QR Code)</Text>
                  <Center flexDirection="column">
                    {qr ? (
                      <img src={qr} alt="QR พร้อมเพย์" style={{ width: 180, height: 180, marginBottom: 8, border: '1px solid #ccc', padding: '5px' }} />
                    ) : (
                      <Text color="red.500">ไม่สามารถสร้าง QR Code ได้</Text>
                    )}
                    <Text fontSize="md" color="gray.700">PromptPay: <b>{bill.promptpay}</b></Text>
                    <Text fontSize="md" color="gray.700">ยอดเงิน: <b>{bill.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</b></Text>
                  </Center>
                </Box>
              )}
              <Box bg="yellow.50" borderRadius="md" p={3} color="yellow.800" fontSize="sm">
                <b>วิธีการชำระเงิน</b>
                <ul style={{ marginLeft: 16 }}>
                  <li>กรุณาชำระเงินภายในวันที่ <b>{bill.dueDate}</b></li>
                  <li>ช่องทางการชำระเงิน: โอนบัญชีธนาคาร/พร้อมเพย์/เงินสด</li>
                  <li>แจ้งสลิปหรือหลักฐานการชำระเงินกับผู้ดูแล</li>
                </ul>
              </Box>
              {bill.slipUrl && (
                <Box mt={4} p={4} border="1px solid" borderColor="gray.200" borderRadius="md" className="payment-slip-section">
                  <Text fontWeight="bold" mb={3} color="brand.700" textAlign="center" fontSize="lg">หลักฐานการชำระเงิน</Text>
                  <Center>
                    <img src={bill.slipUrl} alt="หลักฐานการชำระเงิน" style={{ maxWidth: '100%', height: 'auto', border: '1px solid #ccc' }} />
                  </Center>
                </Box>
              )}
            </Box>
            <Button leftIcon={<FaDownload />} colorScheme="blue" mt={6} w="full" borderRadius="xl" fontFamily="Kanit" fontWeight="bold" size="md" onClick={() => { console.log("Download button clicked"); handleExportPDF(); }} isLoading={isGeneratingPDF} loadingText="กำลังสร้าง PDF...">
              {isGeneratingPDF ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
} 