# @apstatchain/p2p

Peer-to-peer networking package for APStat Chain that enables nodes to discover, connect, and communicate with each other using WebRTC.

## Features

- **Peer Discovery**: Automatic peer discovery using DNS seeds
- **WebRTC Communication**: Reliable peer-to-peer connections using PeerJS
- **Protocol Handshake**: Version compatibility checking and capability negotiation
- **Message Broadcasting**: Efficient message broadcasting to all connected peers
- **Connection Management**: Automatic connection handling and error recovery
- **Type-Safe Messaging**: Comprehensive P2P message types with TypeScript support

## Installation

```bash
npm install @apstatchain/p2p
```

## Usage

### Basic Usage

```typescript
import { P2PNode } from '@apstatchain/p2p';

// Create a new P2P node with a unique ID
const node = new P2PNode('my-unique-node-id');

// Start the node (discovers peers and connects)
await node.start();

// Check if the node is ready
if (node.isReady()) {
  console.log('Node is ready and connected to peers');
}

// Get connection status
const status = node.getConnectionStatus();
console.log(`Connected to ${status.compatibleConnections} compatible peers`);
```

### Broadcasting Messages

```typescript
import { createHelloMessage, createPingMessage } from '@apstatchain/p2p';

// Create and broadcast a hello message
const helloMessage = createHelloMessage(
  'my-node-id',
  'apstat-chain',
  'latest-block-hash',
  123, // block height
  ['validation', 'storage'], // capabilities
  'MyApp/1.0' // user agent
);

node.broadcast(helloMessage);

// Send a ping to all connected peers
const pingMessage = createPingMessage();
node.broadcast(pingMessage);
```

### Handling Custom Logic

The P2PNode class handles all standard protocol messages automatically, including:

- **HELLO/HELLO_RESPONSE**: Protocol handshake and compatibility checking
- **PING/PONG**: Connection health monitoring
- **ERROR**: Error reporting and handling
- **DISCONNECT**: Graceful connection termination

For blockchain-specific messages like transactions and blocks, the message handlers provide logging and can be extended for custom logic.

### Connection Management

```typescript
// Get detailed connection information
const status = node.getConnectionStatus();
console.log('Total connections:', status.totalConnections);
console.log('Compatible connections:', status.compatibleConnections);

// View individual connection details
status.connections.forEach(conn => {
  console.log(`Peer ${conn.nodeId}:`);
  console.log(`  Compatible: ${conn.isCompatible}`);
  console.log(`  Protocol Version: ${conn.protocolVersion}`);
  console.log(`  Capabilities: ${conn.capabilities.join(', ')}`);
});

// Stop the node and clean up connections
await node.stop();
```

## Supported Message Types

The P2P protocol supports the following message types:

### Connection & Handshake
- `HELLO` - Initial handshake with protocol version and capabilities
- `HELLO_RESPONSE` - Response to handshake with acceptance/rejection
- `PING` / `PONG` - Connection health monitoring
- `ERROR` - Error reporting
- `DISCONNECT` - Graceful connection termination

### Peer Discovery
- `GET_PEERS` - Request peer list from connected nodes
- `PEERS_RESPONSE` - Response with known peer addresses

### Blockchain Data
- `GET_CHAIN_STATE` - Request current blockchain state
- `CHAIN_STATE_RESPONSE` - Response with chain information
- `GET_BLOCKS` - Request specific blockchain blocks
- `BLOCKS_RESPONSE` - Response with requested blocks
- `REQUEST_SYNC` - Request blockchain synchronization
- `SYNC_RESPONSE` - Response with sync data

### Transactions
- `SEND_TX` - Send a transaction to peers
- `TX_BROADCAST` - Broadcast transaction across network
- `GET_MISSING_TX` - Request missing transactions
- `MISSING_TX_RESPONSE` - Response with requested transactions

### Consensus & Mining
- `ANNOUNCE_CANDIDATE_BLOCK` - Announce a new candidate block
- `BLOCK_PROPOSAL` - Propose a new block for consensus
- `SEND_ATTESTATION` - Send block attestation/vote
- `ATTESTATION_BROADCAST` - Broadcast attestation across network

## Architecture

### P2PNode Class

The main `P2PNode` class provides:

- **Constructor**: Takes a unique peer ID and initializes PeerJS
- **start()**: Discovers peers and establishes connections
- **handleMessage()**: Processes incoming P2P messages with type-safe handling
- **broadcast()**: Sends messages to all compatible connected peers
- **getConnectionStatus()**: Returns detailed connection information
- **stop()**: Gracefully shuts down all connections
- **isReady()**: Checks if node is operational

### Connection Management

Each peer connection includes:

- **Protocol Compatibility**: Automatic version checking
- **Capability Negotiation**: Exchange of supported features
- **Health Monitoring**: Regular ping/pong for connection health
- **Error Handling**: Automatic cleanup of failed connections

### Bootstrap & Discovery

Peer discovery uses DNS seed servers to find initial peers:

- Queries DNS-over-HTTPS for TXT records containing peer addresses
- Supports multiple seed servers for redundancy
- Automatically connects to discovered peers on startup

## Development

### Testing

Run the test suite:

```bash
npm test
```

Run a manual P2P test:

```bash
npm run build
node dist/test-node.js
```

### Building

```bash
npm run build
```

## Dependencies

- **peerjs**: WebRTC peer-to-peer connections
- **@apstatchain/core**: Core blockchain types and utilities

## License

ISC 