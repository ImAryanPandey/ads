import React, { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  Button,
  TextField,
  Box,
  Typography,
  MenuItem,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Paper,
  styled,
  IconButton,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DeleteIcon from '@mui/icons-material/Delete';

axios.defaults.withCredentials = true;

// Styled component for the file input
const FileInput = styled('div')(({ theme, isDragging }) => ({
  border: `2px dashed var(--primary-color)`,
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center',
  backgroundColor: isDragging
    ? (theme.palette.mode === 'dark' ? 'rgba(108, 92, 231, 0.3)' : 'rgba(108, 92, 231, 0.2)')
    : theme.palette.mode === 'dark' ? 'rgba(108, 92, 231, 0.1)' : 'rgba(108, 92, 231, 0.05)',
  cursor: 'pointer',
  width: '100%',
  height: '200px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  transition: 'background-color 0.2s ease',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(108, 92, 231, 0.2)' : 'rgba(108, 92, 231, 0.1)',
  },
}));

function AddProperty() {
  const { register, handleSubmit, control, formState: { errors }, setValue, watch } = useForm({
    defaultValues: {
      title: '',
      description: '',
      address: '',
      footfall: '',
      footfallType: '',
      baseMonthlyRate: '',
      terms: '',
      images: [],
      captions: [],
      availabilityStart: null,
      availabilityEnd: null,
    },
  });
  const navigate = useNavigate();
  const footfallType = useWatch({ control, name: 'footfallType' });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [footfallRaw, setFootfallRaw] = useState('');
  const [monthlyRateRaw, setMonthlyRateRaw] = useState('');
  const [isDragging, setIsDragging] = useState(false); // State to track drag status

  // Cleanup image previews on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews]);

  // Form submission handler
  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('address', data.address);
    formData.append('footfall', data.footfall);
    formData.append('footfallType', data.footfallType);
    formData.append('baseMonthlyRate', data.baseMonthlyRate);
    if (data.terms) formData.append('terms', data.terms);
    data.images.forEach((image, index) => {
      formData.append('images', image);
      formData.append('captions', data.captions[index] || '');
    });
    if (data.availabilityStart) formData.append('availabilityStart', data.availabilityStart.toISOString());
    if (data.availabilityEnd) formData.append('availabilityEnd', data.availabilityEnd.toISOString());

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/properties/add`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });
      toast.success('AdSpace added successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to add AdSpace');
    }
  };

  // Handle image upload (for both click and drag-and-drop)
  const handleImageChange = (files) => {
    const newFiles = Array.from(files);
    const imageFiles = newFiles.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length < newFiles.length) {
      toast.error('Only image files are allowed');
    }
    const newPreviews = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    setValue('images', [...watch('images'), ...imageFiles]);
  };

  // Handle file input change (click to upload)
  const handleFileInputChange = (e) => {
    handleImageChange(e.target.files);
  };

  // Handle drag-and-drop events
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleImageChange(droppedFiles);
    }
  };

  // Remove an image
  const removeImage = (index) => {
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    const updatedImages = watch('images').filter((_, i) => i !== index);
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews(updatedPreviews);
    setValue('images', updatedImages);
    setValue('captions', watch('captions').filter((_, i) => i !== index));
  };

  // Handle footfall input
  const handleFootfallChange = (e) => {
    const rawValue = e.target.value.replace(/,/g, '');
    if (!isNaN(rawValue) && rawValue >= 0 && rawValue <= 999999999) {
      setFootfallRaw(rawValue);
      setValue('footfall', rawValue, { shouldValidate: true });
    } else if (rawValue === '') {
      setFootfallRaw('');
      setValue('footfall', '');
    }
  };

  // Handle monthly rate input
  const handleMonthlyRateChange = (e) => {
    const rawValue = e.target.value.replace(/,/g, '');
    if (!isNaN(rawValue) && rawValue >= 0) {
      setMonthlyRateRaw(rawValue);
      setValue('baseMonthlyRate', rawValue, { shouldValidate: true });
    } else if (rawValue === '') {
      setMonthlyRateRaw('');
      setValue('baseMonthlyRate', '');
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 900,
          mx: 'auto',
          mt: 5,
          borderRadius: 2,
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #2C2C2C 0%, #1E1E1E 100%)'
              : 'var(--background-light)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
          Add New AdSpace
        </Typography>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Title */}
          <TextField
            label="Title"
            fullWidth
            margin="normal"
            {...register('title', { required: 'Title is required' })}
            error={!!errors.title}
            helperText={errors.title?.message}
            InputLabelProps={{ style: { color: 'var(--text-light)' } }}
            sx={{ input: { color: (theme) => (theme.palette.mode === 'dark' ? 'var(--input-text-dark)' : 'var(--input-text-light)') } }}
          />

          {/* Description */}
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={4}
            {...register('description', { required: 'Description is required' })}
            error={!!errors.description}
            helperText={errors.description?.message}
            InputLabelProps={{ style: { color: 'var(--text-light)' } }}
            sx={{ input: { color: (theme) => (theme.palette.mode === 'dark' ? 'var(--input-text-dark)' : 'var(--input-text-light)') } }}
          />

          {/* Address */}
          <TextField
            label="Address"
            fullWidth
            margin="normal"
            {...register('address', { required: 'Address is required' })}
            error={!!errors.address}
            helperText={errors.address?.message}
            InputLabelProps={{ style: { color: 'var(--text-light)' } }}
            sx={{ input: { color: (theme) => (theme.palette.mode === 'dark' ? 'var(--input-text-dark)' : 'var(--input-text-light)') } }}
          />

          {/* Footfall */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1, color: 'var(--primary-color)' }}>
            Estimated Footfall
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={8}>
              <TextField
                label="Footfall"
                fullWidth
                value={footfallRaw}
                onChange={handleFootfallChange}
                error={!!errors.footfall}
                helperText={
                  errors.footfall?.message ||
                  (footfallType && footfallRaw ? `${new Intl.NumberFormat('en-IN').format(footfallRaw)} Visitors ${footfallType}` : 'Enter footfall')
                }
                InputProps={{ sx: { input: { textAlign: 'right' } } }}
                InputLabelProps={{ style: { color: 'var(--text-light)' } }}
                sx={{ input: { color: (theme) => (theme.palette.mode === 'dark' ? 'var(--input-text-dark)' : 'var(--input-text-light)') } }}
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth error={!!errors.footfallType}>
                <InputLabel sx={{ color: 'var(--text-light)' }}>Frequency</InputLabel>
                <Select
                  label="Frequency"
                  defaultValue=""
                  {...register('footfallType', { required: 'Frequency is required' })}
                  sx={{ color: (theme) => (theme.palette.mode === 'dark' ? 'var(--text-dark)' : 'var(--text-light)') }}
                >
                  <MenuItem value="">Select</MenuItem>
                  <MenuItem value="Daily">Daily</MenuItem>
                  <MenuItem value="Weekly">Weekly</MenuItem>
                  <MenuItem value="Monthly">Monthly</MenuItem>
                </Select>
                {errors.footfallType && <Typography variant="caption" color="error">{errors.footfallType.message}</Typography>}
              </FormControl>
            </Grid>
          </Grid>

          {/* Pricing */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1, color: 'var(--primary-color)' }}>
            Pricing
          </Typography>
          <TextField
            label="Base Monthly Rate (₹)"
            fullWidth
            margin="normal"
            value={monthlyRateRaw}
            onChange={handleMonthlyRateChange}
            error={!!errors.baseMonthlyRate}
            helperText={
              errors.baseMonthlyRate?.message ||
              (monthlyRateRaw ? `₹${new Intl.NumberFormat('en-IN').format(monthlyRateRaw)}` : 'e.g., 50,000')
            }
            InputLabelProps={{ style: { color: 'var(--text-light)' } }}
            sx={{ input: { color: (theme) => (theme.palette.mode === 'dark' ? 'var(--input-text-dark)' : 'var(--input-text-light)') } }}
          />

          {/* Availability */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1, color: 'var(--primary-color)' }}>
            Availability
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <DatePicker
              label="Available From"
              value={watch('availabilityStart')}
              onChange={(date) => setValue('availabilityStart', date, { shouldValidate: true })}
              minDate={new Date()}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  error={!!errors.availabilityStart}
                  helperText={errors.availabilityStart?.message || 'Select start date'}
                  InputLabelProps={{ style: { color: 'var(--text-light)' } }}
                  sx={{ input: { color: (theme) => (theme.palette.mode === 'dark' ? 'var(--input-text-dark)' : 'var(--input-text-light)') } }}
                />
              )}
            />
            <DatePicker
              label="Available Until (Optional)"
              value={watch('availabilityEnd')}
              onChange={(date) => setValue('availabilityEnd', date)}
              minDate={watch('availabilityStart') || new Date()}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  error={!!errors.availabilityEnd}
                  helperText={errors.availabilityEnd?.message || 'Leave blank if always available'}
                  InputLabelProps={{ style: { color: 'var(--text-light)' } }}
                  sx={{ input: { color: (theme) => (theme.palette.mode === 'dark' ? 'var(--input-text-dark)' : 'var(--input-text-light)') } }}
                />
              )}
            />
          </Box>

          {/* Image Upload */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1, color: 'var(--primary-color)' }}>
            Upload Images
          </Typography>
          <FileInput
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              id="file-input"
              onChange={handleFileInputChange}
            />
            <label
              htmlFor="file-input"
              style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <Typography variant="body1" sx={{ color: 'var(--primary-color)' }}>
                {isDragging ? 'Drop Images Here' : 'Drag & Drop or Click to Upload Images'}
              </Typography>
            </label>
          </FileInput>

          {imagePreviews.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                {imagePreviews.map((preview, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 1, position: 'relative' }}>
                      <IconButton
                        onClick={() => removeImage(index)}
                        sx={{ position: 'absolute', top: 5, right: 5, color: 'var(--secondary-color)' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                      <img
                        src={preview}
                        alt={`Preview ${index}`}
                        style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                      <TextField
                        label={`Caption ${index + 1}`}
                        fullWidth
                        margin="normal"
                        size="small"
                        {...register(`captions.${index}`, { maxLength: { value: 150, message: 'Caption cannot exceed 150 characters' } })}
                        error={!!errors.captions?.[index]}
                        helperText={errors.captions?.[index]?.message || 'Describe the image'}
                        InputLabelProps={{ style: { color: 'var(--text-light)' } }}
                        sx={{ input: { color: (theme) => (theme.palette.mode === 'dark' ? 'var(--input-text-dark)' : 'var(--input-text-light)') } }}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Terms */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1, color: 'var(--primary-color)' }}>
            Terms (Optional)
          </Typography>
          <TextField
            label="Terms"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            placeholder="e.g., No smoking, only for commercial ads (optional)"
            {...register('terms', {
              maxLength: { value: 500, message: 'Terms cannot exceed 500 characters' },
              validate: (value) => !/<script/i.test(value) || 'Invalid characters detected',
            })}
            error={!!errors.terms}
            helperText={errors.terms?.message || 'Add specific conditions if needed'}
            InputLabelProps={{ style: { color: 'var(--text-light)' } }}
            sx={{ input: { color: (theme) => (theme.palette.mode === 'dark' ? 'var(--input-text-dark)' : 'var(--input-text-light)') } }}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              mt: 4,
              py: 1.5,
              backgroundColor: 'var(--primary-color)',
              '&:hover': { backgroundColor: 'var(--secondary-color)' },
            }}
          >
            Add AdSpace
          </Button>
        </form>
      </Paper>
    </LocalizationProvider>
  );
}

export default AddProperty;