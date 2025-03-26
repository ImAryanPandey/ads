import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Box, Typography, Grid, Card, CardContent, Button } from '@mui/material';
import { motion } from 'framer-motion';
import styled from '@emotion/styled';
import LoadingSpinner from './LoadingSpinner';

const StyledCard = styled(motion.div)`
  background: var(--container-light);
  border-radius: 12px;
  box-shadow: var(--shadow);
  overflow: hidden;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }

  .dark-mode & {
    background: var(--container-dark);
  }
`;

function BrowseAdSpaces() {
  const [adSpaces, setAdSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdSpaces = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/adSpaces/available`);
        setAdSpaces(response.data);
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load AdSpaces');
        setLoading(false);
      }
    };
    fetchAdSpaces();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: 'var(--primary-color)' }}>
        Browse AdSpaces
      </Typography>
      <Grid container spacing={3}>
        {adSpaces.map((ad) => (
          <Grid item xs={12} sm={6} md={4} key={ad._id}>
            <StyledCard
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  {ad.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--text-light)', mb: 2 }}>
                  {ad.description}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  ₹{ad.pricing.monthly}/month
                </Typography>
                <Button
                  variant="contained"
                  sx={{ mt: 2, bgcolor: 'var(--primary-color)', '&:hover': { bgcolor: '#5B4CD6' } }}
                  onClick={() => navigate(`/adSpace/${ad._id}`)}
                >
                  View Details
                </Button>
              </CardContent>
            </StyledCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default BrowseAdSpaces;