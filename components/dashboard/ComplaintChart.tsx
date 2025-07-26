import { Box, Heading, useTheme } from "@chakra-ui/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ComplaintChartProps {
  data: {
    new: number;
    in_progress: number;
    resolved: number;
  };
}

const ComplaintChart = ({ data }: ComplaintChartProps) => {
  const theme = useTheme();

  const chartData = [
    {
      name: 'สถานะเรื่องร้องเรียน',
      'เรื่องใหม่': data.new,
      'กำลังดำเนินการ': data.in_progress,
      'แก้ไขแล้ว': data.resolved,
    },
  ];

  return (
    <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
      <Heading size="md" mb={6} color="gray.700">สรุปเรื่องร้องเรียน</Heading>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="เรื่องใหม่" fill={theme.colors.blue[500]} />
          <Bar dataKey="กำลังดำเนินการ" fill={theme.colors.orange[500]} />
          <Bar dataKey="แก้ไขแล้ว" fill={theme.colors.green[500]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ComplaintChart;
