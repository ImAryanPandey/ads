import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button, Box, Typography, Grid, Card, CardContent } from '@mui/material';
import AnalyticsDashboard from './AnalyticsDashboard.jsx';
import ChatComponent from './ChatComponent.jsx';

function Dashboard() {
  const [role, setRole] = useState('');
  const [adSpaces, setAdSpaces] = useState([]);
  const [requests, setRequests] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setRole(decoded.role);

        if (decoded.role === 'owner') {
          const adResponse = await axios.get(`${import.meta.env.VITE_API_URL}/properties/my`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setAdSpaces(adResponse.data);

          const reqResponse = await axios.get(`${import.meta.env.VITE_API_URL}/requests/my`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setRequests(reqResponse.data);
        }
      } catch (error) {
        toast.error('Failed to load dashboard');
      }
    };
    fetchData();
  }, []);

  const handleRequestUpdate = async (id, status) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/requests/update/${id}`, { status }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setRequests(requests.map(req => req._id === id ? { ...req, status } : req));
      toast.success(`Request ${status}`);
    } catch (error) {
      toast.error('Failed to update request');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      {role === 'owner' ? (
        <>
          <Button variant="contained" onClick={() => navigate('/add-property')} sx={{ mb: 3 }}>
            Add New AdSpace
          </Button>
          <Typography variant="h6">My AdSpaces</Typography>
          <Grid container spacing={2}>
            {adSpaces.map(ad => (
              <Grid item xs={12} sm={6} md={4} key={ad._id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{ad.title}</Typography>
                    <Typography>Status: {ad.status}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Typography variant="h6" sx={{ mt: 3 }}>Requests</Typography>
          <Grid container spacing={2}>
            {requests.map(req => (
              <Grid item xs={12} key={req._id}>
                <Card>
                  <CardContent>
                    <Typography>Sender: {req.sender.name}</Typography>
                    <Typography>AdSpace: {req.adSpace.title}</Typography>
                    <Typography>Status: {req.status}</Typography>
                    {req.status === 'Pending' && (
                      <>
                        <Button onClick={() => handleRequestUpdate(req._id, 'Approved')}>Approve</Button>
                        <Button onClick={() => handleRequestUpdate(req._id, 'Rejected')}>Reject</Button>
                      </>
                    )}
                    <ChatComponent requestId={req._id} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <AnalyticsDashboard />
        </>
      ) : (
        <Button variant="contained" onClick={() => navigate('/browse-properties')}>
          Browse AdSpaces
        </Button>
      )}
    </Box>
  );
}

export default Dashboard;