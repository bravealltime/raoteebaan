import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import Cookies from 'js-cookie';
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
  HStack,
} from "@chakra-ui/react";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      toast({
        title: "Missing fields",
        description: "Please enter both email and password.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      
      // Set token in cookie
      Cookies.set('token', idToken, { expires: 1, path: '/' });

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        toast({
          title: "Login Successful",
          description: `Welcome back, ${userData.name || 'User'}!`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        // Redirect based on role
        let redirectUrl = "/";
        switch (userData.role) {
          case "admin":
            redirectUrl = "/";
            break;
          case "owner":
            redirectUrl = "/";
            break;
          case "user":
            redirectUrl = "/tenant-dashboard";
            break;
          case "employee":
            redirectUrl = "/employee";
            break;
          default:
            redirectUrl = "/";
        }
        try {
          await router.push(redirectUrl);
        } catch (e) {
          window.location.href = redirectUrl;
        }
      } else {
        setError("User data not found.");
        toast({
          title: "Login Error",
          description: "Could not find user data.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error: any) {
      let errorMessage = "An unknown error occurred.";
      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "No user found with this email.";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password. Please try again.";
          break;
        case "auth/invalid-email":
          errorMessage = "The email address is not valid.";
          break;
        default:
          errorMessage = error.message;
          break;
      }
      setError(errorMessage);
      toast({
        title: "Authentication Failed",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50">
      <Flex w={{ base: "100%", md: "90%", lg: "80%" }} maxW="1200px" minH={{ base: "100vh", md: "auto" }} boxShadow={{ md: "2xl" }} borderRadius={{ md: "2xl" }} overflow="hidden" bg="white" direction={{ base: "column", md: "row" }}>
        {/* Left: Branding/Welcome */}
        <VStack flex={1} bgGradient="linear(to-br, orange.400, orange.500)" color="white" display={{ base: "none", md: "flex" }} justifyContent="center" alignItems="center" p={8} spacing={8}>
          <div style={{ maxWidth: "340px", width: "100%" }}>
            <Heading fontSize={["2xl", "3xl"]} fontWeight="extrabold" mb={4} lineHeight={1.2}>
              Simplify management with <br /> our dashboard.
            </Heading>
            <Text fontSize="md">
              Simplify your property management with our user-friendly admin dashboard.
            </Text>
          </div>
          <HStack justify="center" align="end" gap={4}>
            <Image src="/avatar.png" alt="Mascot" boxSize="80px" borderRadius="full" bg="whiteAlpha.800" />
            <Image src="/avatar.png" alt="Mascot2" boxSize="80px" borderRadius="full" bg="whiteAlpha.800" />
          </HStack>
        </VStack>
        {/* Right: Login Form */}
        <Flex flex={1} direction="column" justifyContent="center" alignItems="center" p={{ base: 6, md: 8 }}>
          <VStack w="full" maxW="340px" spacing={4}>
            <HStack gap={2} mb={2} justify="center">
              <Box bg="orange.400" borderRadius="full" p={2} boxShadow="md">
                <Icon as={FaUser} w={7} h={7} color="white" />
              </Box>
              <Heading color="orange.500" fontWeight="extrabold" fontSize="2xl" letterSpacing={1}>
                TeeRao
              </Heading>
            </HStack>
            <VStack align="flex-start" w="full" spacing={1}>
              <Heading color="gray.800" fontSize="2xl" fontWeight="bold">Welcome Back</Heading>
              <Text color="gray.500" fontSize="md">Please login to your account</Text>
            </VStack>
            <InputGroup size="lg">
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
              />
            </InputGroup>
            <InputGroup size="lg">
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
            {error && <Text color="red.400" fontSize="sm">{error}</Text>}
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
            >
              Login
            </Button>
          </VStack>
        </Flex>
      </Flex>
    </Flex>
  );
} 