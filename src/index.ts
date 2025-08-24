import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

import { IdentityService } from './services/IdentityService';
import identityRoutes from './routes/identity';
import credentialRoutes from './routes/credentials';
import verificationRoutes from './routes/verification';
import zkProofRoutes from './routes/zkproofs';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
});

// Initialize blockchain provider and identity service
let identityService: IdentityService;

async function initializeServices() {
  try {
    // Initialize blockchain provider
    const providerUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545';
    const provider = new ethers.JsonRpcProvider(providerUrl);
    
    // Test connection
    await provider.getNetwork();
    logger.info('Connected to blockchain network');

    // Initialize identity service
    identityService = new IdentityService(provider);
    
    // Initialize contracts if addresses are provided
    const contractAddresses = {
      identityRegistry: process.env.IDENTITY_REGISTRY_ADDRESS || '',
      zkVerification: process.env.ZK_VERIFICATION_ADDRESS || '',
      privacyCredentials: process.env.PRIVACY_CREDENTIALS_ADDRESS || ''
    };

    if (contractAddresses.identityRegistry) {
      await identityService.initializeContracts(contractAddresses);
      logger.info('Smart contracts initialized');
    }

    // Make identity service available to routes
    app.locals.identityService = identityService;
    
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    // Continue without blockchain in development mode
    const provider = new ethers.JsonRpcProvider();
    identityService = new IdentityService(provider);
    app.locals.identityService = identityService;
    logger.warn('Running in development mode without blockchain connection');
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API information endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Blockchain Digital Identity Framework API',
    version: '1.0.0',
    description: 'Privacy-preserving digital identity management with zero-knowledge proofs',
    endpoints: {
      identities: '/api/identities',
      credentials: '/api/credentials',
      verification: '/api/verification',
      zkproofs: '/api/zkproofs'
    },
    features: [
      'Self-Sovereign Identity (SSI)',
      'Verifiable Credentials',
      'Zero-Knowledge Proofs',
      'Selective Disclosure',
      'Blockchain Integration',
      'Privacy Preservation'
    ]
  });
});

// API routes
app.use('/api/identities', identityRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/zkproofs', zkProofRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /health',
      'GET /api/info',
      'POST /api/identities',
      'GET /api/identities/:id',
      'POST /api/credentials',
      'GET /api/credentials/:id',
      'POST /api/verification/request',
      'POST /api/zkproofs/generate'
    ]
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    app.listen(PORT, () => {
      logger.info(`🚀 Blockchain Digital Identity Framework API running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`📖 API info: http://localhost:${PORT}/api/info`);
      logger.info(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;