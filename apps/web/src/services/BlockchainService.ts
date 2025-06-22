import {
  createChainDB,
  ChainDB,
  generateKeyPair,
  sign,
  hash,
  proposeBlock,
  recomputeState,
  saveAppState,
  loadAppState,
  selectPuzzleForUser,
  isTransactionValid,
  isBlockValid,
} from "@apstatchain/core";

import type {
  Transaction,
  LessonProgressData,
  Block,
  PuzzleSolution,
  QuizQuestion,
  Hash,
  AppState,
  BookmarkState,
  PaceState,
  LeaderboardEntry as ProjectedLeaderboardEntry,
  TransactionType,
  TransactionData,
} from "@apstatchain/core";
import { P2PNode, createTxBroadcastMessage, createBlockProposalMessage, type P2PMessage } from "@apstatchain/p2p";
import type { LeaderboardEntry as UiLeaderboardEntry } from "../utils/leaderboard";

// ----------------------------------------------------------------------------
// Type Definitions
// ----------------------------------------------------------------------------

export type SyncStatus = "synced" | "syncing" | "disconnected";

export interface LessonProgressPayload extends LessonProgressData {}

interface ServiceState {
  syncStatus: SyncStatus;
  peerCount: number;
  leaderboardData: UiLeaderboardEntry[];
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

  /**
   * Internal UI-oriented state used for connection / sync feedback.
   * This is kept separate from the immutable projected AppState above.
   */
  private _uiState: ServiceState = {
    syncStatus: "disconnected",
    peerCount: 0,
    leaderboardData: [],
    isProposalRequired: false,
    puzzleData: null,
  };

  private pendingProofOfAccessHash?: Hash;

  /** In-memory mempool mirror for quick size checks (primary storage is ChainDB). */
  private mempool: Transaction[] = [];

  // ------------------------------------------------------------------------
  // Public, in-memory projection of the entire application state.
  // ------------------------------------------------------------------------

