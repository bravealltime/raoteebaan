import { Box, Flex, HStack, Icon, Text } from "@chakra-ui/react";

const SummaryCard: React.FC<{ icon: React.ElementType; label: string; value: string | number; colorScheme?: string; suffix?: string; }> = ({ icon, label, value, colorScheme = "gray", suffix }) => (
    <Box p={3} bg="white" borderRadius="lg" boxShadow="sm" transition="all 0.2s" _hover={{ transform: "translateY(-2px)", boxShadow: "md" }} minW="140px">
        <Flex align="center">
            <Flex
                justify="center"
                align="center"
                w={10}
                h={10}
                borderRadius="md"
                bg={`${colorScheme}.100`}
                flexShrink={0}
            >
                <Icon as={icon} w={5} h={5} color={`${colorScheme}.600`} />
            </Flex>
            <Box ml={3} overflow="hidden">
                <Text color="gray.600" fontSize="xs" fontWeight="medium" isTruncated>
                    {label}
                </Text>
                <HStack spacing={1} align="baseline">
                    <Text fontWeight="bold" fontSize="lg" color="gray.800" lineHeight="1">
                        {value}
                    </Text>
                    {suffix && <Text fontSize="xs" color="gray.500">{suffix}</Text>}
                </HStack>
            </Box>
        </Flex>
    </Box>
);

export default SummaryCard;