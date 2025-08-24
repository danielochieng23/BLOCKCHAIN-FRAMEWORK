import React from 'react';
import { Container, Typography, Card, CardContent } from '@mui/material';

const ZKProofsPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Zero-Knowledge Proofs
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            ZK proof features coming soon...
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ZKProofsPage;