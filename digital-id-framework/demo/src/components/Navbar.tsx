import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Fingerprint, 
  VerifiedUser, 
  Privacy, 
  Dashboard as DashboardIcon 
} from '@mui/icons-material';

const Navbar: React.FC = () => {
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
    { label: 'Create Identity', path: '/create-identity', icon: <Fingerprint /> },
    { label: 'Credentials', path: '/credentials', icon: <VerifiedUser /> },
    { label: 'Verify', path: '/verify', icon: <Shield /> },
    { label: 'Privacy', path: '/privacy', icon: <Privacy /> },
  ];

  return (
    <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid #334155' }}>
      <Toolbar>
        <IconButton edge="start" color="inherit" sx={{ mr: 2 }}>
          <Shield sx={{ fontSize: 32 }} />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 0, mr: 4, fontWeight: 600 }}>
          Digital ID Framework
        </Typography>
        
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              sx={{ 
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        <Button 
          variant="contained" 
          color="primary"
          sx={{ textTransform: 'none' }}
        >
          Connect Wallet
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;