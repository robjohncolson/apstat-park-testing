/**
 * Core type definitions for the APStat Chain blockchain
 * 
 * This file contains all the TypeScript interfaces and types
 * used throughout the chain-core package.
 */

// =============================================================================
// TRANSACTION TYPES AND DATA PAYLOADS
// =============================================================================

/**
 * Discriminated union for all supported transaction types
 */
export type TransactionType = 
  | 'USER_CREATE' 
  | 'LESSON_PROGRESS' 
  | 'PACE_UPDATE' 
  | 'RECOVER_KEY';

/**
 * Data payload for user creation transactions
 */
export interface UserCreateData {
  /** Unique username for the user */
  username: string;
  /** User's display name */
  displayName?: string;
  /** Initial user preferences */
  preferences?: {
    timezone?: string;
    notifications?: boolean;
    studyReminders?: boolean;
  };
  /** Timestamp when user was created */
  createdAt: string; // ISO string
}

/**
 * Data payload for lesson progress transactions
 */
export interface LessonProgressData {
  /** Unique identifier for the lesson */
  lessonId: string;
  /** Type of progress being recorded */
  progressType: 'video_watched' | 'quiz_completed' | 'lesson_completed';
  /** Specific item ID (video ID, quiz ID, etc.) */
  itemId?: string;
  /** Current status of the item */
  status: 'started' | 'in_progress' | 'completed' | 'watched';
  /** Progress percentage (0-100) */
  progressPercentage?: number;
  /** Time spent on this item in seconds */
  timeSpent?: number;
  /** Any additional metadata */
  metadata?: {
    score?: number;
    attempts?: number;
    completedAt?: string; // ISO string
    [key: string]: any;
  };
}

/**
 * Data payload for pace update transactions
 */
export interface PaceUpdateData {
  /** Target completion date for current unit/lesson */
  targetDate: string; // ISO string
  /** Current pace status */
  paceStatus: 'on_track' | 'ahead' | 'behind' | 'critical';
  /** Number of lessons completed */
  lessonsCompleted: number;
  /** Total number of lessons required */
  totalLessons: number;
  /** Current streak of on-time completions */
  currentStreak: number;
  /** Whether user earned a gold star for meeting deadline */
  earnedGoldStar?: boolean;
  /** Additional pace metrics */
  metrics?: {
    averageTimePerLesson?: number; // minutes
    studySessionsPerWeek?: number;
    lastActivityDate?: string; // ISO string
  };
}

/**
 * Data payload for key recovery transactions
 */
export interface RecoverKeyData {
  /** Type of recovery being performed */
  recoveryType: 'password_reset' | 'key_rotation' | 'account_recovery';
  /** New public key (for key rotation) */
  newPublicKey?: string;
  /** Recovery method used */
  recoveryMethod: 'email' | 'backup_phrase' | 'trusted_device';
  /** Timestamp of recovery initiation */
  initiatedAt: string; // ISO string
  /** Recovery verification data */
  verification?: {
    code?: string;
    emailHash?: string;
    deviceFingerprint?: string;
  };
}

/**
 * Union type for all transaction data payloads
 */
export type TransactionData = 
  | UserCreateData 
  | LessonProgressData 
  | PaceUpdateData 
  | RecoverKeyData;

// =============================================================================
// TRANSACTION STRUCTURE
// =============================================================================

/**
 * Priority levels for transaction processing
 */
export type TransactionPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Main transaction interface
 */
export interface Transaction {
  /** Unique identifier for this transaction */
  id: string;
  /** Type of transaction (discriminator) */
  type: TransactionType;
  /** Transaction data payload */
  data: TransactionData;
  /** Digital signature of the transaction */
  signature: string;
  /** Public key of the transaction creator */
  publicKey: string;
  /** Timestamp when transaction was created (Unix timestamp) */
  timestamp: number;
  /** Processing priority for this transaction */
  priority: TransactionPriority;
  /** Optional nonce to prevent replay attacks */
  nonce?: number;
  /** Gas/fee information for transaction processing */
  gas?: {
    limit: number;
    price: number;
    used?: number;
  };
}

// =============================================================================
// BLOCK STRUCTURE
// =============================================================================

/**
 * Block header containing metadata about the block
 */
export interface BlockHeader {
  /** Blockchain protocol version */
  version: number;
  /** Hash of the previous block in the chain */
  previousHash: string;
  /** Merkle root hash of all transactions in this block */
  merkleRoot: string;
  /** Timestamp when block was created (Unix timestamp) */
  timestamp: number;
  /** Nonce value that solves the proof-of-work puzzle */
  nonce: number;
  /** Hash demonstrating proof of access to educational content */
  proofOfAccessHash: string;
  /** Current difficulty target for mining */
  difficulty: number;
  /** Block height in the chain */
  height: number;
  /** Hash of this block's header */
  hash?: string;
}

