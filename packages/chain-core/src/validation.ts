/**
 * Validation logic for the APStat Chain
 * 
 * This file contains pure functions that act as the "rulebook" for the entire blockchain.
 * These functions take data objects and the database instance as arguments and return true or false.
 */

import { verify, hash } from './crypto.js';
import type { Transaction, Block } from './types.js';
import type { ChainDB } from './database.js';
import type {
  CreateUserData,
  SetBookmarkData,
  AwardStarData,
  PaceUpdateData,
} from './types.js';

/**
 * Validates a single transaction by checking its signature
 * @param tx - The transaction to validate
 * @returns true if the transaction is valid, false otherwise
 */
export function isTransactionValid(tx: Transaction): boolean {
  try {
    // Check required fields are present
    if (!tx.id || !tx.type || !tx.data || !tx.signature || !tx.publicKey || !tx.timestamp) {
      return false;
    }

    // Verify the transaction ID matches the hash of the transaction data
    const expectedId = hash({
      type: tx.type,
      data: tx.data,
      publicKey: tx.publicKey,
      timestamp: tx.timestamp,
      priority: tx.priority,
      nonce: tx.nonce,
      gas: tx.gas
    });
    
    if (tx.id !== expectedId) {
      return false;
    }

    // Create the data object that was signed (everything except the signature)
    const signedData = {
      id: tx.id,
      type: tx.type,
      data: tx.data,
      publicKey: tx.publicKey,
      timestamp: tx.timestamp,
      priority: tx.priority,
      nonce: tx.nonce,
      gas: tx.gas
    };

    // Verify the signature using the crypto module
    return verify(tx.signature, signedData, tx.publicKey);
  } catch (error) {
    // If any error occurs during validation, the transaction is invalid
    return false;
  }
}

/**
 * Validates a block by checking all its components
 * @param block - The block to validate
 * @param db - The database instance for historical lookups
 * @returns Promise<boolean> - true if the block is valid, false otherwise
 */
export async function isBlockValid(block: Block, db: ChainDB): Promise<boolean> {
  try {
    // Check all validation components
    const hashValid = isBlockHashCorrect(block);
    const merkleValid = isMerkleRootCorrect(block);
    const proofValid = await isProofOfAccessValid(block, db);
    const transactionsValid = areAllTransactionsValid(block);

    // All checks must pass for a valid block
    return hashValid && merkleValid && proofValid && transactionsValid;
  } catch (error) {
    // If any error occurs during validation, the block is invalid
    return false;
  }
}

/**
 * Validates that the block hash is correctly calculated from the header
 * @param block - The block to validate
 * @returns true if the block hash is correct, false otherwise
 */
export function isBlockHashCorrect(block: Block): boolean {
  try {
    // Check that the block has a hash
    if (!block.header.hash) {
      return false;
    }

    // Re-calculate the hash from the header (excluding the hash field itself)
    const headerForHashing = {
      version: block.header.version,
      previousHash: block.header.previousHash,
      merkleRoot: block.header.merkleRoot,
      timestamp: block.header.timestamp,
      nonce: block.header.nonce,
      proofOfAccessHash: block.header.proofOfAccessHash,
      difficulty: block.header.difficulty,
      height: block.header.height
    };

    const calculatedHash = hash(headerForHashing);
    
    return block.header.hash === calculatedHash;
  } catch (error) {
    return false;
  }
}

/**
 * Validates that the Merkle root is correctly calculated from the transactions
 * @param block - The block to validate
 * @returns true if the Merkle root is correct, false otherwise
 */
export function isMerkleRootCorrect(block: Block): boolean {
  try {
    const calculatedMerkleRoot = calculateMerkleRoot(block.transactions);
    return block.header.merkleRoot === calculatedMerkleRoot;
  } catch (error) {
    return false;
  }
}

/**
 * Validates the proof of access by checking that the hash points to a real historical transaction
 * @param block - The block to validate
 * @param db - The database instance for historical lookups
 * @returns Promise<boolean> - true if the proof of access is valid, false otherwise
 */
