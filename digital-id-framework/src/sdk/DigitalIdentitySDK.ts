import axios, { AxiosInstance } from 'axios';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { IdentityAttribute } from '../crypto/zkp/ZeroKnowledgeProof';

export interface SDKConfig {
  apiUrl: string;
  apiKey?: string;
  privateKey?: string;
  contractAddress?: string;
  providerUrl?: string;
}

export interface SDKIdentity {
  did: string;
  owner: string;
  createdAt: Date;
}

export interface SDKCredential {
  id: string;
  issuer: string;
  subject: string;
  claims: Record<string, any>;
  issuedAt: Date;
  expiresAt: Date;
  signature: string;
}

export interface SDKPresentation {
  id: string;
  holder: string;
  credentials: SDKCredential[];
  proofs: any[];
  disclosedAttributes: string[];
  nonce: string;
  timestamp: Date;
}

export class DigitalIdentitySDK {
  private client: AxiosInstance;
  private config: SDKConfig;
  private wallet?: ethers.Wallet;

  constructor(config: SDKConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (config.privateKey) {
      this.wallet = new ethers.Wallet(config.privateKey);
    }

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for authentication
    this.client.interceptors.request.use(async (config) => {
      if (this.config.apiKey) {
        config.headers.Authorization = `Bearer ${this.config.apiKey}`;
      } else if (this.wallet) {
        // Generate JWT token
        const token = jwt.sign(
          {
            address: this.wallet.address,
            timestamp: Date.now()
          },
          this.config.privateKey!,
          { expiresIn: '1h' }
        );
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add signature for requests with body
      if (this.wallet && config.data) {
        const timestamp = Date.now().toString();
        const message = `${config.method?.toUpperCase()}:${config.url}:${timestamp}:${JSON.stringify(config.data)}`;
        const signature = await this.wallet.signMessage(message);

        config.headers['X-Signature'] = signature;
        config.headers['X-Timestamp'] = timestamp;
        config.headers['X-Address'] = this.wallet.address;
      }

      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error('API Error:', error.response.data);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Identity Management
   */
  async createIdentity(
    owner: string,
    attributes: Array<{ name: string; value: string }>
  ): Promise<SDKIdentity> {
    const response = await this.client.post('/api/v1/identity/create', {
      owner,
      attributes
    });
    return response.data.data;
  }

  async getIdentity(did: string): Promise<SDKIdentity> {
    const response = await this.client.get(`/api/v1/identity/${did}`);
    return response.data.data;
  }

  async updateIdentity(
    did: string,
    attributes: Array<{ name: string; value: string }>
  ): Promise<SDKIdentity> {
    const response = await this.client.put(`/api/v1/identity/${did}`, {
      attributes
    });
    return response.data.data;
  }

  /**
   * Credential Management
   */
  async issueCredential(
    subjectDid: string,
    claims: Record<string, any>,
    expiresInDays: number = 365
  ): Promise<SDKCredential> {
    const response = await this.client.post('/api/v1/credential/issue', {
      subjectDid,
      claims,
      expiresInDays
    });
    return response.data.data;
  }

  async verifyCredential(credential: SDKCredential): Promise<boolean> {
    const response = await this.client.post('/api/v1/credential/verify', {
      credential
    });
    return response.data.data.isValid;
  }

  async revokeCredential(did: string, credentialId: string): Promise<void> {
    await this.client.post('/api/v1/credential/revoke', {
      did,
      credentialId
    });
  }

  /**
   * Presentation Management
   */
  async createPresentation(
    holderDid: string,
    credentialIds: string[],
    requestedAttributes: string[],
    verifierAddress: string
  ): Promise<SDKPresentation> {
    const response = await this.client.post('/api/v1/presentation/create', {
      holderDid,
      credentialIds,
      requestedAttributes,
      verifierAddress
    });
    return response.data.data;
  }

  async verifyPresentation(presentation: SDKPresentation): Promise<boolean> {
    const response = await this.client.post('/api/v1/presentation/verify', {
      presentation
    });
    return response.data.data.isValid;
  }

  /**
   * Privacy Features
   */
  async generateSelectiveDisclosure(
    attributes: IdentityAttribute[],
    policyId: string
  ): Promise<{
    disclosedData: Array<[string, any]>;
    proofs: any[];
    commitments: Array<[string, string]>;
  }> {
    const response = await this.client.post('/api/v1/privacy/selective-disclosure', {
      attributes,
      policyId
    });
    return response.data.data;
  }

  async createAnonymousCredential(
    attributes: IdentityAttribute[],
    domain: string
  ): Promise<{
    id: string;
    blindedAttributes: Array<[string, string]>;
    nullifier: string;
  }> {
    const response = await this.client.post('/api/v1/privacy/anonymous-credential', {
      attributes,
      domain
    });
    return response.data.data;
  }

  async generatePrivacyAnalytics(
    identities: any[],
    attributeName: string
  ): Promise<{
    encryptedSum: string;
    publicKey: {
      n: string;
      g: string;
    };
  }> {
    const response = await this.client.post('/api/v1/privacy/analytics', {
      identities,
      attributeName
    });
    return response.data.data;
  }

  /**
   * Utility Methods
   */
  async generateKeyPair(): Promise<{
    address: string;
    privateKey: string;
    publicKey: string;
  }> {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey
    };
  }

  async signMessage(message: string): Promise<string> {
    if (!this.wallet) {
      throw new Error('No wallet configured');
    }
    return await this.wallet.signMessage(message);
  }

  async verifySignature(
    message: string,
    signature: string,
    address: string
  ): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * Blockchain Integration
   */
  async getBlockchainIdentity(did: string): Promise<any> {
    if (!this.config.contractAddress || !this.config.providerUrl) {
      throw new Error('Blockchain configuration not provided');
    }

    const provider = new ethers.JsonRpcProvider(this.config.providerUrl);
    const contract = new ethers.Contract(
      this.config.contractAddress,
      ['function getIdentity(bytes32) view returns (address, bytes32, uint256, uint256, bool)'],
      provider
    );

    const result = await contract.getIdentity(ethers.encodeBytes32String(did));
    return {
      owner: result[0],
      dataHash: result[1],
      createdAt: new Date(Number(result[2]) * 1000),
      updatedAt: new Date(Number(result[3]) * 1000),
      isActive: result[4]
    };
  }

  /**
   * Batch Operations
   */
  async batchIssueCredentials(
    credentials: Array<{
      subjectDid: string;
      claims: Record<string, any>;
      expiresInDays?: number;
    }>
  ): Promise<SDKCredential[]> {
    const results: SDKCredential[] = [];
    
    for (const cred of credentials) {
      const credential = await this.issueCredential(
        cred.subjectDid,
        cred.claims,
        cred.expiresInDays
      );
      results.push(credential);
    }
    
    return results;
  }

  async batchVerifyCredentials(credentials: SDKCredential[]): Promise<boolean[]> {
    const results: boolean[] = [];
    
    for (const credential of credentials) {
      const isValid = await this.verifyCredential(credential);
      results.push(isValid);
    }
    
    return results;
  }

  /**
   * Event Listeners
   */
  async subscribeToIdentityEvents(
    did: string,
    callback: (event: any) => void
  ): Promise<() => void> {
    if (!this.config.contractAddress || !this.config.providerUrl) {
      throw new Error('Blockchain configuration not provided');
    }

    const provider = new ethers.JsonRpcProvider(this.config.providerUrl);
    const contract = new ethers.Contract(
      this.config.contractAddress,
      ['event IdentityUpdated(bytes32 indexed did, bytes32 newDataHash)'],
      provider
    );

    const filter = contract.filters.IdentityUpdated(ethers.encodeBytes32String(did));
    
    contract.on(filter, (did, dataHash, event) => {
      callback({
        type: 'IdentityUpdated',
        did: ethers.decodeBytes32String(did),
        dataHash,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      });
    });

    // Return unsubscribe function
    return () => {
      contract.removeAllListeners(filter);
    };
  }
}