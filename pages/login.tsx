import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  Box,
  Button,
  Input,
  Heading,
  Text,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  Flex,
  Icon,
  useToast,
  VStack,
  Image,
} from "@chakra-ui/react";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

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
    <Flex minH="100vh" align="center" justify="center" bg="gray.50">
      <Flex w={["100vw", null, "900px"]} minH={["100vh", null, "600px"]} boxShadow="2xl" borderRadius="2xl" overflow="hidden" bg="white">
        {/* Left: Branding/Welcome */}
        <Box flex={1} bgGradient="linear(to-br, orange.400, orange.500)" color="white" display="flex" flexDirection="column" justifyContent="center" alignItems="center" p={[6, 8]}>
          <Box maxW="340px" w="full">
            <Heading fontSize={["2xl", "3xl"]} fontWeight="extrabold" mb={4} lineHeight={1.2}>
              Simplify management with <br /> our dashboard.
            </Heading>
            <Text fontSize="md" mb={8}>
              Simplify your property management with our user-friendly admin dashboard.
            </Text>
            {/* You can use an illustration or mascot here if you want */}
            <Flex justify="center" align="end" gap={4}>
              <Image src="/avatar.png" alt="Mascot" boxSize="80px" borderRadius="full" bg="whiteAlpha.800" />
              <Image src="/avatar.png" alt="Mascot2" boxSize="80px" borderRadius="full" bg="whiteAlpha.800" />
            </Flex>
          </Box>
        </Box>
        {/* Right: Login Form */}
        <Box flex={1} display="flex" flexDirection="column" justifyContent="center" alignItems="center" p={[6, 8]}>
          <Box w="full" maxW="340px">
            <Flex align="center" gap={2} mb={6} justify="center">
              <Box bg="orange.400" borderRadius="full" p={2} boxShadow="md">
                <Icon as={FaUser} w={7} h={7} color="white" />
              </Box>
              <Heading color="orange.500" fontWeight="extrabold" fontSize="2xl" letterSpacing={1}>
                TeeRao
              </Heading>
            </Flex>
            <Heading color="gray.800" fontSize="2xl" mb={2} fontWeight="bold" textAlign="left">Welcome Back</Heading>
            <Text color="gray.500" mb={6} fontSize="md">Please login to your account</Text>
            <InputGroup mb={4}>
              <InputLeftElement pointerEvents="none">
                <FaUser color="#aaa" />
              </InputLeftElement>
              <Input
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                bg="gray.100"
                color="gray.800"
                border="none"
                _placeholder={{ color: "gray.400" }}
                _focus={{ bg: "white" }}
                size="lg"
              />
            </InputGroup>
            <InputGroup mb={2}>
              <InputLeftElement pointerEvents="none">
                <FaLock color="#aaa" />
              </InputLeftElement>
              <Input
                placeholder="Password"
                type={show ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                bg="gray.100"
                color="gray.800"
                border="none"
                _placeholder={{ color: "gray.400" }}
                _focus={{ bg: "white" }}
                size="lg"
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
            {error && <Text color="red.400" fontSize="sm" mb={2}>{error}</Text>}
            <Button
              colorScheme="orange"
              bgGradient="linear(to-r, orange.400, orange.500)"
              color="white"
              fontWeight="bold"
              w="full"
              size="lg"
              boxShadow="md"
              _hover={{ bgGradient: "linear(to-r, orange.500, orange.400)", color: "white" }}
              onClick={handleLogin}
              isLoading={loading}
              mb={4}
            >
              Login
            </Button>
          </Box>
        </Box>
      </Flex>
    </Flex>
  );
} 