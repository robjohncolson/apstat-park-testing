# Penalty System Implementation - Phase 2.3

## Overview

This document outlines the penalty system implementation for the APStat Chain that handles invalid block proposals and tracks penalties for block proposers who submit failed blocks.

## Database Schema Changes

### New Table: `penaltyBox`

The database schema has been updated to include a new `penaltyBox` table with the following structure:

```typescript
interface PenaltyBoxEntry {
  publicKey: string;        // Primary key - the public key of the penalized user
  scoreMultiplier: number;  // Penalty multiplier applied to scores (0.5 for 50% penalty)
  expiryTimestamp: number;  // Unix timestamp when the penalty expires
}
```

**Database Schema Update:**
- **Table Name:** `penaltyBox`
- **Primary Key:** `publicKey`
- **Indexes:** `publicKey`, `scoreMultiplier`, `expiryTimestamp`

## Core Functions

### `handleFailedBlock`

**Location:** `packages/chain-core/src/consensus.ts`

**Signature:**
```typescript
export async function handleFailedBlock(
  block: Block, 
  proposerPublicKey: PublicKey, 
  db: ChainDB
): Promise<void>
```

**Functionality:**
1. **Apply Penalty:** Creates or updates a penalty entry for the block proposer
   - Sets `scoreMultiplier` to `0.5` (50% penalty)
   - Sets `expiryTimestamp` to 1 hour from current time (`Date.now() + 3600 * 1000`)

2. **Return Transactions:** Returns all transactions from the failed block back to the mempool
   - Iterates through `block.transactions`
   - Calls `db.addToMempool(transaction)` for each transaction
   - Continues processing even if individual transactions fail to be added (with warning logs)

3. **Logging:** Provides console output for successful penalty application and transaction return

## Database Helper Methods

The following helper methods have been added to the `ChainDB` class for penalty management:

### `getActivePenalty(publicKey: string)`
- Returns the active penalty for a user if it exists and hasn't expired
- Automatically cleans up expired penalties
- Returns `undefined` if no active penalty exists

### `isPenalized(publicKey: string)`
- Returns `true` if the user has an active penalty
- Returns `false` if no penalty or penalty has expired

### `getScoreMultiplier(publicKey: string)`
- Returns the current score multiplier for a user
- Returns `1.0` if no penalty is active
- Returns the penalty multiplier value if penalized

### `cleanupExpiredPenalties()`
- Removes all expired penalties from the penalty box
- Returns the number of penalties that were cleaned up
- Can be called periodically for database maintenance

### `getActivePenalties()`
- Returns an array of all currently active penalties
- Useful for administrative purposes and system monitoring

## Testing

### Smoke Test Integration
The existing `smokeTest()` function has been enhanced to include penalty box functionality testing:
- Tests penalty creation and retrieval
- Verifies penalty status checks
- Tests score multiplier functionality
- Validates penalty expiry and cleanup

### Comprehensive Test Suite
A dedicated test file `penalty-system.test.ts` has been created with comprehensive testing:
- Tests the complete `handleFailedBlock` workflow
- Verifies penalty application and transaction return
- Tests penalty expiry and cleanup mechanisms
- Validates all helper methods

## Usage Example

```typescript
import { ChainDB, createChainDB } from './database.js';
import { handleFailedBlock } from './consensus.js';

// When a block proposal fails validation
const db = await createChainDB();
const failedBlock = /* ... block that failed validation ... */;
const proposerPublicKey = "user-public-key";

// Apply penalty and return transactions to mempool
await handleFailedBlock(failedBlock, proposerPublicKey, db);

// Check if user is penalized
const isPenalized = await db.isPenalized(proposerPublicKey);
const scoreMultiplier = await db.getScoreMultiplier(proposerPublicKey);

console.log(`User penalized: ${isPenalized}`);
console.log(`Score multiplier: ${scoreMultiplier}`);
```

## Key Features

1. **Automatic Penalty Application:** Failed block proposers receive a 50% score penalty for 1 hour
2. **Transaction Recovery:** All transactions from failed blocks are returned to mempool for reprocessing
3. **Automatic Cleanup:** Expired penalties are automatically removed when accessed
4. **Comprehensive API:** Full set of helper methods for penalty management
5. **Robust Testing:** Complete test coverage for all penalty system functionality

## Future Considerations

- The 10-minute timeout mentioned in the requirements is handled at a higher service level
- Penalty severity and duration could be made configurable
- Additional penalty types could be added for different failure scenarios
- Monitoring and analytics could be built on top of the penalty system

## Files Modified

1. `packages/chain-core/src/database.ts` - Added penalty box schema and helper methods
2. `packages/chain-core/src/consensus.ts` - Added `handleFailedBlock` function
3. `packages/chain-core/src/penalty-system.test.ts` - Added comprehensive tests

The penalty system is now fully implemented and ready for integration with higher-level services that detect failed block proposals. 