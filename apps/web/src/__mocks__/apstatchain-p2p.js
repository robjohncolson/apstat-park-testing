// Minimal stubs for @apstatchain/p2p used in front-end tests.
export class P2PNode {
    constructor(_publicKey) {
        Object.defineProperty(this, "connections", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "peer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: { on: () => { } }
        });
    }
    async start() {
        /* no-op */
    }
    broadcast(_msg) {
        /* no-op */
    }
}
export function createTxBroadcastMessage(_tx, _pub) {
    return {};
}
export function createBlockProposalMessage(_block, _pub, _sig, _puzzleHash, _puzzleSolution, _poaHash) {
    return {};
}
