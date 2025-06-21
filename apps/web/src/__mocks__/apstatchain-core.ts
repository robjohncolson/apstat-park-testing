// Minimal stubs for @apstatchain/core used in front-end tests.
// They implement only the APIs referenced by BlockchainService.

export async function createChainDB() {
  // Very naive in-memory stub
  const mempool: any[] = [];
  let latestBlock: any = null;
  return {
    addToMempool: async (tx: any) => {
      mempool.push(tx);
    },
    getTransactionsFromMempool: async () => [...mempool],
    getLatestBlock: async () => latestBlock,
    addBlock: async (block: any) => {
      latestBlock = block;
    },
    removeFromMempool: async (id: string) => {
      const idx = mempool.findIndex((t) => t.id === id);
      if (idx >= 0) mempool.splice(idx, 1);
    },
  } as const;
}

export type ChainDB = Awaited<ReturnType<typeof createChainDB>>;

export function generateKeyPair() {
  return { publicKey: "test-public", privateKey: "test-private" } as const;
}

export function sign(_data: any, _priv: string) {
  return "signature";
}

export function hash(_val: any) {
  return "hash";
}

export function proposeBlock(transactions: any[], prev: any, _solution: any, _poaHash: any) {
  return {
    header: {
      previousHash: prev?.header?.hash ?? "0",
      timestamp: Date.now(),
      hash: "hash",
    },
    transactions,
    attestations: [],
  } as any;
}

// Simple placeholder types so TypeScript doesn't complain in imports
export type Transaction = any;
export type LessonProgressData = any;
export type Block = any;
export type PuzzleSolution = any; 