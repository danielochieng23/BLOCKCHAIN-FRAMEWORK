# 🚀 Deployment Guide

This guide covers deploying the Blockchain Digital Identity Framework to various environments.

## 📋 Prerequisites

### System Requirements
- **Server**: 2 CPU cores, 4GB RAM minimum
- **Node.js**: Version 18 or higher
- **Database**: PostgreSQL 13+ (optional)
- **Redis**: For caching and sessions (optional)
- **SSL Certificate**: For production HTTPS

### Required Accounts
- **Infura/Alchemy**: Ethereum node provider
- **Etherscan**: Contract verification
- **Domain**: For production deployment
- **Cloud Provider**: AWS/GCP/Azure (optional)

## 🔧 Environment Setup

### 1. Environment Variables

Create environment files for each deployment:

**Production (.env.production)**
```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# Security
JWT_SECRET=your-super-secure-production-jwt-secret
JWT_EXPIRY=24h

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/blockchain_identity_prod
REDIS_URL=redis://localhost:6379

# Blockchain
BLOCKCHAIN_RPC_URL=https://mainnet.infura.io/v3/your-project-id
PRIVATE_KEY=your-deployment-private-key

# Contract Addresses (after deployment)
IDENTITY_REGISTRY_ADDRESS=0x...
ZK_VERIFICATION_ADDRESS=0x...
PRIVACY_CREDENTIALS_ADDRESS=0x...

# External Services
ETHERSCAN_API_KEY=your-etherscan-api-key
INFURA_PROJECT_ID=your-infura-project-id

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Staging (.env.staging)**
```bash
NODE_ENV=staging
PORT=3000
BLOCKCHAIN_RPC_URL=https://goerli.infura.io/v3/your-project-id
# ... other staging-specific configs
```

**Development (.env.development)**
```bash
NODE_ENV=development
PORT=3000
BLOCKCHAIN_RPC_URL=http://localhost:8545
# ... other development configs
```

### 2. Network Configuration

Update `hardhat.config.ts` with your network settings:

```typescript
const config: HardhatUserConfig = {
  networks: {
    mainnet: {
      url: process.env.MAINNET_URL,
      accounts: [process.env.PRIVATE_KEY!],
      gasPrice: 20000000000, // 20 gwei
    },
    goerli: {
      url: process.env.GOERLI_URL,
      accounts: [process.env.PRIVATE_KEY!],
      gasPrice: 5000000000, // 5 gwei
    },
    polygon: {
      url: "https://polygon-rpc.com/",
      accounts: [process.env.PRIVATE_KEY!],
      gasPrice: 30000000000, // 30 gwei
    },
  },
};
```

## 🏗️ Local Development

### 1. Setup Local Environment
```bash
# Clone repository
git clone <repository-url>
cd blockchain-digital-id-framework

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Setup environment
cp .env.example .env
# Edit .env with your local configuration

# Start local blockchain
npm run node

# Deploy contracts locally
npm run compile
npm run deploy:local
```

### 2. Start Development Servers
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
npm run frontend:dev

# Terminal 3: Local blockchain (if needed)
npm run node
```

### 3. Development Workflow
```bash
# Run tests
npm test
npx hardhat test

# Check code quality
npm run lint
npm run lint:fix

# Build for production
npm run build
npm run frontend:build
```

## 🧪 Staging Deployment

### 1. Deploy to Testnet

```bash
# Set staging environment
export NODE_ENV=staging

# Deploy contracts to Goerli
npm run deploy:testnet

# Update environment with contract addresses
# Edit .env.staging with deployed addresses

# Build application
npm run build
npm run frontend:build

# Start staging server
npm start
```

### 2. Verify Deployment

```bash
# Test API endpoints
curl https://staging-api.yourdomain.com/health
curl https://staging-api.yourdomain.com/api/info

# Test frontend
open https://staging.yourdomain.com

# Run integration tests
npm run test:integration
```

## 🚀 Production Deployment

### 1. Server Setup

**Using Docker (Recommended)**

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --only=production
RUN cd frontend && npm ci --only=production

# Copy source code
COPY . .

# Build applications
RUN npm run build
RUN npm run frontend:build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: blockchain_identity_prod
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
```

### 2. Deploy Smart Contracts

```bash
# Deploy to mainnet (CAREFUL!)
npm run deploy:mainnet

