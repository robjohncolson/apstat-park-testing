/**
 * P2P Communication Protocol for APStat Chain
 * 
 * This file defines all the message types that nodes can send to each other
 * in the peer-to-peer network, ensuring type-safe communication.
 */

import type {
  Block,
  BlockHeader,
  Transaction,
  ChainState,
  Validator,
  Signature,
  ChainError,
  PaginationParams
} from '@apstatchain/core';

// Re-export commonly used types for convenience
export type Hash = string;
export type PublicKey = string;
export type PeerID = string;
export type NodeID = string;

// =============================================================================
// P2P MESSAGE TYPES
// =============================================================================

/**
 * Enumeration of all possible P2P message types
 */
export type P2PMessageType =
  | 'HELLO'
  | 'HELLO_RESPONSE'
  | 'PING'
  | 'PONG'
  | 'GET_PEERS'
  | 'PEERS_RESPONSE'
  | 'GET_CHAIN_STATE'
  | 'CHAIN_STATE_RESPONSE'
  | 'GET_MISSING_TX'
  | 'MISSING_TX_RESPONSE'
  | 'SEND_TX'
  | 'TX_BROADCAST'
  | 'GET_BLOCKS'
  | 'BLOCKS_RESPONSE'
  | 'ANNOUNCE_CANDIDATE_BLOCK'
  | 'BLOCK_PROPOSAL'
  | 'SEND_ATTESTATION'
  | 'ATTESTATION_BROADCAST'
  | 'REQUEST_SYNC'
  | 'SYNC_RESPONSE'
  | 'ERROR'
  | 'DISCONNECT';

// =============================================================================
// CONNECTION AND HANDSHAKE MESSAGES
// =============================================================================

/**
 * Initial handshake message sent when connecting to a peer
 */
export interface HelloMessage {
  type: 'HELLO';
  payload: {
    protocolVersion: number;
    nodeId: NodeID;
    chainId: string;
    latestBlockHash: Hash;
    latestBlockHeight: number;
    timestamp: number;
    capabilities: string[]; // e.g., ['mining', 'validation', 'storage']
    userAgent: string;
  };
}

/**
 * Response to a HELLO message
 */
export interface HelloResponseMessage {
  type: 'HELLO_RESPONSE';
  payload: {
    protocolVersion: number;
    nodeId: NodeID;
    chainId: string;
    latestBlockHash: Hash;
    latestBlockHeight: number;
    timestamp: number;
    capabilities: string[];
    userAgent: string;
    accepted: boolean;
    reason?: string; // If not accepted, why?
  };
}

/**
 * Ping message for connection health checks
 */
export interface PingMessage {
  type: 'PING';
  payload: {
    timestamp: number;
    nonce: string;
  };
}

/**
 * Pong response to ping message
 */
export interface PongMessage {
  type: 'PONG';
  payload: {
    timestamp: number;
    originalNonce: string;
    latency?: number;
  };
}

/**
 * Request for peer list
 */
export interface GetPeersMessage {
  type: 'GET_PEERS';
  payload: {
    maxPeers?: number;
  };
}

/**
 * Response with peer list
 */
export interface PeersResponseMessage {
  type: 'PEERS_RESPONSE';
  payload: {
    peers: Array<{
      nodeId: NodeID;
      address: string;
      port: number;
      lastSeen: number;
      capabilities: string[];
    }>;
  };
}

// =============================================================================
// CHAIN STATE AND SYNCHRONIZATION MESSAGES
// =============================================================================

/**
 * Request for current chain state
 */
export interface GetChainStateMessage {
  type: 'GET_CHAIN_STATE';
  payload: {
    includeValidators?: boolean;
    includeMetrics?: boolean;
  };
}

/**
 * Response with chain state information
 */
export interface ChainStateResponseMessage {
  type: 'CHAIN_STATE_RESPONSE';
  payload: {
    chainState: ChainState;
    validators?: Validator[];
    metrics?: {
      networkHashRate: number;
      activeNodes: number;
      averageBlockTime: number;
    };
  };
}

/**
 * Request for specific blocks
 */
