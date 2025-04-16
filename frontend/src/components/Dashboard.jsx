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
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AnalyticsDashboard from './AnalyticsDashboard.jsx';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Requests from './Requests'; // Import Requests component

const reliablePlaceholder = 'https://placehold.co/150x150';
const tinyGrayImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

function Dashboard() {
  const [adSpaces, setAdSpaces] = useState([]);
  const [currentImages, setCurrentImages] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adSpaceToDelete, setAdSpaceToDelete] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [role, setRole] = useState(''); // Role state
  const [currentUserId, setCurrentUserId] = useState(null); // User ID state
  const navigate = useNavigate();
  const intervalRefs = useRef({});
  const socketRef = useRef(null);

  useEffect(() => {
    // Log once when component mounts
    console.log('Dashboard mounted - Initial render');

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
        setCurrentUserId(userData.user?._id?.toString() || userData._id?.toString() || null);
      } catch (error) {
        console.error('Error loading user data:', error.message);
        toast.error('Failed to load user data. Please log in again.');
        setCurrentUserId(null);
        setRole('');
      } finally {
        setIsUserLoading(false);
      }

      try {
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
  }, [navigate, role]); // Dependency on navigate and role

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
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3, backgroundColor: 'var(--background)', color: 'var(--text)' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Dashboard
        </Typography>
        {isUserLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : role === 'owner' || role === 'advertiser' ? (
          <>
            {role === 'owner' && (
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
              </>
            )}

            {role === 'advertiser' && (
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
            )}

            <Typography variant="h6" sx={{ mt: 4, color: 'var(--text)' }}>
              Requests
            </Typography>
            <Requests mode="dashboard" /> {/* Use Requests component here */}

            {role === 'owner' && <AnalyticsDashboard />} {/* Conditionally render AnalyticsDashboard only for owner */}
          </>
        ) : (
          <Typography sx={{ color: 'var(--text-light)' }}>Loading role or unauthorized access...</Typography>
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
      </Box>
    </LocalizationProvider>
  );
}

export default Dashboard;