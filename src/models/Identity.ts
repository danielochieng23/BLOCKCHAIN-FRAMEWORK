import { CryptoUtils } from '../utils/crypto';

/**
 * Digital Identity Model
 * Represents a decentralized identity following W3C DID standards
 */

export interface DIDDocument {
  '@context': string[];
  id: string;
  controller: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  assertionMethod: string[];
  keyAgreement: string[];
  capabilityInvocation: string[];
  capabilityDelegation: string[];
  service: ServiceEndpoint[];
  created: string;
  updated: string;
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase?: string;
  publicKeyJwk?: any;
  blockchainAccountId?: string;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string;
  description?: string;
}

export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string | { id: string; name?: string };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: any;
  proof: Proof;
  credentialStatus?: CredentialStatus;
}

export interface Proof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue?: string;
  jws?: string;
  challenge?: string;
  domain?: string;
}

export interface CredentialStatus {
  id: string;
  type: string;
}

export interface VerifiablePresentation {
  '@context': string[];
  id: string;
  type: string[];
  holder: string;
  verifiableCredential: VerifiableCredential[];
  proof: Proof;
}

export interface IdentityMetadata {
  identityId: string;
  owner: string;
  created: Date;
  updated: Date;
  isActive: boolean;
  credentialCount: number;
  lastVerification?: Date;
}

export class DigitalIdentity {
  public readonly id: string;
  public readonly did: string;
  public didDocument: DIDDocument;
  public credentials: VerifiableCredential[];
  public metadata: IdentityMetadata;
  private privateKeys: Map<string, string>;

  constructor(
    owner: string,
    keyPair?: { publicKey: string; privateKey: string }
  ) {
    this.id = CryptoUtils.generateSecureRandomString();
    this.did = `did:blockchain:${this.id}`;
    this.credentials = [];
    this.privateKeys = new Map();

    // Generate key pair if not provided
    const keys = keyPair || CryptoUtils.generateEd25519KeyPair();
    
    this.didDocument = this.createDIDDocument(owner, keys.publicKey);
    this.privateKeys.set('primary', keys.privateKey);
    
    this.metadata = {
      identityId: this.id,
      owner,
      created: new Date(),
      updated: new Date(),
      isActive: true,
      credentialCount: 0,
    };
  }

  /**
   * Create a DID document following W3C DID specification
   */
  private createDIDDocument(owner: string, publicKey: string): DIDDocument {
    const verificationMethodId = `${this.did}#primary-key`;
    
    return {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1'
      ],
      id: this.did,
      controller: owner,
      verificationMethod: [
        {
          id: verificationMethodId,
          type: 'Ed25519VerificationKey2020',
          controller: this.did,
          blockchainAccountId: `eip155:1:${owner}`
        }
      ],
      authentication: [verificationMethodId],
      assertionMethod: [verificationMethodId],
      keyAgreement: [verificationMethodId],
      capabilityInvocation: [verificationMethodId],
      capabilityDelegation: [verificationMethodId],
      service: [
        {
          id: `${this.did}#identity-service`,
          type: 'IdentityHub',
          serviceEndpoint: 'https://identity.blockchain.example.com',
          description: 'Digital Identity Management Service'
        }
      ],
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
  }

  /**
   * Add a verifiable credential to the identity
   */
  addCredential(credential: VerifiableCredential): void {
    // Verify the credential is valid and belongs to this identity
    if (typeof credential.credentialSubject.id === 'string' && 
        credential.credentialSubject.id !== this.did) {
      throw new Error('Credential does not belong to this identity');
    }

    this.credentials.push(credential);
    this.metadata.credentialCount = this.credentials.length;
    this.metadata.updated = new Date();
  }

  /**
   * Remove a credential from the identity
   */
  removeCredential(credentialId: string): boolean {
    const initialLength = this.credentials.length;
    this.credentials = this.credentials.filter(cred => cred.id !== credentialId);
    
    if (this.credentials.length < initialLength) {
      this.metadata.credentialCount = this.credentials.length;
      this.metadata.updated = new Date();
      return true;
    }
    
    return false;
  }

  /**
   * Get credentials by type
   */
  getCredentialsByType(type: string): VerifiableCredential[] {
    return this.credentials.filter(cred => 
      cred.type.includes(type)
    );
  }

