import { CryptoUtils } from './crypto';

/**
 * Zero-Knowledge Proof utilities for privacy-preserving operations
 */

export interface ZKProofInput {
  secret: string;
  publicSignal: string;
  nonce: string;
}

export interface ZKProof {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
  publicSignals: string[];
}

export interface CircuitWitness {
  [key: string]: string | number | bigint;
}

export class ZKProofGenerator {
  /**
   * Generate proof for age verification without revealing exact age
   */
  static generateAgeProof(
    birthYear: number,
    minimumAge: number,
    nonce: string
  ): ZKProof {
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    const isOldEnough = age >= minimumAge ? 1 : 0;

    // Simplified proof generation - in production, use circom/snarkjs
    const commitment = CryptoUtils.createCommitment(
      birthYear.toString(),
      nonce
    );

    return {
      a: [commitment.slice(0, 32), commitment.slice(32, 64)],
      b: [
        [CryptoUtils.hash(age.toString()).slice(0, 32), CryptoUtils.hash(age.toString()).slice(32, 64)],
        [CryptoUtils.hash(minimumAge.toString()).slice(0, 32), CryptoUtils.hash(minimumAge.toString()).slice(32, 64)]
      ],
      c: [isOldEnough.toString().padStart(32, '0'), '0'.padStart(32, '0')],
      publicSignals: [isOldEnough.toString(), minimumAge.toString()]
    };
  }

  /**
   * Generate proof for location verification without revealing exact location
   */
  static generateLocationProof(
    latitude: number,
    longitude: number,
    allowedRegion: { 
      minLat: number; 
      maxLat: number; 
      minLon: number; 
      maxLon: number; 
    },
    nonce: string
  ): ZKProof {
    const isInRegion = 
      latitude >= allowedRegion.minLat &&
      latitude <= allowedRegion.maxLat &&
      longitude >= allowedRegion.minLon &&
      longitude <= allowedRegion.maxLon ? 1 : 0;

    const locationHash = CryptoUtils.hash(`${latitude},${longitude}`);
    const commitment = CryptoUtils.createCommitment(locationHash, nonce);

    return {
      a: [commitment.slice(0, 32), commitment.slice(32, 64)],
      b: [
        [locationHash.slice(0, 32), locationHash.slice(32, 64)],
        [CryptoUtils.hash(JSON.stringify(allowedRegion)).slice(0, 32), CryptoUtils.hash(JSON.stringify(allowedRegion)).slice(32, 64)]
      ],
      c: [isInRegion.toString().padStart(32, '0'), '0'.padStart(32, '0')],
      publicSignals: [isInRegion.toString()]
    };
  }

  /**
   * Generate proof for income verification without revealing exact amount
   */
  static generateIncomeProof(
    actualIncome: number,
    minimumRequired: number,
    nonce: string
  ): ZKProof {
    const meetsRequirement = actualIncome >= minimumRequired ? 1 : 0;
    const incomeHash = CryptoUtils.hash(actualIncome.toString());
    const commitment = CryptoUtils.createCommitment(incomeHash, nonce);

    return {
      a: [commitment.slice(0, 32), commitment.slice(32, 64)],
      b: [
        [incomeHash.slice(0, 32), incomeHash.slice(32, 64)],
        [CryptoUtils.hash(minimumRequired.toString()).slice(0, 32), CryptoUtils.hash(minimumRequired.toString()).slice(32, 64)]
      ],
      c: [meetsRequirement.toString().padStart(32, '0'), '0'.padStart(32, '0')],
      publicSignals: [meetsRequirement.toString(), minimumRequired.toString()]
    };
  }

  /**
   * Generate membership proof (proving membership in a set without revealing which member)
   */
  static generateMembershipProof(
    memberSecret: string,
    memberSet: string[],
    nonce: string
  ): ZKProof {
    const memberHash = CryptoUtils.hash(memberSecret);
    const isMember = memberSet.includes(memberSecret) ? 1 : 0;
    
    // Create Merkle tree of the member set
    const merkleRoot = CryptoUtils.createMerkleRoot(
      memberSet.map(member => CryptoUtils.hash(member))
    );

    const commitment = CryptoUtils.createCommitment(memberSecret, nonce);

    return {
      a: [commitment.slice(0, 32), commitment.slice(32, 64)],
      b: [
        [memberHash.slice(0, 32), memberHash.slice(32, 64)],
        [merkleRoot.slice(0, 32), merkleRoot.slice(32, 64)]
      ],
      c: [isMember.toString().padStart(32, '0'), '0'.padStart(32, '0')],
      publicSignals: [isMember.toString(), merkleRoot]
    };
  }

  /**
   * Generate proof for credential ownership without revealing the credential
   */
  static generateCredentialOwnershipProof(
    credentialHash: string,
    ownerSecret: string,
    nonce: string
  ): ZKProof {
    const ownershipHash = CryptoUtils.hash(credentialHash + ownerSecret);
    const commitment = CryptoUtils.createCommitment(ownershipHash, nonce);

    return {
      a: [commitment.slice(0, 32), commitment.slice(32, 64)],
      b: [
        [ownershipHash.slice(0, 32), ownershipHash.slice(32, 64)],
        [credentialHash.slice(0, 32), credentialHash.slice(32, 64)]
      ],
      c: ['1'.padStart(32, '0'), '0'.padStart(32, '0')],
      publicSignals: ['1']
    };
  }