# Verify contracts on Etherscan
npx hardhat verify --network mainnet <CONTRACT_ADDRESS>

# Update production environment
# Add deployed contract addresses to .env.production
```

### 3. Application Deployment

```bash
# Build and deploy with Docker
docker-compose -f docker-compose.prod.yml up -d

# Or deploy without Docker
npm run build
npm run frontend:build
NODE_ENV=production npm start
```

### 4. SSL Configuration

**Using Let's Encrypt with Certbot:**
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

**Nginx Configuration (`nginx.conf`):**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## 🌩️ Cloud Deployment

### AWS Deployment

**Using AWS ECS:**

1. **Create ECR Repository**
   ```bash
   aws ecr create-repository --repository-name blockchain-identity
   ```

2. **Build and Push Docker Image**
   ```bash
   # Build image
   docker build -t blockchain-identity .

   # Tag for ECR
   docker tag blockchain-identity:latest aws_account_id.dkr.ecr.region.amazonaws.com/blockchain-identity:latest

   # Push to ECR
   docker push aws_account_id.dkr.ecr.region.amazonaws.com/blockchain-identity:latest
   ```

3. **Create ECS Task Definition**
   ```json
   {
     "family": "blockchain-identity",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "512",
     "memory": "1024",
     "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "app",
         "image": "aws_account_id.dkr.ecr.region.amazonaws.com/blockchain-identity:latest",
         "portMappings": [
           {
             "containerPort": 3000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NODE_ENV",
             "value": "production"
           }
         ]
       }
     ]
   }
   ```

### Google Cloud Deployment

**Using Cloud Run:**

```bash
# Build and submit to Cloud Build
gcloud builds submit --tag gcr.io/project-id/blockchain-identity

# Deploy to Cloud Run
gcloud run deploy blockchain-identity \
  --image gcr.io/project-id/blockchain-identity \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

### Azure Deployment

**Using Container Instances:**

```bash
# Create resource group
az group create --name blockchain-identity-rg --location eastus

# Deploy container
az container create \
  --resource-group blockchain-identity-rg \
  --name blockchain-identity \
  --image youracr.azurecr.io/blockchain-identity:latest \
  --cpu 1 \
  --memory 2 \
  --ports 3000 \
  --environment-variables NODE_ENV=production
```

## 📊 Monitoring & Maintenance

### 1. Health Checks

```bash
# API health check
curl -f https://api.yourdomain.com/health || exit 1

# Frontend health check
curl -f https://yourdomain.com || exit 1

# Blockchain connectivity
curl -X POST https://api.yourdomain.com/api/info
```

### 2. Logging

**Using Winston for structured logging:**
```javascript
// Production logging configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'blockchain-identity' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

### 3. Monitoring Setup

**Using PM2 for process management:**
```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'blockchain-identity',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Backup Strategy

```bash
#!/bin/bash
# backup.sh - Database backup script

# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Upload to S3
aws s3 cp backup_*.sql s3://your-backup-bucket/

# Clean old backups (keep last 7 days)
find . -name "backup_*.sql" -mtime +7 -delete
```

## 🔄 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npx hardhat test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Add your deployment commands here
          echo "Deploying to production..."
```

## 🚨 Troubleshooting

### Common Issues

1. **Contract Deployment Fails**
   ```bash
   # Check gas price and network
   npx hardhat run scripts/deploy.ts --network mainnet
   
   # Increase gas limit if needed
   await contract.deploy({ gasLimit: 5000000 });
   ```

2. **Frontend Build Errors**
   ```bash
   # Clear cache and rebuild
   rm -rf node_modules frontend/node_modules
   npm install
   cd frontend && npm install
   npm run frontend:build
   ```

3. **Database Connection Issues**
   ```bash
   # Test database connection
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Check Redis connection
   redis-cli ping
   ```

4. **SSL Certificate Issues**
   ```bash
   # Renew certificate
   sudo certbot renew
   
   # Test SSL configuration
   openssl s_client -connect yourdomain.com:443
   ```

### Performance Optimization

1. **Enable Gzip Compression**
2. **Use CDN for Static Assets**
3. **Implement Caching Headers**
4. **Optimize Database Queries**
5. **Monitor Memory Usage**

---

For additional support, please refer to our [troubleshooting guide](./troubleshooting.md) or [open an issue](https://github.com/org/blockchain-identity/issues).