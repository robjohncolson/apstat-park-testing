import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// ---------------------------------------------------------------------------
// PeerJS mocks – we do not want to rely on real WebRTC network connections in
// unit tests, so we stub out the minimal behaviour that P2PNode expects.
// ---------------------------------------------------------------------------

class DataConnectionMock extends EventEmitter {
  public peer: string;
  public open = true;
  public metadata: any;

  // Vitest spies allow us to assert that messages were sent if desired.
  public send = vi.fn();
  public close = vi.fn();

  constructor(peerId: string, metadata: any = {}) {
    super();
    this.peer = peerId;
    this.metadata = metadata;
  }
}

class PeerMock extends EventEmitter {
  public id: string;
  public destroyed = false;
  public open = true;

  constructor(id: string, _options?: any) {
    super();
    this.id = id;
  }

  /**
   * Outbound connection initiated by our node. We immediately emit an "open"
   * event on the returned DataConnectionMock for simplicity.
   */
  connect(peerId: string, options?: any) {
    const conn = new DataConnectionMock(peerId, options?.metadata ?? {});
    // Simulate asynchronous "open".
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

// Tell Vitest to replace the real "peerjs" module with our mock implementation
vi.mock('peerjs', () => ({
  Peer: PeerMock,
  DataConnection: DataConnectionMock
}));

// ---------------------------------------------------------------------------
// Tests for P2PNode
// ---------------------------------------------------------------------------
import {
  P2PNode,
  createHelloMessage,
  createAnnounceCandidateBlockMessage
} from './index';


describe('P2PNode – protocol handling', () => {
  let node: P2PNode;
  let inboundConn: DataConnectionMock;

  beforeEach(() => {
    // Each test gets a fresh node to avoid state bleed-through.
    node = new P2PNode('nodeA');

    // Access the underlying mocked Peer instance and simulate an incoming
    // connection from "peerB".
    const peerImpl = (node as any).peer as PeerMock;
    inboundConn = new DataConnectionMock('peerB');

    // Emit events in the same order PeerJS would: first "connection", then the
    // DataConnection emits its own "open".
    peerImpl.emit('connection', inboundConn);
    inboundConn.emit('open');
  });

  afterEach(() => {
    // Clear all mocks to keep assertions isolated.
    vi.clearAllMocks();
  });

  it('flags peer as incompatible when protocol version mismatches (Checklist P2)', () => {
    // Craft a HELLO message with an incompatible protocolVersion (2 instead of 1).
    const incompatibleHello = createHelloMessage(
      'peerB',
      'apstat-chain',
      '0xabc',
      123,
      [],
      'PeerMock/1.0'
    );
    (incompatibleHello as any).payload.protocolVersion = 2;

    // Deliver the message to our node.
    inboundConn.emit('data', incompatibleHello);

    // Assert the node has flagged the peer as incompatible.
    const connInfo = (node as any).connections.get('peerB');
    expect(connInfo).toBeDefined();
    expect(connInfo.isCompatible).toBe(false);
  });

  it('abandons local proposal on competing candidate block announcement (Checklist P5)', () => {
    // Put node into "proposing" mode.
    node.setProposingBlock(true);
    expect(node.currentlyProposing()).toBe(true);

    // Simulate receiving a competing candidate block announcement.
    const announceMsg = createAnnounceCandidateBlockMessage(
      '0xdeadbeef',
      456,
      'peerB',
      10
    );
    inboundConn.emit('data', announceMsg);

    // Node should have exited proposing mode.
    expect(node.currentlyProposing()).toBe(false);
  });
}); 