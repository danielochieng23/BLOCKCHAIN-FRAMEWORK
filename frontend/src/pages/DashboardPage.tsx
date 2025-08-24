import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
  Paper,
} from '@mui/material';
import {
  Person,
  VerifiedUser,
  Security,
  VpnKey,
  Add,
  CheckCircle,
  Warning,
  Info,
  Timeline,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';
import { apiService } from '../services/apiService';
import toast from 'react-hot-toast';

interface DashboardStats {
  identitiesCount: number;
  credentialsCount: number;
  verificationsCount: number;
  zkProofsCount: number;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { account } = useWeb3();
  
  const [stats, setStats] = useState<DashboardStats>({
    identitiesCount: 0,
    credentialsCount: 0,
    verificationsCount: 0,
    zkProofsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load various statistics
      const [verificationStats, zkStats] = await Promise.all([
        apiService.getVerificationStatistics().catch(() => ({ data: { statistics: {} } })),
        apiService.getZKStatistics().catch(() => ({ data: { statistics: {} } })),
      ]);

      setStats({
        identitiesCount: user?.hasIdentity ? 1 : 0,
        credentialsCount: 0, // Will be loaded separately
        verificationsCount: verificationStats.data.statistics?.overall?.totalParticipation || 0,
        zkProofsCount: zkStats.data.statistics?.total || 0,
      });

      // Mock recent activity for demonstration
      setRecentActivity([
        {
          type: 'identity_created',
          message: 'Digital identity created',
          timestamp: new Date(),
          icon: <Person color="primary" />,
        },
        {
          type: 'credential_issued',
          message: 'Age verification credential issued',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          icon: <VerifiedUser color="success" />,
        },
        {
          type: 'zk_proof',
          message: 'Zero-knowledge proof generated',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          icon: <VpnKey color="secondary" />,
        },
      ]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateIdentity = async () => {
    try {
      await apiService.createIdentity({});
      toast.success('Identity created successfully!');
      // Refresh user data
      window.location.reload();
    } catch (error) {
      console.error('Error creating identity:', error);
      toast.error('Failed to create identity');
    }
  };

  const getCompletionPercentage = () => {
    let completed = 0;
    if (user?.hasIdentity) completed += 25;
    if (stats.credentialsCount > 0) completed += 25;
    if (stats.verificationsCount > 0) completed += 25;
    if (stats.zkProofsCount > 0) completed += 25;
    return completed;
  };

  const quickActions = [
    {
      title: 'Create Identity',
      description: 'Set up your decentralized identity',
      icon: <Person />,
      action: () => navigate('/identity'),
      disabled: user?.hasIdentity,
      color: 'primary' as const,
    },
    {
      title: 'Issue Credential',
      description: 'Create a verifiable credential',
      icon: <VerifiedUser />,
      action: () => navigate('/credentials'),
      disabled: false,
      color: 'success' as const,
    },
    {
      title: 'Request Verification',
      description: 'Start a verification process',
      icon: <Security />,
      action: () => navigate('/verification'),
      disabled: false,
      color: 'warning' as const,
    },
    {
      title: 'Generate ZK Proof',
      description: 'Create a zero-knowledge proof',
      icon: <VpnKey />,
      action: () => navigate('/zkproofs'),
      disabled: false,
      color: 'secondary' as const,
    },
  ];

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ width: '100%', mt: 4 }}>
          <LinearProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Welcome Section */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome back! 👋
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Manage your decentralized digital identity
        </Typography>
      </Box>

      {/* Setup Progress */}
      {!user?.hasIdentity && (
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            Complete your identity setup
          </Typography>
          <Box sx={{ width: '100%', mt: 1, mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={getCompletionPercentage()} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
          <Typography variant="body2">
            {getCompletionPercentage()}% complete • 
            {!user?.hasIdentity ? ' Create your identity to get started' : ' Great progress!'}
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <Person />
                </Avatar>
                <Box>
                  <Typography variant="h4">{stats.identitiesCount}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Digital Identity
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <VerifiedUser />
                </Avatar>
                <Box>
                  <Typography variant="h4">{stats.credentialsCount}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Credentials
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <Security />
                </Avatar>
                <Box>
                  <Typography variant="h4">{stats.verificationsCount}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Verifications
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                  <VpnKey />
                </Avatar>
                <Box>
                  <Typography variant="h4">{stats.zkProofsCount}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    ZK Proofs
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                {quickActions.map((action, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={action.icon}
                      onClick={action.action}
                      disabled={action.disabled}
                      color={action.color}
                      sx={{
                        p: 2,
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        height: 80,
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Typography variant="subtitle2">
                        {action.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {action.description}
                      </Typography>
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Info */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Info color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Wallet Address"
                    secondary={`${account?.slice(0, 6)}...${account?.slice(-4)}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    {user?.hasIdentity ? (
                      <CheckCircle color="success" />
                    ) : (
                      <Warning color="warning" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Identity Status"
                    secondary={user?.hasIdentity ? 'Active' : 'Not created'}
                  />
                </ListItem>
                {user?.did && (
                  <ListItem>
                    <ListItemIcon>
                      <VpnKey color="secondary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="DID"
                      secondary={`${user.did.slice(0, 20)}...`}
                    />
                  </ListItem>
                )}
              </List>
              
              {!user?.hasIdentity && (
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Add />}
                  onClick={handleCreateIdentity}
                  sx={{ mt: 2 }}
                >
                  Create Identity
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Timeline sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Recent Activity
                </Typography>
              </Box>
              
              {recentActivity.length > 0 ? (
                <List>
                  {recentActivity.map((activity, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemIcon>
                          {activity.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={activity.message}
                          secondary={activity.timestamp.toLocaleString()}
                        />
                      </ListItem>
                      {index < recentActivity.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                  <Typography variant="body2" color="text.secondary">
                    No recent activity. Start by creating your identity!
                  </Typography>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardPage;