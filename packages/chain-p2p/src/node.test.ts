import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Bring the mock classes into scope for use within the tests.
import { PeerMock, DataConnectionMock } from './__mocks__/peerjs';

// Ensure Vitest replaces the real "peerjs" package with our stub before the
// code under test is imported. Using a dynamic `import()` avoids the hoisting
// issue where references to the mocks would otherwise be undefined.
vi.mock('peerjs', () => import('./__mocks__/peerjs'));

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