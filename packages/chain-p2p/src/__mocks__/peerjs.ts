import { EventEmitter } from 'events';
import { vi } from 'vitest';

/**
 * Minimal stub for PeerJS DataConnection used in unit tests.
 */
export class DataConnectionMock extends EventEmitter {
  public peer: string;
  public open = true;
  public metadata: any;

  // Spies for assertions in tests.
  public send = vi.fn();
  public close = vi.fn();

  constructor(peerId: string, metadata: any = {}) {
    super();
    this.peer = peerId;
    this.metadata = metadata;
  }
}

/**
 * Minimal stub for PeerJS Peer used in unit tests.
 */
export class PeerMock extends EventEmitter {
  public id: string;
  public destroyed = false;
  public open = true;

  constructor(id: string, _options?: any) {
    super();
    this.id = id;
  }

  /**
   * Simulate an outbound connection initiated by our node.
   * Immediately emits an "open" event on the returned DataConnectionMock.
   */
  connect(peerId: string, options?: any) {
    const conn = new DataConnectionMock(peerId, options?.metadata ?? {});
    setTimeout(() => conn.emit('open'), 0);
    return conn;
  }

  reconnect() {
    /* no-op for tests */
  }

  destroy() {
    this.destroyed = true;
  }
}

// Re-export under the names expected by the production code that does
// `import { Peer, DataConnection } from 'peerjs'`.
export const Peer = PeerMock;
export const DataConnection = DataConnectionMock;

// Default export for convenience if someone uses default import style.
export default {
  Peer,
  DataConnection
}; 