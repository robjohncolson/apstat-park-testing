/**
 * Unit tests for the crypto module
 * 
 * This test file ensures the cryptographic functions work correctly
 * and provides high confidence in our cryptographic foundation.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert';
import { generateKeyPair, sign, verify, hash } from './crypto.js';
import type { KeyPair } from './types.js';

describe('Crypto Module', () => {
  describe('generateKeyPair', () => {
    it('should generate a valid key pair', () => {
      const keyPair = generateKeyPair();
      
      // Check that both keys are present
      assert.ok(keyPair.publicKey, 'Public key should be present');
      assert.ok(keyPair.privateKey, 'Private key should be present');
      
      // Check that keys are hex strings
      assert.strictEqual(typeof keyPair.publicKey, 'string');
      assert.strictEqual(typeof keyPair.privateKey, 'string');
      
      // Check hex format (should only contain hex characters)
      assert.ok(/^[0-9a-f]+$/i.test(keyPair.publicKey), 'Public key should be valid hex');
      assert.ok(/^[0-9a-f]+$/i.test(keyPair.privateKey), 'Private key should be valid hex');
      
      // Private key should be 32 bytes (64 hex characters)
      assert.strictEqual(keyPair.privateKey.length, 64, 'Private key should be 64 hex characters (32 bytes)');
      
      // Public key should be 33 bytes (66 hex characters) for compressed format
      assert.strictEqual(keyPair.publicKey.length, 66, 'Public key should be 66 hex characters (33 bytes compressed)');
    });

    it('should generate different key pairs each time', () => {
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();
      
      assert.notStrictEqual(keyPair1.privateKey, keyPair2.privateKey, 'Private keys should be different');
      assert.notStrictEqual(keyPair1.publicKey, keyPair2.publicKey, 'Public keys should be different');
    });
  });

  describe('hash', () => {
    it('should hash data consistently', () => {
      const data = { message: 'Hello, blockchain!' };
      const hash1 = hash(data);
      const hash2 = hash(data);
      
      assert.strictEqual(hash1, hash2, 'Same data should produce same hash');
      assert.strictEqual(typeof hash1, 'string', 'Hash should be a string');
      assert.ok(/^[0-9a-f]+$/i.test(hash1), 'Hash should be valid hex');
      assert.strictEqual(hash1.length, 64, 'SHA-256 hash should be 64 hex characters (32 bytes)');
    });

    it('should produce different hashes for different data', () => {
      const data1 = { message: 'Hello' };
      const data2 = { message: 'World' };
      
      const hash1 = hash(data1);
      const hash2 = hash(data2);
      
      assert.notStrictEqual(hash1, hash2, 'Different data should produce different hashes');
    });

    it('should handle various data types', () => {
      const testCases = [
        'simple string',
        { key: 'value' },
        [1, 2, 3],
        123,
        true,
        null
      ];

      testCases.forEach((testData, index) => {
        const result = hash(testData);
        assert.strictEqual(typeof result, 'string', `Test case ${index}: Hash should be a string`);
        assert.strictEqual(result.length, 64, `Test case ${index}: Hash should be 64 characters`);
      });
    });
  });

  describe('sign and verify', () => {
    let keyPair: KeyPair;
    let sampleData: any;

    // Set up test data
    beforeEach(() => {
      keyPair = generateKeyPair();
      sampleData = { 
        message: 'Test message for signing',
        timestamp: '2024-01-01T00:00:00Z',
        amount: 100
      };
    });

    it('should sign a message and verify with correct public key (returns true)', () => {
      // Sign the sample message
      const signature = sign(sampleData, keyPair.privateKey);
      
      // Verify with the correct public key
      const isValid = verify(signature, sampleData, keyPair.publicKey);
      
      assert.strictEqual(isValid, true, 'Signature should be valid with correct public key');
      assert.strictEqual(typeof signature, 'string', 'Signature should be a string');
      assert.ok(/^[0-9a-f]+$/i.test(signature), 'Signature should be valid hex');
    });

    it('should fail verification with different public key (returns false)', () => {
      // Generate a different key pair
      const differentKeyPair = generateKeyPair();
      
      // Sign with original private key
      const signature = sign(sampleData, keyPair.privateKey);
      
      // Try to verify with different public key
      const isValid = verify(signature, sampleData, differentKeyPair.publicKey);
      
      assert.strictEqual(isValid, false, 'Signature should be invalid with different public key');
    });

    it('should fail verification with modified data', () => {
      // Sign the original data
      const signature = sign(sampleData, keyPair.privateKey);
      
      // Modify the data
      const modifiedData = { ...sampleData, message: 'Modified message' };
      
      // Try to verify with modified data
      const isValid = verify(signature, modifiedData, keyPair.publicKey);
      
      assert.strictEqual(isValid, false, 'Signature should be invalid with modified data');
    });

    it('should fail verification with corrupted signature', () => {
      // Sign the data
      const signature = sign(sampleData, keyPair.privateKey);
      
      // Corrupt the signature by changing one character
      const corruptedSignature = signature.substring(0, signature.length - 1) + 'x';
      
      // Try to verify with corrupted signature
      const isValid = verify(corruptedSignature, sampleData, keyPair.publicKey);
      
      assert.strictEqual(isValid, false, 'Corrupted signature should be invalid');
    });

    it('should handle invalid inputs gracefully', () => {
      // Test with invalid signature format
      const invalidSig = 'not-a-valid-signature';
      const isValid1 = verify(invalidSig, sampleData, keyPair.publicKey);
      assert.strictEqual(isValid1, false, 'Invalid signature format should return false');

      // Test with invalid public key format
      const invalidPubKey = 'not-a-valid-public-key';
      const validSignature = sign(sampleData, keyPair.privateKey);
      const isValid2 = verify(validSignature, sampleData, invalidPubKey);
      assert.strictEqual(isValid2, false, 'Invalid public key format should return false');
    });

    it('should work with different data types', () => {
      const testCases = [
        'string data',
        { complex: { nested: { object: true } } },
        [1, 2, 3, 'mixed', { array: true }],
        123456789,
        true
      ];

      testCases.forEach((testData, index) => {
        const signature = sign(testData, keyPair.privateKey);
        const isValid = verify(signature, testData, keyPair.publicKey);
        
        assert.strictEqual(isValid, true, `Test case ${index}: Should verify correctly`);
      });
    });
  });

  describe('Integration tests', () => {
    it('should work end-to-end with multiple operations', () => {
      // Generate multiple key pairs
      const alice = generateKeyPair();
      const bob = generateKeyPair();
      
      // Create some test data
      const transaction = {
        from: alice.publicKey,
        to: bob.publicKey,
        amount: 50,
        timestamp: Date.now()
      };
      
      // Alice signs the transaction
      const aliceSignature = sign(transaction, alice.privateKey);
      
      // Verify Alice's signature
      const aliceVerification = verify(aliceSignature, transaction, alice.publicKey);
      assert.strictEqual(aliceVerification, true, 'Alice\'s signature should be valid');
      
      // Bob should not be able to verify with his key (he didn't sign it)
      const bobVerification = verify(aliceSignature, transaction, bob.publicKey);
      assert.strictEqual(bobVerification, false, 'Bob should not be able to verify Alice\'s signature');
      
      // Hash the transaction for storage
      const txHash = hash(transaction);
      assert.strictEqual(typeof txHash, 'string', 'Transaction hash should be a string');
      assert.strictEqual(txHash.length, 64, 'Transaction hash should be 64 characters');
    });
  });
});

// Helper function to set up test environment
function beforeEach(setupFn: () => void) {
  // This is a simple implementation for our test setup
  // In a real testing framework, this would be handled automatically
  setupFn();
} 