/**
 * Database layer for the APStat Chain
 * 
 * This file contains IndexedDB operations using Dexie
 * for storing blockchain data locally.
 */

import Dexie, { Table } from 'dexie';
import type { 
  Block, 
  Transaction, 
  TransactionPriority 
} from './types.js';

/**
 * Interface for mempool entries stored in IndexedDB
 */
export interface MempoolEntry {
  id?: number; // Auto-incremented primary key
  hash: string; // Transaction hash
  transaction: Transaction; // The actual transaction data
  priority: TransactionPriority; // Transaction priority for ordering
  addedAt: number; // Timestamp when added to mempool
}

/**
 * Interface for app state key-value pairs
 */
export interface AppStateEntry {
  key: string; // Primary key
  value: any; // Can store any JSON-serializable value
  updatedAt: number; // Timestamp when last updated
}

/**
 * Interface for penalty box entries stored in IndexedDB
 */
export interface PenaltyBoxEntry {
  publicKey: string; // Primary key - the public key of the penalized user
  scoreMultiplier: number; // Penalty multiplier applied to scores (e.g., 0.5 for 50% penalty)
  expiryTimestamp: number; // Unix timestamp when the penalty expires
}

/**
 * Interface for block entries stored in IndexedDB
 */
export interface BlockEntry {
  id?: number; // Auto-incremented primary key
  hash: string; // Block hash
  height: number; // Block height
  block: Block; // The actual block data
  addedAt: number; // Timestamp when added to database
}

/**
 * ChainDB - Dexie database class for APStat Chain
 * 
 * Manages local storage of blockchain data using IndexedDB
 */
export class ChainDB extends Dexie {
  // Table definitions
  blocks!: Table<BlockEntry>;
  mempool!: Table<MempoolEntry>;
  appState!: Table<AppStateEntry>;
  penaltyBox!: Table<PenaltyBoxEntry>;

  constructor() {
    super('APStatChainDB');
    
    // Define database schema
    this.version(1).stores({
      // Blocks table: indexed by auto-increment id, hash, and height
      blocks: '++id, hash, height, addedAt',
      
      // Mempool table: indexed by auto-increment id, hash, and priority
      mempool: '++id, hash, priority, addedAt',
      
      // App state table: simple key-value store
      appState: 'key, updatedAt',
      
      // Penalty box table: indexed by publicKey (primary), scoreMultiplier, and expiryTimestamp
      penaltyBox: 'publicKey, scoreMultiplier, expiryTimestamp'
    });
  }

  /**
   * Add a block to the database
   * @param block - The block to add
   * @returns Promise that resolves when block is stored
   */
  async addBlock(block: Block): Promise<void> {
    const blockEntry: BlockEntry = {
      hash: block.header.hash || '',
      height: block.header.height,
      block: block,
      addedAt: Date.now()
    };

    // Ensure block has a hash
    if (!block.header.hash) {
      throw new Error('Block must have a hash before being stored');
    }

    await this.blocks.add(blockEntry);
  }

  /**
   * Retrieve a block by its hash
   * @param hash - The block hash to search for
   * @returns Promise that resolves to the block or undefined if not found
   */
  async getBlockByHash(hash: string): Promise<Block | undefined> {
    const blockEntry = await this.blocks.where('hash').equals(hash).first();
    return blockEntry?.block;
  }

  /**
   * Get the latest block (highest height)
   * @returns Promise that resolves to the latest block or undefined if no blocks exist
   */
  async getLatestBlock(): Promise<Block | undefined> {
    const blockEntry = await this.blocks.orderBy('height').reverse().first();
    return blockEntry?.block;
  }

