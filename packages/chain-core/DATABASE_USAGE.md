# APStat Chain Database Layer

This document explains how to use the Dexie.js-based database layer for the APStat Chain blockchain.

## Overview

The database layer provides local IndexedDB storage for blockchain data including:
- **Blocks**: The blockchain itself
- **Mempool**: Pending transactions waiting to be included in blocks
- **App State**: Key-value storage for application settings and state

## Quick Start

```typescript
import { ChainDB, createChainDB } from '@apstatchain/core';

// Create and initialize database
const db = await createChainDB();

// Use the database
await db.addBlock(myBlock);
const latestBlock = await db.getLatestBlock();
```

## Database Schema

### Blocks Table
- **Primary Key**: Auto-incremented ID
- **Indexes**: `hash`, `height`, `addedAt`
- **Data**: Complete block objects with metadata

### Mempool Table  
- **Primary Key**: Auto-incremented ID
- **Indexes**: `hash`, `priority`, `addedAt`
- **Data**: Transaction objects with priority information

### App State Table
- **Primary Key**: `key` (string)
- **Indexes**: `updatedAt`
- **Data**: Key-value pairs for application state

## Core Methods

### Block Operations

```typescript
// Add a block to the blockchain
await db.addBlock(block);

// Get a block by hash
const block = await db.getBlockByHash('0x123...');

// Get the latest block (highest height)
const latest = await db.getLatestBlock();

// Get current blockchain height
const height = await db.getCurrentHeight();

// Get blocks in a height range
const blocks = await db.getBlocksByHeightRange(10, 20);
```

### Mempool Operations

```typescript
// Add transaction to mempool
await db.addToMempool(transaction);

// Get transactions ordered by priority
const txs = await db.getTransactionsFromMempool(50); // limit 50

// Remove transaction when included in block
await db.removeFromMempool(transactionId);

// Clear entire mempool
await db.clearMempool();
```

### App State Operations

```typescript
// Store application state
await db.setAppState('privateKey', 'abc123...');
await db.setAppState('userPreferences', { theme: 'dark' });

// Retrieve application state
const privateKey = await db.getAppState('privateKey');
const prefs = await db.getAppState('userPreferences');

// Remove state
await db.removeAppState('oldKey');
```

## Priority System

Transactions in the mempool are ordered by priority:
1. **Critical** - System-critical transactions
2. **High** - Important user actions
3. **Normal** - Standard transactions (default)
4. **Low** - Background/maintenance transactions

Within the same priority level, older transactions are processed first.

## Error Handling

```typescript
try {
  await db.addBlock(block);
} catch (error) {
  if (error.message.includes('hash')) {
    console.error('Block must have a hash before storage');
  }
  // Handle other errors...
}
```

## Testing

A smoke test function is provided to verify database functionality:

```typescript
import { smokeTest } from '@apstatchain/core';

const result = await smokeTest();
if (result.success) {
  console.log('Database is working correctly!');
} else {
  console.error('Database test failed:', result.message);
}
```

## Browser Environment

To test the database in a browser environment, open `database-example.html` in your web browser. This provides a visual interface to test all database operations.

## Production Considerations

1. **Data Migration**: When updating the schema, implement proper migration logic
2. **Performance**: Consider indexing strategies for large datasets
3. **Storage Limits**: Monitor IndexedDB storage quotas
4. **Cleanup**: Implement periodic cleanup of old mempool entries
5. **Backup**: Consider implementing data export/import functionality

## Example: Complete Workflow

```typescript
import { createChainDB, Block, Transaction } from '@apstatchain/core';

async function exampleWorkflow() {
  // Initialize database
  const db = await createChainDB();
  
  // Store user's private key
  await db.setAppState('privateKey', 'user-private-key');
  
  // Add a transaction to mempool
  const transaction: Transaction = {
    id: 'tx-' + Date.now(),
    type: 'LESSON_PROGRESS',
    data: {
      lessonId: 'unit1-lesson1',
      progressType: 'video_watched',
      status: 'completed',
      progressPercentage: 100
    },
    signature: 'signature...',
    publicKey: 'public-key...',
    timestamp: Date.now(),
    priority: 'normal'
  };
  
  await db.addToMempool(transaction);
  
  // Get pending transactions for block creation
  const pendingTxs = await db.getTransactionsFromMempool(10);
  
  // Create and store a new block
  const block: Block = {
    header: {
      version: 1,
      previousHash: 'previous-block-hash...',
      merkleRoot: 'merkle-root...',
      timestamp: Date.now(),
      nonce: 123456,
      proofOfAccessHash: 'proof-hash...',
      difficulty: 1,
      height: await db.getCurrentHeight() + 1,
      hash: 'new-block-hash...'
    },
    transactions: pendingTxs,
    attestations: []
  };
  
  await db.addBlock(block);
  
  // Remove transactions from mempool since they're now in a block
  for (const tx of pendingTxs) {
    await db.removeFromMempool(tx.id);
  }
  
  // Get the latest state
  const latestBlock = await db.getLatestBlock();
  const currentHeight = await db.getCurrentHeight();
  
  console.log(`Latest block height: ${currentHeight}`);
  console.log(`Block hash: ${latestBlock?.header.hash}`);
  
  // Close database when done
  db.close();
}
```

This completes the database layer implementation for Phase 1.4 of the APStat Chain project. 