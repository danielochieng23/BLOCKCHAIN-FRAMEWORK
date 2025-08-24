import React from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  AccountBalanceWallet,
  Security,
  CheckCircle,
  VpnKey,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, connectWallet, account } = useWeb3();
  const { login, isLoading } = useAuth();

  const steps = [
    'Connect Wallet',
    'Sign Message',
    'Access Dashboard',
  ];

  const currentStep = isConnected ? 1 : 0;

  const securityFeatures = [
    'No passwords or personal information stored',
    'Cryptographic signature-based authentication',
    'Your private keys never leave your wallet',
    'Complete control over your identity data',
  ];

  const handleLogin = async () => {
    try {
      await login();
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box textAlign="center" mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          🔐 Secure Authentication
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Connect your wallet to access the Digital Identity Framework
        </Typography>
      </Box>

      {/* Progress Stepper */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stepper activeStep={currentStep} alternativeLabel>
            {steps.map((label, index) => (
              <Step key={label} completed={index < currentStep}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={4}>
        {/* Main Authentication Card */}
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ p: 4 }}>
            <Box textAlign="center">
              <AccountBalanceWallet
                sx={{ fontSize: 64, color: 'primary.main', mb: 2 }}
              />
              
              {!isConnected ? (
                <>
                  <Typography variant="h5" gutterBottom>
                    Connect Your Wallet
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Connect your Ethereum wallet to get started with decentralized
                    identity management.
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={connectWallet}
                    startIcon={<AccountBalanceWallet />}
                    sx={{ mt: 2 }}
                  >
                    Connect Wallet
                  </Button>
                </>
              ) : (
                <>
                  <Typography variant="h5" gutterBottom color="success.main">
                    Wallet Connected!
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Connected as: {account?.slice(0, 6)}...{account?.slice(-4)}
                  </Typography>
                  
                  <Alert severity="info" sx={{ mt: 2, mb: 3, textAlign: 'left' }}>
                    <Typography variant="body2">
                      <strong>Next step:</strong> Sign a message to authenticate securely.
                      This proves you own the wallet without revealing any sensitive information.
                    </Typography>
                  </Alert>

                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleLogin}
                    disabled={isLoading}
                    startIcon={<Security />}
                    sx={{ mt: 2 }}
                  >
                    {isLoading ? 'Authenticating...' : 'Sign & Authenticate'}
                  </Button>
                </>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Security Information */}
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ p: 4 }}>
            <Box display="flex" alignItems="center" mb={3}>
              <VpnKey sx={{ color: 'secondary.main', mr: 1 }} />
              <Typography variant="h6">
                Why is this secure?
              </Typography>
            </Box>
            
            <List>
              {securityFeatures.map((feature, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <ListItemIcon>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={feature}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>

            <Box mt={3} p={2} bgcolor="background.default" borderRadius={2}>
              <Typography variant="subtitle2" gutterBottom>
                🛡️ Technical Details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Authentication uses cryptographic signatures to prove wallet ownership.
                The signed message contains a timestamp and nonce to prevent replay attacks.
                No private keys or sensitive data are transmitted.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Help Section */}
      <Card sx={{ mt: 4, bgcolor: 'grey.50' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Need Help?
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Don't have a wallet? We recommend <strong>MetaMask</strong> for the best experience.
            It's a secure browser extension that manages your Ethereum accounts.
          </Typography>
          <Button
            variant="outlined"
            href="https://metamask.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            Install MetaMask
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
};

export default LoginPage;