  /**
   * Get transactions from mempool with optional limit
   * @param limit - Maximum number of transactions to return
   * @returns Promise that resolves to array of transactions ordered by priority and timestamp
   */
  async getTransactionsFromMempool(limit: number = 100): Promise<Transaction[]> {
    const mempoolEntries = await this.mempool
      .orderBy('priority')
      .reverse() // High priority first
      .limit(limit)
      .toArray();

    // Sort by priority level and then by timestamp (oldest first for same priority)
    const priorityOrder = { 'critical': 4, 'high': 3, 'normal': 2, 'low': 1 };
    
    mempoolEntries.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.addedAt - b.addedAt; // Older transactions first for same priority
    });

    return mempoolEntries.map(entry => entry.transaction);
  }

  /**
   * Add a transaction to the mempool
   * @param transaction - The transaction to add
   * @returns Promise that resolves when transaction is stored
   */
  async addToMempool(transaction: Transaction): Promise<void> {
    const mempoolEntry: MempoolEntry = {
      hash: transaction.id,
      transaction: transaction,
      priority: transaction.priority,
      addedAt: Date.now()
    };

    await this.mempool.add(mempoolEntry);
  }

  /**
   * Remove a transaction from the mempool (typically when it's included in a block)
   * @param transactionId - The ID of the transaction to remove
   * @returns Promise that resolves when transaction is removed
   */
  async removeFromMempool(transactionId: string): Promise<void> {
    await this.mempool.where('hash').equals(transactionId).delete();
  }

  /**
   * Clear all transactions from mempool
   * @returns Promise that resolves when mempool is cleared
   */
  async clearMempool(): Promise<void> {
    await this.mempool.clear();
  }

  /**
   * Get a value from app state
   * @param key - The key to retrieve
   * @returns Promise that resolves to the value or undefined if not found
   */
  async getAppState<T = any>(key: string): Promise<T | undefined> {
    const entry = await this.appState.get(key);
    return entry?.value;
  }

  /**
   * Set a value in app state
   * @param key - The key to set
   * @param value - The value to store
   * @returns Promise that resolves when value is stored
   */
  async setAppState(key: string, value: any): Promise<void> {
    const entry: AppStateEntry = {
      key,
      value,
      updatedAt: Date.now()
    };

    await this.appState.put(entry);
  }

  /**
   * Remove a key from app state
   * @param key - The key to remove
   * @returns Promise that resolves when key is removed
   */
  async removeAppState(key: string): Promise<void> {
    await this.appState.delete(key);
  }

  /**
   * Get the current block height (height of latest block)
   * @returns Promise that resolves to the current height or 0 if no blocks exist
   */
  async getCurrentHeight(): Promise<number> {
    const latestBlock = await this.getLatestBlock();
    return latestBlock?.header.height || 0;
  }

  /**
   * Get blocks in a height range
   * @param fromHeight - Starting height (inclusive)
   * @param toHeight - Ending height (inclusive)
   * @returns Promise that resolves to array of blocks in height order
   */
  async getBlocksByHeightRange(fromHeight: number, toHeight: number): Promise<Block[]> {
    const blockEntries = await this.blocks
      .where('height')
      .between(fromHeight, toHeight, true, true)
      .sortBy('height');

    return blockEntries.map(entry => entry.block);
  }

  /**
   * Get the total number of blocks in the database
   * @returns Promise that resolves to the total block count
   */
  async getBlockCount(): Promise<number> {
    return await this.blocks.count();
  }

  /**
   * Get the total number of transactions in mempool
   * @returns Promise that resolves to the mempool transaction count
   */
  async getMempoolCount(): Promise<number> {
    return await this.mempool.count();
  }

  /**
   * Get active penalty for a specific user
   * @param publicKey - The user's public key
   * @returns Promise that resolves to the penalty entry or undefined if no active penalty
   */
  async getActivePenalty(publicKey: string): Promise<PenaltyBoxEntry | undefined> {
    const penalty = await this.penaltyBox.get(publicKey);
    
    // Check if penalty exists and hasn't expired
    if (penalty && penalty.expiryTimestamp > Date.now()) {
      return penalty;
    }
    
    // If penalty exists but has expired, remove it
    if (penalty && penalty.expiryTimestamp <= Date.now()) {
      await this.penaltyBox.delete(publicKey);
    }
    
    return undefined;
  }

  /**
   * Check if a user is currently penalized
   * @param publicKey - The user's public key
   * @returns Promise that resolves to true if user has an active penalty
   */
  async isPenalized(publicKey: string): Promise<boolean> {
    const activePenalty = await this.getActivePenalty(publicKey);
    return activePenalty !== undefined;
  }

  /**
   * Get the current score multiplier for a user (considering penalties)
   * @param publicKey - The user's public key
   * @returns Promise that resolves to the score multiplier (1.0 if no penalty, or penalty value if penalized)
   */
  async getScoreMultiplier(publicKey: string): Promise<number> {
    const activePenalty = await this.getActivePenalty(publicKey);
    return activePenalty ? activePenalty.scoreMultiplier : 1.0;
  }

  /**
   * Clean up expired penalties from the penalty box
   * @returns Promise that resolves to the number of expired penalties removed
   */
  async cleanupExpiredPenalties(): Promise<number> {
    const currentTime = Date.now();
    const expiredPenalties = await this.penaltyBox
      .where('expiryTimestamp')
      .below(currentTime)
      .toArray();
    
    // Remove expired penalties
    const expiredKeys = expiredPenalties.map(p => p.publicKey);
    if (expiredKeys.length > 0) {
      await this.penaltyBox.where('publicKey').anyOf(expiredKeys).delete();
    }
    
    return expiredKeys.length;
  }

  /**
   * Get all currently active penalties
   * @returns Promise that resolves to array of active penalty entries
   */
  async getActivePenalties(): Promise<PenaltyBoxEntry[]> {
    const currentTime = Date.now();
    return await this.penaltyBox
      .where('expiryTimestamp')
      .above(currentTime)
      .toArray();
  }
}