export interface GetBlocksMessage {
  type: 'GET_BLOCKS';
  payload: {
    startHeight: number;
    endHeight?: number;
    maxBlocks?: number;
    includeTransactions?: boolean;
  };
}

/**
 * Response with requested blocks
 */
export interface BlocksResponseMessage {
  type: 'BLOCKS_RESPONSE';
  payload: {
    blocks: Block[];
    hasMore: boolean;
    totalBlocks?: number;
  };
}

/**
 * Request for chain synchronization
 */
export interface RequestSyncMessage {
  type: 'REQUEST_SYNC';
  payload: {
    fromHeight: number;
    toHeight?: number;
    batchSize?: number;
  };
}

/**
 * Response for sync request
 */
export interface SyncResponseMessage {
  type: 'SYNC_RESPONSE';
  payload: {
    blocks: Block[];
    currentBatch: number;
    totalBatches: number;
    isComplete: boolean;
  };
}

// =============================================================================
// TRANSACTION MESSAGES
// =============================================================================

/**
 * Request for missing transactions by hash
 */
export interface GetMissingTxMessage {
  type: 'GET_MISSING_TX';
  payload: {
    transactionHashes: Hash[];
    urgent?: boolean;
  };
}

/**
 * Response with requested transactions
 */
export interface MissingTxResponseMessage {
  type: 'MISSING_TX_RESPONSE';
  payload: {
    transactions: Transaction[];
    notFound: Hash[];
  };
}

/**
 * Send a single transaction to a peer
 */
export interface SendTxMessage {
  type: 'SEND_TX';
  payload: {
    transaction: Transaction;
    propagate?: boolean; // Should the peer propagate this further?
  };
}

/**
 * Broadcast a transaction to the network
 */
export interface TxBroadcastMessage {
  type: 'TX_BROADCAST';
  payload: {
    transaction: Transaction;
    originNodeId: NodeID;
    hopCount: number;
    maxHops: number;
  };
}

// =============================================================================
// CONSENSUS AND BLOCK PROPOSAL MESSAGES
// =============================================================================

/**
 * Announce a candidate block for validation
 */
export interface AnnounceCandidateBlockMessage {
  type: 'ANNOUNCE_CANDIDATE_BLOCK';
  payload: {
    blockHash: Hash;
    blockHeight: number;
    proposer: PublicKey;
    timestamp: number;
    transactionCount: number;
  };
}

/**
 * Send a complete block proposal
 */
export interface BlockProposalMessage {
  type: 'BLOCK_PROPOSAL';
  payload: {
    block: Block;
    proposer: PublicKey;
    signature: string;
    proofOfKnowledge: {
      puzzleHash: Hash;
      solution: number;
      proofOfAccessHash: Hash;
    };
  };
}

/**
 * Send an attestation for a block
 */
export interface SendAttestationMessage {
  type: 'SEND_ATTESTATION';
  payload: {
    blockHash: Hash;
    blockHeight: number;
    validator: PublicKey;
    signature: string;
    timestamp: number;
  };
}

/**
 * Broadcast an attestation to the network
 */
export interface AttestationBroadcastMessage {
  type: 'ATTESTATION_BROADCAST';
  payload: {
    blockHash: Hash;
    blockHeight: number;
    validator: PublicKey;
    signature: string;
    timestamp: number;
    originNodeId: NodeID;
    hopCount: number;
    maxHops: number;
  };
}

// =============================================================================
// ERROR AND DISCONNECT MESSAGES
// =============================================================================

/**
 * Error message for communication issues
 */
export interface ErrorMessage {
  type: 'ERROR';
  payload: {
    error: ChainError;
    originalMessageType?: P2PMessageType;
    context?: string;
  };
}

/**
 * Graceful disconnect message
 */
export interface DisconnectMessage {
  type: 'DISCONNECT';
  payload: {
    reason: string;
    graceful: boolean;
    reconnectAfter?: number; // seconds
  };
}

// =============================================================================
// DISCRIMINATED UNION OF ALL MESSAGE TYPES
// =============================================================================

/**
 * Union type encompassing all possible P2P messages
 */
