import { Box, Heading, useTheme, Text } from "@chakra-ui/react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
    { name: 'เรื่องใหม่', value: data.new, color: theme.colors.blue[500] },
    { name: 'กำลังดำเนินการ', value: data.in_progress, color: theme.colors.orange[500] },
    { name: 'แก้ไขแล้ว', value: data.resolved, color: theme.colors.green[500] },
  ];

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Box bg="white" p={6} borderRadius="lg" boxShadow="md">
      <Heading size="lg" mb={6} color="gray.700">สรุปเรื่องร้องเรียน</Heading>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip wrapperStyle={{ fontSize: '16px' }} />
          <Legend wrapperStyle={{ fontSize: '16px' }} />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ComplaintChart;
