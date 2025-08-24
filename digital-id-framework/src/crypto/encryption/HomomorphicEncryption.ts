import * as sodium from 'libsodium-wrappers';
import * as crypto from 'crypto';

export interface EncryptedValue {
  ciphertext: string;
  nonce: string;
  publicKey: string;
}

export interface HomomorphicCiphertext {
  value: bigint;
  randomness: bigint;
  publicKey: PublicKey;
}

export interface PublicKey {
  n: bigint;
  g: bigint;
  nSquared: bigint;
}

export interface PrivateKey {
  lambda: bigint;
  mu: bigint;
}

export interface KeyPair {
  publicKey: PublicKey;
  privateKey: PrivateKey;
}

/**
 * Paillier Homomorphic Encryption System
 * Supports addition of encrypted values without decryption
 */
export class PaillierEncryption {
  private bitLength: number;

  constructor(bitLength: number = 2048) {
    this.bitLength = bitLength;
  }

  /**
   * Generate a Paillier key pair
   */
  async generateKeyPair(): Promise<KeyPair> {
    // Generate two large primes
    const p = this.generatePrime(this.bitLength / 2);
    const q = this.generatePrime(this.bitLength / 2);
    
    const n = p * q;
    const nSquared = n * n;
    
    // g = n + 1 (simplified generator)
    const g = n + 1n;
    
    // Compute Carmichael's function λ(n) = lcm(p-1, q-1)
    const lambda = this.lcm(p - 1n, q - 1n);
    
    // Compute μ = (L(g^λ mod n²))^(-1) mod n
    const mu = this.modInverse(this.L(this.modPow(g, lambda, nSquared), n), n);
    
    return {
      publicKey: { n, g, nSquared },
      privateKey: { lambda, mu }
    };
  }

  /**
   * Encrypt a plaintext value
   */
  encrypt(plaintext: bigint, publicKey: PublicKey): HomomorphicCiphertext {
    if (plaintext < 0n || plaintext >= publicKey.n) {
      throw new Error('Plaintext must be in range [0, n)');
    }

    // Generate random r where gcd(r, n) = 1
    const r = this.generateCoprime(publicKey.n);
    
    // c = g^m * r^n mod n²
    const gm = this.modPow(publicKey.g, plaintext, publicKey.nSquared);
    const rn = this.modPow(r, publicKey.n, publicKey.nSquared);
    const ciphertext = (gm * rn) % publicKey.nSquared;
    
    return {
      value: ciphertext,
      randomness: r,
      publicKey
    };
  }

  /**
   * Decrypt a ciphertext
   */
  decrypt(ciphertext: HomomorphicCiphertext, privateKey: PrivateKey): bigint {
    const { value, publicKey } = ciphertext;
    const { lambda, mu } = privateKey;
    const { n, nSquared } = publicKey;
    
    // m = L(c^λ mod n²) * μ mod n
    const cLambda = this.modPow(value, lambda, nSquared);
    const plaintext = (this.L(cLambda, n) * mu) % n;
    
    return plaintext;
  }

  /**
   * Add two encrypted values (homomorphic addition)
   */
  add(
    ciphertext1: HomomorphicCiphertext,
    ciphertext2: HomomorphicCiphertext
  ): HomomorphicCiphertext {
    if (ciphertext1.publicKey.n !== ciphertext2.publicKey.n) {
      throw new Error('Ciphertexts must use the same public key');
    }

    const result = (ciphertext1.value * ciphertext2.value) % ciphertext1.publicKey.nSquared;
    
    return {
      value: result,
      randomness: 0n, // Combined randomness is not tracked
      publicKey: ciphertext1.publicKey
    };
  }

  /**
   * Multiply encrypted value by a plaintext scalar
   */
  scalarMultiply(
    ciphertext: HomomorphicCiphertext,
    scalar: bigint
  ): HomomorphicCiphertext {
    const result = this.modPow(
      ciphertext.value,
      scalar,
      ciphertext.publicKey.nSquared
    );
    
    return {
      value: result,
      randomness: 0n,
      publicKey: ciphertext.publicKey
    };
  }

  /**
   * L function for Paillier decryption
   */
  private L(x: bigint, n: bigint): bigint {
    return (x - 1n) / n;
  }

  /**
   * Generate a random prime of specified bit length
   */
  private generatePrime(bits: number): bigint {
    // Simplified prime generation - in production use a proper prime generation algorithm
    let prime: bigint;
    do {
      const bytes = crypto.randomBytes(bits / 8);
      prime = BigInt('0x' + bytes.toString('hex'));
      // Set MSB to ensure correct bit length
      prime |= 1n << BigInt(bits - 1);
      // Ensure odd
      prime |= 1n;
    } while (!this.isProbablePrime(prime));
    
    return prime;
  }

