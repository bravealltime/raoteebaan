import { Flex, Spinner, Text, VStack } from '@chakra-ui/react';

interface LoadingSpinnerProps {
  message?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

export default function LoadingSpinner({ message = "กำลังโหลด...", size = "xl" }: LoadingSpinnerProps) {
  return (
    <Flex minH="100vh" align="center" justify="center">
      <VStack spacing={4}>
        <Spinner size={size} color="blue.500" thickness="4px" />
        <Text color="gray.600" fontSize="lg">{message}</Text>
      </VStack>
    </Flex>
  );
} 