import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button, TextField, Box, Typography, LinearProgress } from '@mui/material';

function Register() {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const [strength, setStrength] = useState(0);
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    number: false,
    specialChar: false,
  });

  // ✅ Live Password Validation with Dynamic Feedback
  const validatePassword = (value) => {
    const lengthValid = value.length >= 8;
    const numberValid = /\d/.test(value);
    const specialCharValid = /[!@#$%^&*]/.test(value);

    setPasswordCriteria({
      length: lengthValid,
      number: numberValid,
      specialChar: specialCharValid,
    });

    // Strength Calculation (Max: 100%)
    let strengthScore = 0;
    if (lengthValid) strengthScore += 35;
    if (numberValid) strengthScore += 30;
    if (specialCharValid) strengthScore += 35;
    setStrength(strengthScore);

    // ✅ Ensure password gets stored in the form
    setValue('password', value, { shouldValidate: true });
  };

  const onSubmit = async (data) => {
    if (strength < 100) return toast.error('Password must meet all security criteria');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, data);
      toast.success('OTP sent! Please verify your email.');
      navigate(`/verify-otp?email=${encodeURIComponent(data.email)}`);
    } catch (error) {
      toast.error(error.response?.data.message || 'Registration failed');
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 5 }}>
      <Typography variant="h4" gutterBottom>Register</Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField label="Name" fullWidth margin="normal" {...register('name', { required: 'Name is required' })} error={!!errors.name} helperText={errors.name?.message} />
        <TextField label="Email" fullWidth margin="normal" autoComplete="email" {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })} error={!!errors.email} helperText={errors.email?.message} />

        <TextField
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          autoComplete="current-password"
          onChange={(e) => validatePassword(e.target.value)}
          error={!!errors.password}
          helperText={errors.password?.message}
        />

        {/* ✅ Strength Meter */}
        <LinearProgress
          variant="determinate"
          value={strength}
          sx={{
            height: 6,
            borderRadius: 5,
            bgcolor: '#eee',
            mt: 1,
            '& .MuiLinearProgress-bar': {
              bgcolor: strength === 100 ? 'green' : strength >= 60 ? 'orange' : 'red',
            },
          }}
        />

        {/* ✅ Password Requirements (Dynamic & Small) */}
        <Typography sx={{ fontSize: '0.85rem', color: '#888', mt: 1 }}>
          Password must include:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.75rem' }}>
          <li style={{ color: passwordCriteria.length ? 'green' : 'red' }}>✔ At least 8 characters</li>
          <li style={{ color: passwordCriteria.number ? 'green' : 'red' }}>✔ At least one number</li>
          <li style={{ color: passwordCriteria.specialChar ? 'green' : 'red' }}>✔ At least one special character (!@#$%^&*)</li>
        </ul>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 2, bgcolor: 'var(--primary-color)' }}
          disabled={strength < 100}
        >
          Register
        </Button>
      </form>
    </Box>
  );
}

export default Register;
