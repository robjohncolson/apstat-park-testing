/**
 * Unit tests for the validation module
 * 
 * This test file ensures the validation functions work correctly
 * and provides comprehensive coverage of validation rules.
 */

import { describe, it, beforeEach } from 'vitest';
import assert from 'node:assert';
import { generateKeyPair, sign, hash } from './crypto.js';
import { 
  isTransactionValid, 
  isBlockValid, 
  isBlockHashCorrect, 
  isMerkleRootCorrect, 
  isProofOfAccessValid, 
  areAllTransactionsValid,
  calculateMerkleRoot,
  isBlockStructureValid
} from './validation.js';
import type { Transaction, Block, TransactionData, LessonProgressData } from './types.js';
import type { ChainDB } from './database.js';

describe('Validation Module', () => {
  let keyPair: { privateKey: string; publicKey: string };

  // Helper function to create a valid mock transaction
  function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
    const progressData: LessonProgressData = {
      lessonId: 'lesson-001',
      progressType: 'lesson_completed',
      status: 'completed',
      progressPercentage: 100,
      timeSpent: 1800 // 30 minutes
    };

    // Build the transaction fields, allowing overrides from the caller
    const txFields: Omit<Transaction, 'id' | 'signature'> = {
      type: 'LESSON_PROGRESS',
      data: progressData as TransactionData,
      publicKey: keyPair.publicKey,
      timestamp: Date.now(),
      priority: 'normal',
      nonce: 1,
      gas: { limit: 21_000, price: 1 },
      ...overrides,
    } as any;

    // Generate the canonical transaction ID exactly how the validator does
    const id = hash({
      type: txFields.type,
      data: txFields.data,
      publicKey: txFields.publicKey,
      timestamp: txFields.timestamp,
      priority: txFields.priority,
      nonce: txFields.nonce,
      gas: txFields.gas,
    });

    // Sign the transaction payload (including the freshly computed id)
    const signData = { id, ...txFields };
    const signature = sign(signData, keyPair.privateKey);

    return {
      id,
      ...txFields,
      signature,
    } as Transaction;
  }

  // Helper function to create a valid mock block
  function createMockBlock(overrides: Partial<Block> = {}): Block {
    const transactions = overrides.transactions || [createMockTransaction()];
    const merkleRoot = calculateMerkleRoot(transactions);
    
    const header = {
      version: 1,
      previousHash: '0'.repeat(64),
      merkleRoot,
      timestamp: Date.now(),
      nonce: 12345,
      proofOfAccessHash: hash({ content: 'educational-access-proof' }),
      difficulty: 1,
      height: 1,
      ...overrides.header
    };

    // Calculate block hash
    const blockHash = hash({
      version: header.version,
      previousHash: header.previousHash,
      merkleRoot: header.merkleRoot,
      timestamp: header.timestamp,
      nonce: header.nonce,
      proofOfAccessHash: header.proofOfAccessHash,
      difficulty: header.difficulty,
      height: header.height
    });

    return {
      header: { ...header, hash: blockHash },
      transactions,
      attestations: [],
      ...overrides
    };
  }

  // Mock database for testing
  const mockDB: ChainDB = {
    getBlockByHash: async (hash: string) => undefined,
    addBlock: async (block: Block) => {},
    getLatestBlock: async () => undefined,
    getCurrentHeight: async () => 0
  } as any;

  beforeEach(() => {
    keyPair = generateKeyPair();
  });

  describe('isTransactionValid', () => {
    it('should return true for a valid transaction', () => {
      const transaction = createMockTransaction();
      const isValid = isTransactionValid(transaction);
      assert.strictEqual(isValid, true, 'Valid transaction should pass validation');
    });

    it('should return false for transaction with missing required fields', () => {
      const transaction = createMockTransaction();
      
      // Test missing ID
      const noId = { ...transaction, id: '' };
      assert.strictEqual(isTransactionValid(noId), false, 'Transaction without ID should be invalid');
      
      // Test missing signature
      const noSignature = { ...transaction, signature: '' };
      assert.strictEqual(isTransactionValid(noSignature), false, 'Transaction without signature should be invalid');
      
      // Test missing public key
      const noPublicKey = { ...transaction, publicKey: '' };
      assert.strictEqual(isTransactionValid(noPublicKey), false, 'Transaction without public key should be invalid');
    });

    it('should return false for transaction with incorrect ID hash', () => {
      const transaction = createMockTransaction();
      transaction.id = 'wrong-hash';
      
      const isValid = isTransactionValid(transaction);
      assert.strictEqual(isValid, false, 'Transaction with incorrect ID hash should be invalid');
    });

    it('should return false for transaction with invalid signature', () => {
      const transaction = createMockTransaction();
      
      // Tamper with the signature
      transaction.signature = 'invalid-signature';
      
      const isValid = isTransactionValid(transaction);
      assert.strictEqual(isValid, false, 'Transaction with invalid signature should be invalid');
    });

    it('should return false for transaction signed with different key', () => {
      const transaction = createMockTransaction();
      const differentKeyPair = generateKeyPair();
      
      // Re-sign with different private key but keep original public key
      const signData = {
        id: transaction.id,
        type: transaction.type,
        data: transaction.data,
        publicKey: transaction.publicKey,
        timestamp: transaction.timestamp,
        priority: transaction.priority
      };
      transaction.signature = sign(signData, differentKeyPair.privateKey);
      
      const isValid = isTransactionValid(transaction);
      assert.strictEqual(isValid, false, 'Transaction signed with different key should be invalid');
    });

    it('should handle malformed transaction gracefully', () => {
      const malformedTransaction = {} as Transaction;
      const isValid = isTransactionValid(malformedTransaction);
      assert.strictEqual(isValid, false, 'Malformed transaction should be invalid');
    });
  });

  describe('isBlockHashCorrect', () => {
    it('should return true for block with correct hash', () => {
      const block = createMockBlock();
      const isValid = isBlockHashCorrect(block);
      assert.strictEqual(isValid, true, 'Block with correct hash should be valid');
    });

    it('should return false for block without hash', () => {
      const block = createMockBlock();
      delete block.header.hash;
      
      const isValid = isBlockHashCorrect(block);
      assert.strictEqual(isValid, false, 'Block without hash should be invalid');
    });

    it('should return false for block with incorrect hash', () => {
      const block = createMockBlock();
      block.header.hash = 'wrong-hash';
      
      const isValid = isBlockHashCorrect(block);
      assert.strictEqual(isValid, false, 'Block with incorrect hash should be invalid');
    });

    it('should return false for block with tampered header data', () => {
      const block = createMockBlock();
      // Tamper with header but keep original hash
      block.header.nonce = 99999;
      
      const isValid = isBlockHashCorrect(block);
      assert.strictEqual(isValid, false, 'Block with tampered header should be invalid');
    });
  });

  describe('isMerkleRootCorrect', () => {
    it('should return true for block with correct Merkle root', () => {
      const block = createMockBlock();
      const isValid = isMerkleRootCorrect(block);
      assert.strictEqual(isValid, true, 'Block with correct Merkle root should be valid');
    });

    it('should return false for block with incorrect Merkle root', () => {
      const block = createMockBlock();
      block.header.merkleRoot = 'wrong-merkle-root';
      
      const isValid = isMerkleRootCorrect(block);
      assert.strictEqual(isValid, false, 'Block with incorrect Merkle root should be invalid');
    });

    it('should handle block with modified transactions', () => {
      const block = createMockBlock();
      // Modify a transaction but keep original Merkle root
      block.transactions[0].timestamp = 999999;
      
      const isValid = isMerkleRootCorrect(block);
      assert.strictEqual(isValid, false, 'Block with modified transactions should have invalid Merkle root');
    });
  });

  describe('calculateMerkleRoot', () => {
    it('should calculate Merkle root for empty transaction list', () => {
      const merkleRoot = calculateMerkleRoot([]);
      assert.strictEqual(typeof merkleRoot, 'string', 'Merkle root should be a string');
      assert.strictEqual(merkleRoot.length, 64, 'Merkle root should be 64 hex characters');
    });

    it('should calculate Merkle root for single transaction', () => {
      const transaction = createMockTransaction();
      const merkleRoot = calculateMerkleRoot([transaction]);
      
      // Should be the hash of the single transaction
      const expectedRoot = hash(transaction);
      assert.strictEqual(merkleRoot, expectedRoot, 'Single transaction Merkle root should equal transaction hash');
    });

    it('should calculate Merkle root for multiple transactions', () => {
      const tx1 = createMockTransaction();
      const tx2 = createMockTransaction({ timestamp: Date.now() + 1000 });
      const transactions = [tx1, tx2];
      
      const merkleRoot = calculateMerkleRoot(transactions);
      assert.strictEqual(typeof merkleRoot, 'string', 'Merkle root should be a string');
      assert.strictEqual(merkleRoot.length, 64, 'Merkle root should be 64 hex characters');
      
      // Should be deterministic
      const merkleRoot2 = calculateMerkleRoot(transactions);
      assert.strictEqual(merkleRoot, merkleRoot2, 'Merkle root calculation should be deterministic');
    });

    it('should handle odd number of transactions', () => {
      const tx1 = createMockTransaction();
      const tx2 = createMockTransaction({ timestamp: Date.now() + 1000 });
      const tx3 = createMockTransaction({ timestamp: Date.now() + 2000 });
      const transactions = [tx1, tx2, tx3];
      
      const merkleRoot = calculateMerkleRoot(transactions);
      assert.strictEqual(typeof merkleRoot, 'string', 'Merkle root should be a string');
      assert.strictEqual(merkleRoot.length, 64, 'Merkle root should be 64 hex characters');
    });
  });

  describe('isProofOfAccessValid', () => {
    it('should return true for properly formatted proof of access hash', async () => {
      const block = createMockBlock();
      const isValid = await isProofOfAccessValid(block, mockDB);
      assert.strictEqual(isValid, true, 'Block with properly formatted proof of access should be valid');
    });

    it('should return false for missing proof of access hash', async () => {
      const block = createMockBlock();
      block.header.proofOfAccessHash = '';
      
      const isValid = await isProofOfAccessValid(block, mockDB);
      assert.strictEqual(isValid, false, 'Block without proof of access should be invalid');
    });

    it('should return false for incorrectly formatted proof of access hash', async () => {
      const block = createMockBlock();
      block.header.proofOfAccessHash = 'not-a-valid-hash';
      
      const isValid = await isProofOfAccessValid(block, mockDB);
      assert.strictEqual(isValid, false, 'Block with invalid proof of access format should be invalid');
    });

    it('should return false for proof of access hash that is too short', async () => {
      const block = createMockBlock();
      block.header.proofOfAccessHash = 'abc123'; // Too short
      
      const isValid = await isProofOfAccessValid(block, mockDB);
      assert.strictEqual(isValid, false, 'Block with short proof of access should be invalid');
    });
  });

  describe('areAllTransactionsValid', () => {
    it('should return true for block with all valid transactions', () => {
      const tx1 = createMockTransaction();
      const tx2 = createMockTransaction({ timestamp: Date.now() + 1000 });
      const block = createMockBlock({ transactions: [tx1, tx2] });
      
      const isValid = areAllTransactionsValid(block);
      assert.strictEqual(isValid, true, 'Block with all valid transactions should be valid');
    });

    it('should return false for block with no transactions', () => {
      const block = createMockBlock({ transactions: [] });
      
      const isValid = areAllTransactionsValid(block);
      assert.strictEqual(isValid, false, 'Block with no transactions should be invalid');
    });

    it('should return false for block with at least one invalid transaction', () => {
      const validTx = createMockTransaction();
      const invalidTx = createMockTransaction({ signature: 'invalid-signature' });
      const block = createMockBlock({ transactions: [validTx, invalidTx] });
      
      const isValid = areAllTransactionsValid(block);
      assert.strictEqual(isValid, false, 'Block with invalid transaction should be invalid');
    });
  });

  describe('isBlockStructureValid', () => {
    it('should return true for properly structured block', () => {
      const block = createMockBlock();
      const isValid = isBlockStructureValid(block);
      assert.strictEqual(isValid, true, 'Properly structured block should be valid');
    });

    it('should return false for block without header', () => {
      const block = createMockBlock();
      delete (block as any).header;
      
      const isValid = isBlockStructureValid(block);
      assert.strictEqual(isValid, false, 'Block without header should be invalid');
    });

    it('should return false for block without transactions array', () => {
      const block = createMockBlock();
      delete (block as any).transactions;
      
      const isValid = isBlockStructureValid(block);
      assert.strictEqual(isValid, false, 'Block without transactions should be invalid');
    });

    it('should return false for block with invalid hash format', () => {
      const block = createMockBlock();
      block.header.previousHash = 'invalid-hash-format';
      
      const isValid = isBlockStructureValid(block);
      assert.strictEqual(isValid, false, 'Block with invalid hash format should be invalid');
    });

    it('should return false for block with negative height', () => {
      const block = createMockBlock();
      block.header.height = -1;
      
      const isValid = isBlockStructureValid(block);
      assert.strictEqual(isValid, false, 'Block with negative height should be invalid');
    });

    it('should return false for block with future timestamp', () => {
      const block = createMockBlock();
      block.header.timestamp = Date.now() + (2 * 60 * 60 * 1000); // 2 hours in future
      
      const isValid = isBlockStructureValid(block);
      assert.strictEqual(isValid, false, 'Block with future timestamp should be invalid');
    });

    it('should return false for block with very old timestamp', () => {
      const block = createMockBlock();
      block.header.timestamp = new Date('2020-01-01').getTime(); // Before project start
      
      const isValid = isBlockStructureValid(block);
      assert.strictEqual(isValid, false, 'Block with very old timestamp should be invalid');
    });
  });

  describe('isBlockValid (integration test)', () => {
    it('should return true for completely valid block', async () => {
      const block = createMockBlock();
      const isValid = await isBlockValid(block, mockDB);
      assert.strictEqual(isValid, true, 'Completely valid block should pass all validations');
    });

    it('should return false if any validation component fails', async () => {
      // Test with invalid hash
      const blockWithBadHash = createMockBlock();
      blockWithBadHash.header.hash = 'wrong-hash';
      
      const isValid1 = await isBlockValid(blockWithBadHash, mockDB);
      assert.strictEqual(isValid1, false, 'Block with invalid hash should fail validation');

      // Test with invalid Merkle root
      const blockWithBadMerkle = createMockBlock();
      blockWithBadMerkle.header.merkleRoot = 'wrong-merkle';
      
      const isValid2 = await isBlockValid(blockWithBadMerkle, mockDB);
      assert.strictEqual(isValid2, false, 'Block with invalid Merkle root should fail validation');

      // Test with invalid transactions
      const invalidTx = createMockTransaction({ signature: 'invalid' });
      const blockWithBadTx = createMockBlock({ transactions: [invalidTx] });
      
      const isValid3 = await isBlockValid(blockWithBadTx, mockDB);
      assert.strictEqual(isValid3, false, 'Block with invalid transactions should fail validation');
    });

    it('should handle validation errors gracefully', async () => {
      const malformedBlock = {} as Block;
      const isValid = await isBlockValid(malformedBlock, mockDB);
      assert.strictEqual(isValid, false, 'Malformed block should be invalid');
    });
  });
}); 