// frontend/src/components/BrowseAdSpaces.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Chip,
} from '@mui/material';

function BrowseAdSpaces() {
  const [adSpaces, setAdSpaces] = useState([]);
  const [currentImages, setCurrentImages] = useState({});
  const navigate = useNavigate();
  const intervalRefs = useRef({});

  useEffect(() => {
    const fetchAdSpaces = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/adSpaces/available`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch AdSpaces');
        const fetchedAdSpaces = await response.json();

        const adSpacesWithImageUrls = await Promise.all(
          fetchedAdSpaces.map(async (adSpace) => {
            const imagesWithUrls = await Promise.all(
              adSpace.images.map(async (image) => {
                try {
                  const imageResponse = await fetch(
                    `${import.meta.env.VITE_API_URL}/images/${image.imageId}`,
                    { method: 'GET', credentials: 'include' }
                  );
                  if (!imageResponse.ok) throw new Error('Failed to fetch image');
                  const blob = await imageResponse.blob();
                  const imageUrl = URL.createObjectURL(blob);
                  return { ...image, url: imageUrl };
                } catch (imgError) {
                  console.error(`Error fetching image ${image.imageId}:`, imgError);
                  return { ...image, url: null };
                }
              })
            );
            return { ...adSpace, images: imagesWithUrls };
          })
        );
        setAdSpaces(adSpacesWithImageUrls);

        // Initialize current image index for each AdSpace
        const initialImages = {};
        adSpacesWithImageUrls.forEach((adSpace) => {
          initialImages[adSpace._id] = 0;
        });
        setCurrentImages(initialImages);
      } catch (error) {
        console.error('Error fetching ad spaces:', error);
        toast.error('Failed to load AdSpaces');
      }
    };
    fetchAdSpaces();
  }, []);

  // Set up image rotation for each AdSpace
  useEffect(() => {
    adSpaces.forEach((adSpace) => {
      if (adSpace.images && adSpace.images.length > 1) {
        intervalRefs.current[adSpace._id] = setInterval(() => {
          setCurrentImages((prev) => ({
            ...prev,
            [adSpace._id]: (prev[adSpace._id] + 1) % adSpace.images.length,
          }));
        }, 5000);
      }
    });

    return () => {
      Object.values(intervalRefs.current).forEach((interval) => clearInterval(interval));
    };
  }, [adSpaces]);

  return (
    <Box sx={{ p: 3, backgroundColor: 'var(--background)', color: 'var(--text)' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Browse AdSpaces
      </Typography>
      {adSpaces.length > 0 ? (
        <Grid container spacing={2}>
          {adSpaces.map((adSpace) => (
            <Grid item xs={12} sm={6} md={4} key={adSpace._id}>
              <Card
                sx={{
                  backgroundColor: 'var(--container-light)',
                  boxShadow: 'var(--shadow)',
                  borderRadius: '12px',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.02)' },
                }}
              >
                <CardMedia
                  component="img"
                  height="140"
                  image={
                    adSpace.images?.length > 0 && adSpace.images[currentImages[adSpace._id] || 0]?.url
                      ? adSpace.images[currentImages[adSpace._id] || 0].url
                      : 'https://via.placeholder.com/150'
                  }
                  alt={adSpace.title}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/150';
                    e.target.onerror = null;
                  }}
                  onClick={() => navigate(`/adSpace/${adSpace._id}`)}
                  sx={{ cursor: 'pointer' }}
                />
                <CardContent>
                  <Typography variant="h6" sx={{ color: 'var(--text)' }}>
                    {adSpace.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--text-light)' }}>
                    {adSpace.address}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--text-light)' }}>
                    Footfall: {adSpace.footfall} ({adSpace.footfallType})
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--text-light)' }}>
                    Price: ₹{adSpace.pricing.baseMonthlyRate}/month
                  </Typography>
                  <Chip
                    label={adSpace.status}
                    color="success"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography sx={{ color: 'var(--text-light)' }}>
          No available AdSpaces at the moment.
        </Typography>
      )}
    </Box>
  );
}

export default BrowseAdSpaces;