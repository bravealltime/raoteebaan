import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  Box,
  Button,
  Input,
  Heading,
  VStack,
  Text,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  useToast,
  Flex,
  Icon,
} from "@chakra-ui/react";
import { FaUser, FaLock, FaBolt, FaEye, FaEyeSlash } from "react-icons/fa";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "เข้าสู่ระบบสำเร็จ", status: "success", duration: 1500, isClosable: true });
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bgGradient="linear(to-br, #232f3e, #2980b9)">
      <VStack spacing={6} bg="rgba(30,41,59,0.95)" p={[6, 10]} borderRadius="2xl" boxShadow="2xl" minW={["90vw", "400px"]}>
        <Flex direction="column" align="center" mb={2}>
          <Box bgGradient="linear(to-br, yellow.400, orange.400)" borderRadius="full" p={3} mb={2} boxShadow="md">
            <Icon as={FaBolt} w={8} h={8} color="white" />
          </Box>
          <Heading color="white" fontWeight="extrabold" fontSize="2xl" mb={1} letterSpacing={1}>
            Electricity Bill Calculator
          </Heading>
          <Text color="gray.300" fontSize="md" mb={2}>
            ระบบคำนวณค่าไฟฟ้า
          </Text>
        </Flex>
        <Heading color="white" fontSize="xl" mb={2} fontWeight="bold">เข้าสู่ระบบ</Heading>
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <FaUser color="#aaa" />
          </InputLeftElement>
          <Input
            placeholder="กรอกอีเมลของคุณ"
            value={email}
            onChange={e => setEmail(e.target.value)}
            bg="gray.800"
            color="white"
            border="none"
            _placeholder={{ color: "gray.400" }}
            _focus={{ bg: "gray.700" }}
          />
        </InputGroup>
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <FaLock color="#aaa" />
          </InputLeftElement>
          <Input
            placeholder="กรอกรหัสผ่าน"
            type={show ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            bg="gray.800"
            color="white"
            border="none"
            _placeholder={{ color: "gray.400" }}
            _focus={{ bg: "gray.700" }}
          />
          <InputRightElement>
            <IconButton
              aria-label="show password"
              icon={show ? <FaEyeSlash /> : <FaEye />}
              size="sm"
              variant="ghost"
              colorScheme="gray"
              onClick={() => setShow(!show)}
            />
          </InputRightElement>
        </InputGroup>
        {error && <Text color="red.300" fontSize="sm">{error}</Text>}
        <Button
          colorScheme="yellow"
          bgGradient="linear(to-r, yellow.400, orange.400)"
          color="gray.900"
          fontWeight="bold"
          w="full"
          size="lg"
          boxShadow="md"
          _hover={{ bgGradient: "linear(to-r, orange.400, yellow.400)", color: "gray.800" }}
          onClick={handleLogin}
          isLoading={loading}
        >
          เข้าสู่ระบบ
        </Button>
      </VStack>
    </Flex>
  );
} 