# Blockchain & Privacy-Preserving Digital ID Framework

A comprehensive framework for building decentralized digital identity systems with advanced privacy-preserving features including zero-knowledge proofs, selective disclosure, and homomorphic encryption.

## 🚀 Features

### Core Identity Management
- **Decentralized Identifiers (DIDs)**: Self-sovereign identity creation and management
- **Verifiable Credentials**: Issue, manage, and verify digital credentials
- **Blockchain Integration**: Immutable identity records on Ethereum-compatible chains
- **Multi-signature Support**: Enhanced security for identity operations

### Privacy-Preserving Technologies
- **Zero-Knowledge Proofs**: Prove attributes without revealing actual values
- **Selective Disclosure**: Share only necessary information
- **Homomorphic Encryption**: Perform computations on encrypted data
- **K-Anonymity**: Ensure identity anonymity within groups
- **Differential Privacy**: Add noise for aggregate queries

### Security Features
- **End-to-End Encryption**: All sensitive data encrypted at rest and in transit
- **Cryptographic Commitments**: Tamper-proof attribute verification
- **Nullifier Support**: Prevent double-spending and replay attacks
- **Audit Trail**: Privacy-preserving audit logs

## 📋 Prerequisites

- Node.js v18+ and npm
- Ethereum wallet (MetaMask recommended)
- Access to an Ethereum RPC endpoint (local or remote)

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/digital-id-framework.git
cd digital-id-framework

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Compile smart contracts
npm run compile-contracts

# Deploy contracts (to local network)
npm run deploy
```

## 🚀 Quick Start

### 1. Start the API Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### 2. Using the SDK

```typescript
import { DigitalIdentitySDK } from 'digital-id-framework';

// Initialize SDK
const sdk = new DigitalIdentitySDK({
  apiUrl: 'http://localhost:3000',
  privateKey: 'your-private-key'
});

// Create a new identity
const identity = await sdk.createIdentity(
  '0xYourAddress',
  [
    { name: 'firstName', value: 'John' },
    { name: 'lastName', value: 'Doe' },
    { name: 'age', value: '25' }
  ]
);

// Issue a credential
const credential = await sdk.issueCredential(
  identity.did,
  {
    type: 'DriverLicense',
    licenseNumber: 'DL123456',
    expiryDate: '2025-12-31'
  }
);

// Create a privacy-preserving presentation
const presentation = await sdk.createPresentation(
  identity.did,
  [credential.id],
  ['age'], // Only disclose age
  '0xVerifierAddress'
);
```

### 3. Running the Demo Application

```bash
cd demo
npm install
npm start
```

Visit `http://localhost:3001` to see the demo application.

## 📚 API Reference

### Identity Endpoints

#### Create Identity
```http
POST /api/v1/identity/create
Content-Type: application/json
Authorization: Bearer <token>

{
  "owner": "0xAddress",
  "attributes": [
    { "name": "firstName", "value": "John" },
    { "name": "lastName", "value": "Doe" }
  ]
}
```

#### Get Identity
```http
GET /api/v1/identity/{did}
Authorization: Bearer <token>
```

### Credential Endpoints

#### Issue Credential
```http
POST /api/v1/credential/issue
Content-Type: application/json
Authorization: Bearer <token>

{
  "subjectDid": "did:eth:0x...",
  "claims": {
    "type": "Passport",
    "number": "P123456",
    "country": "US"
  },
  "expiresInDays": 365
}
```

### Privacy Endpoints

#### Selective Disclosure
```http
POST /api/v1/privacy/selective-disclosure
Content-Type: application/json
Authorization: Bearer <token>

{
  "attributes": [...],
  "policyId": "policy-id"
}
```

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend App  │────▶│    REST API     │────▶│   Blockchain    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                         │
         │                       ▼                         │
         │              ┌─────────────────┐               │
         └─────────────▶│      SDK        │───────────────┘
                        └─────────────────┘
                                 │
                        ┌────────┴────────┐
                        │                 │
                 ┌──────▼──────┐  ┌──────▼──────┐
                 │   ZK Proof   │  │ Encryption  │
                 │   Service    │  │  Service    │
                 └──────────────┘  └──────────────┘
```

## 🔐 Smart Contracts

### DigitalIdentityRegistry
Main contract for identity management.

**Key Functions:**
- `createIdentity(bytes32 did, bytes32 dataHash)`
- `issueCredential(bytes32 did, bytes32 credentialId, ...)`
- `revokeCredential(bytes32 did, bytes32 credentialId)`
- `requestVerification(bytes32 did, bytes32[] attributes)`

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run contract tests
npm run test:contracts
```

## 🚢 Deployment

### Deploy to Testnet

```bash
# Deploy to Sepolia
NETWORK=sepolia npm run deploy

# Deploy to Polygon Mumbai
NETWORK=mumbai npm run deploy
```

### Production Deployment

1. Update environment variables for production
2. Run security audit: `npm run audit`
3. Deploy contracts: `npm run deploy:mainnet`
4. Deploy API: Use provided Docker configuration

## 🐳 Docker Support

```bash
# Build Docker image
docker build -t digital-id-framework .

# Run container
docker run -p 3000:3000 --env-file .env digital-id-framework
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenZeppelin for smart contract libraries
- Circom/SnarkJS for zero-knowledge proof implementation
- Ethereum Foundation for blockchain infrastructure

## 📞 Support

- Documentation: [docs.example.com](https://docs.example.com)
- Discord: [discord.gg/example](https://discord.gg/example)
- Email: support@example.com