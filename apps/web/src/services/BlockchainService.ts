import {
  createChainDB,
  ChainDB,
  generateKeyPair,
  sign,
  hash,
  proposeBlock,
  type Transaction,
  type LessonProgressData,
  type Block,
  type PuzzleSolution,
  selectPuzzleForUser,
  type QuizQuestion,
  type Hash,
} from "@apstatchain/core";
import { P2PNode, createTxBroadcastMessage, createBlockProposalMessage, type P2PMessage } from "@apstatchain/p2p";
import type { LeaderboardEntry } from "../utils/leaderboard";

// ----------------------------------------------------------------------------
// Type Definitions
// ----------------------------------------------------------------------------

export type SyncStatus = "synced" | "syncing" | "disconnected";

export interface LessonProgressPayload extends LessonProgressData {}

interface ServiceState {
  syncStatus: SyncStatus;
  peerCount: number;
  leaderboardData: LeaderboardEntry[];
  isProposalRequired: boolean;
  /** Current mining puzzle, if the user is required to propose a block */
  puzzleData: QuizQuestion | null;
}

// ----------------------------------------------------------------------------
// BlockchainService (Singleton)
// ----------------------------------------------------------------------------

export class BlockchainService {
  private static _instance: BlockchainService | null = null;

  static getInstance(): BlockchainService {
    if (!BlockchainService._instance) {
      BlockchainService._instance = new BlockchainService();
    }
    return BlockchainService._instance;
  }

  // --------------------------------------------------------------------------
  // Private Members
  // --------------------------------------------------------------------------

  private db!: ChainDB;
  private p2pNode!: P2PNode;
  private keyPair!: { publicKey: string; privateKey: string };

  private eventTarget = new EventTarget();

  private state: ServiceState = {
    syncStatus: "disconnected",
    peerCount: 0,
    leaderboardData: [],
    isProposalRequired: false,
    puzzleData: null,
  };

  private pendingProofOfAccessHash?: Hash;

  private constructor() {
    // Private constructor enforces singleton

    // 👇 Expose the singleton instance in browser environments so E2E tests
    //    can control chain state without reaching into React internals.
    if (typeof window !== "undefined") {
      // Use a stable name to avoid clashes and allow Playwright to access it.
      (window as any).__APSTAT_CHAIN_SERVICE__ = this;
    }
  }

  // --------------------------------------------------------------------------
  // Public State Helpers
  // --------------------------------------------------------------------------

  /**
   * Subscribe to state updates. Returns an unsubscribe function.
   */
  subscribe(callback: (state: ServiceState) => void): () => void {
    const listener = (evt: Event) => callback((evt as CustomEvent<ServiceState>).detail);
    this.eventTarget.addEventListener("state", listener);
    // Immediately emit current state so subscriber has initial value
    callback(this.state);
    return () => this.eventTarget.removeEventListener("state", listener);
  }

  getState(): ServiceState {
    return { ...this.state };
  }

  // --------------------------------------------------------------------------
  // Public API Methods
  // --------------------------------------------------------------------------

  /**
   * Starts the database & P2P networking layer, and begins chain sync.
   */
  async start(): Promise<void> {
    if (this.state.syncStatus === "syncing" || this.state.syncStatus === "synced") {
      console.warn("BlockchainService already started");
      return;
    }

    try {
      this.updateState({ syncStatus: "syncing" });

      // 1. Load key pair (or generate)
      await this.loadOrCreateKeyPair();

      // 2. Initialise database
      this.db = await createChainDB();
      console.info("✅ ChainDB initialised");

      // 3. Initialise P2P Node
      this.p2pNode = new P2PNode(this.keyPair.publicKey);
      // Hook into peer connection events to update peer count
      (this.p2pNode as any).peer.on("connection", () => this.refreshPeerCount());
      (this.p2pNode as any).peer.on("close", () => this.refreshPeerCount());

      await this.p2pNode.start();

      this.refreshPeerCount();
      this.updateState({ syncStatus: "synced" });

      console.info("🚀 BlockchainService started");
    } catch (err) {
      console.error("Failed to start BlockchainService", err);
      this.updateState({ syncStatus: "disconnected" });
      throw err; // surface
    }
  }

  /**
   * Creates, signs and broadcasts a LESSON_PROGRESS transaction.
   */
  async submitLessonProgress(payload: LessonProgressPayload): Promise<void> {
    // Build base transaction
    const baseTx = {
      type: "LESSON_PROGRESS" as const,
      data: payload,
      publicKey: this.keyPair.publicKey,
      timestamp: Date.now(),
      priority: "normal" as const,
    };

    const id = hash(baseTx);
    const signature = sign({ ...baseTx, id }, this.keyPair.privateKey);

    const tx: Transaction = {
      id,
      ...baseTx,
      signature,
    } as Transaction;

    // Add to local mempool
    await this.db.addToMempool(tx);

    // Broadcast to peers
    const broadcastMsg = createTxBroadcastMessage(tx, this.keyPair.publicKey);
    this.p2pNode.broadcast(broadcastMsg as P2PMessage);

    console.info("📤 Lesson progress transaction broadcasted", tx);

    // After successfully submitting progress, check if a puzzle can be offered.
    await this.selectPuzzleIfNeeded();
  }

