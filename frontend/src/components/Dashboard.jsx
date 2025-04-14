import React, { useEffect, useState, useRef, useMemo } from 'react';
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
import ChatComponent from './ChatComponent.jsx';

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
  const [openChatDialog, setOpenChatDialog] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const navigate = useNavigate();
  const intervalRefs = useRef({});
  const socketRef = useRef(null);

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
      toast.error('Failed to connect to real-time updates. Continuing without real-time features.');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });

    const fetchData = async () => {
      setIsUserLoading(true);
      try {
        const userResponse = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!userResponse.ok) {
          const errorData = await userResponse.json();
          console.log('Error response from /auth/me:', errorData);
          if (userResponse.status === 403 && errorData.redirect) {
            navigate(errorData.redirect);
            return;
          }
          throw new Error('Failed to fetch user');
        }
        const userData = await userResponse.json();
        console.log('Full user data from /auth/me:', userData);
        setRole(userData.user?.role || userData.role || '');
        setCurrentUserId(userData.user?._id ? userData.user._id.toString() : userData._id ? userData._id.toString() : null);
      } catch (error) {
        console.error('Error loading user data:', error.message);
        toast.error('Failed to load user data. Please log in again.');
        setCurrentUserId(null);
      } finally {
        setIsUserLoading(false);
      }

      try {
        if (role === 'owner' || role === 'advertiser') {
          await fetchRequests();
          if (role === 'owner') {
            const adSpaceResponse = await fetch(`${import.meta.env.VITE_API_URL}/adSpaces/my`, {
              method: 'GET',
              credentials: 'include',
            });
            if (!adSpaceResponse.ok) throw new Error('Failed to fetch AdSpaces');
            const fetchedAdSpaces = await adSpaceResponse.json();
            console.log('AdSpaces response:', fetchedAdSpaces);
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
          }
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error.message);
        toast.error('Failed to load dashboard data');
      }
    };
    fetchData();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      Object.values(intervalRefs.current).forEach((interval) => clearInterval(interval));
    };
  }, [navigate, role]);

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
      console.log('Requests response:', requestsData);
      setRequests(requestsData || []);
    } catch (reqError) {
      console.error('Error fetching requests:', reqError);
      setRequests([]);
      toast.warn('Could not load requests, but dashboard is still available');
    }
  };

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

  const openChat = async (requestId, _, recipientId) => {
    console.log('Opening chat for requestId:', requestId, 'recipientId:', recipientId, 'currentUserId:', currentUserId);
    if (isUserLoading || !requestId || !recipientId || openChatDialog) {
      console.log('Chat open failed - missing data or already open:', { isUserLoading, currentUserId, requestId, recipientId, openChatDialog });
      toast.error('Chat already open or invalid data. Please wait or refresh.');
      return;
    }
    const userIdToUse = currentUserId || 'tempUserId';
    try {
      const baseUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/chat/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestId, recipientId, userId: userIdToUse }),
      });
      console.log('Chat open response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error data from /chat/open:', errorData);
        throw new Error(errorData.message || 'Failed to open chat');
      }
      const data = await response.json();
      console.log('Chat open response data:', data);
      if (data.conversationId) {
        setConversationId(data.conversationId);
        setOpenChatDialog(true);
        toast.success('Chat opened successfully!');
      } else {
        throw new Error('No conversationId returned');
      }
    } catch (error) {
      console.error('Error opening chat:', error);
      toast.error(`Failed to open chat: ${error.message}`);
    }
  };

  const handleCloseChatDialog = () => {
    setOpenChatDialog(false);
    setConversationId(null);
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

  const chatProps = useMemo(
    () => ({
      conversationId,
      userId: currentUserId || 'tempUserId',
      onClose: handleCloseChatDialog,
      title: requests.find((r) => r._id === selectedRequestId)?.adSpace?.title || 'Chat',
    }),
    [conversationId, currentUserId, selectedRequestId, requests]
  );

  // Render ChatComponent only when conversationId exists
  const renderChatComponent = () => {
    if (conversationId) {
      console.log('Rendering ChatComponent with conversationId:', conversationId, 'userId:', currentUserId || 'tempUserId');
      return (
        <ChatComponent
          key={conversationId}
          conversationId={conversationId}
          userId={currentUserId || 'tempUserId'}
          onClose={handleCloseChatDialog}
          title={requests.find((r) => r._id === selectedRequestId)?.adSpace?.title || 'Chat'}
        />
      );
    }
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '350px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading chat... Please wait or refresh.</Typography>
      </Box>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3, backgroundColor: 'var(--background)', color: 'var(--text)' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Dashboard
        </Typography>
        {isUserLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : role === 'owner' ? (
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
                    const recipientId = req.sender?._id || req.owner?._id;
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
                                {req.sender?.name?.charAt(0) || req.owner?.name?.charAt(0) || '?'}
                              </Avatar>
                            }
                            title={
                              <Typography variant="h6" sx={{ color: 'var(--text)' }}>
                                {req.sender?.name || req.owner?.name || 'Unknown Sender'}
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
                              <Typography variant="body2" sx={{ color: 'var(--text-light)', mb: 1 }}>
                                Chat with Requester: {req.sender?.name || req.owner?.name || 'Unknown Requester'}
                              </Typography>
                              <Button
                                variant="outlined"
                                onClick={() => openChat(req._id, null, recipientId)}
                                sx={{ borderRadius: '8px' }}
                                disabled={openChatDialog || isUserLoading}
                              >
                                {openChatDialog ? 'Chat Opened' : 'Open Chat'}
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
                    const recipientId = req.owner?._id;
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
                                Owner: {req.owner?.name || 'Unknown Owner'} (Location: {req.adSpace?.address || 'N/A'})
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
                              <Typography variant="body2" sx={{ color: 'var(--text-light)', mb: 1 }}>
                                Chat with Owner: {req.owner?.name || 'Unknown Owner'}
                              </Typography>
                              <Button
                                variant="outlined"
                                onClick={() => openChat(req._id, null, recipientId)}
                                sx={{ borderRadius: '8px' }}
                                disabled={openChatDialog || isUserLoading}
                              >
                                {openChatDialog ? 'Chat Opened' : 'Open Chat'}
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

        <Dialog open={openChatDialog} onClose={handleCloseChatDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            Chat with{' '}
            {requests.find((r) => r._id === selectedRequestId)?.sender?.name ||
              requests.find((r) => r._id === selectedRequestId)?.owner?.name ||
              'User'}
          </DialogTitle>
          <DialogContent>{renderChatComponent()}</DialogContent>
          <DialogActions>
            <Button onClick={handleCloseChatDialog} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>

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
    </LocalizationProvider>
  );
}

export default Dashboard;