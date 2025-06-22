// P2P Node implementation will go here
import { Peer, DataConnection } from 'peerjs';
import type { Block } from '@apstatchain/core';
import { discoverPeers } from './bootstrap.js';
import { 
  P2PMessage, 
  P2PMessageType, 
  PublicKey, 
  NodeID,
  createHelloMessage,
  createHelloResponseMessage,
  createPongMessage,
  createErrorMessage,
  isValidP2PMessage,
  validateMessage
} from './protocol.js';

/**
 * Connection metadata for tracking peer connections
 */
interface ConnectionInfo {
  connection: DataConnection;
  nodeId: NodeID;
  protocolVersion?: number;
  isCompatible: boolean;
  lastPing?: number;
  capabilities: string[];
  userAgent?: string;
}

/**
 * Main P2P Node class that manages all peer connections and message handling
 */
export class P2PNode {
  public readonly id: string;
  private peer: Peer;
  private connections: Map<string, ConnectionInfo> = new Map();
  private isStarted: boolean = false;
  private readonly protocolVersion: number = 1;
  private readonly chainId: string = 'apstat-chain';
  private readonly capabilities: string[] = ['validation', 'storage'];
  private readonly userAgent: string = 'APStatChain/1.0';
  /**
   * Flag indicating this node is currently working on its own candidate block proposal. When
   * set to true the node SHOULD abandon the proposal if it learns that another peer has
   * already announced a competing candidate block at the same height. This variable is mutated
   * by consensus logic elsewhere, but it is useful for unit‐testing conflict resolution of the
   * networking layer.
   */
  private isProposingBlock: boolean = false;

  // Dummy chain state - in a real implementation, this would come from the blockchain
  private latestBlockHash: string = '0x0000000000000000000000000000000000000000000000000000000000000000';
  private latestBlockHeight: number = 0;

