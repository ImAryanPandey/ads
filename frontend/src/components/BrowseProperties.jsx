import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Box, Typography, Grid, Card, CardContent, Button } from '@mui/material';

function BrowseProperties() {
  const [adSpaces, setAdSpaces] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdSpaces = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/properties/available`);
        setAdSpaces(response.data);
      } catch (error) {
        toast.error('Failed to load AdSpaces');
      }
    };
    fetchAdSpaces();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Browse AdSpaces</Typography>
      <Grid container spacing={2}>
        {adSpaces.map(ad => (
          <Grid item xs={12} sm={6} md={4} key={ad._id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{ad.title}</Typography>
                <Typography>{ad.description}</Typography>
                <Typography>Monthly Price: ₹{ad.pricing.monthly}</Typography>
                <Button onClick={() => navigate(`/property/${ad._id}`)}>View Details</Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default BrowseProperties;