  /**
   * Create a verifiable presentation
   */
  async createPresentation(
    credentialIds: string[],
    challenge?: string,
    domain?: string
  ): Promise<VerifiablePresentation> {
    const selectedCredentials = this.credentials.filter(cred =>
      credentialIds.includes(cred.id)
    );

    if (selectedCredentials.length !== credentialIds.length) {
      throw new Error('Some requested credentials not found');
    }

    const presentationId = `urn:uuid:${CryptoUtils.generateSecureRandomString()}`;
    
    const presentation: VerifiablePresentation = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1'
      ],
      id: presentationId,
      type: ['VerifiablePresentation'],
      holder: this.did,
      verifiableCredential: selectedCredentials,
      proof: await this.createPresentationProof(presentationId, challenge, domain)
    };

    return presentation;
  }

  /**
   * Create proof for a verifiable presentation
   */
  private async createPresentationProof(
    presentationId: string,
    challenge?: string,
    domain?: string
  ): Promise<Proof> {
    const privateKey = this.privateKeys.get('primary');
    if (!privateKey) {
      throw new Error('Private key not found');
    }

    const proofData = {
      presentationId,
      challenge: challenge || CryptoUtils.generateNonce(),
      domain: domain || 'blockchain-identity.example.com',
      created: new Date().toISOString()
    };

    const dataToSign = JSON.stringify(proofData);
    const signature = await CryptoUtils.signMessage(dataToSign, privateKey);

    return {
      type: 'Ed25519Signature2020',
      created: proofData.created,
      verificationMethod: `${this.did}#primary-key`,
      proofPurpose: 'authentication',
      challenge: proofData.challenge,
      domain: proofData.domain,
      proofValue: signature
    };
  }

  /**
   * Update the DID document
   */
  updateDIDDocument(updates: Partial<DIDDocument>): void {
    this.didDocument = {
      ...this.didDocument,
      ...updates,
      updated: new Date().toISOString()
    };
    this.metadata.updated = new Date();
  }

  /**
   * Add a new verification method
   */
  addVerificationMethod(method: VerificationMethod): void {
    this.didDocument.verificationMethod.push(method);
    this.didDocument.updated = new Date().toISOString();
    this.metadata.updated = new Date();
  }

  /**
   * Add a service endpoint
   */
  addServiceEndpoint(service: ServiceEndpoint): void {
    this.didDocument.service.push(service);
    this.didDocument.updated = new Date().toISOString();
    this.metadata.updated = new Date();
  }

  /**
   * Sign data with the identity's private key
   */
  async signData(data: string): Promise<string> {
    const privateKey = this.privateKeys.get('primary');
    if (!privateKey) {
      throw new Error('Private key not found');
    }
    
    return await CryptoUtils.signMessage(data, privateKey);
  }

  /**
   * Verify a signature against this identity
   */
  verifySignature(data: string, signature: string): boolean {
    const publicKey = this.metadata.owner; // Using owner address as public key
    return CryptoUtils.verifySignature(data, signature, publicKey);
  }

  /**
   * Deactivate the identity
   */
  deactivate(): void {
    this.metadata.isActive = false;
    this.metadata.updated = new Date();
  }

  /**
   * Reactivate the identity
   */
  reactivate(): void {
    this.metadata.isActive = true;
    this.metadata.updated = new Date();
  }

  /**
   * Export identity data (without private keys)
   */
  export(): {
    did: string;
    didDocument: DIDDocument;
    credentials: VerifiableCredential[];
    metadata: IdentityMetadata;
  } {
    return {
      did: this.did,
      didDocument: this.didDocument,
      credentials: this.credentials,
      metadata: this.metadata
    };
  }

  /**
   * Get identity summary
   */
  getSummary(): {
    did: string;
    owner: string;
    credentialCount: number;
    isActive: boolean;
    created: Date;
    updated: Date;
  } {
    return {
      did: this.did,
      owner: this.metadata.owner,
      credentialCount: this.metadata.credentialCount,
      isActive: this.metadata.isActive,
      created: this.metadata.created,
      updated: this.metadata.updated
    };
  }

  /**
   * Validate the identity structure
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check DID format
    if (!this.did.startsWith('did:blockchain:')) {
      errors.push('Invalid DID format');
    }

    // Check DID document
    if (!this.didDocument.id || this.didDocument.id !== this.did) {
      errors.push('DID document ID mismatch');
    }

    if (!this.didDocument.verificationMethod || this.didDocument.verificationMethod.length === 0) {
      errors.push('No verification methods found');
    }

    // Check metadata
    if (!this.metadata.owner) {
      errors.push('No owner specified');
    }

    // Validate credentials
    for (const credential of this.credentials) {
      if (!credential.id || !credential.type || !credential.issuer) {
        errors.push(`Invalid credential: ${credential.id || 'unknown'}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}