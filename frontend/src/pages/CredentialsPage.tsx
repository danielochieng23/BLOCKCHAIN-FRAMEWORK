import React from 'react';
import { Container, Typography, Card, CardContent } from '@mui/material';

const CredentialsPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Verifiable Credentials
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Credential management features coming soon...
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default CredentialsPage;