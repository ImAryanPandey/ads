import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Box, Typography, Tabs, Tab } from '@mui/material';

axios.defaults.withCredentials = true;

function AnalyticsDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [overviewData, setOverviewData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [footfallData, setFootfallData] = useState([]);
  const [bookingRateData, setBookingRateData] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/adSpaces/analytics`);
        const { overview, revenue, footfall, bookingRate } = response.data;

        setOverviewData([
          { name: 'Total', value: overview.total },
          { name: 'Available', value: overview.available },
          { name: 'Requested', value: overview.requested },
          { name: 'Booked', value: overview.booked }, 
        ]);
        setRevenueData(revenue);
        setFootfallData(footfall);
        setBookingRateData(bookingRate);
      } catch (error) {
        console.error('Error loading analytics:', error.response?.data || error.message);
        toast.error('Failed to load analytics');
      }
    };
    fetchAnalytics();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ff7300', '#ffbb28'];

  return (
    <Box sx={{ mt: 3, p: 3, backgroundColor: 'var(--container-light)', borderRadius: '12px', boxShadow: 'var(--shadow)' }}>
      <Typography variant="h6" sx={{ color: 'var(--text)', mb: 2 }}>
        Analytics
      </Typography>
      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="Revenue" />
        <Tab label="Footfall Trends" />
        <Tab label="Booking Rate" />
      </Tabs>

      {/* Overview Tab */}
      {tabValue === 0 && (
        <Box>
          <Typography variant="body1" sx={{ color: 'var(--text)', mb: 2 }}>
            Overview of AdSpaces
          </Typography>
          {overviewData.length > 0 ? (
            <BarChart width={500} height={300} data={overviewData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          ) : (
            <Typography sx={{ color: 'var(--text-light)' }}>No overview data available.</Typography>
          )}
        </Box>
      )}

      {/* Revenue Tab */}
      {tabValue === 1 && (
        <Box>
          <Typography variant="body1" sx={{ color: 'var(--text)', mb: 2 }}>
            Revenue Over Time
          </Typography>
          {revenueData.length > 0 ? (
            <LineChart width={500} height={300} data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
            </LineChart>
          ) : (
            <Typography sx={{ color: 'var(--text-light)' }}>No revenue data available.</Typography>
          )}
        </Box>
      )}

      {/* Footfall Trends Tab */}
      {tabValue === 2 && (
        <Box>
          <Typography variant="body1" sx={{ color: 'var(--text)', mb: 2 }}>
            Footfall Trends
          </Typography>
          {footfallData.length > 0 ? (
            <LineChart width={500} height={300} data={footfallData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgFootfall" stroke="#82ca9d" />
            </LineChart>
          ) : (
            <Typography sx={{ color: 'var(--text-light)' }}>No footfall data available.</Typography>
          )}
        </Box>
      )}

      {/* Booking Rate Tab */}
      {tabValue === 3 && (
        <Box>
          <Typography variant="body1" sx={{ color: 'var(--text)', mb: 2 }}>
            Booking Rate Distribution
          </Typography>
          {bookingRateData.length > 0 ? (
            <PieChart width={500} height={300}>
              <Pie
                data={bookingRateData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label
              >
                {bookingRateData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          ) : (
            <Typography sx={{ color: 'var(--text-light)' }}>No booking rate data available.</Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

export default AnalyticsDashboard;