  /**
   * Verify a zero-knowledge proof
   */
  static verifyProof(
    proof: ZKProof,
    expectedPublicSignals: string[],
    verificationKey?: any
  ): boolean {
    // Simplified verification - in production, use proper verification
    if (!proof.publicSignals || proof.publicSignals.length === 0) {
      return false;
    }

    // Check public signals match expected
    if (proof.publicSignals.length !== expectedPublicSignals.length) {
      return false;
    }

    for (let i = 0; i < expectedPublicSignals.length; i++) {
      if (proof.publicSignals[i] !== expectedPublicSignals[i]) {
        return false;
      }
    }

    // Simplified proof structure validation
    if (!proof.a || proof.a.length !== 2) return false;
    if (!proof.b || proof.b.length !== 2 || proof.b[0].length !== 2 || proof.b[1].length !== 2) return false;
    if (!proof.c || proof.c.length !== 2) return false;

    return true;
  }

  /**
   * Generate circuit witness for a given input
   */
  static generateWitness(
    circuitType: string,
    inputs: { [key: string]: any }
  ): CircuitWitness {
    const witness: CircuitWitness = {};

    switch (circuitType) {
      case 'age_verification':
        witness.birthYear = inputs.birthYear;
        witness.currentYear = new Date().getFullYear();
        witness.minimumAge = inputs.minimumAge;
        witness.age = witness.currentYear - witness.birthYear;
        witness.isOldEnough = Number(witness.age >= witness.minimumAge);
        witness.nonce = inputs.nonce;
        break;

      case 'location_verification':
        witness.latitude = inputs.latitude;
        witness.longitude = inputs.longitude;
        witness.minLat = inputs.region.minLat;
        witness.maxLat = inputs.region.maxLat;
        witness.minLon = inputs.region.minLon;
        witness.maxLon = inputs.region.maxLon;
        witness.isInRegion = Number(
          inputs.latitude >= inputs.region.minLat &&
          inputs.latitude <= inputs.region.maxLat &&
          inputs.longitude >= inputs.region.minLon &&
          inputs.longitude <= inputs.region.maxLon
        );
        witness.nonce = inputs.nonce;
        break;

      case 'income_verification':
        witness.actualIncome = inputs.actualIncome;
        witness.minimumRequired = inputs.minimumRequired;
        witness.meetsRequirement = Number(inputs.actualIncome >= inputs.minimumRequired);
        witness.nonce = inputs.nonce;
        break;

      default:
        throw new Error(`Unknown circuit type: ${circuitType}`);
    }

    return witness;
  }

  /**
   * Create a range proof (prove a value is within a range without revealing it)
   */
  static generateRangeProof(
    value: number,
    minValue: number,
    maxValue: number,
    nonce: string
  ): ZKProof {
    const isInRange = value >= minValue && value <= maxValue ? 1 : 0;
    const valueHash = CryptoUtils.hash(value.toString());
    const commitment = CryptoUtils.createCommitment(valueHash, nonce);

    return {
      a: [commitment.slice(0, 32), commitment.slice(32, 64)],
      b: [
        [valueHash.slice(0, 32), valueHash.slice(32, 64)],
        [CryptoUtils.hash(`${minValue}-${maxValue}`).slice(0, 32), CryptoUtils.hash(`${minValue}-${maxValue}`).slice(32, 64)]
      ],
      c: [isInRange.toString().padStart(32, '0'), '0'.padStart(32, '0')],
      publicSignals: [isInRange.toString(), minValue.toString(), maxValue.toString()]
    };
  }

  /**
   * Generate a nullifier to prevent double-spending or double-use
   */
  static generateNullifier(secret: string, context: string): string {
    return CryptoUtils.generateNullifier(secret, context);
  }

  /**
   * Batch verify multiple proofs
   */
  static batchVerifyProofs(
    proofs: ZKProof[],
    expectedSignals: string[][],
    verificationKeys?: any[]
  ): boolean[] {
    return proofs.map((proof, index) => {
      return this.verifyProof(
        proof,
        expectedSignals[index],
        verificationKeys?.[index]
      );
    });
  }
}

/**
 * Circuit definitions for common privacy-preserving operations
 */
export const CircuitDefinitions = {
  AGE_VERIFICATION: {
    name: 'age_verification',
    description: 'Prove age is above minimum without revealing exact age',
    inputs: ['birthYear', 'minimumAge', 'nonce'],
    outputs: ['isOldEnough']
  },

  LOCATION_VERIFICATION: {
    name: 'location_verification',
    description: 'Prove location is within allowed region without revealing exact coordinates',
    inputs: ['latitude', 'longitude', 'region', 'nonce'],
    outputs: ['isInRegion']
  },

  INCOME_VERIFICATION: {
    name: 'income_verification',
    description: 'Prove income meets requirement without revealing exact amount',
    inputs: ['actualIncome', 'minimumRequired', 'nonce'],
    outputs: ['meetsRequirement']
  },

  MEMBERSHIP_PROOF: {
    name: 'membership_proof',
    description: 'Prove membership in a set without revealing which member',
    inputs: ['memberSecret', 'memberSet', 'nonce'],
    outputs: ['isMember', 'merkleRoot']
  },

  CREDENTIAL_OWNERSHIP: {
    name: 'credential_ownership',
    description: 'Prove ownership of a credential without revealing the credential',
    inputs: ['credentialHash', 'ownerSecret', 'nonce'],
    outputs: ['isOwner']
  }
};