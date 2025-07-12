
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Text } from '@chakra-ui/react';

const COLORS = ['#0088FE', '#00C49F'];

const RoomStatusChart = ({ data }) => {
  return (
    <Box width="100%" height={300}>
      <Text fontSize="xl" mb={4}>สรุปสถานะห้องพัก</Text>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default RoomStatusChart;
