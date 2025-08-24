import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { StandardEncryption, PaillierEncryption } from '../crypto/encryption/HomomorphicEncryption';
import { ZeroKnowledgeProof, IdentityAttribute } from '../crypto/zkp/ZeroKnowledgeProof';
import { MerkleTree } from 'merkletreejs';
import * as crypto from 'crypto';

export interface Identity {
  did: string;
  owner: string;
  attributes: IdentityAttribute[];
  createdAt: Date;
  updatedAt: Date;
  encryptionKeyPair?: {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  };
}

export interface Credential {
  id: string;
  issuer: string;
  subject: string;
  claims: Map<string, any>;
  issuedAt: Date;
  expiresAt: Date;
  signature: string;
  merkleRoot?: string;
}

export interface VerifiablePresentation {
  id: string;
  holder: string;
  credentials: Credential[];
  proofs: any[];
  disclosedAttributes: string[];
  nonce: string;
  timestamp: Date;
}

export class IdentityManager {
  private provider: ethers.Provider;
  private contract: ethers.Contract;
  private zkProof: ZeroKnowledgeProof;
  private paillier: PaillierEncryption;
  private identities: Map<string, Identity>;

  constructor(
    providerUrl: string,
    contractAddress: string,
    contractABI: any[],
    zkpConfig: {
      circuitPath: string;
      provingKeyPath: string;
      verificationKeyPath: string;
    }
  ) {
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.contract = new ethers.Contract(contractAddress, contractABI, this.provider);
    this.zkProof = new ZeroKnowledgeProof(
      zkpConfig.circuitPath,
      zkpConfig.provingKeyPath,
      zkpConfig.verificationKeyPath
    );
    this.paillier = new PaillierEncryption();
    this.identities = new Map();
  }

