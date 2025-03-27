// frontend/src/components/Dashboard.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AnalyticsDashboard from './AnalyticsDashboard.jsx';
import ChatComponent from './ChatComponent.jsx';

function Dashboard() {
  const [role, setRole] = useState('');
  const [adSpaces, setAdSpaces] = useState([]);
  const [requests, setRequests] = useState([]);
  const [currentImages, setCurrentImages] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adSpaceToDelete, setAdSpaceToDelete] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const navigate = useNavigate();
  const intervalRefs = useRef({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user role
        const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!userResponse.ok) throw new Error('Failed to fetch user');
        const userData = await userResponse.json();
        console.log('User data from /auth/me:', userData);
        const userRole = userData.role;
        setRole(userRole);

        if (userRole === 'owner') {
          // Fetch ad spaces
          const adSpaceResponse = await fetch(`${import.meta.env.VITE_API_URL}/adSpaces/my`, {
            method: 'GET',
            credentials: 'include',
          });
          if (!adSpaceResponse.ok) throw new Error('Failed to fetch AdSpaces');
          const fetchedAdSpaces = await adSpaceResponse.json();
          console.log('Number of ad spaces:', fetchedAdSpaces.length);
          fetchedAdSpaces.forEach((adSpace) => {
            console.log(`Ad space ${adSpace._id} has ${adSpace.images.length} images`);
          });

          // Fetch images for each ad space
          const adSpacesWithImageUrls = await Promise.all(
            fetchedAdSpaces.map(async (adSpace) => {
              const imagesWithUrls = await Promise.all(
                adSpace.images.map(async (image) => {
                  try {
                    console.log(`Fetching image with ID: ${image.imageId}`);
                    const imageResponse = await fetch(
                      `${import.meta.env.VITE_API_URL}/images/${image.imageId}`,
                      { method: 'GET', credentials: 'include' }
                    );
                    if (!imageResponse.ok) throw new Error('Failed to fetch image');
                    const blob = await imageResponse.blob();
                    const imageUrl = URL.createObjectURL(blob);
                    return { ...image, url: imageUrl };
                  } catch (imgError) {
                    console.error(`Error fetching image ${image.imageId}:`, imgError);
                    return { ...image, url: null };
                  }
                })
              );
              return { ...adSpace, images: imagesWithUrls };
            })
          );
          setAdSpaces(adSpacesWithImageUrls);

          // Initialize current image index for each AdSpace
          const initialImages = {};
          adSpacesWithImageUrls.forEach((adSpace) => {
            initialImages[adSpace._id] = 0;
          });
          setCurrentImages(initialImages);

          // Fetch requests with error handling
          try {
            const reqResponse = await fetch(`${import.meta.env.VITE_API_URL}/requests/my`, {
              method: 'GET',
              credentials: 'include',
            });
            if (!reqResponse.ok) {
              console.error('Requests fetch failed with status:', reqResponse.status);
              throw new Error('Failed to fetch requests');
            }
            const requestsData = await reqResponse.json();
            console.log('Requests data for owner:', requestsData);
            setRequests(requestsData || []);
          } catch (reqError) {
            console.error('Error fetching owner requests:', reqError);
            setRequests([]);
            toast.warn('Could not load requests, but dashboard is still available');
          }
        } else if (userRole === 'advertiser') {
          // Fetch sent requests with error handling
          try {
            const reqResponse = await fetch(`${import.meta.env.VITE_API_URL}/requests/my`, {
              method: 'GET',
              credentials: 'include',
            });
            if (!reqResponse.ok) {
              console.error('Requests fetch failed with status:', reqResponse.status);
              throw new Error('Failed to fetch requests');
            }
            const requestsData = await reqResponse.json();
            console.log('Requests data for advertiser:', requestsData);
            setRequests(requestsData || []);
          } catch (reqError) {
            console.error('Error fetching advertiser requests:', reqError);
            setRequests([]);
            toast.warn('Could not load requests, but dashboard is still available');
          }
        }
      } catch (error) {
        console.error('Error loading dashboard:', error.message);
        toast.error('Failed to load dashboard');
      }
    };
    fetchData();
  }, []);

  // Set up image rotation for each AdSpace (for Owners)
  useEffect(() => {
    adSpaces.forEach((adSpace) => {
      if (adSpace.images && adSpace.images.length > 1) {
        intervalRefs.current[adSpace._id] = setInterval(() => {
          setCurrentImages((prev) => ({
            ...prev,
            [adSpace._id]: (prev[adSpace._id] + 1) % adSpace.images.length,
          }));
        }, 5000);
      }
    });

    return () => {
      Object.values(intervalRefs.current).forEach((interval) => clearInterval(interval));
    };
  }, [adSpaces]);

  const handleRequestUpdate = async (id, status) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/requests/update/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update request');
      setRequests(requests.map((req) => (req._id === id ? { ...req, status } : req)));
      toast.success(`Request ${status}`);
    } catch (error) {
      toast.error('Failed to update request');
    }
  };

  const openDeleteDialog = (adSpace) => {
    setAdSpaceToDelete(adSpace);
    setDeleteDialogOpen(true);
    setDeleteConfirmationText('');
  };

  const handleDeleteAdSpace = async () => {
    if (!adSpaceToDelete) return;

    if (deleteConfirmationText !== adSpaceToDelete.title) {
      toast.error('Please type the correct AdSpace title to confirm deletion');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/adSpaces/${adSpaceToDelete._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete AdSpace');
      setAdSpaces(adSpaces.filter((adSpace) => adSpace._id !== adSpaceToDelete._id));
      toast.success('AdSpace deleted successfully');
      setDeleteDialogOpen(false);
      setAdSpaceToDelete(null);
      setDeleteConfirmationText('');
    } catch (error) {
      toast.error('Failed to delete AdSpace');
    }
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setAdSpaceToDelete(null);
    setDeleteConfirmationText('');
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
              {adSpaces.map((adSpace) => (
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
                      image={
                        adSpace.images?.length > 0 && adSpace.images[currentImages[adSpace._id] || 0]?.url
                          ? adSpace.images[currentImages[adSpace._id] || 0].url
                          : 'https://via.placeholder.com/150'
                      }
                      alt={adSpace.title}
                      onError={(e) => {
                        console.log(`Failed to load image for AdSpace ${adSpace._id}`);
                        e.target.src = 'https://via.placeholder.com/150';
                        e.target.onerror = null;
                      }}
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
                        color={
                          adSpace.status === 'Available'
                            ? 'success'
                            : adSpace.status === 'Requested'
                            ? 'warning'
                            : 'info'
                        }
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                    <IconButton
                      onClick={() => openDeleteDialog(adSpace)}
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
              {requests.map((req) => (
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
                      <ChatComponent requestId={req._id} adSpaceId={req.adSpace._id} />
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
      ) : role === 'advertiser' ? (
        <>
          <Button
            variant="contained"
            onClick={() => navigate('/browse-adSpaces')}
            sx={{
              mb: 3,
              backgroundColor: 'var(--primary-color)',
              '&:hover': { backgroundColor: 'var(--primary-dark)' },
              borderRadius: '8px',
            }}
          >
            Browse AdSpaces
          </Button>

          {/* Sent Requests Section */}
          <Typography variant="h6" sx={{ mt: 2, color: 'var(--text)' }}>
            My Sent Requests
          </Typography>
          {requests.length > 0 ? (
            <Grid container spacing={2}>
              {requests.map((req) => (
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
                        AdSpace: {req.adSpace.title}
                      </Typography>
                      <Typography sx={{ color: 'var(--text)' }}>
                        Owner: {req.owner.name}
                      </Typography>
                      <Typography sx={{ color: 'var(--text)' }}>
                        Status: {req.status}
                      </Typography>
                      <ChatComponent requestId={req._id} adSpaceId={req.adSpace._id} />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography sx={{ color: 'var(--text-light)' }}>
              No requests sent yet. Browse AdSpaces to get started.
            </Typography>
          )}
        </>
      ) : (
        <Typography>Loading...</Typography>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm AdSpace Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Deleting an AdSpace is permanent. To confirm, please type the title of the AdSpace:{' '}
            <strong>{adSpaceToDelete?.title}</strong>
          </Typography>
          <TextField
            fullWidth
            margin="normal"
            label="AdSpace Title"
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            sx={{ backgroundColor: 'var(--container-light)', borderRadius: '8px' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteAdSpace} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Dashboard;