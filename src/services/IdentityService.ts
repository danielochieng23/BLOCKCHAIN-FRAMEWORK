import { ethers } from 'ethers';
import { DigitalIdentity, VerifiableCredential, VerifiablePresentation } from '../models/Identity';
import { CryptoUtils } from '../utils/crypto';
import { ZKProofGenerator } from '../utils/zkProofs';

/**
 * Identity Service
 * Manages digital identities and their interactions with the blockchain
 */

export interface IdentityCreationParams {
  owner: string;
  didDocument?: any;
  keyPair?: { publicKey: string; privateKey: string };
}

export interface CredentialIssuanceParams {
  issuer: string;
  subject: string;
  credentialType: string;
  attributes: { [key: string]: any };
  expirationDate?: Date;
  useZKProof?: boolean;
}

export interface VerificationRequest {
  verifier: string;
  subject: string;
  requiredAttributes: string[];
  useZKProof?: boolean;
}

export interface SelectiveDisclosureRequest {
  credentialId: string;
  attributesToDisclose: string[];
  verifier: string;
  challenge?: string;
}

export class IdentityService {
  private identities: Map<string, DigitalIdentity>;
  private blockchainProvider: ethers.Provider;
  private contracts: {
    identityRegistry?: ethers.Contract;
    zkVerification?: ethers.Contract;
    privacyCredentials?: ethers.Contract;
  };

  constructor(provider: ethers.Provider) {
    this.identities = new Map();
    this.blockchainProvider = provider;
    this.contracts = {};
  }

  /**
   * Initialize contracts
   */
  async initializeContracts(contractAddresses: {
    identityRegistry: string;
    zkVerification: string;
    privacyCredentials: string;
  }): Promise<void> {
    // Contract ABIs would be loaded from artifacts in a real implementation
    const registryABI = [
      "function createIdentity(string memory didDocument) external",
      "function getIdentity(uint256 identityId) external view returns (tuple)",
      "function updateIdentity(uint256 identityId, string memory newDidDocument) external",
      "function addressToIdentityId(address owner) external view returns (uint256)"
    ];

    const zkABI = [
      "function requestProof(address prover, string memory proofType, bytes32 challenge) external returns (bytes32)",
      "function submitProof(bytes32 requestId, tuple proof) external",
      "function verifyProof(string memory proofType, tuple proof) external view returns (bool)"
    ];

    const credentialABI = [
      "function issueSelectiveDisclosureCredential(address holder, string[] memory attributeNames, bytes32[] memory attributeCommitments, bytes memory signature, uint256 expiresAt) external",
      "function requestDisclosure(address holder, string[] memory requestedAttributes) external returns (bytes32)"
    ];

    this.contracts.identityRegistry = new ethers.Contract(
      contractAddresses.identityRegistry,
      registryABI,
      this.blockchainProvider
    );

    this.contracts.zkVerification = new ethers.Contract(
      contractAddresses.zkVerification,
      zkABI,
      this.blockchainProvider
    );

    this.contracts.privacyCredentials = new ethers.Contract(
      contractAddresses.privacyCredentials,
      credentialABI,
      this.blockchainProvider
    );
  }

  /**
   * Create a new digital identity
   */
  async createIdentity(params: IdentityCreationParams): Promise<DigitalIdentity> {
    // Create identity object
    const identity = new DigitalIdentity(params.owner, params.keyPair);

    // Store locally
    this.identities.set(identity.id, identity);

    try {
      // Register on blockchain if contracts are available
      if (this.contracts.identityRegistry) {
        const signer = new ethers.Wallet(
          params.keyPair?.privateKey || CryptoUtils.generateEd25519KeyPair().privateKey,
          this.blockchainProvider
        );
        
        const registryWithSigner = this.contracts.identityRegistry.connect(signer);
        const didDocumentJSON = JSON.stringify(identity.didDocument);
        
        const tx = await registryWithSigner.createIdentity(didDocumentJSON);
        await tx.wait();
        
        console.log(`Identity ${identity.did} registered on blockchain`);
      }
    } catch (error) {
      console.error('Failed to register identity on blockchain:', error);
      // Continue without blockchain registration in development
    }

    return identity;
  }

  /**
   * Get identity by ID
   */
  getIdentity(identityId: string): DigitalIdentity | undefined {
    return this.identities.get(identityId);
  }

  /**
   * Get identity by DID
   */
  getIdentityByDID(did: string): DigitalIdentity | undefined {
    for (const identity of this.identities.values()) {
      if (identity.did === did) {
        return identity;
      }
    }
    return undefined;
  }

  /**
   * Get identity by owner address
   */
  getIdentityByOwner(owner: string): DigitalIdentity | undefined {
    for (const identity of this.identities.values()) {
      if (identity.metadata.owner.toLowerCase() === owner.toLowerCase()) {
        return identity;
      }
    }
    return undefined;
  }

