import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  AccountBalanceWallet,
  Person,
  MoreVert,
  Dashboard,
  VerifiedUser,
  Security,
  VpnKey,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { account, isConnected, connectWallet, disconnectWallet, chainId } = useWeb3();
  const { user, isAuthenticated, logout } = useAuth();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    disconnectWallet();
    handleMenuClose();
    navigate('/');
  };

  const getNetworkName = (chainId: number | null) => {
    switch (chainId) {
      case 1: return 'Ethereum';
      case 5: return 'Goerli';
      case 11155111: return 'Sepolia';
      case 137: return 'Polygon';
      case 1337: return 'Localhost';
      default: return 'Unknown';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const navigationItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
    { label: 'Identity', path: '/identity', icon: <Person /> },
    { label: 'Credentials', path: '/credentials', icon: <VerifiedUser /> },
    { label: 'Verification', path: '/verification', icon: <Security /> },
    { label: 'ZK Proofs', path: '/zkproofs', icon: <VpnKey /> },
  ];

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        {/* Logo/Brand */}
        <Typography
          variant="h6"
          component="div"
          sx={{ 
            flexGrow: 0, 
            mr: 4,
            cursor: 'pointer',
            fontWeight: 700,
            background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
          onClick={() => navigate('/')}
        >
          🔒 Digital ID
        </Typography>

        {/* Navigation Links - Desktop */}
        {!isMobile && isAuthenticated && (
          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
            {navigationItems.map((item) => (
              <Button
                key={item.path}
                color="inherit"
                startIcon={item.icon}
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 2,
                  backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        )}

        {/* Spacer for mobile */}
        {isMobile && <Box sx={{ flexGrow: 1 }} />}

        {/* Network Info */}
        {isConnected && chainId && (
          <Chip
            label={getNetworkName(chainId)}
            size="small"
            color="secondary"
            sx={{ mr: 2 }}
          />
        )}

        {/* Wallet Connection */}
        {!isConnected ? (
          <Button
            color="inherit"
            startIcon={<AccountBalanceWallet />}
            onClick={connectWallet}
            variant="outlined"
            sx={{ 
              borderColor: 'white',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            Connect Wallet
          </Button>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Account Info */}
            <Tooltip title={account || ''}>
              <Chip
                avatar={<Avatar sx={{ width: 24, height: 24 }}>{account?.slice(2, 4).toUpperCase()}</Avatar>}
                label={formatAddress(account || '')}
                size="small"
                color="primary"
                sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              />
            </Tooltip>

            {/* User Menu */}
            {isAuthenticated && (
              <>
                <IconButton
                  color="inherit"
                  onClick={handleMenuOpen}
                  size="small"
                >
                  <MoreVert />
                </IconButton>
                
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: { mt: 1, minWidth: 200 },
                  }}
                >
                  {isMobile && navigationItems.map((item) => (
                    <MenuItem
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        handleMenuClose();
                      }}
                      selected={location.pathname === item.path}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {item.icon}
                        {item.label}
                      </Box>
                    </MenuItem>
                  ))}
                  
                  {isMobile && <MenuItem divider />}
                  
                  <MenuItem onClick={handleMenuClose}>
                    <Typography variant="caption" color="textSecondary">
                      DID: {user?.did ? `${user.did.slice(0, 20)}...` : 'Not created'}
                    </Typography>
                  </MenuItem>
                  
                  <MenuItem onClick={handleMenuClose}>
                    <Typography variant="caption" color="textSecondary">
                      Identity: {user?.hasIdentity ? 'Active' : 'Not created'}
                    </Typography>
                  </MenuItem>
                  
                  <MenuItem onClick={handleLogout}>
                    Logout
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;