  public state: AppState = {
    users: {},
    bookmarks: {},
    pace: {},
    starCounts: {},
    lessonProgress: {},
    leaderboard: [],
  };

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
    callback(this._uiState);
    return () => this.eventTarget.removeEventListener("state", listener);
  }

  getState(): ServiceState {
    return { ...this._uiState };
  }

  // --------------------------------------------------------------------------
  // Public API Methods
  // --------------------------------------------------------------------------

  /**
   * Starts the database & P2P networking layer, and begins chain sync.
   */
  async start(): Promise<void> {
    if (this._uiState.syncStatus === "syncing" || this._uiState.syncStatus === "synced") {
      console.warn("BlockchainService already started");
      return;
    }

    try {
      this.updateUiState({ syncStatus: "syncing" });

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
      this.updateUiState({ syncStatus: "synced" });

      console.info("🚀 BlockchainService started");

      // ------------------------------------------------------------------
      // Subscribe to P2P events
      // ------------------------------------------------------------------

      this.p2pNode.on("transaction:received", (tx: Transaction) => {
        void this.handleReceivedTransaction(tx);
      });

      this.p2pNode.on("block:received", (blk: Block) => {
        void this.handleReceivedBlock(blk);
      });
    } catch (err) {
      console.error("Failed to start BlockchainService", err);
      this.updateUiState({ syncStatus: "disconnected" });
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

    // Add to local mempool (DB + in-memory mirror)
    await this.db.addToMempool(tx);
    this.mempool.push(tx);

    // Broadcast to peers
    const broadcastMsg = createTxBroadcastMessage(tx, this.keyPair.publicKey);
    this.p2pNode.broadcast(broadcastMsg as P2PMessage);

    console.info("📤 Transaction broadcasted", tx);

    // After successfully submitting progress, check if a puzzle can be offered.
    await this.attemptToProposeBlock();
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
    this.updateUiState({ isProposalRequired: false, puzzleData: null });

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
      this.updateUiState({ peerCount: count });
    } catch {
      /* ignore */
    }
  }

  private updateUiState(partial: Partial<ServiceState>): void {
    this._uiState = { ...this._uiState, ...partial };
    this.eventTarget.dispatchEvent(new CustomEvent<ServiceState>("state", { detail: this._uiState }));
  }

  private async recalculateLeaderboard(): Promise<void> {
    // Placeholder implementation – calculate based on blocks in DB
    // For now, we keep mock implementation
    const leaderboard: UiLeaderboardEntry[] = [
      {
        rank: 1,
        username: "You",
        completed_videos: 0,
        completed_quizzes: 0,
        total_completed: 0,
      },
    ];
    this.updateUiState({ leaderboardData: leaderboard });
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
    if (this._uiState.isProposalRequired) return; // Already have a puzzle pending
    if (!this.db) return; // DB not initialised yet

    try {
      const result = await selectPuzzleForUser(this.keyPair.publicKey, this.db);
      if (result) {
        const { puzzle, proofOfAccessHash } = result;
        this.pendingProofOfAccessHash = proofOfAccessHash;
        this.updateUiState({ isProposalRequired: true, puzzleData: puzzle });
      }
    } catch (err) {
      console.error("Failed to select puzzle", err);
    }
  }

  // --------------------------------------------------------------------------
  // Phase-2  – Initialisation & State Projection
  // --------------------------------------------------------------------------

  /**
   * Initialise the service: starts networking, loads blocks and projects state.
   * This should be called once when the application boots.
   */
  public async initialize(): Promise<void> {
    // Ensure lower-level networking/DB is running
    await this.start();

    // 1) Load cached state if it exists
    const cached = await loadAppState();

    // 2) Always load blocks from DB (fast)
    const blockEntries = await this.db.blocks.orderBy("height").toArray();
    const blocks = blockEntries.map((be) => be.block);

    // 3) Decide whether to recompute – naive strategy: if no cached state, recompute.
    let latestState: AppState;
    if (!cached) {
      latestState = recomputeState(blocks);
      await saveAppState(latestState);
    } else {
      latestState = cached;
      // TODO: enhancement – compare timestamps / heights for staleness
    }

    // 4) Store in-memory copy for ultra-fast reads
    this.state = latestState;

    // 5) Notify subscribers via UI state update so React can re-render
    this.updateUiState({});
  }

  // --------------------------------------------------------------------------
  // Convenience read helpers (pure, sync)
  // --------------------------------------------------------------------------

  getLeaderboard(): ProjectedLeaderboardEntry[] {
    return this.state.leaderboard;
  }

  getBookmarksForUser(publicKey: string): Record<string, BookmarkState> {
    return this.state.bookmarks[publicKey] ?? {};
  }

  getPaceForUser(publicKey: string): PaceState | undefined {
    return this.state.pace[publicKey];
  }

  // --------------------------------------------------------------------------
  // Generic transaction submission helper (Phase-2 stub)
  // --------------------------------------------------------------------------

  async submitTransaction(type: TransactionType, data: TransactionData): Promise<void> {
    // Build unsigned transaction
    const baseTx = {
      type,
      data,
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

    // Add to local mempool (DB + in-memory mirror)
    await this.db.addToMempool(tx);
    this.mempool.push(tx);

    // Broadcast to peers
    const broadcastMsg = createTxBroadcastMessage(tx, this.keyPair.publicKey);
    this.p2pNode.broadcast(broadcastMsg as P2PMessage);

    console.info("📤 Transaction broadcasted", tx);

    // Check if conditions met for proposing block
    await this.attemptToProposeBlock();
  }

  // --------------------------------------------------------------------------
  // Phase-3 – Network Event Handlers
  // --------------------------------------------------------------------------

  /** Handle an incoming transaction from the P2P network. */
  private async handleReceivedTransaction(tx: Transaction): Promise<void> {
    try {
      if (!isTransactionValid(tx)) {
        console.warn("⚠️  Invalid transaction received – ignoring");
        return;
      }

      // Deduplication – skip if already in DB
      const exists = await this.db.mempool.where("hash").equals(tx.id).count();
      if (exists > 0) {
        return; // Already seen
      }

      await this.db.addToMempool(tx);
      this.mempool.push(tx);

      console.info("📥 Transaction accepted from network", tx.id);

      await this.attemptToProposeBlock();
    } catch (err) {
      console.error("Failed to handle incoming transaction", err);
    }
  }

  /** Handle an incoming block from the P2P network. */
  private async handleReceivedBlock(block: Block): Promise<void> {
    try {
      if (!(await isBlockValid(block, this.db))) {
        console.warn("⚠️  Invalid block received – ignoring");
        return;
      }

      // Check for duplicates
      const existing = await this.db.getBlockByHash(block.header.hash as string);
      if (existing) return;

      await this.db.addBlock(block);

      // Remove included txs from mempool/db mirror
      for (const tx of block.transactions) {
        await this.db.removeFromMempool(tx.id);
        this.mempool = this.mempool.filter((t) => t.id !== tx.id);
      }

      // Recompute application state
      const allBlocks = (await this.db.blocks.orderBy("height").toArray()).map((be) => be.block);
      this.state = recomputeState(allBlocks);
      await saveAppState(this.state);

      await this.recalculateLeaderboard();

      // Clear puzzle flag if we're no longer the highest proposer
      this.updateUiState({});
    } catch (err) {
      console.error("Failed to handle incoming block", err);
    }
  }

  /** Attempt to trigger puzzle selection / block proposal based on mempool size. */
  private async attemptToProposeBlock(): Promise<void> {
    try {
      const mempoolCount = this.mempool.length;
      if (mempoolCount >= 10) {
        await this.selectPuzzleIfNeeded();
      }
    } catch (err) {
      console.error("Error during proposal check", err);
    }
  }

  /** Callback invoked by UI when user answers mining puzzle. */
  public async handlePuzzleSolution(solution: any): Promise<void> {
    await this.submitPuzzleSolution(solution);
  }
} 