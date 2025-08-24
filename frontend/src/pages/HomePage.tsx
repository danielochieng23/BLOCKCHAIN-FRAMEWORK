import React from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Security,
  VerifiedUser,
  VpnKey,
  Visibility,
  Lock,
  Speed,
  Public,
  CheckCircle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isConnected } = useWeb3();

  const features = [
    {
      icon: <Security sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Self-Sovereign Identity',
      description: 'Complete control over your digital identity without relying on centralized authorities.',
      benefits: ['Full ownership', 'No central authority', 'Portable identity'],
    },
    {
      icon: <VpnKey sx={{ fontSize: 40, color: 'secondary.main' }} />,
      title: 'Zero-Knowledge Proofs',
      description: 'Prove claims about yourself without revealing the underlying sensitive data.',
      benefits: ['Privacy protection', 'Selective disclosure', 'Cryptographic security'],
    },
    {
      icon: <VerifiedUser sx={{ fontSize: 40, color: 'success.main' }} />,
      title: 'Verifiable Credentials',
      description: 'Digital credentials that can be cryptographically verified by anyone.',
      benefits: ['Tamper-proof', 'Instantly verifiable', 'W3C standard'],
    },
    {
      icon: <Public sx={{ fontSize: 40, color: 'info.main' }} />,
      title: 'Blockchain Integration',
      description: 'Leverage blockchain technology for immutable and decentralized identity management.',
      benefits: ['Immutable records', 'Global accessibility', 'Censorship resistant'],
    },
  ];

  const useCases = [
    'Age verification without revealing birth date',
    'Income verification without disclosing exact salary',
    'Location verification without revealing exact address',
    'Educational credentials from trusted institutions',
    'Professional certifications and licenses',
    'Membership proofs without revealing identity',
  ];

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else if (isConnected) {
      navigate('/login');
    } else {
      // Will trigger wallet connection in navbar
      window.scrollTo(0, 0);
    }
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 8,
          mb: 6,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" gutterBottom fontWeight={700}>
                Privacy-Preserving
                <br />
                <span style={{ color: '#FFD700' }}>Digital Identity</span>
              </Typography>
              <Typography variant="h5" paragraph sx={{ mb: 4, opacity: 0.9 }}>
                Take control of your digital identity with blockchain technology
                and zero-knowledge proofs. Share what you want, when you want,
                with cryptographic proof.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGetStarted}
                  sx={{
                    backgroundColor: '#FFD700',
                    color: 'black',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: '#FFC107',
                    },
                  }}
                >
                  {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                  onClick={() => navigate('/learn')}
                >
                  Learn More
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 400,
                  position: 'relative',
                }}
              >
                {/* Animated Identity Visualization */}
                <Box
                  sx={{
                    width: 300,
                    height: 300,
                    border: '3px solid rgba(255,255,255,0.3)',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative',
                    animation: 'pulse 2s infinite',
                  }}
                >
                  <Security sx={{ fontSize: 80, opacity: 0.8 }} />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 20,
                      right: 40,
                      animation: 'float 3s ease-in-out infinite',
                    }}
                  >
                    <VpnKey sx={{ fontSize: 30 }} />
                  </Box>
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 30,
                      left: 30,
                      animation: 'float 3s ease-in-out infinite 1s',
                    }}
                  >
                    <VerifiedUser sx={{ fontSize: 25 }} />
                  </Box>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 50,
                      left: 20,
                      animation: 'float 3s ease-in-out infinite 2s',
                    }}
                  >
                    <Lock sx={{ fontSize: 20 }} />
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {/* Features Section */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            Why Choose Our Platform?
          </Typography>
          <Typography variant="h6" textAlign="center" color="text.secondary" paragraph sx={{ mb: 6 }}>
            Built on cutting-edge cryptography and blockchain technology
          </Typography>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" component="h3" gutterBottom textAlign="center">
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {feature.description}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {feature.benefits.map((benefit, idx) => (
                        <Chip
                          key={idx}
                          label={benefit}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Use Cases Section */}
        <Box sx={{ mb: 8 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" component="h2" gutterBottom>
                Real-World Applications
              </Typography>
              <Typography variant="h6" color="text.secondary" paragraph>
                Discover how privacy-preserving digital identity can transform
                various aspects of digital life.
              </Typography>
              <List>
                {useCases.map((useCase, index) => (
                  <ListItem key={index} sx={{ pl: 0 }}>
                    <ListItemIcon>
                      <CheckCircle color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={useCase} />
                  </ListItem>
                ))}
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
                <Typography variant="h5" gutterBottom>
                  🎯 Example: Age Verification
                </Typography>
                <Typography variant="body1" paragraph>
                  Prove you're over 18 to access age-restricted content without
                  revealing your exact birth date or any other personal information.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label="Zero Knowledge" color="primary" size="small" />
                  <Chip label="Privacy First" color="secondary" size="small" />
                  <Chip label="Instant Verification" color="success" size="small" />
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* CTA Section */}
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            backgroundColor: 'primary.main',
            color: 'white',
            borderRadius: 3,
            mb: 4,
          }}
        >
          <Typography variant="h4" component="h2" gutterBottom>
            Ready to Take Control?
          </Typography>
          <Typography variant="h6" paragraph sx={{ mb: 4 }}>
            Start your journey towards self-sovereign digital identity today.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleGetStarted}
            sx={{
              backgroundColor: 'white',
              color: 'primary.main',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: 'grey.100',
              },
            }}
          >
            {isAuthenticated ? 'Access Dashboard' : 'Connect Wallet & Start'}
          </Button>
        </Box>
      </Container>

      {/* Custom animations */}
      <style>
        {`
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
            70% { box-shadow: 0 0 0 20px rgba(255, 255, 255, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}
      </style>
    </Box>
  );
};

export default HomePage;