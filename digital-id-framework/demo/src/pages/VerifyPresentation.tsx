import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

const VerifyPresentation: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4">Verify Presentation</Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          Presentation verification interface will be implemented here.
        </Typography>
      </Paper>
    </Container>
  );
};

export default VerifyPresentation;