  /**
   * Miller-Rabin primality test
   */
  private isProbablePrime(n: bigint, k: number = 10): boolean {
    if (n === 2n || n === 3n) return true;
    if (n < 2n || n % 2n === 0n) return false;

    // Write n-1 as 2^r * d
    let r = 0n;
    let d = n - 1n;
    while (d % 2n === 0n) {
      d /= 2n;
      r++;
    }

    // Witness loop
    for (let i = 0; i < k; i++) {
      const a = this.randomBigInt(2n, n - 2n);
      let x = this.modPow(a, d, n);
      
      if (x === 1n || x === n - 1n) continue;
      
      let continueWitnessLoop = false;
      for (let j = 0n; j < r - 1n; j++) {
        x = (x * x) % n;
        if (x === n - 1n) {
          continueWitnessLoop = true;
          break;
        }
      }
      
      if (!continueWitnessLoop) return false;
    }
    
    return true;
  }

  /**
   * Generate random bigint in range [min, max]
   */
  private randomBigInt(min: bigint, max: bigint): bigint {
    const range = max - min + 1n;
    const bits = range.toString(2).length;
    let result: bigint;
    
    do {
      const bytes = crypto.randomBytes(Math.ceil(bits / 8));
      result = BigInt('0x' + bytes.toString('hex')) % range;
    } while (result > range);
    
    return result + min;
  }

  /**
   * Generate a random number coprime to n
   */
  private generateCoprime(n: bigint): bigint {
    let r: bigint;
    do {
      r = this.randomBigInt(1n, n - 1n);
    } while (this.gcd(r, n) !== 1n);
    return r;
  }

  /**
   * Compute greatest common divisor
   */
  private gcd(a: bigint, b: bigint): bigint {
    while (b !== 0n) {
      [a, b] = [b, a % b];
    }
    return a;
  }

  /**
   * Compute least common multiple
   */
  private lcm(a: bigint, b: bigint): bigint {
    return (a * b) / this.gcd(a, b);
  }

  /**
   * Modular exponentiation
   */
  private modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
    let result = 1n;
    base = base % modulus;
    
    while (exponent > 0n) {
      if (exponent % 2n === 1n) {
        result = (result * base) % modulus;
      }
      exponent = exponent / 2n;
      base = (base * base) % modulus;
    }
    
    return result;
  }

  /**
   * Modular multiplicative inverse
   */
  private modInverse(a: bigint, m: bigint): bigint {
    const [g, x] = this.extendedGcd(a, m);
    if (g !== 1n) {
      throw new Error('Modular inverse does not exist');
    }
    return ((x % m) + m) % m;
  }

  /**
   * Extended Euclidean algorithm
   */
  private extendedGcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
    if (a === 0n) return [b, 0n, 1n];
    
    const [g, x1, y1] = this.extendedGcd(b % a, a);
    const x = y1 - (b / a) * x1;
    const y = x1;
    
    return [g, x, y];
  }
}

/**
 * Standard encryption for sensitive data
 */
export class StandardEncryption {
  /**
   * Initialize sodium library
   */
  static async init(): Promise<void> {
    await sodium.ready;
  }

  /**
   * Encrypt data using authenticated encryption
   */
  static async encrypt(
    plaintext: string,
    publicKey: Uint8Array
  ): Promise<EncryptedValue> {
    await this.init();
    
    const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
    const ephemeralKeyPair = sodium.crypto_box_keypair();
    
    const ciphertext = sodium.crypto_box_easy(
      sodium.from_string(plaintext),
      nonce,
      publicKey,
      ephemeralKeyPair.privateKey
    );
    
    return {
      ciphertext: sodium.to_base64(ciphertext),
      nonce: sodium.to_base64(nonce),
      publicKey: sodium.to_base64(ephemeralKeyPair.publicKey)
    };
  }

  /**
   * Decrypt data
   */
  static async decrypt(
    encryptedValue: EncryptedValue,
    privateKey: Uint8Array
  ): Promise<string> {
    await this.init();
    
    const ciphertext = sodium.from_base64(encryptedValue.ciphertext);
    const nonce = sodium.from_base64(encryptedValue.nonce);
    const ephemeralPublicKey = sodium.from_base64(encryptedValue.publicKey);
    
    const plaintext = sodium.crypto_box_open_easy(
      ciphertext,
      nonce,
      ephemeralPublicKey,
      privateKey
    );
    
    return sodium.to_string(plaintext);
  }

  /**
   * Generate encryption key pair
   */
  static async generateKeyPair(): Promise<{
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  }> {
    await this.init();
    return sodium.crypto_box_keypair();
  }

  /**
   * Hash data securely
   */
  static async hash(data: string): Promise<string> {
    await this.init();
    const hash = sodium.crypto_generichash(32, sodium.from_string(data));
    return sodium.to_hex(hash);
  }
}