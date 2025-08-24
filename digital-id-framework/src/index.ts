import * as dotenv from 'dotenv';
import DigitalIdentityAPI from './api/server';
import contractABI from '../artifacts/contracts/DigitalIdentityRegistry.sol/DigitalIdentityRegistry.json';

// Load environment variables
dotenv.config();

// Export all main components for use as a library
export { IdentityManager } from './core/IdentityManager';
export { PrivacyService } from './services/PrivacyService';
export { ZeroKnowledgeProof, IdentityAttribute } from './crypto/zkp/ZeroKnowledgeProof';
export { PaillierEncryption, StandardEncryption } from './crypto/encryption/HomomorphicEncryption';
export { DigitalIdentitySDK } from './sdk/DigitalIdentitySDK';

// Main function to start the API server
async function main() {
  const port = parseInt(process.env.PORT || '3000');
  const providerUrl = process.env.PROVIDER_URL || 'http://localhost:8545';
  const contractAddress = process.env.CONTRACT_ADDRESS || '';

  if (!contractAddress) {
    console.error('CONTRACT_ADDRESS environment variable is required');
    process.exit(1);
  }

  // Initialize and start the API server
  const api = new DigitalIdentityAPI(
    port,
    providerUrl,
    contractAddress,
    contractABI.abi
  );

  api.start();
}

// Run the main function if this is the entry point
if (require.main === module) {
  main().catch(console.error);
}