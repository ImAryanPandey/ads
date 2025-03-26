import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Box, Typography, Grid, Card, CardContent, Button, CardMedia } from '@mui/material';
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
        const token = localStorage.getItem('token');
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/adSpaces/available`, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const adSpacesWithImageUrls = await Promise.all(
          response.data.map(async (adSpace) => {
            if (adSpace.images?.length > 0) {
              const image = adSpace.images[0];
              try {
                console.log(`Fetching image with ID: ${image.imageId}`);
                const imageResponse = await axios.get(
                  `${import.meta.env.VITE_API_URL}/images/${image.imageId}`,
                  {
                    withCredentials: true,
                    responseType: 'blob',
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );
                const imageUrl = URL.createObjectURL(imageResponse.data);
                return { ...adSpace, images: [{ ...image, url: imageUrl }].concat(adSpace.images.slice(1)) };
              } catch (imgError) {
                console.error(`Error fetching image ${image.imageId}:`, imgError);
                return { ...adSpace, images: [{ ...image, url: null }].concat(adSpace.images.slice(1)) };
              }
            }
            return adSpace;
          })
        );

        setAdSpaces(adSpacesWithImageUrls);
      } catch (error) {
        console.error('Error fetching ad spaces:', error.response?.data || error.message);
        toast.error('Failed to load AdSpaces');
      } finally {
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
      {adSpaces.length === 0 ? (
        <Typography sx={{ color: 'var(--text-light)' }}>
          No AdSpaces available at the moment.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {adSpaces.map((adSpace) => (
            <Grid item xs={12} sm={6} md={4} key={adSpace._id}>
              <StyledCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <CardMedia
                  component="img"
                  height="140"
                  image={
                    adSpace.images?.[0]?.url
                      ? adSpace.images[0].url
                      : 'https://via.placeholder.com/150'
                  }
                  alt={adSpace.title}
                  onError={(e) => {
                    console.log(`Failed to load image for AdSpace ${adSpace._id}`);
                    e.target.src = 'https://via.placeholder.com/150';
                    e.target.onerror = null;
                  }}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/adSpace/${adSpace._id}`)}
                />
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 500, color: 'var(--text)' }}>
                    {adSpace.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--text-light)', mb: 2 }}>
                    {adSpace.description}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'var(--text)' }}>
                    ₹{adSpace.pricing.baseMonthlyRate}/month
                  </Typography>
                  <Button
                    variant="contained"
                    sx={{
                      mt: 2,
                      bgcolor: 'var(--primary-color)',
                      '&:hover': { bgcolor: '#5B4CD6' },
                      borderRadius: '8px',
                    }}
                    onClick={() => navigate(`/adSpace/${adSpace._id}`)}
                  >
                    View Details
                  </Button>
                </CardContent>
              </StyledCard>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default BrowseAdSpaces;