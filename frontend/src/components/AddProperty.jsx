import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button, TextField, Box, Typography, MenuItem } from '@mui/material';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

function AddProperty() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [dateRange, setDateRange] = useState([{ startDate: null, endDate: null, key: 'selection' }]);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    const availability = dateRange[0].startDate ? {
      startDate: dateRange[0].startDate,
      endDate: dateRange[0].endDate,
    } : {};
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/properties/add`, {
        ...data,
        pricing: {
          daily: data.daily || undefined,
          weekly: data.weekly || undefined,
          monthly: data.monthly,
        },
        availability,
        images: [], // Add file upload logic if needed
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      toast.success('AdSpace added successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to add AdSpace');
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 5 }}>
      <Typography variant="h4" gutterBottom>Add AdSpace</Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          label="Title"
          fullWidth
          margin="normal"
          {...register('title', { required: 'Title is required' })}
          error={!!errors.title}
          helperText={errors.title?.message}
        />
        <TextField
          label="Description"
          fullWidth
          margin="normal"
          multiline
          rows={4}
          {...register('description', { required: 'Description is required' })}
          error={!!errors.description}
          helperText={errors.description?.message}
        />
        <TextField
          label="Address"
          fullWidth
          margin="normal"
          {...register('address', { required: 'Address is required' })}
          error={!!errors.address}
          helperText={errors.address?.message}
        />
        <TextField
          label="Footfall"
          type="number"
          fullWidth
          margin="normal"
          {...register('footfall', { required: 'Footfall is required' })}
          error={!!errors.footfall}
          helperText={errors.footfall?.message}
        />
        <TextField
          select
          label="Footfall Type"
          fullWidth
          margin="normal"
          {...register('footfallType', { required: 'Footfall type is required' })}
          error={!!errors.footfallType}
          helperText={errors.footfallType?.message}
        >
          <MenuItem value="Daily">Daily</MenuItem>
          <MenuItem value="Weekly">Weekly</MenuItem>
          <MenuItem value="Monthly">Monthly</MenuItem>
        </TextField>
        <TextField
          label="Daily Price (₹)"
          type="number"
          fullWidth
          margin="normal"
          {...register('daily')}
        />
        <TextField
          label="Weekly Price (₹)"
          type="number"
          fullWidth
          margin="normal"
          {...register('weekly')}
        />
        <TextField
          label="Monthly Price (₹)"
          type="number"
          fullWidth
          margin="normal"
          {...register('monthly', { required: 'Monthly price is required' })}
          error={!!errors.monthly}
          helperText={errors.monthly?.message}
        />
        <Typography>Availability</Typography>
        <DateRangePicker
          ranges={dateRange}
          onChange={(item) => setDateRange([item.selection])}
        />
        <TextField
          label="Terms"
          fullWidth
          margin="normal"
          multiline
          rows={2}
          {...register('terms')}
        />
        <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>Add AdSpace</Button>
      </form>
    </Box>
  );
}

export default AddProperty;