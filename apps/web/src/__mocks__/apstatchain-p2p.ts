// Minimal stubs for @apstatchain/p2p used in front-end tests.

export class P2PNode {
  public connections = new Map();
  public peer = { on: () => {} } as any;
  constructor(_publicKey?: string) {}
  async start() {
    /* no-op */
  }
  broadcast(_msg: any) {
    /* no-op */
  }
}

export function createTxBroadcastMessage(_tx: any, _pub: string) {
  return {};
}

export function createBlockProposalMessage(
  _block: any,
  _pub: string,
  _sig: string,
  _puzzleHash: string,
  _puzzleSolution: any,
  _poaHash: string,
) {
  return {};
}

export type P2PMessage = any; 