export async function isProofOfAccessValid(block: Block, db: ChainDB): Promise<boolean> {
  try {
    // For now, we'll implement a basic check
    // In a full implementation, this would verify that the proofOfAccessHash
    // corresponds to a legitimate educational content access event
    
    // Note: db parameter will be used in future phases for historical verification
    // Currently unused but kept for API consistency
    void db;
    
    // Check that proofOfAccessHash is present and properly formatted
    if (!block.header.proofOfAccessHash) {
      return false;
    }
    
    // Verify it's a valid hash format (64 hex characters)
    if (!/^[0-9a-f]{64}$/i.test(block.header.proofOfAccessHash)) {
      return false;
    }

    // For Phase 1.5, we'll accept any properly formatted hash
    // TODO: In later phases, implement full proof-of-access verification
    // This would involve checking against historical educational content access logs
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validates all transactions in a block
 * @param block - The block containing transactions to validate
 * @returns true if all transactions are valid, false otherwise
 */
export function areAllTransactionsValid(block: Block): boolean {
  try {
    // Check that there are transactions
    if (!block.transactions || block.transactions.length === 0) {
      return false;
    }

    // Validate each transaction
    for (const transaction of block.transactions) {
      if (!isTransactionValid(transaction)) {
        return false;
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Calculates the Merkle root from an array of transactions
 * @param transactions - Array of transactions
 * @returns The Merkle root hash as a hex string
 */
export function calculateMerkleRoot(transactions: Transaction[]): string {
  if (transactions.length === 0) {
    // Return hash of empty string for empty transaction list
    return hash('');
  }

  // Create an array of transaction hashes
  let hashes = transactions.map(tx => hash(tx));

  // Build the Merkle tree bottom-up
  while (hashes.length > 1) {
    const nextLevel: string[] = [];
    
    // Process pairs of hashes
    for (let i = 0; i < hashes.length; i += 2) {
      if (i + 1 < hashes.length) {
        // Pair exists - combine the two hashes
        const combinedHash = hash(hashes[i] + hashes[i + 1]);
        nextLevel.push(combinedHash);
      } else {
        // Odd number - duplicate the last hash
        const combinedHash = hash(hashes[i] + hashes[i]);
        nextLevel.push(combinedHash);
      }
    }
    
    hashes = nextLevel;
  }

  return hashes[0];
}

/**
 * Helper function to validate basic block structure
 * @param block - The block to validate
 * @returns true if the block has valid structure, false otherwise
 */
export function isBlockStructureValid(block: Block): boolean {
  try {
    // Check that block exists and has required properties
    if (!block || !block.header || !block.transactions || !Array.isArray(block.transactions)) {
      return false;
    }

    const header = block.header;

    // Check required header fields
    if (
      typeof header.version !== 'number' ||
      typeof header.previousHash !== 'string' ||
      typeof header.merkleRoot !== 'string' ||
      typeof header.timestamp !== 'number' ||
      typeof header.nonce !== 'number' ||
      typeof header.proofOfAccessHash !== 'string' ||
      typeof header.difficulty !== 'number' ||
      typeof header.height !== 'number'
    ) {
      return false;
    }

    // Validate hash formats (should be 64 hex characters)
    const hashPattern = /^[0-9a-f]{64}$/i;
    if (!hashPattern.test(header.previousHash) || 
        !hashPattern.test(header.merkleRoot) ||
        !hashPattern.test(header.proofOfAccessHash)) {
      return false;
    }

    // Check that block hash exists if provided
    if (header.hash && !hashPattern.test(header.hash)) {
      return false;
    }

    // Check that height is non-negative
    if (header.height < 0) {
      return false;
    }

    // Check that timestamp is reasonable (not too far in future or past)
    const now = Date.now();
    const maxFutureTime = now + (60 * 60 * 1000); // 1 hour in future
    const minPastTime = new Date('2024-01-01').getTime(); // Project start date
    
    if (header.timestamp > maxFutureTime || header.timestamp < minPastTime) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validates a CREATE_USER transaction (schema + signature)
 */
export function isCreateUserTxValid(tx: Transaction): boolean {
  if (tx.type !== 'CREATE_USER') return false;
  // Base transaction validity (signature, id, etc.)
  if (!isTransactionValid(tx)) return false;

  const data = tx.data as CreateUserData;

  // Schema checks
  if (!data || typeof data.username !== 'string' || data.username.trim() === '') return false;
  if (data.displayName && typeof data.displayName !== 'string') return false;
  if (typeof data.createdAt !== 'number' || data.createdAt <= 0) return false;

  return true;
}

/**
 * Validates a SET_BOOKMARK transaction
 */
export function isSetBookmarkTxValid(tx: Transaction): boolean {
  if (tx.type !== 'SET_BOOKMARK') return false;
  if (!isTransactionValid(tx)) return false;

  const data = tx.data as SetBookmarkData;

  if (!data || typeof data.lessonId !== 'string' || data.lessonId.trim() === '') return false;
  if (typeof data.page !== 'number' || data.page <= 0) return false;
  if (data.offset !== undefined && typeof data.offset !== 'number') return false;
  if (data.note !== undefined && typeof data.note !== 'string') return false;
  if (typeof data.createdAt !== 'number' || data.createdAt <= 0) return false;

  return true;
}

/**
 * Validates an AWARD_STAR transaction
 */
export function isAwardStarTxValid(tx: Transaction): boolean {
  if (tx.type !== 'AWARD_STAR') return false;
  if (!isTransactionValid(tx)) return false;

  const data = tx.data as AwardStarData;

  if (!data || typeof data.toPublicKey !== 'string' || data.toPublicKey.trim() === '') return false;
  if (!['gold', 'silver', 'bronze'].includes(data.starType)) return false;
  if (data.lessonId !== undefined && typeof data.lessonId !== 'string') return false;
  if (data.reason !== undefined && typeof data.reason !== 'string') return false;
  if (typeof data.awardedAt !== 'number' || data.awardedAt <= 0) return false;

  return true;
}

/**
 * Validates a PACE_UPDATE transaction (revised schema)
 */
export function isPaceUpdateTxValid(tx: Transaction): boolean {
  if (tx.type !== 'PACE_UPDATE') return false;
  if (!isTransactionValid(tx)) return false;

  const data = tx.data as PaceUpdateData;

  if (!data) return false;
  if (typeof data.totalLessons !== 'number' || data.totalLessons <= 0) return false;
  if (typeof data.lessonsCompleted !== 'number' || data.lessonsCompleted < 0) return false;
  if (data.lessonsCompleted > data.totalLessons) return false;
  if (typeof data.targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.targetDate)) return false;
  if (typeof data.updatedAt !== 'number' || data.updatedAt <= 0) return false;

  return true;
}

// Placeholder export to make this a valid ES module
export {}; 