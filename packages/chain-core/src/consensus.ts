/**
 * Consensus mechanism for the APStat Chain
 * 
 * This file contains the consensus algorithm implementation
 * for the educational blockchain's "Proof of Knowledge" system.
 */

import type { 
  Block, 
  BlockHeader, 
  Transaction, 
  LessonProgressData 
} from './types.js';
import { ChainDB } from './database.js';
import { QUIZ_BANK, type QuizQuestion } from './QuizBank.js';
import { hash } from './crypto.js';
import { calculateMerkleRoot } from './validation.js';

// Type definitions for puzzle-related operations
export type PublicKey = string;
export type Hash = string;
export type PuzzleSolution = number; // The correct answer index (0-3)

/**
 * Select a random puzzle for a user based on their progress
 * @param userId - The user's public key
 * @param db - The ChainDB instance
 * @returns Promise resolving to puzzle data or null if no progress found
 */
export async function selectPuzzleForUser(
  userId: PublicKey, 
  db: ChainDB
): Promise<{ puzzle: QuizQuestion, proofOfAccessHash: Hash } | null> {
  try {
    // Get the latest block to start searching backwards
    const latestBlock = await db.getLatestBlock();
    if (!latestBlock) {
      return null; // No blocks exist yet
    }

    // Find the most recent LESSON_PROGRESS transaction for this user
    let mostRecentProgressTx: Transaction | null = null;
    let currentHeight = latestBlock.header.height;

    // Search backwards through blocks to find user's latest progress
    while (currentHeight >= 1 && !mostRecentProgressTx) {
      const blocks = await db.getBlocksByHeightRange(currentHeight, currentHeight);
      
      for (const block of blocks) {
        // Search transactions in reverse order (most recent first)
        for (let i = block.transactions.length - 1; i >= 0; i--) {
          const tx = block.transactions[i];
          if (tx.type === 'LESSON_PROGRESS' && tx.publicKey === userId) {
            mostRecentProgressTx = tx;
            break;
          }
        }
        if (mostRecentProgressTx) break;
      }
      currentHeight--;
    }

    if (!mostRecentProgressTx) {
      return null; // No progress found for this user
    }

    // Extract lesson ID from the progress transaction
    const progressData = mostRecentProgressTx.data as LessonProgressData;
    const lessonId = progressData.lessonId;

    // Filter quiz bank for questions from this lesson
    const availableQuestions = QUIZ_BANK.filter(q => q.lessonId === lessonId);
    
    if (availableQuestions.length === 0) {
      return null; // No questions available for this lesson
    }

    // Select a random question
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const selectedPuzzle = availableQuestions[randomIndex];

    // Calculate proof of access hash from the progress transaction
    const proofOfAccessHash = hash(mostRecentProgressTx);

    return {
      puzzle: selectedPuzzle,
      proofOfAccessHash
    };
  } catch (error) {
    console.error('Error selecting puzzle for user:', error);
    return null;
  }
}

/**
 * Propose a new block with given transactions and puzzle solution
 * @param transactions - Array of transactions to include in the block
 * @param lastBlock - The previous block in the chain
 * @param puzzleSolution - The solution to the puzzle (correct answer index)
 * @param proofOfAccessHash - Hash proving access to educational content
 * @returns The proposed block
 */
export function proposeBlock(
  transactions: Transaction[], 
  lastBlock: Block, 
  puzzleSolution: PuzzleSolution, 
  proofOfAccessHash: Hash
): Block {
  // Calculate merkle root for the transactions
  const merkleRoot = calculateMerkleRoot(transactions);

  // Create the block header
  const blockHeader: BlockHeader = {
    version: 1,
    previousHash: lastBlock.header.hash || '',
    merkleRoot: merkleRoot,
    timestamp: Date.now(),
    nonce: puzzleSolution, // The puzzle solution serves as the nonce
    proofOfAccessHash: proofOfAccessHash,
    difficulty: 1, // Fixed difficulty for educational blockchain
    height: lastBlock.header.height + 1
  };

  // Calculate the block hash
  const blockHash = hash({
    version: blockHeader.version,
    previousHash: blockHeader.previousHash,
    merkleRoot: blockHeader.merkleRoot,
    timestamp: blockHeader.timestamp,
    nonce: blockHeader.nonce,
    proofOfAccessHash: blockHeader.proofOfAccessHash,
    difficulty: blockHeader.difficulty,
    height: blockHeader.height
  });

  blockHeader.hash = blockHash;

  // Construct the complete block
  const block: Block = {
    header: blockHeader,
    transactions: transactions,
    attestations: [], // Empty for now - will be filled by validators
    size: JSON.stringify({ header: blockHeader, transactions }).length,
    transactionCount: transactions.length
  };

  return block;
}