/**
 * Complete block structure
 */
export interface Block {
  /** Block header with metadata */
  header: BlockHeader;
  /** Array of transactions included in this block */
  transactions: Transaction[];
  /** Array of attestation signatures from validators */
  attestations: string[];
  /** Block size in bytes */
  size?: number;
  /** Number of transactions in this block */
  transactionCount?: number;
}

// =============================================================================
// BLOCKCHAIN STATE AND METADATA
// =============================================================================

/**
 * Current state of the blockchain
 */
export interface ChainState {
  /** Latest block in the chain */
  latestBlock: Block;
  /** Current block height */
  height: number;
  /** Total number of transactions processed */
  totalTransactions: number;
  /** Current difficulty for mining */
  difficulty: number;
  /** Average block time in seconds */
  averageBlockTime: number;
  /** Network hash rate */
  networkHashRate?: number;
}

/**
 * Validator information for consensus
 */
export interface Validator {
  /** Validator's public key */
  publicKey: string;
  /** Validator's stake amount */
  stake: number;
  /** Validator status */
  status: 'active' | 'inactive' | 'slashed';
  /** Last block this validator attested to */
  lastAttestation?: number;
  /** Validator performance metrics */
  metrics?: {
    uptime: number; // percentage
    successfulAttestations: number;
    missedAttestations: number;
  };
}

// =============================================================================
// USER AND PROGRESS TRACKING
// =============================================================================

/**
 * User profile stored on-chain
 */
export interface UserProfile {
  /** User's public key (serves as unique identifier) */
  publicKey: string;
  /** Username */
  username: string;
  /** Display name */
  displayName?: string;
  /** When user account was created */
  createdAt: number; // Unix timestamp
  /** Last time user was active */
  lastActive?: number; // Unix timestamp
  /** User preferences */
  preferences?: UserCreateData['preferences'];
}

/**
 * Educational progress summary
 */
export interface ProgressSummary {
  /** User this progress belongs to */
  userPublicKey: string;
  /** Total lessons completed */
  lessonsCompleted: number;
  /** Current streak of on-time completions */
  currentStreak: number;
  /** Total gold stars earned */
  goldStarsEarned: number;
  /** Last lesson completed */
  lastLessonCompleted?: string;
  /** Last completion timestamp */
  lastCompletionDate?: number; // Unix timestamp
  /** Overall progress percentage */
  overallProgress: number;
}

// =============================================================================
// CRYPTOGRAPHIC TYPES
// =============================================================================

/**
 * Key pair for cryptographic operations
 */
export interface KeyPair {
  /** Private key (should be kept secure) */
  privateKey: string;
  /** Public key (can be shared) */
  publicKey: string;
}

/**
 * Digital signature components
 */
export interface Signature {
  /** The signature value */
  signature: string;
  /** Public key used to verify the signature */
  publicKey: string;
  /** Algorithm used for signing */
  algorithm: 'ECDSA' | 'Ed25519';
}

/**
 * Hash function result
 */
export interface HashResult {
  /** The computed hash value */
  hash: string;
  /** Algorithm used for hashing */
  algorithm: 'SHA256' | 'SHA3-256' | 'BLAKE2b';
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Blockchain-specific error types
 */
export type ChainErrorType = 
  | 'INVALID_TRANSACTION'
  | 'INVALID_BLOCK'
  | 'CONSENSUS_FAILURE'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'STORAGE_ERROR'
  | 'CRYPTOGRAPHIC_ERROR';

/**
 * Structured error interface
 */
export interface ChainError {
  /** Type of error */
  type: ChainErrorType;
  /** Human-readable error message */
  message: string;
  /** Error code for programmatic handling */
  code: string;
  /** Additional error context */
  details?: {
    transactionId?: string;
    blockHash?: string;
    timestamp?: number;
    [key: string]: any;
  };
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Generic response wrapper for API operations
 */
export interface ApiResponse<T> {
  /** Whether the operation was successful */
  success: boolean;
  /** Response data (if successful) */
  data?: T;
  /** Error information (if unsuccessful) */
  error?: ChainError;
  /** Response metadata */
  metadata?: {
    timestamp: number;
    requestId?: string;
    processingTime?: number;
  };
}

/**
 * Pagination parameters for queries
 */
export interface PaginationParams {
  /** Page number (0-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items available */
  total?: number;
}

/**
 * Query filters for blockchain data
 */
export interface QueryFilters {
  /** Filter by transaction type */
  transactionType?: TransactionType;
  /** Filter by user public key */
  userPublicKey?: string;
  /** Filter by date range */
  dateRange?: {
    from: number; // Unix timestamp
    to: number; // Unix timestamp
  };
  /** Filter by block height range */
  blockRange?: {
    from: number;
    to: number;
  };
} 