export type P2PMessage = 
  | HelloMessage
  | HelloResponseMessage
  | PingMessage
  | PongMessage
  | GetPeersMessage
  | PeersResponseMessage
  | GetChainStateMessage
  | ChainStateResponseMessage
  | GetBlocksMessage
  | BlocksResponseMessage
  | RequestSyncMessage
  | SyncResponseMessage
  | GetMissingTxMessage
  | MissingTxResponseMessage
  | SendTxMessage
  | TxBroadcastMessage
  | AnnounceCandidateBlockMessage
  | BlockProposalMessage
  | SendAttestationMessage
  | AttestationBroadcastMessage
  | ErrorMessage
  | DisconnectMessage;

// =============================================================================
// MESSAGE FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a HELLO message for initial handshake
 */
export function createHelloMessage(
  nodeId: NodeID,
  chainId: string,
  latestBlockHash: Hash,
  latestBlockHeight: number,
  capabilities: string[] = [],
  userAgent: string = 'APStatChain/1.0'
): HelloMessage {
  return {
    type: 'HELLO',
    payload: {
      protocolVersion: 1,
      nodeId,
      chainId,
      latestBlockHash,
      latestBlockHeight,
      timestamp: Date.now(),
      capabilities,
      userAgent
    }
  };
}

/**
 * Create a HELLO_RESPONSE message
 */
export function createHelloResponseMessage(
  nodeId: NodeID,
  chainId: string,
  latestBlockHash: Hash,
  latestBlockHeight: number,
  accepted: boolean,
  capabilities: string[] = [],
  userAgent: string = 'APStatChain/1.0',
  reason?: string
): HelloResponseMessage {
  return {
    type: 'HELLO_RESPONSE',
    payload: {
      protocolVersion: 1,
      nodeId,
      chainId,
      latestBlockHash,
      latestBlockHeight,
      timestamp: Date.now(),
      capabilities,
      userAgent,
      accepted,
      reason
    }
  };
}

/**
 * Create a PING message for health checks
 */
export function createPingMessage(): PingMessage {
  return {
    type: 'PING',
    payload: {
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substr(2, 9)
    }
  };
}

/**
 * Create a PONG response message
 */
export function createPongMessage(originalNonce: string, latency?: number): PongMessage {
  return {
    type: 'PONG',
    payload: {
      timestamp: Date.now(),
      originalNonce,
      latency
    }
  };
}

/**
 * Create a GET_PEERS message
 */
export function createGetPeersMessage(maxPeers?: number): GetPeersMessage {
  return {
    type: 'GET_PEERS',
    payload: {
      maxPeers
    }
  };
}

/**
 * Create a GET_CHAIN_STATE message
 */
export function createGetChainStateMessage(
  includeValidators: boolean = false,
  includeMetrics: boolean = false
): GetChainStateMessage {
  return {
    type: 'GET_CHAIN_STATE',
    payload: {
      includeValidators,
      includeMetrics
    }
  };
}

/**
 * Create a GET_MISSING_TX message
 */
export function createGetMissingTxMessage(
  transactionHashes: Hash[],
  urgent: boolean = false
): GetMissingTxMessage {
  return {
    type: 'GET_MISSING_TX',
    payload: {
      transactionHashes,
      urgent
    }
  };
}

/**
 * Create a SEND_TX message
 */
export function createSendTxMessage(
  transaction: Transaction,
  propagate: boolean = true
): SendTxMessage {
  return {
    type: 'SEND_TX',
    payload: {
      transaction,
      propagate
    }
  };
}

/**
 * Create a TX_BROADCAST message
 */
export function createTxBroadcastMessage(
  transaction: Transaction,
  originNodeId: NodeID,
  hopCount: number = 0,
  maxHops: number = 7
): TxBroadcastMessage {
  return {
    type: 'TX_BROADCAST',
    payload: {
      transaction,
      originNodeId,
      hopCount,
      maxHops
    }
  };
}

/**
 * Create a GET_BLOCKS message
 */
export function createGetBlocksMessage(
  startHeight: number,
  endHeight?: number,
  maxBlocks: number = 100,
  includeTransactions: boolean = true
): GetBlocksMessage {
  return {
    type: 'GET_BLOCKS',
    payload: {
      startHeight,
      endHeight,
      maxBlocks,
      includeTransactions
    }
  };
}

