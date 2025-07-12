
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Text } from '@chakra-ui/react';

const PaymentStatusChart = ({ data }) => {
  return (
    <Box width="100%" height={300}>
      <Text fontSize="xl" mb={4}>สรุปสถานะการชำระเงิน</Text>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="paid" fill="#82ca9d" name="ชำระแล้ว" />
          <Bar dataKey="unpaid" fill="#8884d8" name="ค้างชำระ" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default PaymentStatusChart;
