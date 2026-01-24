
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Box, Text } from '@chakra-ui/react';

const PaymentStatusChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <Box>No data available</Box>;
  }

  return (
    <Box width="100%" height="100%">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" style={{ fontSize: '12px' }} />
          <YAxis style={{ fontSize: '12px' }} />
          <Tooltip wrapperStyle={{ fontSize: '12px' }} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="paid" fill="#48BB78" name="ชำระแล้ว">
            <LabelList dataKey="paid" position="top" style={{ fontSize: '12px' }} />
          </Bar>
          <Bar dataKey="unpaid" fill="#F56565" name="ค้างชำระ">
            <LabelList dataKey="unpaid" position="top" style={{ fontSize: '12px' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default PaymentStatusChart;
