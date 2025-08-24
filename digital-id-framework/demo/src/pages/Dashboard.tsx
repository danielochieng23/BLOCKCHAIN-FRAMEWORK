import React from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
} from '@mui/material';
import {
  People,
  VerifiedUser,
  Security,
  TrendingUp,
  CheckCircle,
  AccessTime,
  Fingerprint,
} from '@mui/icons-material';

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}

const Dashboard: React.FC = () => {
  const stats: StatCard[] = [
    {
      title: 'Active Identities',
      value: '2,847',
      icon: <People />,
      color: '#6366f1',
      trend: 12.5,
    },
    {
      title: 'Verified Credentials',
      value: '8,294',
      icon: <VerifiedUser />,
      color: '#10b981',
      trend: 8.2,
    },
    {
      title: 'Privacy Score',
      value: '94%',
      icon: <Security />,
      color: '#f59e0b',
    },
    {
      title: 'Verifications Today',
      value: '342',
      icon: <CheckCircle />,
      color: '#8b5cf6',
      trend: 15.8,
    },
  ];

  const recentActivities = [
    {
      type: 'credential',
      message: 'New credential issued: Driver License',
      time: '2 minutes ago',
      icon: <VerifiedUser />,
    },
    {
      type: 'verification',
      message: 'Age verification completed successfully',
      time: '15 minutes ago',
      icon: <CheckCircle />,
    },
    {
      type: 'identity',
      message: 'Identity attributes updated',
      time: '1 hour ago',
      icon: <Fingerprint />,
    },
    {
      type: 'privacy',
      message: 'Privacy settings enhanced',
      time: '3 hours ago',
      icon: <Security />,
    },
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Overview of your digital identity ecosystem
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                border: '1px solid #334155',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: stat.color,
                      width: 48,
                      height: 48,
                      mr: 2,
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                      {stat.value}
                    </Typography>
                  </Box>
                </Box>
                {stat.trend && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TrendingUp sx={{ fontSize: 16, mr: 0.5, color: '#10b981' }} />
                    <Typography variant="body2" sx={{ color: '#10b981' }}>
                      +{stat.trend}% from last month
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, bgcolor: '#1e293b', border: '1px solid #334155' }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Recent Activity
            </Typography>
            <List>
              {recentActivities.map((activity, index) => (
                <ListItem
                  key={index}
                  sx={{
                    mb: 1,
                    bgcolor: '#0f172a',
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#1e293b' },
                  }}
                >
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: '#6366f1', width: 36, height: 36 }}>
                      {activity.icon}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.message}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <AccessTime sx={{ fontSize: 14, mr: 0.5 }} />
                        <Typography variant="caption">{activity.time}</Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Privacy Metrics */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, bgcolor: '#1e293b', border: '1px solid #334155' }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Privacy Metrics
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}> 
                <Typography variant="body2">Data Minimization</Typography>
                <Typography variant="body2">92%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={92} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Selective Disclosure</Typography>
                <Typography variant="body2">88%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={88} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Zero-Knowledge Proofs</Typography>
                <Typography variant="body2">95%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={95} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Active Privacy Features
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label="K-Anonymity" size="small" color="primary" />
                <Chip label="Differential Privacy" size="small" color="primary" />
                <Chip label="Homomorphic Encryption" size="small" color="primary" />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;