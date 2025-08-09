import { Box, Flex, HStack, Icon, Text } from "@chakra-ui/react";

const SummaryCard: React.FC<{ icon: React.ElementType; label: string; value: string | number; colorScheme?: string; suffix?: string; }> = ({ icon, label, value, colorScheme = "gray", suffix }) => (
    <Box p={6} bg="white" borderRadius="xl" boxShadow="md" transition="all 0.2s" _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}>
        <Flex align="center">
            <Flex
                justify="center"
                align="center"
                w={16}
                h={16}
                borderRadius="lg"
                bg={`${colorScheme}.100`}
            >
                <Icon as={icon} w={8} h={8} color={`${colorScheme}.600`} />
            </Flex>
            <Box ml={5}>
                <Text color="gray.600" fontSize="lg" fontWeight="medium" noOfLines={1}>
                    {label}
                </Text>
                <HStack>
                  <Text fontWeight="bold" fontSize="3xl" color="gray.800">
                      {value}
                  </Text>
                  {suffix && <Text fontSize="lg" color="gray.600" alignSelf="flex-end">{suffix}</Text>}
                </HStack>
            </Box>
        </Flex>
    </Box>
);

export default SummaryCard;