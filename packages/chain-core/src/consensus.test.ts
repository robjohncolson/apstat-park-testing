/**
 * Unit tests for the consensus module
 * 
 * This test file ensures the consensus functions work correctly
 * for the Proof of Knowledge blockchain system.
 */

import { describe, it, beforeEach } from 'vitest';
import assert from 'node:assert';
import { 
  selectPuzzleForUser, 
  proposeBlock, 
  verifyPuzzleSolution,
  getTransactionByHash,
  verifyPuzzleSolutionWithContext,
  handleFailedBlock 
} from './consensus.js';
import { ChainDB } from './database.js';
import { QUIZ_BANK } from './QuizBank.js';
import { generateKeyPair, hash } from './crypto.js';
import type { Block, Transaction, LessonProgressData } from './types.js';

describe('Consensus Module', () => {
  let db: ChainDB;
  let userKeyPair: ReturnType<typeof generateKeyPair>;
  let genesisBlock: Block;

  beforeEach(async () => {
    // Create a fresh database for each test
    db = new ChainDB();
    await db.open();
    
    // Generate a test user
    userKeyPair = generateKeyPair();
    
    // Create a genesis block
    genesisBlock = {
      header: {
        version: 1,
        previousHash: '0'.repeat(64),
        merkleRoot: hash(''),
        timestamp: Date.now(),
        nonce: 0,
        proofOfAccessHash: '0'.repeat(64),
        difficulty: 1,
        height: 0,
        hash: '1'.repeat(64)
      },
      transactions: [],
      attestations: []
    };
    
    await db.addBlock(genesisBlock);
  });

  describe('selectPuzzleForUser', () => {
    it('should return null when no blocks exist', async () => {
      // Clear the database
      await db.close();
      db = new ChainDB();
      await db.open();
      
      const result = await selectPuzzleForUser(userKeyPair.publicKey, db);
      assert.strictEqual(result, null, 'Should return null when no blocks exist');
    });

    it('should return null when user has no progress', async () => {
      const result = await selectPuzzleForUser(userKeyPair.publicKey, db);
      assert.strictEqual(result, null, 'Should return null when user has no progress');
    });

    it('should return a puzzle when user has progress', async () => {
      // Create a lesson progress transaction
      const progressTx: Transaction = {
        id: 'test-progress-1',
        type: 'LESSON_PROGRESS',
        data: {
          lessonId: '1-1',
          progressType: 'lesson_completed',
          status: 'completed',
          progressPercentage: 100,
          timeSpent: 1800
        } as LessonProgressData,
        signature: 'test-signature',
        publicKey: userKeyPair.publicKey,
        timestamp: Date.now(),
        priority: 'normal'
      };

      // Create a block with the progress transaction
      const block: Block = {
        header: {
          version: 1,
          previousHash: genesisBlock.header.hash!,
          merkleRoot: hash([progressTx]),
          timestamp: Date.now(),
          nonce: 0,
          proofOfAccessHash: '0'.repeat(64),
          difficulty: 1,
          height: 1,
          hash: '2'.repeat(64)
        },
        transactions: [progressTx],
        attestations: []
      };

      await db.addBlock(block);

      const result = await selectPuzzleForUser(userKeyPair.publicKey, db);
      
      assert.notStrictEqual(result, null, 'Should return a puzzle when user has progress');
      assert.ok(result!.puzzle, 'Result should contain a puzzle');
      assert.ok(result!.proofOfAccessHash, 'Result should contain proof of access hash');
      assert.strictEqual(result!.puzzle.lessonId, '1-1', 'Puzzle should be from the correct lesson');
    });

    it('should return null when lesson has no questions', async () => {
      // Create a lesson progress transaction for a lesson with no questions
      const progressTx: Transaction = {
        id: 'test-progress-2',
        type: 'LESSON_PROGRESS',
        data: {
          lessonId: 'nonexistent-lesson',
          progressType: 'lesson_completed',
          status: 'completed',
          progressPercentage: 100,
          timeSpent: 1800
        } as LessonProgressData,
        signature: 'test-signature',
        publicKey: userKeyPair.publicKey,
        timestamp: Date.now(),
        priority: 'normal'
      };

      const block: Block = {
        header: {
          version: 1,
          previousHash: genesisBlock.header.hash!,
          merkleRoot: hash([progressTx]),
          timestamp: Date.now(),
          nonce: 0,
          proofOfAccessHash: '0'.repeat(64),
          difficulty: 1,
          height: 1,
          hash: '3'.repeat(64)
        },
        transactions: [progressTx],
        attestations: []
      };

      await db.addBlock(block);

      const result = await selectPuzzleForUser(userKeyPair.publicKey, db);
      assert.strictEqual(result, null, 'Should return null when lesson has no questions');
    });
  });

  describe('proposeBlock', () => {
    it('should create a valid block with correct structure', () => {
      const transactions: Transaction[] = [{
        id: 'test-tx-1',
        type: 'USER_CREATE',
        data: {
          username: 'testuser',
          createdAt: new Date().toISOString()
        },
        signature: 'test-signature',
        publicKey: userKeyPair.publicKey,
        timestamp: Date.now(),
        priority: 'normal'
      }];

      const puzzleSolution = 2; // Valid answer index
      const proofOfAccessHash = hash({ proof: 'test' });

      const block = proposeBlock(transactions, genesisBlock, puzzleSolution, proofOfAccessHash);

      // Verify block structure
      assert.ok(block.header, 'Block should have a header');
      assert.ok(block.transactions, 'Block should have transactions');
      assert.ok(block.attestations, 'Block should have attestations array');
      
      // Verify header fields
      assert.strictEqual(block.header.version, 1, 'Version should be 1');
      assert.strictEqual(block.header.previousHash, genesisBlock.header.hash, 'Previous hash should match');
      assert.strictEqual(block.header.nonce, puzzleSolution, 'Nonce should equal puzzle solution');
      assert.strictEqual(block.header.proofOfAccessHash, proofOfAccessHash, 'Proof of access hash should match');
      assert.strictEqual(block.header.height, genesisBlock.header.height + 1, 'Height should increment');
      assert.ok(block.header.hash, 'Block should have a hash');
      
      // Verify transactions
      assert.strictEqual(block.transactions.length, 1, 'Block should contain the transaction');
      assert.strictEqual(block.transactions[0].id, 'test-tx-1', 'Transaction ID should match');
    });

    it('should handle empty transaction list', () => {
      const transactions: Transaction[] = [];
      const puzzleSolution = 1;
      const proofOfAccessHash = hash({ proof: 'empty' });

      const block = proposeBlock(transactions, genesisBlock, puzzleSolution, proofOfAccessHash);

      assert.strictEqual(block.transactions.length, 0, 'Block should have no transactions');
      assert.strictEqual(block.transactionCount, 0, 'Transaction count should be 0');
      assert.ok(block.header.merkleRoot, 'Merkle root should be calculated even for empty list');
    });
  });

  describe('verifyPuzzleSolution', () => {
    it('should return true for valid answer indices', () => {
      // Test all valid answer indices (0-3)
      for (let i = 0; i <= 3; i++) {
        const blockHeader = {
          version: 1,
          previousHash: '0'.repeat(64),
          merkleRoot: '1'.repeat(64),
          timestamp: Date.now(),
          nonce: i,
          proofOfAccessHash: '2'.repeat(64),
          difficulty: 1,
          height: 1
        };

        const isValid = verifyPuzzleSolution(blockHeader);
        assert.strictEqual(isValid, true, `Answer index ${i} should be valid`);
      }
    });

    it('should return false for invalid answer indices', () => {
      const invalidAnswers = [-1, 4, 5, 10];
      
      for (const answer of invalidAnswers) {
        const blockHeader = {
          version: 1,
          previousHash: '0'.repeat(64),
          merkleRoot: '1'.repeat(64),
          timestamp: Date.now(),
          nonce: answer,
          proofOfAccessHash: '2'.repeat(64),
          difficulty: 1,
          height: 1
        };

        const isValid = verifyPuzzleSolution(blockHeader);
        assert.strictEqual(isValid, false, `Answer index ${answer} should be invalid`);
      }
    });

    it('should return false for non-integer nonce', () => {
      const blockHeader = {
        version: 1,
        previousHash: '0'.repeat(64),
        merkleRoot: '1'.repeat(64),
        timestamp: Date.now(),
        nonce: 1.5, // Non-integer
        proofOfAccessHash: '2'.repeat(64),
        difficulty: 1,
        height: 1
      };

      const isValid = verifyPuzzleSolution(blockHeader);
      assert.strictEqual(isValid, false, 'Non-integer nonce should be invalid');
    });
  });

  describe('getTransactionByHash', () => {
    it('should return null when no blocks exist', async () => {
      // Clear the database
      await db.close();
      db = new ChainDB();
      await db.open();
      
      const result = await getTransactionByHash('nonexistent-hash', db);
      assert.strictEqual(result, null, 'Should return null when no blocks exist');
    });

    it('should return null for nonexistent transaction', async () => {
      const result = await getTransactionByHash('nonexistent-hash', db);
      assert.strictEqual(result, null, 'Should return null for nonexistent transaction');
    });

    it('should find existing transaction', async () => {
      const transaction: Transaction = {
        id: 'findable-tx',
        type: 'USER_CREATE',
        data: {
          username: 'findableuser',
          createdAt: new Date().toISOString()
        },
        signature: 'test-signature',
        publicKey: userKeyPair.publicKey,
        timestamp: Date.now(),
        priority: 'normal'
      };

      const block: Block = {
        header: {
          version: 1,
          previousHash: genesisBlock.header.hash!,
          merkleRoot: hash([transaction]),
          timestamp: Date.now(),
          nonce: 0,
          proofOfAccessHash: '0'.repeat(64),
          difficulty: 1,
          height: 1,
          hash: '4'.repeat(64)
        },
        transactions: [transaction],
        attestations: []
      };

      await db.addBlock(block);

      const txHash = hash(transaction);
      const result = await getTransactionByHash(txHash, db);
      
      assert.notStrictEqual(result, null, 'Should find the transaction');
      assert.strictEqual(result!.id, 'findable-tx', 'Should return correct transaction');
    });
  });

  describe('verifyPuzzleSolutionWithContext', () => {
    it('should return false when transaction is not found', async () => {
      const blockHeader = {
        version: 1,
        previousHash: '0'.repeat(64),
        merkleRoot: '1'.repeat(64),
        timestamp: Date.now(),
        nonce: 1,
        proofOfAccessHash: 'nonexistent-hash',
        difficulty: 1,
        height: 1
      };

      const isValid = await verifyPuzzleSolutionWithContext(blockHeader, db);
      assert.strictEqual(isValid, false, 'Should return false when transaction is not found');
    });

    it('should return false when transaction is not LESSON_PROGRESS type', async () => {
      const transaction: Transaction = {
        id: 'wrong-type-tx',
        type: 'USER_CREATE', // Wrong type
        data: {
          username: 'testuser',
          createdAt: new Date().toISOString()
        },
        signature: 'test-signature',
        publicKey: userKeyPair.publicKey,
        timestamp: Date.now(),
        priority: 'normal'
      };

      const block: Block = {
        header: {
          version: 1,
          previousHash: genesisBlock.header.hash!,
          merkleRoot: hash([transaction]),
          timestamp: Date.now(),
          nonce: 0,
          proofOfAccessHash: '0'.repeat(64),
          difficulty: 1,
          height: 1,
          hash: '5'.repeat(64)
        },
        transactions: [transaction],
        attestations: []
      };

      await db.addBlock(block);

      const txHash = hash(transaction);
      const blockHeader = {
        version: 1,
        previousHash: '0'.repeat(64),
        merkleRoot: '1'.repeat(64),
        timestamp: Date.now(),
        nonce: 1,
        proofOfAccessHash: txHash,
        difficulty: 1,
        height: 1
      };

      const isValid = await verifyPuzzleSolutionWithContext(blockHeader, db);
      assert.strictEqual(isValid, false, 'Should return false for non-LESSON_PROGRESS transaction');
    });

    it('should return true for valid puzzle solution with context', async () => {
      const progressTx: Transaction = {
        id: 'context-progress-tx',
        type: 'LESSON_PROGRESS',
        data: {
          lessonId: '1-1',
          progressType: 'lesson_completed',
          status: 'completed',
          progressPercentage: 100,
          timeSpent: 1800
        } as LessonProgressData,
        signature: 'test-signature',
        publicKey: userKeyPair.publicKey,
        timestamp: Date.now(),
        priority: 'normal'
      };

      const block: Block = {
        header: {
          version: 1,
          previousHash: genesisBlock.header.hash!,
          merkleRoot: hash([progressTx]),
          timestamp: Date.now(),
          nonce: 0,
          proofOfAccessHash: '0'.repeat(64),
          difficulty: 1,
          height: 1,
          hash: '6'.repeat(64)
        },
        transactions: [progressTx],
        attestations: []
      };

      await db.addBlock(block);

      const txHash = hash(progressTx);
      
      // Find a correct answer for lesson 1-1
      const lesson1Questions = QUIZ_BANK.filter(q => q.lessonId === '1-1');
      assert.ok(lesson1Questions.length > 0, 'Lesson 1-1 should have questions');
      
      const correctAnswer = lesson1Questions[0].correctAnswerIndex;
      
      const blockHeader = {
        version: 1,
        previousHash: '0'.repeat(64),
        merkleRoot: '1'.repeat(64),
        timestamp: Date.now(),
        nonce: correctAnswer,
        proofOfAccessHash: txHash,
        difficulty: 1,
        height: 1
      };

      const isValid = await verifyPuzzleSolutionWithContext(blockHeader, db);
      assert.strictEqual(isValid, true, 'Should return true for valid puzzle solution with context');
    });
  });

  describe('handleFailedBlock', () => {
    it('should penalize the proposer and return transactions to the mempool', async () => {
      // Create a dummy transaction to include in the failed block
      const failedTx: Transaction = {
        id: 'failed-tx-1',
        type: 'USER_CREATE',
        data: {
          username: 'failedUser',
          createdAt: new Date().toISOString()
        },
        signature: 'bad-signature',
        publicKey: userKeyPair.publicKey,
        timestamp: Date.now(),
        priority: 'normal'
      };

      // Construct a block that will be considered failed
      const failedBlock: Block = {
        header: {
          version: 1,
          previousHash: genesisBlock.header.hash!,
          merkleRoot: hash([failedTx]),
          timestamp: Date.now(),
          nonce: 0,
          proofOfAccessHash: '0'.repeat(64),
          difficulty: 1,
          height: 1,
          hash: 'deadbeef'.padEnd(64, '0')
        },
        transactions: [failedTx],
        attestations: []
      };

      // Sanity-check that the mempool starts empty
      const initialMempoolCount = await db.getMempoolCount();
      assert.strictEqual(initialMempoolCount, 0, 'Mempool should start empty');

      // Call the function under test
      await handleFailedBlock(failedBlock, userKeyPair.publicKey, db);

      // 1) The proposer should be penalized
      const penalized = await db.isPenalized(userKeyPair.publicKey);
      assert.strictEqual(penalized, true, 'Proposer should be penalized');

      const activePenalty = await db.getActivePenalty(userKeyPair.publicKey);
      assert.ok(activePenalty, 'Active penalty should be present');
      assert.strictEqual(activePenalty!.scoreMultiplier, 0.5, 'Penalty multiplier should be 0.5');

      // 2) Transactions from the failed block should be back in the mempool
      const mempoolCount = await db.getMempoolCount();
      assert.strictEqual(mempoolCount, 1, 'One transaction should be in the mempool');

      const mempoolTxs = await db.getTransactionsFromMempool(10);
      assert.strictEqual(mempoolTxs[0].id, failedTx.id, 'Returned transaction ID should match');
    });
  });
}); 