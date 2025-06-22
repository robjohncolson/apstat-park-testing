// Minimal stubs for @apstatchain/core used in front-end tests.
// They implement only the APIs referenced by BlockchainService.
export async function createChainDB() {
    // Very naive in-memory stub
    const mempool = [];
    let latestBlock = null;
    return {
        addToMempool: async (tx) => {
            mempool.push(tx);
        },
        getTransactionsFromMempool: async () => [...mempool],
        getLatestBlock: async () => latestBlock,
        addBlock: async (block) => {
            latestBlock = block;
        },
        removeFromMempool: async (id) => {
            const idx = mempool.findIndex((t) => t.id === id);
            if (idx >= 0)
                mempool.splice(idx, 1);
        },
    };
}
export function generateKeyPair() {
    return { publicKey: "test-public", privateKey: "test-private" };
}
export function sign(_data, _priv) {
    return "signature";
}
export function hash(_val) {
    return "hash";
}
export function proposeBlock(transactions, prev, _solution, _poaHash) {
    return {
        header: {
            previousHash: prev?.header?.hash ?? "0",
            timestamp: Date.now(),
            hash: "hash",
        },
        transactions,
        attestations: [],
    };
}