  constructor(peerId: PublicKey) {
    this.id = peerId;
    console.log(`Initializing P2P Node with ID: ${this.id}`);
    
    // Initialize PeerJS instance
    this.peer = new Peer(this.id, {
      debug: 2, // Enable debug logging
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    this.setupPeerEventListeners();
  }

  /**
   * Set up core event listeners for the peer object
   */
  private setupPeerEventListeners(): void {
    // Fires when our node is successfully registered with the broker server
    this.peer.on('open', (id: string) => {
      console.log(`P2P Node opened with ID: ${id}`);
      console.log('Node is ready to accept connections and discover peers');
    });

    // Fires when another peer connects to us
    this.peer.on('connection', (conn: DataConnection) => {
      console.log(`Incoming connection from peer: ${conn.peer}`);
      this.handleIncomingConnection(conn);
    });

    // For logging connection errors
    this.peer.on('error', (err: Error) => {
      console.error('P2P Node error:', err);
      // Handle specific error types
      if (err.message.includes('ID is taken')) {
        console.error('Node ID already in use. Try a different ID.');
      } else if (err.message.includes('Lost connection')) {
        console.warn('Lost connection to broker server. Attempting to reconnect...');
      }
    });

    this.peer.on('disconnected', () => {
      console.warn('Disconnected from broker server');
      // Attempt to reconnect
      if (!this.peer.destroyed) {
        this.peer.reconnect();
      }
    });

    this.peer.on('close', () => {
      console.log('P2P Node connection closed');
      this.isStarted = false;
    });
  }

  /**
   * Start the P2P node: discover peers and attempt connections
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      console.warn('P2P Node is already started');
      return;
    }

    console.log('Starting P2P Node...');
    
    try {
      // Wait for peer to be ready
      await this.waitForPeerReady();
      
      // Discover peers using bootstrap mechanism
      console.log('Discovering peers...');
      const peerIds = await discoverPeers();
      
      console.log(`Discovered ${peerIds.length} peers:`, peerIds);

      // Connect to discovered peers
      for (const peerId of peerIds) {
        // Don't connect to ourselves
        if (peerId === this.id) {
          continue;
        }
        
        try {
          await this.connectToPeer(peerId);
        } catch (error) {
          console.warn(`Failed to connect to peer ${peerId}:`, error);
          // Continue with other peers
        }
      }

      this.isStarted = true;
      console.log(`P2P Node started successfully. Connected to ${this.connections.size} peers.`);
      
    } catch (error) {
      console.error('Failed to start P2P Node:', error);
      throw error;
    }
  }

  /**
   * Wait for the peer to be ready (registered with broker)
   */
  private waitForPeerReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.peer.open) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for peer to be ready'));
      }, 10000); // 10 second timeout

      this.peer.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.peer.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Connect to a specific peer
   */
  private async connectToPeer(peerId: string): Promise<void> {
    console.log(`Attempting to connect to peer: ${peerId}`);
    
    try {
      const connection = this.peer.connect(peerId, {
        reliable: true,
        metadata: {
          nodeId: this.id,
          protocolVersion: this.protocolVersion
        }
      });

      // Set up connection event handlers
      this.setupConnectionEventListeners(connection);
      
    } catch (error) {
      console.error(`Failed to initiate connection to ${peerId}:`, error);
      throw error;
    }
  }

  /**
   * Handle incoming connections from other peers
   */
  private handleIncomingConnection(connection: DataConnection): void {
    console.log(`Setting up incoming connection from ${connection.peer}`);
    this.setupConnectionEventListeners(connection);
  }

  /**
   * Set up event listeners for a data connection
   */
  private setupConnectionEventListeners(connection: DataConnection): void {
    connection.on('open', () => {
      console.log(`Connection opened with peer: ${connection.peer}`);
      
      // Store connection info
      const connInfo: ConnectionInfo = {
        connection,
        nodeId: connection.peer,
        isCompatible: false, // Will be set during handshake
        capabilities: []
      };
      this.connections.set(connection.peer, connInfo);

      // Send initial HELLO message
      this.sendHelloMessage(connection);
    });

    connection.on('data', (data: any) => {
      try {
        if (isValidP2PMessage(data)) {
          this.handleMessage(connection, data);
        } else {
          console.warn(`Invalid message received from ${connection.peer}:`, data);
          this.sendErrorMessage(connection, 'Invalid message format');
        }
      } catch (error) {
        console.error(`Error handling message from ${connection.peer}:`, error);
        this.sendErrorMessage(connection, 'Message processing error');
      }
    });

    connection.on('close', () => {
      console.log(`Connection closed with peer: ${connection.peer}`);
      this.connections.delete(connection.peer);
    });

    connection.on('error', (err: Error) => {
      console.error(`Connection error with peer ${connection.peer}:`, err);
      this.connections.delete(connection.peer);
    });
  }

  /**
   * Send initial HELLO message to establish protocol compatibility
   */
  private sendHelloMessage(connection: DataConnection): void {
    const helloMessage = createHelloMessage(
      this.id,
      this.chainId,
      this.latestBlockHash,
      this.latestBlockHeight,
      this.capabilities,
      this.userAgent
    );

    console.log(`Sending HELLO to ${connection.peer}`);
    connection.send(helloMessage);
  }

  /**
   * Send error message to a peer
   */
  private sendErrorMessage(connection: DataConnection, reason: string): void {
    const errorMessage = createErrorMessage(
      { type: 'PROTOCOL_ERROR', message: reason } as any,
      undefined,
      reason
    );
    connection.send(errorMessage);
  }

  /**
   * Main message handler - processes all incoming P2P messages
   */
  private handleMessage(connection: DataConnection, message: P2PMessage): void {
    console.log(`Received ${message.type} from ${connection.peer}`);

    // Get connection info
    const connInfo = this.connections.get(connection.peer);
    if (!connInfo) {
      console.warn(`No connection info found for peer ${connection.peer}`);
      return;
    }

    // Handle message based on type
    switch (message.type) {
      case 'HELLO':
        this.handleHelloMessage(connInfo, message);
        break;

      case 'HELLO_RESPONSE':
        this.handleHelloResponseMessage(connInfo, message);
        break;

      case 'PING':
        this.handlePingMessage(connInfo, message);
        break;

      case 'PONG':
        this.handlePongMessage(connInfo, message);
        break;

      case 'GET_PEERS':
        this.handleGetPeersMessage(connInfo, message);
        break;

      case 'PEERS_RESPONSE':
        this.handlePeersResponseMessage(connInfo, message);
        break;

      case 'GET_CHAIN_STATE':
        this.handleGetChainStateMessage(connInfo, message);
        break;

      case 'CHAIN_STATE_RESPONSE':
        this.handleChainStateResponseMessage(connInfo, message);
        break;

      case 'SEND_TX':
        this.handleSendTxMessage(connInfo, message);
        break;

      case 'TX_BROADCAST':
        this.handleTxBroadcastMessage(connInfo, message);
        break;

      case 'ANNOUNCE_CANDIDATE_BLOCK':
        this.handleAnnounceCandidateBlockMessage(connInfo, message);
        break;

      case 'BLOCK_PROPOSAL':
        this.handleBlockProposalMessage(connInfo, message);
        break;

      case 'SEND_ATTESTATION':
        this.handleSendAttestationMessage(connInfo, message);
        break;

      case 'ATTESTATION_BROADCAST':
        this.handleAttestationBroadcastMessage(connInfo, message);
        break;

      case 'ERROR':
        this.handleErrorMessage(connInfo, message);
        break;

      case 'DISCONNECT':
        this.handleDisconnectMessage(connInfo, message);
        break;

      default:
        console.warn(`Unknown message type: ${(message as any).type}`);
        this.sendErrorMessage(connection, `Unsupported message type: ${(message as any).type}`);
    }
  }

  /**
   * Handle HELLO message - incoming handshake
   */
  private handleHelloMessage(connInfo: ConnectionInfo, message: any): void {
    const { payload } = message;
    
    // Check protocol compatibility
    const isCompatible = payload.protocolVersion === this.protocolVersion && 
                        payload.chainId === this.chainId;

    // Update connection info
    connInfo.protocolVersion = payload.protocolVersion;
    connInfo.isCompatible = isCompatible;
    connInfo.capabilities = payload.capabilities || [];
    connInfo.userAgent = payload.userAgent;

    console.log(`HELLO from ${connInfo.nodeId}: compatible=${isCompatible}, version=${payload.protocolVersion}`);

    // Send response
    const response = createHelloResponseMessage(
      this.id,
      this.chainId,
      this.latestBlockHash,
      this.latestBlockHeight,
      isCompatible,
      this.capabilities,
      this.userAgent,
      isCompatible ? undefined : 'Protocol version or chain ID mismatch'
    );

    connInfo.connection.send(response);

    if (!isCompatible) {
      console.warn(`Flagging peer ${connInfo.nodeId} as incompatible`);
      // Could disconnect here or keep connection for future compatibility
    }
  }

  /**
   * Handle HELLO_RESPONSE message - response to our handshake
   */
  private handleHelloResponseMessage(connInfo: ConnectionInfo, message: any): void {
    const { payload } = message;
    
    connInfo.protocolVersion = payload.protocolVersion;
    connInfo.isCompatible = payload.accepted;
    connInfo.capabilities = payload.capabilities || [];
    connInfo.userAgent = payload.userAgent;

    if (payload.accepted) {
      console.log(`Handshake successful with ${connInfo.nodeId}`);
    } else {
      console.warn(`Handshake rejected by ${connInfo.nodeId}: ${payload.reason}`);
    }
  }

  /**
   * Handle PING message
   */
  private handlePingMessage(connInfo: ConnectionInfo, message: any): void {
    const { payload } = message;
    const latency = Date.now() - payload.timestamp;
    
    const pongMessage = createPongMessage(payload.nonce, latency);
    connInfo.connection.send(pongMessage);
  }

  /**
   * Handle PONG message
   */
  private handlePongMessage(connInfo: ConnectionInfo, message: any): void {
    const { payload } = message;
    console.log(`PONG received from ${connInfo.nodeId}, latency: ${payload.latency}ms`);
    connInfo.lastPing = Date.now();
  }

  // Placeholder handlers for other message types
  private handleGetPeersMessage(connInfo: ConnectionInfo, message: any): void {
    console.log(`GET_PEERS from ${connInfo.nodeId} - not implemented yet`);
  }

  private handlePeersResponseMessage(connInfo: ConnectionInfo, message: any): void {
    console.log(`PEERS_RESPONSE from ${connInfo.nodeId} - not implemented yet`);
  }

  private handleGetChainStateMessage(connInfo: ConnectionInfo, message: any): void {
    console.log(`GET_CHAIN_STATE from ${connInfo.nodeId} - not implemented yet`);
  }

  private handleChainStateResponseMessage(connInfo: ConnectionInfo, message: any): void {
    console.log(`CHAIN_STATE_RESPONSE from ${connInfo.nodeId} - not implemented yet`);
  }

  private handleSendTxMessage(connInfo: ConnectionInfo, message: any): void {
    console.log(`SEND_TX from ${connInfo.nodeId} - not implemented yet`);
  }

  private handleTxBroadcastMessage(connInfo: ConnectionInfo, message: any): void {
    console.log(`TX_BROADCAST from ${connInfo.nodeId} - not implemented yet`);
  }

  private handleAnnounceCandidateBlockMessage(connInfo: ConnectionInfo, message: any): void {
    console.log(`ANNOUNCE_CANDIDATE_BLOCK from ${connInfo.nodeId}`);

    // If we are in the middle of building our own proposal and another peer announces one first
    // we follow "passive conflict resolution" – abandon our local proposal and switch to
    // validating the peer's candidate. For now we just clear the flag; consensus logic can pick
    // up the candidate through a subsequent BLOCK_PROPOSAL message.
    if (this.isProposingBlock) {
      console.info('Abandoning local block proposal due to competing candidate block');
      this.isProposingBlock = false;
    }

    // In a full implementation we would now request the full block or wait for a BLOCK_PROPOSAL
    // message. For the purposes of this phase we simply acknowledge the announcement.
  }

  private handleBlockProposalMessage(connInfo: ConnectionInfo, message: any): void {
    console.log(`BLOCK_PROPOSAL from ${connInfo.nodeId} - not implemented yet`);
  }

  private handleSendAttestationMessage(connInfo: ConnectionInfo, message: any): void {
    console.log(`SEND_ATTESTATION from ${connInfo.nodeId} - not implemented yet`);
  }

  private handleAttestationBroadcastMessage(connInfo: ConnectionInfo, message: any): void {
    console.log(`ATTESTATION_BROADCAST from ${connInfo.nodeId} - not implemented yet`);
  }

  private handleErrorMessage(connInfo: ConnectionInfo, message: any): void {
    console.error(`ERROR from ${connInfo.nodeId}:`, message.payload);
  }

  private handleDisconnectMessage(connInfo: ConnectionInfo, message: any): void {
    console.log(`DISCONNECT from ${connInfo.nodeId}: ${message.payload.reason}`);
    connInfo.connection.close();
  }

  /**
   * Broadcast a message to all active, compatible connections
   */
  public broadcast(message: P2PMessage): void {
    const compatibleConnections = Array.from(this.connections.values())
      .filter(conn => conn.isCompatible && conn.connection.open);

    console.log(`Broadcasting ${message.type} to ${compatibleConnections.length} peers`);

    for (const connInfo of compatibleConnections) {
      try {
        connInfo.connection.send(message);
      } catch (error) {
        console.error(`Failed to send message to ${connInfo.nodeId}:`, error);
        // Remove failed connection
        this.connections.delete(connInfo.nodeId);
      }
    }
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): {
    totalConnections: number;
    compatibleConnections: number;
    connections: Array<{
      nodeId: string;
      isCompatible: boolean;
      protocolVersion?: number;
      capabilities: string[];
      userAgent?: string;
    }>;
  } {
    const connections = Array.from(this.connections.values());
    return {
      totalConnections: connections.length,
      compatibleConnections: connections.filter(c => c.isCompatible).length,
      connections: connections.map(conn => ({
        nodeId: conn.nodeId,
        isCompatible: conn.isCompatible,
        protocolVersion: conn.protocolVersion,
        capabilities: conn.capabilities,
        userAgent: conn.userAgent
      }))
    };
  }

  /**
   * Stop the P2P node and close all connections
   */
  public async stop(): Promise<void> {
    console.log('Stopping P2P Node...');
    
    // Close all connections
    for (const connInfo of this.connections.values()) {
      try {
        connInfo.connection.close();
      } catch (error) {
        console.warn(`Error closing connection to ${connInfo.nodeId}:`, error);
      }
    }
    
    this.connections.clear();
    
    // Close peer connection
    if (!this.peer.destroyed) {
      this.peer.destroy();
    }
    
    this.isStarted = false;
    console.log('P2P Node stopped');
  }

  /**
   * Check if the node is started and ready
   */
  public isReady(): boolean {
    return this.isStarted && this.peer.open;
  }

  /**
   * Helper used by tests or higher-level consensus logic to mark the node as actively proposing
   * (or not proposing) a new block.
   */
  public setProposingBlock(isProposing: boolean): void {
    this.isProposingBlock = isProposing;
  }

  /**
   * Returns current proposal status (primarily for tests).
   */
  public currentlyProposing(): boolean {
    return this.isProposingBlock;
  }
}

// For backward compatibility with the existing interface
export {}; 