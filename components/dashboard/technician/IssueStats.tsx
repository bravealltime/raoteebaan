import { Box, SimpleGrid, Card, CardHeader, CardBody, Text, Heading, Icon, Flex } from "@chakra-ui/react";
import { FaRegListAlt, FaExclamationCircle, FaSpinner, FaCheckCircle } from "react-icons/fa";

interface IssueStatsProps {
  stats: {
    pending: number;
    in_progress: number;
    resolved: number;
    overdue: number;
  };
}

const IssueStats = ({ stats }: IssueStatsProps) => {
  const statItems = [
    {
      icon: FaRegListAlt,
      label: "งานทั้งหมด",
      value: stats.pending + stats.in_progress + stats.resolved,
      color: "blue.500",
    },
    {
      icon: FaSpinner,
      label: "งานใหม่",
      value: stats.pending,
      color: "yellow.500",
    },
    {
      icon: FaCheckCircle,
      label: "งานที่เสร็จแล้ว",
      value: stats.resolved,
      color: "green.500",
    },
    {
      icon: FaExclamationCircle,
      label: "งานค้าง",
      value: stats.overdue,
      color: "red.500",
    },
  ];

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
        {statItems.map((item, index) => (
          <Card key={index} boxShadow="md" borderRadius="lg" bg="white">
            <CardHeader>
              <Flex alignItems="center">
                <Icon as={item.icon} w={8} h={8} color={item.color} />
                <Heading size="md" ml={4} color="gray.700">{item.label}</Heading>
              </Flex>
            </CardHeader>
            <CardBody>
              <Text fontSize="4xl" fontWeight="bold" color={item.color}>
                {item.value}
              </Text>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default IssueStats;
