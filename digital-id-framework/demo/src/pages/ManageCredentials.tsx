import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

const ManageCredentials: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4">Manage Credentials</Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          Credential management interface will be implemented here.
        </Typography>
      </Paper>
    </Container>
  );
};

export default ManageCredentials;