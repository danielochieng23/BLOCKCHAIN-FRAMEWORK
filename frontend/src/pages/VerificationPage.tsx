import React from 'react';
import { Container, Typography, Card, CardContent } from '@mui/material';

const VerificationPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Identity Verification
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Verification features coming soon...
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default VerificationPage;