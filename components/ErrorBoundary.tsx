import React from 'react';
import { Box, Text, Button, VStack, Icon } from '@chakra-ui/react';
import { FaExclamationTriangle } from 'react-icons/fa';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          minH="100vh"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bgGradient="linear(to-br, #e3f2fd, #bbdefb)"
          p={4}
        >
          <VStack spacing={6} textAlign="center">
            <Icon as={FaExclamationTriangle} w={16} h={16} color="red.500" />
            <Text fontSize="2xl" fontWeight="bold" color="gray.800">
              เกิดข้อผิดพลาด
            </Text>
            <Text color="gray.600" maxW="500px">
              ขออภัย เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองรีเฟรชหน้าหรือติดต่อผู้ดูแลระบบ
            </Text>
            <Button
              colorScheme="blue"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
            >
              รีเฟรชหน้า
            </Button>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 