/**
 * Create an ANNOUNCE_CANDIDATE_BLOCK message
 */
export function createAnnounceCandidateBlockMessage(
  blockHash: Hash,
  blockHeight: number,
  proposer: PublicKey,
  transactionCount: number
): AnnounceCandidateBlockMessage {
  return {
    type: 'ANNOUNCE_CANDIDATE_BLOCK',
    payload: {
      blockHash,
      blockHeight,
      proposer,
      timestamp: Date.now(),
      transactionCount
    }
  };
}

/**
 * Create a BLOCK_PROPOSAL message
 */
export function createBlockProposalMessage(
  block: Block,
  proposer: PublicKey,
  signature: string,
  puzzleHash: Hash,
  solution: number,
  proofOfAccessHash: Hash
): BlockProposalMessage {
  return {
    type: 'BLOCK_PROPOSAL',
    payload: {
      block,
      proposer,
      signature,
      proofOfKnowledge: {
        puzzleHash,
        solution,
        proofOfAccessHash
      }
    }
  };
}

/**
 * Create a SEND_ATTESTATION message
 */
export function createSendAttestationMessage(
  blockHash: Hash,
  blockHeight: number,
  validator: PublicKey,
  signature: string
): SendAttestationMessage {
  return {
    type: 'SEND_ATTESTATION',
    payload: {
      blockHash,
      blockHeight,
      validator,
      signature,
      timestamp: Date.now()
    }
  };
}

/**
 * Create an ATTESTATION_BROADCAST message
 */
export function createAttestationBroadcastMessage(
  blockHash: Hash,
  blockHeight: number,
  validator: PublicKey,
  signature: string,
  originNodeId: NodeID,
  hopCount: number = 0,
  maxHops: number = 7
): AttestationBroadcastMessage {
  return {
    type: 'ATTESTATION_BROADCAST',
    payload: {
      blockHash,
      blockHeight,
      validator,
      signature,
      timestamp: Date.now(),
      originNodeId,
      hopCount,
      maxHops
    }
  };
}

/**
 * Create a REQUEST_SYNC message
 */
export function createRequestSyncMessage(
  fromHeight: number,
  toHeight?: number,
  batchSize: number = 50
): RequestSyncMessage {
  return {
    type: 'REQUEST_SYNC',
    payload: {
      fromHeight,
      toHeight,
      batchSize
    }
  };
}

/**
 * Create an ERROR message
 */
export function createErrorMessage(
  error: ChainError,
  originalMessageType?: P2PMessageType,
  context?: string
): ErrorMessage {
  return {
    type: 'ERROR',
    payload: {
      error,
      originalMessageType,
      context
    }
  };
}

/**
 * Create a DISCONNECT message
 */
export function createDisconnectMessage(
  reason: string,
  graceful: boolean = true,
  reconnectAfter?: number
): DisconnectMessage {
  return {
    type: 'DISCONNECT',
    payload: {
      reason,
      graceful,
      reconnectAfter
    }
  };
}

// =============================================================================
// MESSAGE VALIDATION UTILITIES
// =============================================================================

/**
 * Type guard to check if a message is a valid P2P message
 */
export function isValidP2PMessage(message: any): message is P2PMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    typeof message.type === 'string' &&
    typeof message.payload === 'object' &&
    message.payload !== null
  );
}

/**
 * Type guard for specific message types
 */
export function isMessageOfType<T extends P2PMessage['type']>(
  message: P2PMessage,
  type: T
): message is Extract<P2PMessage, { type: T }> {
  return message.type === type;
}

/**
 * Validate message structure and required fields
 */
export function validateMessage(message: any): { valid: boolean; error?: string } {
  if (!isValidP2PMessage(message)) {
    return { valid: false, error: 'Invalid message structure' };
  }

  // Add specific validation for each message type
  switch (message.type) {
    case 'HELLO':
      if (!message.payload.nodeId || !message.payload.chainId) {
        return { valid: false, error: 'Missing required fields in HELLO message' };
      }
      break;
    case 'SEND_TX':
      if (!message.payload.transaction) {
        return { valid: false, error: 'Missing transaction in SEND_TX message' };
      }
      break;
    // Add more validation cases as needed
  }

  return { valid: true };
} 