  /**
   * Proposes a new block using current mempool and broadcasts to peers.
   */
  async proposeNewBlock(puzzleSolution: PuzzleSolution): Promise<Block> {
    // Gather transactions
    const transactions = await this.db.getTransactionsFromMempool(1000);

    const prevBlock = (await this.db.getLatestBlock()) ?? (await this.createGenesisBlock());

    // Use stored proofOfAccessHash if available, otherwise stub
    const proofOfAccessHash = this.pendingProofOfAccessHash ?? hash("proof-placeholder");

    const newBlock = proposeBlock(transactions, prevBlock, puzzleSolution, proofOfAccessHash);

    // Store block locally
    await this.db.addBlock(newBlock);

    // Clear mempool for included transactions
    for (const tx of transactions) {
      await this.db.removeFromMempool(tx.id);
    }

    // Broadcast block proposal (simplified – using TX_BROADCAST for demo)
    const proposalMsg = createBlockProposalMessage(
      newBlock,
      this.keyPair.publicKey,
      sign(hash(newBlock), this.keyPair.privateKey),
      hash("puzzle-placeholder"),
      puzzleSolution,
      proofOfAccessHash,
    );

    this.p2pNode.broadcast(proposalMsg as unknown as P2PMessage);

    console.info("⛏️ New block proposed", newBlock);

    // Refresh leaderboard (placeholder)
    await this.recalculateLeaderboard();

    // Clear pending puzzle state
    this.pendingProofOfAccessHash = undefined;
    this.updateState({ isProposalRequired: false, puzzleData: null });

    return newBlock;
  }

  /**
   * Public wrapper to submit puzzle solution and mine a block.
   */
  async submitPuzzleSolution(solution: PuzzleSolution): Promise<void> {
    await this.proposeNewBlock(solution);
  }

  // --------------------------------------------------------------------------
  // Internal Helpers
  // --------------------------------------------------------------------------

  private async loadOrCreateKeyPair(): Promise<void> {
    const storedPrivate = localStorage.getItem("apstat_private_key");

    if (storedPrivate) {
      // Derive public key
      const keyPair = generateKeyPair(); // temp
      // Overwrite generated private key with stored one, keep derived public.
      keyPair.privateKey = storedPrivate;
      this.keyPair = {
        privateKey: storedPrivate,
        publicKey: keyPair.publicKey,
      };
    } else {
      this.keyPair = generateKeyPair();
      localStorage.setItem("apstat_private_key", this.keyPair.privateKey);
      console.info("🔑 Generated new key pair for user");
    }
  }

  private refreshPeerCount(): void {
    try {
      // Access internal map size (not officially public API)
      const count = (this.p2pNode as any).connections?.size ?? 0;
      this.updateState({ peerCount: count });
    } catch {
      /* ignore */
    }
  }

  private updateState(partial: Partial<ServiceState>): void {
    this.state = { ...this.state, ...partial };
    this.eventTarget.dispatchEvent(new CustomEvent<ServiceState>("state", { detail: this.state }));
  }

  private async recalculateLeaderboard(): Promise<void> {
    // Placeholder implementation – calculate based on blocks in DB
    // For now, we keep mock implementation
    const leaderboard: LeaderboardEntry[] = [
      {
        rank: 1,
        username: "You",
        completed_videos: 0,
        completed_quizzes: 0,
        total_completed: 0,
      },
    ];
    this.updateState({ leaderboardData: leaderboard });
  }

  private async createGenesisBlock(): Promise<Block> {
    const genesis: Block = {
      header: {
        version: 1,
        previousHash: "0".repeat(64),
        merkleRoot: hash(""),
        timestamp: Date.now(),
        nonce: 0,
        proofOfAccessHash: "0".repeat(64),
        difficulty: 1,
        height: 0,
        hash: "1".repeat(64),
      },
      transactions: [],
      attestations: [],
    } as Block;

    await this.db.addBlock(genesis);
    return genesis;
  }

  /**
   * Select a mining puzzle for the current user if conditions allow.
   * Sets state.isProposalRequired and puzzleData when a puzzle is available.
   */
  private async selectPuzzleIfNeeded(): Promise<void> {
    if (this.state.isProposalRequired) return; // Already have a puzzle pending
    if (!this.db) return; // DB not initialised yet

    try {
      const result = await selectPuzzleForUser(this.keyPair.publicKey, this.db);
      if (result) {
        const { puzzle, proofOfAccessHash } = result;
        this.pendingProofOfAccessHash = proofOfAccessHash;
        this.updateState({ isProposalRequired: true, puzzleData: puzzle });
      }
    } catch (err) {
      console.error("Failed to select puzzle", err);
    }
  }
} 