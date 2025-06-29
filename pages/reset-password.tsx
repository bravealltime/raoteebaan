import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { auth } from "../lib/firebase";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { Box, Flex, Heading, Text, Button, Input, FormControl, FormLabel, useToast, Spinner, Center, Alert, AlertIcon, AlertTitle, AlertDescription, VStack, Container } from "@chakra-ui/react";
import { FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validCode, setValidCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const { oobCode } = router.query;
    
    if (oobCode && typeof oobCode === 'string') {
      // Verify the password reset code
      verifyPasswordResetCode(auth, oobCode)
        .then((email) => {
          setValidCode(true);
          setVerifying(false);
        })
        .catch((error) => {
          console.error('Error verifying reset code:', error);
          setValidCode(false);
          setVerifying(false);
        });
    } else {
      setVerifying(false);
    }
  }, [router.query]);

  const handleResetPassword = async () => {
    if (password !== confirmPassword) {
      toast({
        title: "รหัสผ่านไม่ตรงกัน",
        description: "กรุณากรอกรหัสผ่านให้ตรงกัน",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "รหัสผ่านสั้นเกินไป",
        description: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    const { oobCode } = router.query;

    try {
      if (oobCode && typeof oobCode === 'string') {
        await confirmPasswordReset(auth, oobCode, password);
        toast({
          title: "ตั้งรหัสผ่านสำเร็จ",
          description: "คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        
        // Redirect to login page after 2 seconds
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถตั้งรหัสผ่านได้",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <Center minH="100vh" bgGradient="linear(to-br, #e3f2fd, #bbdefb)">
        <VStack spacing={4}>
          <Spinner color="blue.400" size="xl" />
          <Text color="blue.600" fontSize="lg">กำลังตรวจสอบลิงก์...</Text>
        </VStack>
      </Center>
    );
  }

  if (!validCode) {
    return (
      <Center minH="100vh" bgGradient="linear(to-br, #e3f2fd, #bbdefb)">
        <Container maxW="md">
          <Box bg="white" borderRadius="2xl" p={8} boxShadow="xl" border="1.5px solid #e3f2fd">
            <VStack spacing={6}>
              <Alert status="error" borderRadius="xl">
                <AlertIcon />
                <Box>
                  <AlertTitle>ลิงก์ไม่ถูกต้องหรือหมดอายุ</AlertTitle>
                  <AlertDescription>
                    ลิงก์ตั้งรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว กรุณาติดต่อผู้ดูแลระบบ
                  </AlertDescription>
                </Box>
              </Alert>
              <Button 
                colorScheme="blue" 
                onClick={() => router.push("/login")}
                borderRadius="xl"
                fontWeight="bold"
                w="full"
              >
                กลับไปหน้าเข้าสู่ระบบ
              </Button>
            </VStack>
          </Box>
        </Container>
      </Center>
    );
  }

  return (
    <Center minH="100vh" bgGradient="linear(to-br, #e3f2fd, #bbdefb)">
      <Container maxW="md">
        <Box bg="white" borderRadius="2xl" p={8} boxShadow="xl" border="1.5px solid #e3f2fd">
          <VStack spacing={6}>
            <VStack spacing={2}>
              <Box 
                bg="blue.100" 
                p={4} 
                borderRadius="full" 
                color="blue.600"
              >
                <FaLock size="2xl" />
              </Box>
              <Heading color="blue.600" fontSize="2xl" textAlign="center">
                ตั้งรหัสผ่านใหม่
              </Heading>
              <Text color="gray.600" textAlign="center">
                กรุณากรอกรหัสผ่านใหม่สำหรับบัญชีของคุณ
              </Text>
            </VStack>

            <VStack spacing={4} w="full">
              <FormControl>
                <FormLabel color="gray.700">รหัสผ่านใหม่</FormLabel>
                <Box position="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="รหัสผ่านใหม่"
                    pr="3rem"
                    borderRadius="xl"
                    border="1.5px solid"
                    borderColor="gray.200"
                    _focus={{
                      borderColor: "blue.400",
                      boxShadow: "0 0 0 1px #3182ce",
                    }}
                  />
                  <Button
                    position="absolute"
                    right="0.5rem"
                    top="50%"
                    transform="translateY(-50%)"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    color="gray.500"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </Button>
                </Box>
              </FormControl>

              <FormControl>
                <FormLabel color="gray.700">ยืนยันรหัสผ่านใหม่</FormLabel>
                <Box position="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="ยืนยันรหัสผ่านใหม่"
                    pr="3rem"
                    borderRadius="xl"
                    border="1.5px solid"
                    borderColor="gray.200"
                    _focus={{
                      borderColor: "blue.400",
                      boxShadow: "0 0 0 1px #3182ce",
                    }}
                  />
                  <Button
                    position="absolute"
                    right="0.5rem"
                    top="50%"
                    transform="translateY(-50%)"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    color="gray.500"
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </Button>
                </Box>
              </FormControl>
            </VStack>

            <Button
              colorScheme="blue"
              size="lg"
              w="full"
              onClick={handleResetPassword}
              isLoading={loading}
              borderRadius="xl"
              fontWeight="bold"
              leftIcon={<FaLock />}
            >
              ตั้งรหัสผ่านใหม่
            </Button>

            <Text fontSize="sm" color="gray.500" textAlign="center">
              💡 รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร
            </Text>
          </VStack>
        </Box>
      </Container>
    </Center>
  );
} 