/**
 * Create and initialize a new ChainDB instance
 * @returns Promise that resolves to an opened ChainDB instance
 */
export async function createChainDB(): Promise<ChainDB> {
  const db = new ChainDB();
  await db.open();
  return db;
}

/**
 * Smoke test function to verify database functionality
 * Can be run manually in a browser environment to test the database
 * @returns Promise that resolves to test results
 */
export async function smokeTest(): Promise<{ success: boolean; message: string }> {
  try {
    // Create database instance
    const db = await createChainDB();

    // Test app state operations
    await db.setAppState('testKey', 'testValue');
    const retrievedValue = await db.getAppState('testKey');
    
    if (retrievedValue !== 'testValue') {
      throw new Error('App state test failed');
    }

    // Create a dummy block for testing
    const dummyBlock: Block = {
      header: {
        version: 1,
        previousHash: '0'.repeat(64),
        merkleRoot: '1'.repeat(64),
        timestamp: Date.now(),
        nonce: 12345,
        proofOfAccessHash: '2'.repeat(64),
        difficulty: 1,
        height: 1,
        hash: '3'.repeat(64)
      },
      transactions: [],
      attestations: [],
      size: 256,
      transactionCount: 0
    };

    // Test block operations
    await db.addBlock(dummyBlock);
    const retrievedBlock = await db.getBlockByHash(dummyBlock.header.hash!);
    
    if (!retrievedBlock || retrievedBlock.header.height !== dummyBlock.header.height) {
      throw new Error('Block storage test failed');
    }

    // Test latest block retrieval
    const latestBlock = await db.getLatestBlock();
    if (!latestBlock || latestBlock.header.hash !== dummyBlock.header.hash) {
      throw new Error('Latest block retrieval test failed');
    }

    // Create a dummy transaction for testing
    const dummyTransaction: Transaction = {
      id: 'test-tx-' + Date.now(),
      type: 'USER_CREATE',
      data: {
        username: 'testuser',
        displayName: 'Test User',
        createdAt: new Date().toISOString()
      },
      signature: 'dummy-signature',
      publicKey: 'dummy-public-key',
      timestamp: Date.now(),
      priority: 'normal'
    };

    // Test mempool operations
    await db.addToMempool(dummyTransaction);
    const mempoolTransactions = await db.getTransactionsFromMempool(10);
    
    if (mempoolTransactions.length !== 1 || mempoolTransactions[0].id !== dummyTransaction.id) {
      throw new Error('Mempool test failed');
    }

    // Clean up test data
    await db.removeFromMempool(dummyTransaction.id);
    await db.removeAppState('testKey');

    // Test penalty box operations
    const testPublicKey = 'test-public-key-123';
    
    // Test adding a penalty
    await db.penaltyBox.put({
      publicKey: testPublicKey,
      scoreMultiplier: 0.5,
      expiryTimestamp: Date.now() + 3600 * 1000 // 1 hour from now
    });
    
    // Test getting active penalty
    const activePenalty = await db.getActivePenalty(testPublicKey);
    if (!activePenalty || activePenalty.scoreMultiplier !== 0.5) {
      throw new Error('Penalty box test failed - could not retrieve active penalty');
    }
    
    // Test penalty check
    const isPenalized = await db.isPenalized(testPublicKey);
    if (!isPenalized) {
      throw new Error('Penalty box test failed - isPenalized check failed');
    }
    
    // Test score multiplier
    const scoreMultiplier = await db.getScoreMultiplier(testPublicKey);
    if (scoreMultiplier !== 0.5) {
      throw new Error('Penalty box test failed - incorrect score multiplier');
    }
    
    // Test cleanup (add an expired penalty and clean it up)
    await db.penaltyBox.put({
      publicKey: 'expired-test-key',
      scoreMultiplier: 0.25,
      expiryTimestamp: Date.now() - 1000 // 1 second ago (expired)
    });
    
    const cleanedUp = await db.cleanupExpiredPenalties();
    if (cleanedUp !== 1) {
      throw new Error('Penalty box test failed - cleanup did not remove expired penalty');
    }
    
    // Clean up test penalties
    await db.penaltyBox.delete(testPublicKey);

    // Close database
    db.close();

    return {
      success: true,
      message: 'All database tests including penalty box functionality passed successfully!'
    };

  } catch (error) {
    return {
      success: false,
      message: `Database test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Placeholder export to make this a valid ES module
export {}; 