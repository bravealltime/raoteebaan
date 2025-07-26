import { Box, Heading, useTheme } from "@chakra-ui/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface IssueChartProps {
  data: {
    name: string;
    pending: number;
    in_progress: number;
    resolved: number;
  }[];
}

const IssueChart = ({ data }: IssueChartProps) => {
  const theme = useTheme();

  const chartData = [
    {
      name: 'สถานะงาน',
      'งานใหม่': data.reduce((acc, cur) => acc + cur.pending, 0),
      'กำลังดำเนินการ': data.reduce((acc, cur) => acc + cur.in_progress, 0),
      'งานที่เสร็จแล้ว': data.reduce((acc, cur) => acc + cur.resolved, 0),
    },
  ];

  return (
    <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
      <Heading size="md" mb={6} color="gray.700">สรุปงานแจ้งซ่อม</Heading>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="งานใหม่" fill={theme.colors.yellow[500]} />
          <Bar dataKey="กำลังดำเนินการ" fill={theme.colors.blue[500]} />
          <Bar dataKey="งานที่เสร็จแล้ว" fill={theme.colors.green[500]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default IssueChart;
