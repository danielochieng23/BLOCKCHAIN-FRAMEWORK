import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import winston from 'winston';
import { IdentityManager } from '../core/IdentityManager';
import { PrivacyService } from '../services/PrivacyService';
import { authMiddleware, validateRequest } from './middleware';
import identityRoutes from './routes/identity';
import credentialRoutes from './routes/credential';
import privacyRoutes from './routes/privacy';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

export class DigitalIdentityAPI {
  private app: Express;
  private identityManager: IdentityManager;
  private privacyService: PrivacyService;
  private port: number;

  constructor(
    port: number = 3000,
    providerUrl: string,
    contractAddress: string,
    contractABI: any[]
  ) {
    this.app = express();
    this.port = port;

    // Initialize services
    const zkpConfig = {
      circuitPath: process.env.ZKP_CIRCUIT_PATH || './circuits',
      provingKeyPath: process.env.ZKP_PROVING_KEY_PATH || './circuits/proving_key.json',
      verificationKeyPath: process.env.ZKP_VERIFICATION_KEY_PATH || './circuits/verification_key.json'
    };

    this.identityManager = new IdentityManager(
      providerUrl,
      contractAddress,
      contractABI,
      zkpConfig
    );

    this.privacyService = new PrivacyService(zkpConfig);

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true
    }));
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // API routes
    this.app.use('/api/v1/identity', identityRoutes(this.identityManager));
    this.app.use('/api/v1/credential', credentialRoutes(this.identityManager));
    this.app.use('/api/v1/privacy', privacyRoutes(this.privacyService));

    // Main endpoints
    this.setupMainEndpoints();
  }

  private setupMainEndpoints(): void {
    // Create new identity
    this.app.post('/api/v1/identity/create', 
      validateRequest(['owner', 'attributes']),
      async (req: Request, res: Response) => {
        try {
          const { owner, attributes } = req.body;
          const identity = await this.identityManager.createIdentity(owner, attributes);
          
          res.status(201).json({
            success: true,
            data: {
              did: identity.did,
              owner: identity.owner,
              createdAt: identity.createdAt
            }
          });
        } catch (error) {
          logger.error('Identity creation failed:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create identity'
          });
        }
      }
    );

    // Issue credential
    this.app.post('/api/v1/credential/issue',
      authMiddleware,
      validateRequest(['subjectDid', 'claims', 'expiresInDays']),
      async (req: Request, res: Response) => {
        try {
          const { subjectDid, claims, expiresInDays } = req.body;
          const issuerPrivateKey = (req as any).user.privateKey;
          
          const credential = await this.identityManager.issueCredential(
            issuerPrivateKey,
            subjectDid,
            new Map(Object.entries(claims)),
            expiresInDays
          );
          
          res.status(201).json({
            success: true,
            data: credential
          });
        } catch (error) {
          logger.error('Credential issuance failed:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to issue credential'
          });
        }
      }
    );

    // Create verifiable presentation
    this.app.post('/api/v1/presentation/create',
      authMiddleware,
      validateRequest(['holderDid', 'credentialIds', 'requestedAttributes', 'verifierAddress']),
      async (req: Request, res: Response) => {
        try {
          const { holderDid, credentialIds, requestedAttributes, verifierAddress } = req.body;
          
          // In real implementation, fetch credentials from storage
          const credentials = []; // Placeholder
          
          const presentation = await this.identityManager.createPresentation(
            holderDid,
            credentials,
            requestedAttributes,
            verifierAddress
          );
          
          res.status(201).json({
            success: true,
            data: presentation
          });
        } catch (error) {
          logger.error('Presentation creation failed:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create presentation'
          });
        }
      }
    );

    // Verify presentation
    this.app.post('/api/v1/presentation/verify',
      validateRequest(['presentation']),
      async (req: Request, res: Response) => {
        try {
          const { presentation } = req.body;
          const isValid = await this.identityManager.verifyPresentation(presentation);
          
          res.json({
            success: true,
            data: {
              isValid,
              verifiedAt: new Date().toISOString()
            }
          });
        } catch (error) {
          logger.error('Presentation verification failed:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to verify presentation'
          });
        }
      }
    );

    // Privacy-preserving operations
    this.app.post('/api/v1/privacy/selective-disclosure',
      authMiddleware,
      validateRequest(['attributes', 'policyId']),
      async (req: Request, res: Response) => {
        try {
          const { attributes, policyId } = req.body;
          const result = await this.privacyService.generateSelectiveDisclosure(
            attributes,
            policyId
          );
          
          res.json({
            success: true,
            data: {
              disclosedData: Array.from(result.disclosedData.entries()),
              proofs: result.proofs,
              commitments: Array.from(result.commitments.entries())
            }
          });
        } catch (error) {
          logger.error('Selective disclosure failed:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to generate selective disclosure'
          });
        }
      }
    );

    // Anonymous credential
    this.app.post('/api/v1/privacy/anonymous-credential',
      authMiddleware,
      validateRequest(['attributes', 'domain']),
      async (req: Request, res: Response) => {
        try {
          const { attributes, domain } = req.body;
          const credential = await this.privacyService.createAnonymousCredential(
            attributes,
            domain
          );
          
          res.json({
            success: true,
            data: {
              id: credential.id,
              blindedAttributes: Array.from(credential.blindedAttributes.entries()),
              nullifier: credential.nullifier
            }
          });
        } catch (error) {
          logger.error('Anonymous credential creation failed:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to create anonymous credential'
          });
        }
      }
    );

    // Privacy analytics
    this.app.post('/api/v1/privacy/analytics',
      authMiddleware,
      validateRequest(['identities', 'attributeName']),
      async (req: Request, res: Response) => {
        try {
          const { identities, attributeName } = req.body;
          const result = await this.identityManager.generatePrivateAnalytics(
            identities,
            attributeName
          );
          
          res.json({
            success: true,
            data: {
              encryptedSum: result.encryptedSum.value.toString(),
              publicKey: {
                n: result.publicKey.n.toString(),
                g: result.publicKey.g.toString()
              }
            }
          });
        } catch (error) {
          logger.error('Privacy analytics failed:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to generate privacy analytics'
          });
        }
      }
    );
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found'
      });
    });

    // Global error handler
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : err.message
      });
    });
  }

  public start(): void {
    this.app.listen(this.port, () => {
      logger.info(`Digital Identity API server running on port ${this.port}`);
    });
  }
}

// Export for use as module
export default DigitalIdentityAPI;