
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Box, Text } from '@chakra-ui/react';

const PaymentStatusChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <Box>No data available</Box>;
  }

  return (
    <Box width="100%" height={300}>
      <Text fontSize="2xl" mb={4} fontWeight="bold">สรุปสถานะการชำระเงิน</Text>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" style={{ fontSize: '14px' }} />
          <YAxis style={{ fontSize: '14px' }} />
          <Tooltip wrapperStyle={{ fontSize: '16px' }} />
          <Legend wrapperStyle={{ fontSize: '16px' }} />
          <Bar dataKey="paid" fill="#48BB78" name="ชำระแล้ว">
            <LabelList dataKey="paid" position="top" style={{ fontSize: '14px' }} />
          </Bar>
          <Bar dataKey="unpaid" fill="#F56565" name="ค้างชำระ">
            <LabelList dataKey="unpaid" position="top" style={{ fontSize: '14px' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default PaymentStatusChart;
