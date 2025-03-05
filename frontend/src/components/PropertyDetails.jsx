import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Box, Typography, Button, TextField, MenuItem } from '@mui/material';

function PropertyDetails() {
  const { id } = useParams();
  const [adSpace, setAdSpace] = useState(null);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    const fetchAdSpace = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/properties/available`);
        const ad = response.data.find(a => a._id === id);
        setAdSpace(ad);
      } catch (error) {
        toast.error('Failed to load AdSpace');
      }
    };
    fetchAdSpace();
  }, [id]);

  const onSubmit = async (data) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/requests/send`, {
        adSpaceId: id,
        duration: { type: data.durationType, value: data.durationValue },
        requirements: data.requirements,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      toast.success('Request sent successfully!');
    } catch (error) {
      toast.error('Failed to send request');
    }
  };

  if (!adSpace) return <Typography>Loading...</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">{adSpace.title}</Typography>
      <Typography>{adSpace.description}</Typography>
      <Typography>Address: {adSpace.address}</Typography>
      <Typography>Footfall: {adSpace.footfall} ({adSpace.footfallType})</Typography>
      <Typography>Pricing: Daily: ₹{adSpace.pricing.daily || 'N/A'}, Weekly: ₹{adSpace.pricing.weekly || 'N/A'}, Monthly: ₹{adSpace.pricing.monthly}</Typography>
      <Typography>Availability: {adSpace.availability.startDate ? `${new Date(adSpace.availability.startDate).toLocaleDateString()} - ${new Date(adSpace.availability.endDate).toLocaleDateString()}` : 'N/A'}</Typography>
      <Typography>Terms: {adSpace.terms || 'None'}</Typography>

      <Typography variant="h6" sx={{ mt: 2 }}>Send Request</Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          select
          label="Duration Type"
          fullWidth
          margin="normal"
          {...register('durationType', { required: 'Duration type is required' })}
          error={!!errors.durationType}
          helperText={errors.durationType?.message}
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
        />
        <TextField
          label="Requirements"
          fullWidth
          margin="normal"
          multiline
          rows={2}
          {...register('requirements')}
        />
        <Button type="submit" variant="contained" sx={{ mt: 2 }}>Send Request</Button>
      </form>
    </Box>
  );
}

export default PropertyDetails;