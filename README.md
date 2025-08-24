# 🔒 Blockchain & Privacy-Preserving Digital ID Framework

A comprehensive decentralized identity management system built on blockchain technology with advanced privacy-preserving mechanisms including zero-knowledge proofs and selective disclosure.

## 🌟 Features

### Core Capabilities
- **Self-Sovereign Identity (SSI)**: Complete user control over digital identity
- **Verifiable Credentials**: W3C standard compliant digital credentials
- **Zero-Knowledge Proofs**: Prove claims without revealing sensitive data
- **Selective Disclosure**: Share only necessary information
- **Blockchain Integration**: Immutable and decentralized identity registry
- **Privacy-First Design**: Advanced cryptographic protection

### Privacy Features
- **Age Verification**: Prove minimum age without revealing birth date
- **Location Verification**: Prove location within region without exact coordinates
- **Income Verification**: Prove income threshold without revealing exact amount
- **Membership Proofs**: Prove group membership without revealing identity
- **Credential Ownership**: Prove credential possession without disclosure

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Blockchain    │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Ethereum)    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Identity UI   │    │ • Identity Mgmt │    │ • Smart Contracts│
│ • Credential UI │    │ • ZK Proofs     │    │ • DID Registry  │
│ • ZK Proof UI   │    │ • Verification  │    │ • Credentials   │
│ • Wallet Integration│ │ • Cryptography  │    │ • ZK Verification│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

**Backend:**
- Node.js + TypeScript
- Express.js API framework
- ethers.js for blockchain interaction
- PostgreSQL for metadata storage
- Redis for caching

**Blockchain:**
- Solidity smart contracts
- Hardhat development environment
- OpenZeppelin security libraries
- Zero-knowledge proof circuits

**Frontend:**
- React 18 + TypeScript
- Material-UI components
- ethers.js wallet integration
- React Query for state management

**Cryptography:**
- Ed25519 digital signatures
- AES-256-GCM encryption
- zk-SNARKs for privacy proofs
- BBS+ signatures for selective disclosure

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 8+
- Git
- MetaMask or compatible wallet

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd blockchain-digital-id-framework
   ```

2. **Install dependencies**
   ```bash
   npm run setup
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start local blockchain (optional)**
   ```bash
   npm run node
   ```

5. **Deploy contracts**
   ```bash
   npm run compile
   npm run deploy:local
   ```

6. **Start the backend**
   ```bash
   npm run dev
   ```

7. **Start the frontend**
   ```bash
   npm run frontend:dev
   ```

8. **Access the application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - API Documentation: http://localhost:3000/api/info

## 📖 Usage Guide

### 1. Connect Wallet
- Install MetaMask browser extension
- Connect your Ethereum wallet
- Switch to supported network (localhost/testnet)

### 2. Create Digital Identity
- Click "Create Identity" in the dashboard
- Sign the transaction to deploy your DID
- Your decentralized identifier (DID) will be generated

### 3. Issue Credentials
- Navigate to Credentials section
- Choose credential type (Age, Location, Income, etc.)
- Fill in the required information
- Sign to issue the verifiable credential

### 4. Generate Zero-Knowledge Proofs
- Go to ZK Proofs section
- Select proof type (age verification, location proof, etc.)
- Provide necessary inputs
- Generate cryptographic proof

### 5. Verify Claims
- Request verification from other users
- Submit ZK proofs to prove claims
- Verify presentations from others

## 🔧 API Reference

### Authentication
All API requests require authentication via JWT token obtained through wallet signature.

```javascript
// Authenticate with wallet signature
POST /api/identities/auth
{
  "message": "signed_message",
  "signature": "0x...",
  "address": "0x..."
}
```

### Identity Management
```javascript
// Create identity
POST /api/identities

// Get identity
GET /api/identities/:id

// Update identity
PUT /api/identities/:id

// Create presentation
POST /api/identities/:id/presentations
```

### Credentials
```javascript
// Issue credential
POST /api/credentials/issue

// Verify credential
POST /api/credentials/:id/verify

// Get holder credentials
GET /api/credentials/holder/:address

// Create presentation
POST /api/credentials/create-presentation
```

### Zero-Knowledge Proofs
```javascript
// Generate ZK proof
POST /api/zkproofs/generate

// Verify ZK proof
POST /api/zkproofs/verify

// Get available circuits
GET /api/zkproofs/circuits

// Batch verify proofs
POST /api/zkproofs/batch-verify
```

### Verification
```javascript
// Request verification
POST /api/verification/request

// Respond to verification
POST /api/verification/respond/:id

// Get verification requests
GET /api/verification/requests

// Verify presentation
POST /api/verification/verify-presentation
```

## 🧪 Testing

### Run Tests
```bash
# Smart contract tests
npx hardhat test

# Backend tests
npm test

# Frontend tests
cd frontend && npm test

# Coverage report
npm run test:coverage
```

### Test Scenarios
- Identity creation and management
- Credential issuance and verification
- Zero-knowledge proof generation
- Verification workflows
- Access control and security

## 🔐 Security Considerations

### Smart Contract Security
- Access control with role-based permissions
- Reentrancy guards on all state-changing functions
- Input validation and sanitization
- Pausable contracts for emergency stops
- Comprehensive test coverage

### Privacy Protection
- Zero-knowledge proofs prevent data leakage
- Selective disclosure minimizes information sharing
- Cryptographic commitments hide sensitive data
- Nullifiers prevent double-spending attacks
- Secure random number generation

### API Security
- JWT token authentication
- Rate limiting on sensitive endpoints
- CORS protection
- Helmet security middleware
- Input validation with Zod schemas

## 📚 Additional Documentation

- [Architecture Deep Dive](./docs/architecture.md)
- [Smart Contract Reference](./docs/contracts.md)
- [ZK Proof Circuits](./docs/zk-circuits.md)
- [API Documentation](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)
- [Security Audit](./docs/security.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Run the full test suite
5. Submit a pull request

### Code Standards
- TypeScript for type safety
- ESLint + Prettier for code formatting
- Comprehensive test coverage
- Clear documentation and comments

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [W3C DID Specification](https://www.w3.org/TR/did-core/)
- [Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/)
- [OpenZeppelin](https://openzeppelin.com/) for security libraries
- [Circom](https://docs.circom.io/) for ZK circuit development
- [snarkjs](https://github.com/iden3/snarkjs) for ZK proof generation

## 🌐 Links

- [Live Demo](https://demo.blockchain-identity.example.com)
- [Documentation](https://docs.blockchain-identity.example.com)
- [API Reference](https://api.blockchain-identity.example.com)
- [GitHub Issues](https://github.com/org/blockchain-identity/issues)
- [Community Discord](https://discord.gg/blockchain-identity)

## 📊 Roadmap

### Phase 1 (Current)
- ✅ Core identity management
- ✅ Basic ZK proof circuits
- ✅ Web interface
- ✅ Smart contract deployment

### Phase 2 (Next)
- 🔄 Mobile application
- 🔄 IPFS integration
- 🔄 Advanced ZK circuits
- 🔄 Multi-chain support

### Phase 3 (Future)
- ⏳ Decentralized governance
- ⏳ Cross-chain identity
- ⏳ Advanced biometric proofs
- ⏳ Enterprise integrations

---

Built with ❤️ for a privacy-preserving digital future.