import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button, Box, Typography, Grid, Card, CardContent, CardMedia, Chip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AnalyticsDashboard from './AnalyticsDashboard.jsx';
import ChatComponent from './ChatComponent.jsx';

axios.defaults.withCredentials = true;

function Dashboard() {
  const [role, setRole] = useState('');
  const [adSpaces, setAdSpaces] = useState([]);
  const [requests, setRequests] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await axios.get(`${import.meta.env.VITE_API_URL}/auth/me`);
        const userRole = userResponse.data.role;
        setRole(userRole);

        if (userRole === 'owner') {
          const adSpaceResponse = await axios.get(`${import.meta.env.VITE_API_URL}/adSpaces/my`);
          setAdSpaces(adSpaceResponse.data);

          const reqResponse = await axios.get(`${import.meta.env.VITE_API_URL}/requests/my`);
          setRequests(reqResponse.data);
        }
      } catch (error) {
        console.error('Error loading dashboard:', error.response?.data || error.message);
        toast.error('Failed to load dashboard');
      }
    };
    fetchData();
  }, []);

  const handleRequestUpdate = async (id, status) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/requests/update/${id}`, { status });
      setRequests(requests.map(req => (req._id === id ? { ...req, status } : req)));
      toast.success(`Request ${status}`);
    } catch (error) {
      toast.error('Failed to update request');
    }
  };

  const handleDeleteAdSpace = async (id) => {
    if (!window.confirm('Are you sure you want to delete this AdSpace?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/adSpaces/${id}`, { withCredentials: true });
      setAdSpaces(adSpaces.filter(adSpace => adSpace._id !== id));
      toast.success('AdSpace deleted successfully');
    } catch (error) {
      toast.error('Failed to delete AdSpace');
    }
  };

  return (
    <Box sx={{ p: 3, backgroundColor: 'var(--background)', color: 'var(--text)' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Dashboard
      </Typography>
      {role === 'owner' ? (
        <>
          <Button
            variant="contained"
            onClick={() => navigate('/add-adSpace')}
            sx={{
              mb: 3,
              backgroundColor: 'var(--primary-color)',
              '&:hover': { backgroundColor: 'var(--primary-dark)' },
              borderRadius: '8px',
            }}
          >
            Add New AdSpace
          </Button>

          {/* My AdSpaces Section */}
          <Typography variant="h6" sx={{ mt: 2, color: 'var(--text)' }}>
            My AdSpaces
          </Typography>
          {adSpaces.length > 0 ? (
            <Grid container spacing={2}>
              {adSpaces.map(adSpace => (
                <Grid item xs={12} sm={6} md={4} key={adSpace._id}>
                  <Card
                    sx={{
                      backgroundColor: 'var(--container-light)',
                      boxShadow: 'var(--shadow)',
                      borderRadius: '12px',
                      position: 'relative',
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="140"
                      image={adSpace.images?.[0]?.imageId ? `${import.meta.env.VITE_API_URL}/images/${adSpace.images[0].imageId}` : 'https://via.placeholder.com/150'}
                      alt={adSpace.title}
                      onClick={() => navigate(`/adSpace/${adSpace._id}`)}
                      sx={{ cursor: 'pointer' }}
                    />
                    <CardContent>
                      <Typography variant="h6" sx={{ color: 'var(--text)' }}>
                        {adSpace.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'var(--text-light)' }}>
                        {adSpace.address}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'var(--text-light)' }}>
                        Footfall: {adSpace.footfall} ({adSpace.footfallType})
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'var(--text-light)' }}>
                        Price: ₹{adSpace.pricing.baseMonthlyRate}/month
                      </Typography>
                      <Chip
                        label={adSpace.status}
                        color={adSpace.status === 'Available' ? 'success' : adSpace.status === 'Requested' ? 'warning' : 'info'}
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                    <IconButton
                      onClick={() => handleDeleteAdSpace(adSpace._id)}
                      sx={{ position: 'absolute', top: 8, right: 8, color: 'var(--secondary-color)' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography sx={{ color: 'var(--text-light)' }}>
              No AdSpaces added yet. Click "Add New AdSpace" to start.
            </Typography>
          )}

          {/* Requests Section */}
          <Typography variant="h6" sx={{ mt: 4, color: 'var(--text)' }}>
            Requests
          </Typography>
          {requests.length > 0 ? (
            <Grid container spacing={2}>
              {requests.map(req => (
                <Grid item xs={12} key={req._id}>
                  <Card
                    sx={{
                      backgroundColor: 'var(--container-light)',
                      boxShadow: 'var(--shadow)',
                      borderRadius: '12px',
                    }}
                  >
                    <CardContent>
                      <Typography sx={{ color: 'var(--text)' }}>
                        Sender: {req.sender.name}
                      </Typography>
                      <Typography sx={{ color: 'var(--text)' }}>
                        AdSpace: {req.adSpace.title}
                      </Typography>
                      <Typography sx={{ color: 'var(--text)' }}>
                        Status: {req.status}
                      </Typography>
                      {req.status === 'Pending' && (
                        <Box sx={{ mt: 2 }}>
                          <Button
                            variant="contained"
                            color="success"
                            onClick={() => handleRequestUpdate(req._id, 'Approved')}
                            sx={{ mr: 1 }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            onClick={() => handleRequestUpdate(req._id, 'Rejected')}
                          >
                            Reject
                          </Button>
                        </Box>
                      )}
                      <ChatComponent requestId={req._id} />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography sx={{ color: 'var(--text-light)' }}>
              No requests yet.
            </Typography>
          )}

          {/* Analytics Section */}
          <AnalyticsDashboard />
        </>
      ) : (
        <Button
          variant="contained"
          onClick={() => navigate('/browse-adSpaces')}
          sx={{
            backgroundColor: 'var(--primary-color)',
            '&:hover': { backgroundColor: 'var(--primary-dark)' },
          }}
        >
          Browse AdSpaces
        </Button>
      )}
    </Box>
  );
}

export default Dashboard;