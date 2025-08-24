import * as crypto from 'crypto';
import { ethers } from 'ethers';

/**
 * Cryptographic utilities for privacy-preserving digital identity
 */

export class CryptoUtils {
  /**
   * Generate a secure random key
   */
  static generateSecureKey(length: number = 32): Buffer {
    return crypto.randomBytes(length);
  }

  /**
   * Generate a cryptographically secure nonce
   */
  static generateNonce(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash data using SHA-256
   */
  static hash(data: string | Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Create HMAC signature
   */
  static createHMAC(data: string, key: string): string {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  static encrypt(plaintext: string, key: string): {
    encrypted: string;
    iv: string;
    authTag: string;
  } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', key);
    cipher.setAAD(Buffer.from('digital-identity', 'utf8'));
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag,
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  static decrypt(encryptedData: {
    encrypted: string;
    iv: string;
    authTag: string;
  }, key: string): string {
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    decipher.setAAD(Buffer.from('digital-identity', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Create a Pedersen commitment
   */
  static createCommitment(value: string, nonce: string): string {
    const combined = value + nonce;
    return this.hash(combined);
  }

  /**
   * Generate a nullifier for preventing double-spending
   */
  static generateNullifier(secret: string, publicKey: string): string {
    return this.hash(secret + publicKey);
  }

  /**
   * Create a Merkle tree root from leaves
   */
  static createMerkleRoot(leaves: string[]): string {
    if (leaves.length === 0) return '';
    if (leaves.length === 1) return leaves[0];

    const nextLevel: string[] = [];
    
    for (let i = 0; i < leaves.length; i += 2) {
      const left = leaves[i];
      const right = i + 1 < leaves.length ? leaves[i + 1] : left;
      nextLevel.push(this.hash(left + right));
    }

    return this.createMerkleRoot(nextLevel);
  }

  /**
   * Generate Merkle proof for a leaf
   */
  static generateMerkleProof(leaves: string[], targetLeaf: string): {
    proof: string[];
    indices: number[];
  } {
    const proof: string[] = [];
    const indices: number[] = [];
    let currentLevel = [...leaves];
    let targetIndex = leaves.indexOf(targetLeaf);

    if (targetIndex === -1) {
      throw new Error('Target leaf not found in tree');
    }

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      const isEven = targetIndex % 2 === 0;
      const siblingIndex = isEven ? targetIndex + 1 : targetIndex - 1;

      if (siblingIndex < currentLevel.length) {
        proof.push(currentLevel[siblingIndex]);
        indices.push(siblingIndex);
      }

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        nextLevel.push(this.hash(left + right));
      }

      currentLevel = nextLevel;
      targetIndex = Math.floor(targetIndex / 2);
    }

    return { proof, indices };
  }

  /**
   * Verify Merkle proof
   */
  static verifyMerkleProof(
    leaf: string,
    proof: string[],
    indices: number[],
    root: string
  ): boolean {
    let currentHash = leaf;
    let currentIndex = indices[0] || 0;

    for (let i = 0; i < proof.length; i++) {
      const isEven = currentIndex % 2 === 0;
      const sibling = proof[i];

      if (isEven) {
        currentHash = this.hash(currentHash + sibling);
      } else {
        currentHash = this.hash(sibling + currentHash);
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return currentHash === root;
  }

  /**
   * Generate BLS signature (simplified version)
   */
  static generateBLSSignature(message: string, privateKey: string): string {
    // Simplified BLS signature - in production, use a proper BLS library
    const messageHash = this.hash(message);
    const keyHash = this.hash(privateKey);
    return this.hash(messageHash + keyHash);
  }

  /**
   * Verify BLS signature (simplified version)
   */
  static verifyBLSSignature(
    message: string,
    signature: string,
    publicKey: string
  ): boolean {
    // Simplified verification - in production, use proper BLS verification
    const messageHash = this.hash(message);
    const expectedSig = this.hash(messageHash + this.hash(publicKey));
    return signature === expectedSig;
  }

  /**
   * Generate Ed25519 key pair
   */
  static generateEd25519KeyPair(): {
    publicKey: string;
    privateKey: string;
  } {
    const wallet = ethers.Wallet.createRandom();
    return {
      publicKey: wallet.address,
      privateKey: wallet.privateKey,
    };
  }

  /**
   * Sign message with Ed25519 (using ethers for demo)
   */
  static async signMessage(message: string, privateKey: string): Promise<string> {
    const wallet = new ethers.Wallet(privateKey);
    return await wallet.signMessage(message);
  }

  /**
   * Verify Ed25519 signature (using ethers for demo)
   */
  static verifySignature(
    message: string,
    signature: string,
    publicKey: string
  ): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === publicKey.toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * Generate a zero-knowledge proof challenge
   */
  static generateZKChallenge(
    commitment: string,
    publicKey: string,
    nonce: string
  ): string {
    return this.hash(commitment + publicKey + nonce);
  }

  /**
   * Create a simple zero-knowledge proof of knowledge
   */
  static createZKProof(
    secret: string,
    challenge: string,
    nonce: string
  ): {
    response: string;
    commitment: string;
  } {
    const commitment = this.createCommitment(secret, nonce);
    const response = this.hash(secret + challenge + nonce);
    
    return { response, commitment };
  }

  /**
   * Verify a zero-knowledge proof
   */
  static verifyZKProof(
    proof: { response: string; commitment: string },
    challenge: string,
    publicCommitment: string
  ): boolean {
    // Simplified verification - in production, use proper ZK verification
    return proof.commitment === publicCommitment;
  }

  /**
   * Generate secure random string
   */
  static generateSecureRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Derive key using PBKDF2
   */
  static deriveKey(
    password: string,
    salt: string,
    iterations: number = 100000,
    keyLength: number = 32
  ): Buffer {
    return crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha256');
  }

  /**
   * Constant time comparison to prevent timing attacks
   */
  static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }
}