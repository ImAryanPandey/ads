// frontend/src/components/EditAdSpace.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
} from '@mui/material';

function EditAdSpace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [adSpace, setAdSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    footfall: '',
    footfallType: 'Daily',
    baseMonthlyRate: '',
    availabilityStart: '',
    availabilityEnd: '',
    terms: '',
    images: [],
    captions: [],
  });

  useEffect(() => {
    const fetchAdSpace = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/adSpaces/${id}`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch AdSpace');
        const data = await response.json();
        setAdSpace(data);
        setFormData({
          title: data.title,
          description: data.description,
          address: data.address,
          footfall: data.footfall,
          footfallType: data.footfallType,
          baseMonthlyRate: data.pricing.baseMonthlyRate,
          availabilityStart: data.availability.startDate.split('T')[0],
          availabilityEnd: data.availability.endDate ? data.availability.endDate.split('T')[0] : '',
          terms: data.terms || '',
          images: [],
          captions: data.images.map(img => img.caption),
        });
      } catch (error) {
        toast.error('Failed to load AdSpace');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchAdSpace();
  }, [id, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    setFormData({ ...formData, images: Array.from(e.target.files) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('address', formData.address);
    data.append('footfall', formData.footfall);
    data.append('footfallType', formData.footfallType);
    data.append('baseMonthlyRate', formData.baseMonthlyRate);
    data.append('availabilityStart', formData.availabilityStart);
    if (formData.availabilityEnd) data.append('availabilityEnd', formData.availabilityEnd);
    data.append('terms', formData.terms);
    formData.images.forEach((image) => data.append('images', image));
    formData.captions.forEach((caption, index) => data.append(`captions[${index}]`, caption));

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/adSpaces/${id}`, {
        method: 'PUT',
        credentials: 'include',
        body: data,
      });
      if (!response.ok) throw new Error('Failed to update AdSpace');
      toast.success('AdSpace updated successfully');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to update AdSpace');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: 'var(--background)', color: 'var(--text)' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Edit AdSpace
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          margin="normal"
          multiline
          rows={4}
          required
        />
        <TextField
          fullWidth
          label="Address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          label="Footfall"
          name="footfall"
          type="number"
          value={formData.footfall}
          onChange={handleChange}
          margin="normal"
          required
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Footfall Type</InputLabel>
          <Select
            name="footfallType"
            value={formData.footfallType}
            onChange={handleChange}
            required
          >
            <MenuItem value="Daily">Daily</MenuItem>
            <MenuItem value="Weekly">Weekly</MenuItem>
            <MenuItem value="Monthly">Monthly</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          label="Base Monthly Rate (₹)"
          name="baseMonthlyRate"
          type="number"
          value={formData.baseMonthlyRate}
          onChange={handleChange}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          label="Availability Start Date"
          name="availabilityStart"
          type="date"
          value={formData.availabilityStart}
          onChange={handleChange}
          margin="normal"
          InputLabelProps={{ shrink: true }}
          required
        />
        <TextField
          fullWidth
          label="Availability End Date"
          name="availabilityEnd"
          type="date"
          value={formData.availabilityEnd}
          onChange={handleChange}
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          label="Terms"
          name="terms"
          value={formData.terms}
          onChange={handleChange}
          margin="normal"
          multiline
          rows={2}
        />
        <input
          type="file"
          multiple
          onChange={handleImageChange}
          accept="image/*"
          style={{ margin: '16px 0' }}
        />
        <Button
          type="submit"
          variant="contained"
          sx={{
            backgroundColor: 'var(--primary-color)',
            '&:hover': { backgroundColor: 'var(--primary-dark)' },
            borderRadius: '8px',
          }}
        >
          Update AdSpace
        </Button>
      </form>
    </Box>
  );
}

export default EditAdSpace;