  /**
   * Create a new decentralized identity
   */
  async createIdentity(
    owner: string,
    initialAttributes: Omit<IdentityAttribute, 'salt'>[]
  ): Promise<Identity> {
    // Generate DID
    const did = `did:eth:${ethers.keccak256(ethers.toUtf8Bytes(owner + Date.now()))}`;
    
    // Generate encryption keys
    const encryptionKeyPair = await StandardEncryption.generateKeyPair();
    
    // Add salt to attributes
    const attributes: IdentityAttribute[] = initialAttributes.map(attr => ({
      ...attr,
      salt: crypto.randomBytes(32).toString('hex')
    }));
    
    // Create Merkle tree of attributes
    const merkleTree = this.zkProof.createMerkleTree(attributes);
    const merkleRoot = merkleTree.getRoot().toString('hex');
    
    // Encrypt attributes
    const encryptedData = await this.encryptIdentityData(attributes, encryptionKeyPair.publicKey);
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(encryptedData)));
    
    // Store on blockchain
    const signer = await this.getSigner(owner);
    const tx = await this.contract.connect(signer).createIdentity(
      ethers.encodeBytes32String(did),
      dataHash
    );
    await tx.wait();
    
    const identity: Identity = {
      did,
      owner,
      attributes,
      createdAt: new Date(),
      updatedAt: new Date(),
      encryptionKeyPair
    };
    
    this.identities.set(did, identity);
    
    return identity;
  }

  /**
   * Issue a verifiable credential
   */
  async issueCredential(
    issuerPrivateKey: string,
    subjectDid: string,
    claims: Map<string, any>,
    expiresInDays: number = 365
  ): Promise<Credential> {
    const credentialId = uuidv4();
    const issuer = new ethers.Wallet(issuerPrivateKey).address;
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
    
    // Create credential attributes for selective disclosure
    const credentialAttributes: IdentityAttribute[] = Array.from(claims.entries()).map(
      ([name, value]) => ({
        name,
        value: value.toString(),
        salt: crypto.randomBytes(32).toString('hex')
      })
    );
    
    // Create Merkle tree for selective disclosure
    const merkleTree = this.zkProof.createMerkleTree(credentialAttributes);
    const merkleRoot = merkleTree.getRoot().toString('hex');
    
    // Create credential object
    const credential: Omit<Credential, 'signature'> = {
      id: credentialId,
      issuer,
      subject: subjectDid,
      claims,
      issuedAt,
      expiresAt,
      merkleRoot
    };
    
    // Sign credential
    const credentialHash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(credential))
    );
    const wallet = new ethers.Wallet(issuerPrivateKey);
    const signature = await wallet.signMessage(credentialHash);
    
    // Store credential on blockchain
    const signer = await this.getSigner(issuer);
    const tx = await this.contract.connect(signer).issueCredential(
      ethers.encodeBytes32String(subjectDid),
      ethers.encodeBytes32String(credentialId),
      credentialHash,
      Math.floor(expiresAt.getTime() / 1000),
      merkleRoot
    );
    await tx.wait();
    
    return {
      ...credential,
      signature
    } as Credential;
  }

  /**
   * Create a verifiable presentation with selective disclosure
   */
  async createPresentation(
    holderDid: string,
    credentials: Credential[],
    requestedAttributes: string[],
    verifierAddress: string
  ): Promise<VerifiablePresentation> {
    const presentationId = uuidv4();
    const nonce = crypto.randomBytes(32).toString('hex');
    
    // Generate proofs for requested attributes
    const proofs: any[] = [];
    const disclosedAttributes: string[] = [];
    
    for (const credential of credentials) {
      const credentialAttributes: IdentityAttribute[] = Array.from(credential.claims.entries())
        .map(([name, value]) => ({
          name,
          value: value.toString(),
          salt: crypto.randomBytes(32).toString('hex') // In real implementation, retrieve original salt
        }));
      
      const merkleTree = this.zkProof.createMerkleTree(credentialAttributes);
      
      // Find indices of requested attributes
      const disclosedIndices: number[] = [];
      credentialAttributes.forEach((attr, index) => {
        if (requestedAttributes.includes(attr.name)) {
          disclosedIndices.push(index);
          disclosedAttributes.push(`${credential.id}:${attr.name}`);
        }
      });
      
      if (disclosedIndices.length > 0) {
        const proof = await this.zkProof.generateSelectiveDisclosureProof(
          credentialAttributes,
          disclosedIndices,
          merkleTree
        );
        proofs.push(proof);
      }
    }
    
    // Create verification request on blockchain
    const signer = await this.getSigner(verifierAddress);
    const tx = await this.contract.connect(signer).requestVerification(
      ethers.encodeBytes32String(holderDid),
      requestedAttributes.map(attr => ethers.encodeBytes32String(attr))
    );
    const receipt = await tx.wait();
    
    return {
      id: presentationId,
      holder: holderDid,
      credentials,
      proofs,
      disclosedAttributes,
      nonce,
      timestamp: new Date()
    };
  }

  /**
   * Verify a presentation
   */
  async verifyPresentation(
    presentation: VerifiablePresentation
  ): Promise<boolean> {
    try {
      // Verify each proof
      for (let i = 0; i < presentation.proofs.length; i++) {
        const proof = presentation.proofs[i];
        const isValid = await this.zkProof.verifySelectiveDisclosureProof(
          proof.proof,
          proof.publicSignals
        );
        
        if (!isValid) {
          return false;
        }
      }
      
      // Verify credential signatures
      for (const credential of presentation.credentials) {
        const credentialWithoutSignature = { ...credential };
        delete (credentialWithoutSignature as any).signature;
        
        const credentialHash = ethers.keccak256(
          ethers.toUtf8Bytes(JSON.stringify(credentialWithoutSignature))
        );
        
        const recoveredAddress = ethers.verifyMessage(credentialHash, credential.signature);
        if (recoveredAddress !== credential.issuer) {
          return false;
        }
        
        // Check expiration
        if (new Date() > credential.expiresAt) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Presentation verification failed:', error);
      return false;
    }
  }

  /**
   * Generate privacy-preserving analytics using homomorphic encryption
   */
  async generatePrivateAnalytics(
    identities: Identity[],
    attributeName: string
  ): Promise<{ encryptedSum: any; publicKey: any }> {
    const keyPair = await this.paillier.generateKeyPair();
    
    let encryptedSum = this.paillier.encrypt(0n, keyPair.publicKey);
    
    for (const identity of identities) {
      const attribute = identity.attributes.find(attr => attr.name === attributeName);
      if (attribute && !isNaN(Number(attribute.value))) {
        const value = BigInt(attribute.value);
        const encryptedValue = this.paillier.encrypt(value, keyPair.publicKey);
        encryptedSum = this.paillier.add(encryptedSum, encryptedValue);
      }
    }
    
    return {
      encryptedSum,
      publicKey: keyPair.publicKey
    };
  }

  /**
   * Encrypt identity data
   */
  private async encryptIdentityData(
    attributes: IdentityAttribute[],
    publicKey: Uint8Array
  ): Promise<any> {
    const data = JSON.stringify(attributes);
    return await StandardEncryption.encrypt(data, publicKey);
  }

  /**
   * Get signer for blockchain transactions
   */
  private async getSigner(address: string): Promise<ethers.Signer> {
    // In a real implementation, this would connect to a wallet
    // For now, create a random wallet
    const wallet = ethers.Wallet.createRandom();
    return wallet.connect(this.provider);
  }

  /**
   * Revoke a credential
   */
  async revokeCredential(
    issuerPrivateKey: string,
    did: string,
    credentialId: string
  ): Promise<void> {
    const wallet = new ethers.Wallet(issuerPrivateKey, this.provider);
    const tx = await this.contract.connect(wallet).revokeCredential(
      ethers.encodeBytes32String(did),
      ethers.encodeBytes32String(credentialId)
    );
    await tx.wait();
  }

  /**
   * Update identity attributes
   */
  async updateIdentity(
    did: string,
    newAttributes: Omit<IdentityAttribute, 'salt'>[],
    ownerPrivateKey: string
  ): Promise<Identity> {
    const identity = this.identities.get(did);
    if (!identity) {
      throw new Error('Identity not found');
    }
    
    // Add salt to new attributes
    const attributes: IdentityAttribute[] = newAttributes.map(attr => ({
      ...attr,
      salt: crypto.randomBytes(32).toString('hex')
    }));
    
    // Encrypt new data
    const encryptedData = await this.encryptIdentityData(
      attributes,
      identity.encryptionKeyPair!.publicKey
    );
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(encryptedData)));
    
    // Update on blockchain
    const wallet = new ethers.Wallet(ownerPrivateKey, this.provider);
    const tx = await this.contract.connect(wallet).updateIdentity(
      ethers.encodeBytes32String(did),
      dataHash
    );
    await tx.wait();
    
    // Update local storage
    identity.attributes = attributes;
    identity.updatedAt = new Date();
    
    return identity;
  }
}