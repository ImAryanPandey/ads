import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
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
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatComponent from './ChatComponent.jsx';

axios.defaults.withCredentials = true;

function AdSpaceDetails() {
  const { id } = useParams();
  const [adSpace, setAdSpace] = useState(null);
  const [openImageModal, setOpenImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    const fetchAdSpace = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/adSpaces/available`, {
          withCredentials: true,
        });
        const adSpaceData = response.data.find((a) => a._id === id);

        if (adSpaceData) {
          // Fetch images for the ad space
          const imagesWithUrls = await Promise.all(
            adSpaceData.images.map(async (image) => {
              try {
                console.log(`Fetching image with ID: ${image.imageId}`);
                const imageResponse = await axios.get(
                  `${import.meta.env.VITE_API_URL}/images/${image.imageId}`,
                  {
                    withCredentials: true,
                    responseType: 'blob',
                  }
                );
                const imageUrl = URL.createObjectURL(imageResponse.data);
                return { ...image, url: imageUrl };
              } catch (imgError) {
                console.error(`Error fetching image ${image.imageId}:`, imgError);
                return { ...image, url: null };
              }
            })
          );

          setAdSpace({ ...adSpaceData, images: imagesWithUrls });
        } else {
          toast.error('AdSpace not found');
        }
      } catch (error) {
        console.error('Error fetching ad space:', error);
        toast.error('Failed to load AdSpace');
      }
    };
    fetchAdSpace();
  }, [id]);

  const onSubmit = async (data) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/requests/send`,
        {
          adSpaceId: id,
          duration: { type: data.durationType, value: data.durationValue },
          requirements: data.requirements,
        },
        {
          withCredentials: true, // Use cookies for authentication
        }
      );
      toast.success('Request sent successfully!');
    } catch (error) {
      console.error('Error sending request:', error);
      toast.error('Failed to send request');
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

  if (!adSpace) return <Typography sx={{ p: 3, color: 'var(--text)' }}>Loading...</Typography>;

  return (
    <Box sx={{ p: 3, backgroundColor: 'var(--background)', color: 'var(--text)' }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {adSpace.images?.length > 0 ? (
              adSpace.images.map((image, index) => (
                <CardMedia
                  key={index}
                  component="img"
                  height="150"
                  image={image.url || 'https://via.placeholder.com/150'}
                  alt={image.caption || `AdSpace Image ${index + 1}`}
                  onClick={() => handleImageClick(image)}
                  onError={(e) => {
                    console.log(`Failed to load image ${image.imageId}`);
                    e.target.src = 'https://via.placeholder.com/150';
                    e.target.onerror = null; // Prevent retry loop
                  }}
                  sx={{
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow)',
                    cursor: 'pointer',
                    width: '150px',
                    objectFit: 'cover',
                  }}
                />
              ))
            ) : (
              <CardMedia
                component="img"
                height="300"
                image="https://via.placeholder.com/300"
                alt="No Image Available"
                sx={{ borderRadius: '12px', boxShadow: 'var(--shadow)' }}
              />
            )}
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h4" sx={{ color: 'var(--primary-color)', fontWeight: 600 }}>
            {adSpace.title}
          </Typography>
          <Typography variant="body1" sx={{ color: 'var(--text-light)', mt: 1 }}>
            {adSpace.description}
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Address: {adSpace.address}
          </Typography>
          <Typography variant="body2">
            Footfall: {adSpace.footfall} ({adSpace.footfallType})
          </Typography>
          <Typography variant="body2">
            Pricing: Monthly: ₹{adSpace.pricing.baseMonthlyRate}
          </Typography>
          <Typography variant="body2">
            Availability:{' '}
            {adSpace.availability.startDate
              ? `${new Date(adSpace.availability.startDate).toLocaleDateString()} - ${new Date(adSpace.availability.endDate).toLocaleDateString()}`
              : 'N/A'}
          </Typography>
          <Typography variant="body2">Terms: {adSpace.terms || 'None'}</Typography>
        </Grid>
      </Grid>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ color: 'var(--text)' }}>
          Send Request
        </Typography>
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            select
            label="Duration Type"
            fullWidth
            margin="normal"
            {...register('durationType', { required: 'Duration type is required' })}
            error={!!errors.durationType}
            helperText={errors.durationType?.message}
            sx={{
              backgroundColor: 'var(--container-light)',
              borderRadius: '8px',
            }}
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
            {...register('durationValue', { required: 'Duration value is required' })}
            error={!!errors.durationValue}
            helperText={errors.durationValue?.message}
            sx={{
              backgroundColor: 'var(--container-light)',
              borderRadius: '8px',
            }}
          />
          <TextField
            label="Requirements"
            fullWidth
            margin="normal"
            multiline
            rows={2}
            {...register('requirements')}
            sx={{
              backgroundColor: 'var(--container-light)',
              borderRadius: '8px',
            }}
          />
          <Button
            type="submit"
            variant="contained"
            sx={{
              mt: 2,
              backgroundColor: 'var(--primary-color)',
              '&:hover': { backgroundColor: 'var(--primary-dark)' },
            }}
          >
            Send Request
          </Button>
        </form>
      </Box>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ color: 'var(--text)' }}>
          Chat with Owner
        </Typography>
        <ChatComponent adSpaceId={id} />
      </Box>

      {/* Full-Screen Image Modal */}
      <Dialog open={openImageModal} onClose={handleCloseImageModal} maxWidth="lg">
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={handleCloseImageModal}
            sx={{ position: 'absolute', top: 8, right: 8, color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
          {selectedImage && (
            <img
              src={selectedImage.url || 'https://via.placeholder.com/300'}
              alt={selectedImage.caption || 'AdSpace Image'}
              onError={(e) => {
                console.log(`Failed to load modal image ${selectedImage.imageId}`);
                e.target.src = 'https://via.placeholder.com/300';
                e.target.onerror = null;
              }}
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default AdSpaceDetails;