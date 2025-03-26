import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Box, Typography, Button, TextField, MenuItem, Grid, CardMedia } from '@mui/material';
import ChatComponent from './ChatComponent.jsx';

function AdSpaceDetails() {
  const { id } = useParams();
  const [adSpace, setAdSpace] = useState(null);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    const fetchAdSpace = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/adSpaces/available`);
        const adSpace = response.data.find(a => a._id === id);
        setAdSpace(adSpace);
      } catch (error) {
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
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      toast.success('Request sent successfully!');
    } catch (error) {
      toast.error('Failed to send request');
    }
  };

  if (!adSpace) return <Typography sx={{ p: 3, color: 'var(--text)' }}>Loading...</Typography>;

  return (
    <Box sx={{ p: 3, backgroundColor: 'var(--background)', color: 'var(--text)' }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <CardMedia
            component="img"
            height="300"
            image={adSpace.images?.[0]?.imageId ? `${import.meta.env.VITE_API_URL}/images/${adSpace.images[0].imageId}` : 'https://via.placeholder.com/300'}
            alt={adSpace.title}
            sx={{ borderRadius: '12px', boxShadow: 'var(--shadow)' }}
          />
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
    </Box>
  );
}

export default AdSpaceDetails;