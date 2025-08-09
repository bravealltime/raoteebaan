
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import { Box, Text } from '@chakra-ui/react';

const COLORS = ['#4299E1', '#48BB78']; // Blue and Green from Chakra

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const RoomStatusChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <Box>No data available</Box>;
  }

  return (
    <Box width="100%" height={300}>
      <Text fontSize="2xl" mb={4} fontWeight="bold">สรุปสถานะห้องพัก</Text>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip wrapperStyle={{ fontSize: '16px' }} />
          <Legend wrapperStyle={{ fontSize: '16px' }} />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default RoomStatusChart;
