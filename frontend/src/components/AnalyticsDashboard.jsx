import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Box, Typography } from '@mui/material';

function AnalyticsDashboard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/properties/analytics`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setData([
          { name: 'Total', value: response.data.total },
          { name: 'Available', value: response.data.available },
          { name: 'Requested', value: response.data.requested },
        ]);
      } catch (error) {
        toast.error('Failed to load analytics');
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6">Analytics</Typography>
      <BarChart width={500} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="value" fill="#8884d8" />
      </BarChart>
    </Box>
  );
}

export default AnalyticsDashboard;