  /**
   * Issue a verifiable credential
   */
  async issueCredential(params: CredentialIssuanceParams): Promise<VerifiableCredential> {
    const credentialId = `urn:uuid:${CryptoUtils.generateSecureRandomString()}`;
    const issuanceDate = new Date().toISOString();
    
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1'
      ],
      id: credentialId,
      type: ['VerifiableCredential', params.credentialType],
      issuer: params.issuer,
      issuanceDate,
      expirationDate: params.expirationDate?.toISOString(),
      credentialSubject: {
        id: params.subject,
        ...params.attributes
      },
      proof: await this.createCredentialProof(credentialId, params)
    };

    // Add credential to subject's identity
    const subjectIdentity = this.getIdentityByOwner(params.subject);
    if (subjectIdentity) {
      subjectIdentity.addCredential(credential);
    }

    // Register on blockchain if using privacy-preserving credentials
    if (params.useZKProof && this.contracts.privacyCredentials) {
      await this.registerPrivacyCredential(credential, params);
    }

    return credential;
  }

  /**
   * Create proof for a verifiable credential
   */
  private async createCredentialProof(
    credentialId: string,
    params: CredentialIssuanceParams
  ): Promise<any> {
    // In a real implementation, this would use proper cryptographic signatures
    const proofData = {
      credentialId,
      issuer: params.issuer,
      subject: params.subject,
      issuanceDate: new Date().toISOString()
    };

    const dataToSign = JSON.stringify(proofData);
    
    // For demo purposes, create a simple proof
    return {
      type: 'Ed25519Signature2020',
      created: proofData.issuanceDate,
      verificationMethod: `${params.issuer}#signing-key`,
      proofPurpose: 'assertionMethod',
      proofValue: CryptoUtils.hash(dataToSign)
    };
  }

  /**
   * Register privacy-preserving credential on blockchain
   */
  private async registerPrivacyCredential(
    credential: VerifiableCredential,
    params: CredentialIssuanceParams
  ): Promise<void> {
    try {
      if (!this.contracts.privacyCredentials) return;

      const attributeNames = Object.keys(params.attributes);
      const attributeCommitments = attributeNames.map(name => {
        const value = params.attributes[name];
        const nonce = CryptoUtils.generateNonce();
        return CryptoUtils.createCommitment(JSON.stringify(value), nonce);
      });

      // Create BBS+ signature (simplified)
      const signatureData = {
        credentialId: credential.id,
        subject: params.subject,
        attributes: attributeCommitments
      };
      const signature = CryptoUtils.hash(JSON.stringify(signatureData));

      const expiresAt = params.expirationDate 
        ? Math.floor(params.expirationDate.getTime() / 1000)
        : Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year default

      // This would require a signer in a real implementation
      console.log('Privacy credential would be registered:', {
        holder: params.subject,
        attributeNames,
        attributeCommitments,
        signature,
        expiresAt
      });
    } catch (error) {
      console.error('Failed to register privacy credential:', error);
    }
  }

  /**
   * Request verification with zero-knowledge proofs
   */
  async requestZKVerification(request: VerificationRequest): Promise<string> {
    if (!this.contracts.zkVerification) {
      throw new Error('ZK verification contract not initialized');
    }

    try {
      const challenge = CryptoUtils.generateZKChallenge(
        request.subject,
        request.verifier,
        CryptoUtils.generateNonce()
      );

      // Generate appropriate proof type based on requested attributes
      const proofType = this.determineProofType(request.requiredAttributes);
      
      console.log('ZK verification request would be created:', {
        prover: request.subject,
        proofType,
        challenge,
        requiredAttributes: request.requiredAttributes
      });

      return challenge;
    } catch (error) {
      console.error('Failed to request ZK verification:', error);
      throw error;
    }
  }

  /**
   * Submit zero-knowledge proof for verification
   */
  async submitZKProof(
    requestId: string,
    proofType: string,
    proofData: any
  ): Promise<boolean> {
    try {
      let proof;
      
      switch (proofType) {
        case 'age_verification':
          proof = ZKProofGenerator.generateAgeProof(
            proofData.birthYear,
            proofData.minimumAge,
            proofData.nonce
          );
          break;
          
        case 'location_verification':
          proof = ZKProofGenerator.generateLocationProof(
            proofData.latitude,
            proofData.longitude,
            proofData.allowedRegion,
            proofData.nonce
          );
          break;
          
        case 'income_verification':
          proof = ZKProofGenerator.generateIncomeProof(
            proofData.actualIncome,
            proofData.minimumRequired,
            proofData.nonce
          );
          break;
          
        default:
          throw new Error(`Unsupported proof type: ${proofType}`);
      }

      // Verify proof locally first
      const isValid = ZKProofGenerator.verifyProof(proof, proof.publicSignals);
      
      if (!isValid) {
        throw new Error('Generated proof is invalid');
      }

      console.log('ZK proof would be submitted:', {
        requestId,
        proofType,
        proof,
        isValid
      });

      return isValid;
    } catch (error) {
      console.error('Failed to submit ZK proof:', error);
      return false;
    }
  }

  /**
   * Create selective disclosure presentation
   */
  async createSelectiveDisclosurePresentation(
    request: SelectiveDisclosureRequest
  ): Promise<VerifiablePresentation> {
    const identity = this.identities.get(request.credentialId.split(':')[2]); // Extract identity ID from credential ID
    if (!identity) {
      throw new Error('Identity not found');
    }

    const credential = identity.credentials.find(cred => cred.id === request.credentialId);
    if (!credential) {
      throw new Error('Credential not found');
    }

    // Create selective disclosure by filtering attributes
    const disclosedCredential = {
      ...credential,
      credentialSubject: this.selectivelyDiscloseAttributes(
        credential.credentialSubject,
        request.attributesToDisclose
      )
    };

    return await identity.createPresentation(
      [disclosedCredential.id],
      request.challenge
    );
  }

  /**
   * Selectively disclose attributes from credential subject
   */
  private selectivelyDiscloseAttributes(
    credentialSubject: any,
    attributesToDisclose: string[]
  ): any {
    const disclosed: any = { id: credentialSubject.id };
    
    for (const attribute of attributesToDisclose) {
      if (credentialSubject.hasOwnProperty(attribute)) {
        disclosed[attribute] = credentialSubject[attribute];
      }
    }

    return disclosed;
  }

  /**
   * Determine proof type based on required attributes
   */
  private determineProofType(requiredAttributes: string[]): string {
    if (requiredAttributes.includes('age') || requiredAttributes.includes('birthDate')) {
      return 'age_verification';
    }
    
    if (requiredAttributes.includes('location') || requiredAttributes.includes('address')) {
      return 'location_verification';
    }
    
    if (requiredAttributes.includes('income') || requiredAttributes.includes('salary')) {
      return 'income_verification';
    }
    
    return 'general_verification';
  }

  /**
   * Verify a verifiable credential
   */
  async verifyCredential(credential: VerifiableCredential): Promise<boolean> {
    try {
      // Check expiration
      if (credential.expirationDate) {
        const expirationDate = new Date(credential.expirationDate);
        if (expirationDate < new Date()) {
          return false;
        }
      }

      // Verify proof (simplified)
      if (!credential.proof || !credential.proof.proofValue) {
        return false;
      }

      // In a real implementation, verify the cryptographic proof
      return true;
    } catch (error) {
      console.error('Credential verification failed:', error);
      return false;
    }
  }

  /**
   * Verify a verifiable presentation
   */
  async verifyPresentation(presentation: VerifiablePresentation): Promise<boolean> {
    try {
      // Verify each credential in the presentation
      for (const credential of presentation.verifiableCredential) {
        const isValid = await this.verifyCredential(credential);
        if (!isValid) {
          return false;
        }
      }

      // Verify presentation proof
      if (!presentation.proof || !presentation.proof.proofValue) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Presentation verification failed:', error);
      return false;
    }
  }

  /**
   * List all identities
   */
  listIdentities(): DigitalIdentity[] {
    return Array.from(this.identities.values());
  }

  /**
   * Get identity statistics
   */
  getStatistics(): {
    totalIdentities: number;
    activeIdentities: number;
    totalCredentials: number;
    averageCredentialsPerIdentity: number;
  } {
    const identities = Array.from(this.identities.values());
    const activeIdentities = identities.filter(id => id.metadata.isActive);
    const totalCredentials = identities.reduce((sum, id) => sum + id.credentials.length, 0);

    return {
      totalIdentities: identities.length,
      activeIdentities: activeIdentities.length,
      totalCredentials,
      averageCredentialsPerIdentity: identities.length > 0 ? totalCredentials / identities.length : 0
    };
  }

  /**
   * Update identity on blockchain
   */
  async updateIdentityOnChain(identityId: string): Promise<void> {
    const identity = this.identities.get(identityId);
    if (!identity || !this.contracts.identityRegistry) {
      throw new Error('Identity or contract not found');
    }

    try {
      const didDocumentJSON = JSON.stringify(identity.didDocument);
      
      console.log('Identity would be updated on blockchain:', {
        identityId,
        didDocument: didDocumentJSON
      });
    } catch (error) {
      console.error('Failed to update identity on blockchain:', error);
      throw error;
    }
  }
}