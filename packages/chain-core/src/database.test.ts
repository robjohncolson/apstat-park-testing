import { describe, it, beforeEach } from 'vitest';
import assert from 'node:assert';

// Ensure IndexedDB is available in the test environment (Node + happy-dom)
// fake-indexeddb provides an in-memory implementation compatible with Dexie.
// The import has side-effects that attach indexedDB to the global scope.
import 'fake-indexeddb/auto';

import { ChainDB } from './database.js';
import type { Transaction, Block } from './types.js';

describe('Database Module (ChainDB) – Checklist C6', () => {
  let db: ChainDB;

  beforeEach(async () => {
    // Close any previous instance (Vitest may reuse the same VM)
    if (db) {
      try {
        db.close();
      } catch {
        /* ignore */
      }
    }
    db = new ChainDB();
    await db.open();
  });

  it('should add and retrieve a block by hash', async () => {
    const dummyBlock: Block = {
      header: {
        version: 1,
        previousHash: '0'.repeat(64),
        merkleRoot: '1'.repeat(64),
        timestamp: Date.now(),
        nonce: 0,
        proofOfAccessHash: '2'.repeat(64),
        difficulty: 1,
        height: 1,
        hash: 'a'.repeat(64)
      },
      transactions: [],
      attestations: []
    };

    await db.addBlock(dummyBlock);

    const fetched = await db.getBlockByHash(dummyBlock.header.hash!);
    assert.ok(fetched, 'Block should be fetched');
    assert.strictEqual(fetched!.header.height, 1, 'Fetched block height should match');
  });

  it('should correctly queue and order mempool transactions', async () => {
    const lowPriorityTx: Transaction = {
      id: 'tx-low',
      type: 'USER_CREATE',
      data: { username: 'low', createdAt: new Date().toISOString() },
      signature: 'sig',
      publicKey: 'pub',
      timestamp: Date.now(),
      priority: 'low'
    } as Transaction;

    // Wait a millisecond so timestamps differ for equal priority test case
    await new Promise(r => setTimeout(r, 1));

    const highPriorityTx: Transaction = {
      id: 'tx-high',
      type: 'USER_CREATE',
      data: { username: 'high', createdAt: new Date().toISOString() },
      signature: 'sig',
      publicKey: 'pub',
      timestamp: Date.now(),
      priority: 'high'
    } as Transaction;

    await db.addToMempool(lowPriorityTx);
    await db.addToMempool(highPriorityTx);

    const ordered = await db.getTransactionsFromMempool(10);
    assert.strictEqual(ordered.length, 2, 'Two transactions expected');
    assert.strictEqual(ordered[0].id, 'tx-high', 'High-priority tx should come first');
    assert.strictEqual(ordered[1].id, 'tx-low', 'Low-priority tx should come second');
  });

  it('should manage penalty box entries (add, query, cleanup)', async () => {
    const publicKey = 'penalized-key';

    // Add a penalty (expires in 100ms)
    await db.penaltyBox.put({
      publicKey,
      scoreMultiplier: 0.5,
      expiryTimestamp: Date.now() + 100
    });

    // Immediately check active penalty
    const activePenalty = await db.getActivePenalty(publicKey);
    assert.ok(activePenalty, 'Penalty should be active');
    assert.strictEqual(await db.isPenalized(publicKey), true, 'User should be penalized');
    assert.strictEqual(await db.getScoreMultiplier(publicKey), 0.5, 'Multiplier should match');

    // Wait for expiry (110ms) then run cleanup
    await new Promise(r => setTimeout(r, 110));
    const cleaned = await db.cleanupExpiredPenalties();
    assert.strictEqual(cleaned, 1, 'One expired penalty should be removed');

    // After cleanup, penalty should no longer be active
    assert.strictEqual(await db.isPenalized(publicKey), false, 'User should not be penalized');
    assert.strictEqual(await db.getScoreMultiplier(publicKey), 1.0, 'Multiplier should reset');
  });
}); 