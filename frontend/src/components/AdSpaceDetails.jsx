import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Grid,
  CardMedia,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatComponent from './ChatComponent';

function AdSpaceDetails() {
  const { id } = useParams();
  const [adSpace, setAdSpace] = useState(null);
  const [openImageModal, setOpenImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [request, setRequest] = useState(null);
  const [user, setUser] = useState(null);
  const [openChatDialog, setOpenChatDialog] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    defaultValues: { durationType: 'months', durationValue: '', requirements: '' },
    mode: 'onSubmit',
  });
  const [durationType] = useState('months');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch user');
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Failed to load user');
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAdSpace = async () => {
      if (!isMounted) return;
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/adSpaces/${id}`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch AdSpace');
        const adSpaceData = await response.json();
        if (isMounted) {
          const imagesWithUrls = await Promise.all(
            adSpaceData.images.map(async (image) => {
              try {
                const imageResponse = await fetch(`${import.meta.env.VITE_API_URL}/images/${image.imageId}`, {
                  method: 'GET',
                  credentials: 'include',
                });
                if (!imageResponse.ok) throw new Error('Failed to fetch image');
                const blob = await imageResponse.blob();
                return { ...image, url: URL.createObjectURL(blob) };
              } catch (imgError) {
                console.error(`Error fetching image ${image.imageId}:`, imgError);
                return { ...image, url: null };
              }
            })
          );
          setAdSpace({ ...adSpaceData, images: imagesWithUrls });
        }
      } catch (error) {
        console.error('Error fetching ad space:', error);
        if (isMounted) toast.error('Failed to load AdSpace');
      }
    };

    const fetchRequest = async () => {
      if (!user || !isMounted) return;
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/requests/my`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch requests');
        const data = await response.json();
        if (isMounted) {
          const existingRequest = data.find((req) => req.adSpace._id === id);
          setRequest(existingRequest || null);
        }
      } catch (error) {
        console.error('Error fetching requests:', error);
      }
    };

    fetchAdSpace();
    if (user) fetchRequest();

    return () => { isMounted = false; };
  }, [id, user]);

  const onSubmit = async (data) => {
    const durationValue = parseInt(data.durationValue, 10);
    if (!data.durationType || isNaN(durationValue) || durationValue <= 0) {
      toast.error('Please select a duration type and enter a valid positive duration value');
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/requests/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          adSpaceId: id,
          duration: { type: data.durationType, value: durationValue },
          requirements: data.requirements || '',
        }),
      });
      if (!response.ok) throw new Error('Failed to send request');
      const newRequest = await response.json();
      setRequest(newRequest);
      toast.success('Request sent successfully!');
      reset();
    } catch (error) {
      console.error('Error sending request:', error);
      toast.error('Failed to send request');
    }
  };

  const openChat = async () => {
    if (!request || !adSpace || !user) {
      toast.error('Cannot open chat yet');
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/chat/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ adSpaceId: id, recipientId: adSpace.owner }),
      });
      if (!response.ok) throw new Error('Failed to open chat');
      const data = await response.json();
      setConversationId(data.conversationId);
      setOpenChatDialog(true);
      toast.success('Chat opened successfully!');
    } catch (error) {
      console.error('Error opening chat:', error);
      toast.error('Failed to open chat');
    }
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
    setOpenImageModal(true);
  };

  const handleCloseImageModal = () => {
    setOpenImageModal(false);
    setSelectedImage(null);
  };

  const handleCloseChatDialog = () => {
    setOpenChatDialog(false);
    setConversationId(null);
  };

  if (!adSpace) return <Typography sx={{ p: 3, color: 'var(--text)' }}>Loading...</Typography>;

  return (
    <Box sx={{ p: 3, backgroundColor: 'var(--background)', color: 'var(--text)' }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <CardMedia
              component="img"
              height="300"
              image={adSpace.images?.[0]?.url || 'https://via.placeholder.com/300'}
              alt={adSpace.title}
              onError={(e) => { e.target.src = 'https://via.placeholder.com/300'; e.target.onerror = null; }}
              onClick={() => handleImageClick(adSpace.images[0])}
              sx={{ borderRadius: '12px', boxShadow: 'var(--shadow)', cursor: 'pointer', width: '100%', objectFit: 'cover' }}
            />
            {adSpace.images?.length > 1 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {adSpace.images.slice(1).map((image, index) => (
                  <CardMedia
                    key={index}
                    component="img"
                    height="60"
                    image={image.url || 'https://via.placeholder.com/60'}
                    alt={image.caption || `AdSpace Image ${index + 2}`}
                    onClick={() => handleImageClick(image)}
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/60'; e.target.onerror = null; }}
                    sx={{ borderRadius: '8px', cursor: 'pointer', width: '60px', objectFit: 'cover' }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h4" sx={{ color: 'var(--primary-color)', fontWeight: 600 }}>{adSpace.title}</Typography>
          <Typography variant="body1" sx={{ color: 'var(--text-light)', mt: 1 }}>{adSpace.description}</Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>Address: {adSpace.address}</Typography>
          <Typography variant="body2">Footfall: {adSpace.footfall} ({adSpace.footfallType})</Typography>
          <Typography variant="body2">Pricing: Monthly: ₹{adSpace.pricing.baseMonthlyRate}</Typography>
          <Typography variant="body2">Availability: {adSpace.availability.startDate ? `${new Date(adSpace.availability.startDate).toLocaleDateString()} - ${new Date(adSpace.availability.endDate).toLocaleDateString()}` : 'N/A'}</Typography>
          <Typography variant="body2">Terms: {adSpace.terms || 'None'}</Typography>
        </Grid>
      </Grid>
      {user?.role === 'advertiser' && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ color: 'var(--text)' }}>Send Request</Typography>
          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              select
              label="Duration Type"
              fullWidth
              margin="normal"
              value={durationType}
              {...register('durationType', { required: 'Duration type is required' })}
              error={!!errors.durationType}
              helperText={errors.durationType?.message}
              sx={{ backgroundColor: 'var(--container-light)', borderRadius: '8px' }}
            >
              <MenuItem value="days">Days</MenuItem>
              <MenuItem value="weeks">Weeks</MenuItem>
              <MenuItem value="months">Months</MenuItem>
            </TextField>
            <TextField
              label="Duration Value"
              type="number"
              fullWidth
              margin="normal"
              {...register('durationValue', {
                required: 'Duration value is required',
                min: { value: 1, message: 'Duration must be at least 1' },
                validate: (value) => !isNaN(parseInt(value, 10)) || 'Please enter a valid number',
              })}
              error={!!errors.durationValue}
              helperText={errors.durationValue?.message}
              sx={{ backgroundColor: 'var(--container-light)', borderRadius: '8px' }}
            />
            <TextField
              label="Requirements"
              fullWidth
              margin="normal"
              multiline
              rows={2}
              {...register('requirements')}
              sx={{ backgroundColor: 'var(--container-light)', borderRadius: '8px' }}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{ mt: 2, backgroundColor: 'var(--primary-color)', '&:hover': { backgroundColor: 'var(--primary-dark)' } }}
              disabled={!!request}
            >
              {request ? 'REQUEST SENT' : 'Send Request'}
            </Button>
            {request && adSpace && adSpace.owner && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ color: 'var(--text-light)', mb: 1 }}>
                  Chat with Owner: {adSpace.owner.name || 'Unknown Owner'}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={openChat}
                  sx={{ borderRadius: '8px' }}
                  disabled={!!conversationId}
                >
                  {conversationId ? 'Chat Opened' : 'Open Chat'}
                </Button>
              </Box>
            )}
          </form>
        </Box>
      )}
      <Dialog open={openChatDialog} onClose={handleCloseChatDialog} maxWidth="md" fullWidth>
        <DialogTitle>Chat with {adSpace?.owner?.name || 'Owner'}</DialogTitle>
        <DialogContent>
          {conversationId && <ChatComponent conversationId={conversationId} userId={user?.id} />}
        </DialogContent>
        <IconButton
          onClick={handleCloseChatDialog}
          sx={{ position: 'absolute', top: 8, right: 8, color: 'var(--text)' }}
        >
          <CloseIcon />
        </IconButton>
      </Dialog>
      <Dialog open={openImageModal} onClose={handleCloseImageModal} maxWidth="lg">
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton onClick={handleCloseImageModal} sx={{ position: 'absolute', top: 8, right: 8, color: 'white' }}>
            <CloseIcon />
          </IconButton>
          {selectedImage && (
            <img
              src={selectedImage.url || 'https://via.placeholder.com/300'}
              alt={selectedImage.caption || 'AdSpace Image'}
              onError={(e) => { e.target.src = 'https://via.placeholder.com/300'; e.target.onerror = null; }}
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default AdSpaceDetails;