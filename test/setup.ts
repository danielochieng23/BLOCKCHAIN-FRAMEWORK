// Test setup file
import { expect } from 'chai';

// Global test configuration
before(async function () {
  console.log('🧪 Starting test suite for Blockchain Digital Identity Framework');
});

after(async function () {
  console.log('✅ Test suite completed');
});

// Chai configuration
expect.extend({
  toBeValidAddress(received: string) {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(received);
    return {
      pass: isValid,
      message: () => `Expected ${received} to be a valid Ethereum address`,
    };
  },
  
  toBeValidDID(received: string) {
    const isValid = received.startsWith('did:blockchain:');
    return {
      pass: isValid,
      message: () => `Expected ${received} to be a valid DID`,
    };
  },
});