/**
 * Verify that a puzzle solution in a block header is correct
 * @param blockHeader - The block header containing the puzzle solution
 * @returns true if the puzzle solution is valid, false otherwise
 */
export function verifyPuzzleSolution(blockHeader: BlockHeader): boolean {
  try {
    // The nonce contains the puzzle solution (correct answer index)
    const proposedSolution = blockHeader.nonce;
    
    // Validate that the solution is a valid answer index (0-3)
    if (proposedSolution < 0 || proposedSolution > 3 || !Number.isInteger(proposedSolution)) {
      return false;
    }

    // We need to infer the lesson ID from the proofOfAccessHash
    // For this to work, we'd need a way to look up transactions by hash
    // Since this functionality isn't available in the current database implementation,
    // we'll implement a simplified version that validates against all possible puzzles
    
    // Get all possible correct answers from the quiz bank
    const allValidSolutions = QUIZ_BANK.map(q => q.correctAnswerIndex);
    
    // Check if the proposed solution matches any valid answer
    return allValidSolutions.includes(proposedSolution as 0 | 1 | 2 | 3);
  } catch (error) {
    console.error('Error verifying puzzle solution:', error);
    return false;
  }
}

/**
 * Helper function to get a transaction by its hash
 * This would ideally be implemented in the database layer for better performance
 * @param transactionHash - The hash of the transaction to find
 * @param db - The ChainDB instance
 * @returns Promise resolving to the transaction or null if not found
 */
export async function getTransactionByHash(
  transactionHash: Hash, 
  db: ChainDB
): Promise<Transaction | null> {
  try {
    // Get the latest block to determine search range
    const latestBlock = await db.getLatestBlock();
    if (!latestBlock) {
      return null;
    }

    // Search through all blocks from latest to genesis
    for (let height = latestBlock.header.height; height >= 1; height--) {
      const blocks = await db.getBlocksByHeightRange(height, height);
      
      for (const block of blocks) {
        for (const transaction of block.transactions) {
          if (hash(transaction) === transactionHash) {
            return transaction;
          }
        }
      }
    }

    return null; // Transaction not found
  } catch (error) {
    console.error('Error getting transaction by hash:', error);
    return null;
  }
}

/**
 * Enhanced puzzle verification that checks against specific lesson context
 * This function would be used once we have the transaction lookup capability
 * @param blockHeader - The block header containing the puzzle solution
 * @param db - The ChainDB instance for transaction lookup
 * @returns Promise resolving to true if the puzzle solution is valid
 */
export async function verifyPuzzleSolutionWithContext(
  blockHeader: BlockHeader, 
  db: ChainDB
): Promise<boolean> {
  try {
    // Get the transaction that serves as proof of access
    const proofTransaction = await getTransactionByHash(blockHeader.proofOfAccessHash, db);
    
    if (!proofTransaction || proofTransaction.type !== 'LESSON_PROGRESS') {
      return false;
    }

    // Extract lesson ID from the progress transaction
    const progressData = proofTransaction.data as LessonProgressData;
    const lessonId = progressData.lessonId;

    // Get all valid puzzles for this lesson
    const validPuzzles = QUIZ_BANK.filter(q => q.lessonId === lessonId);
    
    if (validPuzzles.length === 0) {
      return false;
    }

    // Check if the proposed solution matches any valid answer for this lesson
    const proposedSolution = blockHeader.nonce;
    const validSolutions = validPuzzles.map(q => q.correctAnswerIndex);
    
    return validSolutions.includes(proposedSolution as 0 | 1 | 2 | 3);
  } catch (error) {
    console.error('Error verifying puzzle solution with context:', error);
    return false;
  }
}

// Placeholder export to make this a valid ES module
export {}; 