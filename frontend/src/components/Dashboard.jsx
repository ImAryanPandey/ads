// frontend/src/components/Dashboard.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import {
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardHeader,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  Divider,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AnalyticsDashboard from './AnalyticsDashboard.jsx';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const reliablePlaceholder = 'https://placehold.co/150x150';
const tinyGrayImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

function Dashboard() {
  const [role, setRole] = useState('');
  const [adSpaces, setAdSpaces] = useState([]);
  const [requests, setRequests] = useState([]);
  const [currentImages, setCurrentImages] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adSpaceToDelete, setAdSpaceToDelete] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [showDateForm, setShowDateForm] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isApproving, setIsApproving] = useState(false);
  const [renderError, setRenderError] = useState(null);
  const navigate = useNavigate();
  const intervalRefs = useRef({});
  const socketRef = useRef(null);

  const fetchRequests = async () => {
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
      console.log('Fetched requests data:', requestsData);
      setRequests(requestsData || []);
    } catch (reqError) {
      console.error('Error fetching requests:', reqError);
      setRequests([]);
      toast.warn('Could not load requests, but dashboard is still available');
    }
  };

  useEffect(() => {
    socketRef.current = io('http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      console.log('Socket.IO connected successfully', 'Transport:', socketRef.current.io.engine.transport.name);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message);
      toast.error('Failed to connect to real-time updates');
      socketRef.current.disconnect();
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });

    const fetchData = async () => {
      try {
        const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!userResponse.ok) {
          const errorData = await userResponse.json();
          if (userResponse.status === 403 && errorData.redirect) {
            navigate(errorData.redirect);
            return;
          }
          throw new Error('Failed to fetch user');
        }
        const userData = await userResponse.json();
        console.log('User data from /auth/me:', userData);
        const userRole = userData.role;
        setRole(userRole);

        if (userRole === 'owner') {
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

          const initialImages = {};
          adSpacesWithImageUrls.forEach((adSpace) => {
            initialImages[adSpace._id] = 0;
          });
          setCurrentImages(initialImages);

          await fetchRequests();
        } else if (userRole === 'advertiser') {
          await fetchRequests();
        }
      } catch (error) {
        console.error('Error loading dashboard:', error.message);
        toast.error('Failed to load dashboard');
      }
    };
    fetchData();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [navigate]);

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

  const handleOpenDateForm = (requestId) => {
    setSelectedRequestId(requestId);
    setStartDate(new Date());
    setEndDate(new Date());
    setShowDateForm(true);
  };

  const handleApproveWithDates = async () => {
    if (!selectedRequestId) return;

    setIsApproving(true);
    try {
      console.log('Approving request with ID:', selectedRequestId);
      console.log('Current requests state before update:', requests);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/requests/update/${selectedRequestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'Approved',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve request');
      }
      const updatedRequest = await response.json();
      console.log('Updated request from backend:', updatedRequest);
      setRequests((prev) => prev.map((req) => (req._id === selectedRequestId ? updatedRequest : req)));
      toast.success('Request approved successfully');
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error.message || 'Failed to approve request');
    } finally {
      setShowDateForm(false);
      setSelectedRequestId(null);
      setStartDate(new Date());
      setEndDate(new Date());
      setIsApproving(false);
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/requests/update/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'Rejected' }),
      });
      if (!response.ok) throw new Error('Failed to update request');
      const updatedRequest = await response.json();
      setRequests((prev) => prev.map((req) => (req._id === id ? updatedRequest : req)));
      toast.success('Request rejected');
    } catch (error) {
      toast.error('Failed to update request');
    }
  };

  const handleOpenChat = async (requestId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/chat/conversation/request/${requestId}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }
      const data = await response.json();
      navigate(`/chat/${data.conversationId}`);
    } catch (error) {
      toast.error('Failed to open chat');
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

  if (renderError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">
          An error occurred while rendering the dashboard: {renderError.message}
        </Typography>
        <Button onClick={() => window.location.reload()} variant="contained" sx={{ mt: 2 }}>
          Reload Page
        </Button>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
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
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'scale(1.02)' },
                      }}
                    >
                      <CardMedia
                        component="img"
                        height="140"
                        image={
                          adSpace.images?.length > 0 && adSpace.images[currentImages[adSpace._id] || 0]?.url
                            ? adSpace.images[currentImages[adSpace._id] || 0].url
                            : reliablePlaceholder
                        }
                        alt={adSpace.title}
                        onError={(e) => {
                          const target = e.target;
                          if (target.src !== reliablePlaceholder && target.src !== tinyGrayImage) {
                            console.log(`Failed to load image for AdSpace ${adSpace._id}, trying reliable placeholder`);
                            target.src = reliablePlaceholder;
                          } else if (target.src === reliablePlaceholder) {
                            console.log(`Reliable placeholder failed, falling back to tiny gray image`);
                            target.src = tinyGrayImage;
                            target.onerror = null;
                          }
                        }}
                        onClick={() => navigate(`/adSpace/${adSpace._id}`)}
                        sx={{ cursor: 'pointer' }} // Reverted to original sx props
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
                          label={adSpace.status === 'Booked' ? 'Booked' : adSpace.status}
                          color={
                            adSpace.status === 'Available'
                              ? 'success'
                              : adSpace.status === 'Requested'
                              ? 'warning'
                              : adSpace.status === 'Booked'
                              ? 'info'
                              : 'default'
                          }
                          size="small"
                          sx={{ mt: 1 }}
                        />
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            onClick={() => navigate(`/edit-adSpace/${adSpace._id}`)}
                            sx={{ borderRadius: '8px' }}
                          >
                            Edit
                          </Button>
                        </Box>
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

            <Typography variant="h6" sx={{ mt: 4, color: 'var(--text)' }}>
              Requests
            </Typography>
            {requests.length > 0 ? (
              <Grid container spacing={2}>
                {requests.map((req) => {
                  try {
                    return (
                      <Grid item xs={12} key={req._id}>
                        <Card
                          sx={{
                            backgroundColor: 'var(--container-light)',
                            boxShadow: 'var(--shadow)',
                            borderRadius: '12px',
                            transition: 'transform 0.2s',
                            '&:hover': { transform: 'scale(1.02)' },
                          }}
                        >
                          <CardHeader
                            avatar={
                              <Avatar sx={{ bgcolor: 'var(--primary-color)' }}>
                                {req.sender?.name?.charAt(0) || '?'}
                              </Avatar>
                            }
                            title={
                              <Typography variant="h6" sx={{ color: 'var(--text)' }}>
                                {req.sender?.name || 'Unknown Sender'}
                              </Typography>
                            }
                            subheader={
                              <Typography variant="body2" sx={{ color: 'var(--text-light)' }}>
                                Business: {req.sender?.businessName || 'N/A'}
                              </Typography>
                            }
                          />
                          <CardContent>
                            <Divider sx={{ mb: 2 }} />
                            <Typography sx={{ color: 'var(--text)', mb: 1 }}>
                              AdSpace: {req.adSpace?.title || 'Unknown AdSpace'}
                            </Typography>
                            <Typography sx={{ color: 'var(--text)', mb: 1 }}>
                              Duration: {req.duration?.value || 'N/A'} {req.duration?.type || 'N/A'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Typography sx={{ color: 'var(--text)' }}>Status:</Typography>
                              <Chip
                                label={req.status === 'Approved' ? 'Booked' : req.status || 'Unknown'}
                                color={
                                  req.status === 'Approved'
                                    ? 'success'
                                    : req.status === 'Pending'
                                    ? 'warning'
                                    : 'error'
                                }
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            </Box>
                            {req.status === 'Pending' && (
                              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                <Button
                                  variant="contained"
                                  color="success"
                                  onClick={() => handleOpenDateForm(req._id)}
                                  disabled={isApproving}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="contained"
                                  color="error"
                                  onClick={() => handleRejectRequest(req._id)}
                                  disabled={isApproving}
                                >
                                  Reject
                                </Button>
                              </Box>
                            )}
                            <Box sx={{ mt: 2 }}>
                              <Button
                                variant="outlined"
                                onClick={() => handleOpenChat(req._id)}
                                sx={{ borderRadius: '8px' }}
                                disabled={isApproving}
                              >
                                Open Chat
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  } catch (error) {
                    console.error('Error rendering request:', req, error);
                    setRenderError(error);
                    return null;
                  }
                })}
              </Grid>
            ) : (
              <Typography sx={{ color: 'var(--text-light)' }}>
                No requests yet.
              </Typography>
            )}

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

            <Typography variant="h6" sx={{ mt: 2, color: 'var(--text)' }}>
              My Sent Requests
            </Typography>
            {requests.length > 0 ? (
              <Grid container spacing={2}>
                {requests.map((req) => {
                  try {
                    return (
                      <Grid item xs={12} key={req._id}>
                        <Card
                          sx={{
                            backgroundColor: 'var(--container-light)',
                            boxShadow: 'var(--shadow)',
                            borderRadius: '12px',
                            transition: 'transform 0.2s',
                            '&:hover': { transform: 'scale(1.02)' },
                          }}
                        >
                          <CardHeader
                            avatar={
                              <Avatar sx={{ bgcolor: 'var(--primary-color)' }}>
                                {req.owner?.name?.charAt(0) || '?'}
                              </Avatar>
                            }
                            title={
                              <Typography variant="h6" sx={{ color: 'var(--text)' }}>
                                AdSpace: {req.adSpace?.title || 'Unknown AdSpace'}
                              </Typography>
                            }
                            subheader={
                              <Typography variant="body2" sx={{ color: 'var(--text-light)' }}>
                                Owner: {req.owner?.name || 'Unknown Owner'} (Location:{' '}
                                {req.adSpace?.address || 'N/A'})
                              </Typography>
                            }
                          />
                          <CardContent>
                            <Divider sx={{ mb: 2 }} />
                            <Typography sx={{ color: 'var(--text)', mb: 1 }}>
                              Duration: {req.duration?.value || 'N/A'} {req.duration?.type || 'N/A'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Typography sx={{ color: 'var(--text)' }}>Status:</Typography>
                              <Chip
                                label={req.status === 'Approved' ? 'Booked' : req.status || 'Unknown'}
                                color={
                                  req.status === 'Approved'
                                    ? 'success'
                                    : req.status === 'Pending'
                                    ? 'warning'
                                    : 'error'
                                }
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            </Box>
                            <Box sx={{ mt: 2 }}>
                              <Button
                                variant="outlined"
                                onClick={() => handleOpenChat(req._id)}
                                sx={{ borderRadius: '8px' }}
                              >
                                Open Chat
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  } catch (error) {
                    console.error('Error rendering request:', req, error);
                    setRenderError(error);
                    return null;
                  }
                })}
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

        <Dialog open={showDateForm} onClose={() => setShowDateForm(false)}>
          <DialogTitle>Confirm Booking Dates</DialogTitle>
          <DialogContent>
            {isApproving ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Typography sx={{ mb: 2 }}>
                  Please enter the dates you agreed on with the requester via chat.
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                    minDate={new Date()}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        InputLabelProps: { style: { color: 'var(--text-light)' } },
                        sx: {
                          input: {
                            color: (theme) =>
                              theme.palette.mode === 'dark' ? 'var(--input-text-dark)' : 'var(--input-text-light)',
                          },
                          backgroundColor: 'var(--container-light)',
                          borderRadius: '8px',
                        },
                      },
                    }}
                  />
                </Box>
                <Box>
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                    minDate={startDate || new Date()}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        InputLabelProps: { style: { color: 'var(--text-light)' } },
                        sx: {
                          input: {
                            color: (theme) =>
                              theme.palette.mode === 'dark' ? 'var(--input-text-dark)' : 'var(--input-text-light)',
                          },
                          backgroundColor: 'var(--container-light)',
                          borderRadius: '8px',
                        },
                      },
                    }}
                  />
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDateForm(false)} color="primary" disabled={isApproving}>
              Cancel
            </Button>
            <Button
              onClick={handleApproveWithDates}
              color="success"
              variant="contained"
              disabled={isApproving}
            >
              Confirm Approval
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}

export default Dashboard;