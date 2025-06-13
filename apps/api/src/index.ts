import express, { Request, Response, NextFunction } from "express";
import { Pool, Client } from "pg";
import cors from "cors";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import {
  User,
  Progress,
  Bookmark,
  SyncProgressRequest,
  LeaderboardEntry,
} from "./types";
import { appLogger, requestLogger, Logger as WinstonLogger } from "./logger";
import {
  observabilityMiddleware,
  healthCheckHandler,
  metricsHandler,
  errorHandler,
  setupProcessErrorHandlers,
  logStartupInfo,
} from "./observability";
import MigrationRunner from "./migrations/migrationRunner";

// Types
interface GoldStar {
  id: number;
  user_id: number;
  total_stars: number;
  current_streak: number;
  last_lesson_time?: Date;
  last_target_hours?: number;
  updated_at: Date;
}

interface ExtendedRequest extends Request {
  requestId?: string;
  logger?: WinstonLogger;
}

interface CustomSocket extends Socket {
  username?: string;
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const port = parseInt(process.env.PORT || "3000", 10);

// Add Winston request logger middleware
app.use(requestLogger);

// Add observability middleware for metrics and enhanced monitoring
app.use(observabilityMiddleware);

// Database connections
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Dedicated listener connection for PostgreSQL LISTEN/NOTIFY
let notificationListener: Pool | null = null;

// Track connected users for real-time updates
const connectedUsers = new Map<string, Set<string>>(); // username -> Set of socket.ids

// Initialize PostgreSQL notification listener
async function initializeNotificationListener(): Promise<void> {
  try {
    notificationListener = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
      max: 1, // Single dedicated connection for notifications
    });

    const client = await notificationListener.connect();

    // Listen for progress, bookmark, and leaderboard updates
    await client.query("LISTEN progress_updates");
    await client.query("LISTEN bookmark_updates");
    await client.query("LISTEN user_activity");
    await client.query("LISTEN leaderboard_updates");

    client.on("notification", (msg) => {
      try {
        if (!msg.payload) return;
        const data = JSON.parse(msg.payload);
        appLogger.info(`Real-time notification received`, {
          channel: msg.channel,
          data: data,
        });

        // Broadcast to user's connected devices
        broadcastToUser(data.username, {
          type: msg.channel,
          data: data,
        });
      } catch (error) {
        appLogger.error(
          "Error processing notification",
          { error },
          error instanceof Error ? error : undefined,
        );
      }
    });

    appLogger.info("PostgreSQL notification listener initialized successfully");
  } catch (error) {
    appLogger.error(
      "Failed to initialize notification listener",
      { error },
      error instanceof Error ? error : undefined,
    );
  }
}

// Broadcast message to all of a user's connected devices
function broadcastToUser(username: string, message: any): void {
  const userSockets = connectedUsers.get(username);
  if (userSockets && userSockets.size > 0) {
    userSockets.forEach((socketId) => {
      io.to(socketId).emit("realtime_update", message);
    });
    appLogger.debug("Broadcasted message to user devices", {
      username,
      deviceCount: userSockets.size,
      messageType: message.type,
    });
  }
}

// WebSocket connection handling
io.on("connection", (socket: CustomSocket) => {
  appLogger.info("WebSocket client connected", { socketId: socket.id });

  // User joins with their username
  socket.on("join", ({ username }: { username: string }) => {
    if (!username) return;

    // Track this socket for the user
    if (!connectedUsers.has(username)) {
      connectedUsers.set(username, new Set());
    }
    connectedUsers.get(username)!.add(socket.id);

    // Store username on socket for cleanup
    socket.username = username;

    appLogger.info("User connected via WebSocket", {
      username,
      socketId: socket.id,
      deviceCount: connectedUsers.get(username)!.size,
    });

    // Notify other devices that a new device connected
    broadcastToUser(username, {
      type: "device_connected",
      data: {
        socketId: socket.id,
        deviceCount: connectedUsers.get(username)!.size,
      },
    });
  });

  // Handle user activity (opening lessons, etc.)
  socket.on("user_activity", async (activity: any) => {
    if (!socket.username) return;

    try {
      // Notify PostgreSQL about user activity
      const activityPayload = JSON.stringify({
        username: socket.username,
        activity: activity,
        timestamp: new Date().toISOString(),
      });
      await pool.query(`NOTIFY user_activity, $1`, [activityPayload]);
    } catch (error) {
      appLogger.error(
        "Error notifying user activity",
        {
          username: socket.username,
          activity,
          error,
        },
        error instanceof Error ? error : undefined,
      );
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    if (socket.username) {
      const userSockets = connectedUsers.get(socket.username);
      if (userSockets) {
        userSockets.delete(socket.id);

        if (userSockets.size === 0) {
          connectedUsers.delete(socket.username);
        } else {
          // Notify remaining devices
          broadcastToUser(socket.username, {
            type: "device_disconnected",
            data: {
              socketId: socket.id,
              deviceCount: userSockets.size,
            },
          });
        }
      }
      appLogger.info("User WebSocket disconnected", {
        username: socket.username,
        socketId: socket.id,
        remainingDevices: userSockets ? userSockets.size : 0,
      });
    }
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage fallback when database is not available
const inMemoryUsers = new Map<string, User>();
let nextUserId = 1;
const inMemoryProgress = new Map<number, Progress[]>();
const inMemoryBookmarks = new Map<number, Bookmark[]>();

// Set up process-level error handlers for better observability
setupProcessErrorHandlers();

// Observability endpoints
app.get("/health", healthCheckHandler);
app.get("/metrics", metricsHandler);

// Username generation lists
const adjectives = [
  "happy",
  "cheerful",
  "wise",
  "brave",
  "calm",
  "bright",
  "clever",
  "gentle",
  "swift",
  "kind",
  "bold",
  "quick",
  "smart",
  "cool",
  "warm",
  "sunny",
];

const animals = [
  "otter",
  "panda",
  "fox",
  "owl",
  "cat",
  "dog",
  "bear",
  "wolf",
  "hawk",
  "deer",
  "rabbit",
  "turtle",
  "dolphin",
  "seal",
  "penguin",
  "koala",
];

const plants = [
  "oak",
  "maple",
  "willow",
  "cedar",
  "pine",
  "sage",
  "fern",
  "moss",
  "ivy",
  "rose",
  "lily",
  "iris",
  "mint",
  "basil",
  "lavender",
  "bamboo",
];

function generateUsername(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const nature =
    Math.random() < 0.5
      ? animals[Math.floor(Math.random() * animals.length)]
      : plants[Math.floor(Math.random() * plants.length)];
  const number = Math.floor(Math.random() * 100);
  return `${adjective}${nature}${number}`;
}

// API Routes

// Generate username
app.get("/api/generate-username", (req: Request, res: Response) => {
  const username = generateUsername();
  res.json({ username });
});

// Get or create user
app.post(
  "/api/users/get-or-create",
  async (req: ExtendedRequest, res: Response) => {
    try {
      const { username } = req.body;

      if (!username || typeof username !== "string") {
        return res.status(400).json({ error: "Valid username is required" });
      }

      let user: User;

      try {
        // Try to use database first
        let result = await pool.query(
          "SELECT * FROM users WHERE username = $1",
          [username],
        );

        if (result.rows.length === 0) {
          // Create new user
          result = await pool.query(
            "INSERT INTO users (username) VALUES ($1) RETURNING *",
            [username],
          );
          req.logger?.info("Created new user in database", { username });
        } else {
          req.logger?.info("Found existing user in database", { username });
        }

        user = result.rows[0];
      } catch (dbError) {
        // Fallback to in-memory storage if database is not available
        req.logger?.warn("Database unavailable, using in-memory storage", {
          username,
        });

        // Check if user exists in memory
        if (inMemoryUsers.has(username)) {
          user = inMemoryUsers.get(username)!;
          req.logger?.info("Found existing user in memory", { username });
        } else {
          // Create new user in memory
          user = {
            id: nextUserId++,
            username: username,
            created_at: new Date(),
            last_sync: new Date(),
          };
          inMemoryUsers.set(username, user);
          req.logger?.info("Created new user in memory", { username });
        }
      }

      res.json({ user });
    } catch (error) {
      req.logger?.error("Error in get-or-create user", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Get user progress
app.get(
  "/api/users/:userId/progress",
  async (req: ExtendedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      let progress: Progress[] = [];

      try {
        // Try to use database first
        const result = await pool.query(
          "SELECT * FROM progress WHERE user_id = $1",
          [userId],
        );
        progress = result.rows;
      } catch (dbError) {
        req.logger?.warn("Database unavailable, getting progress from memory", {
          userId,
        });
        progress = inMemoryProgress.get(parseInt(userId, 10)) || [];
      }

      res.json(progress); // Return the progress data directly as array
    } catch (error) {
      req.logger?.error("Error getting progress:", {
        error,
        userId: req.params.userId,
      });
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Sync progress with real-time notifications
app.post(
  "/api/users/:userId/progress/sync",
  async (req: ExtendedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const {
        lesson_id,
        video_index,
        quiz_index,
        completed_at,
        lesson_completed,
      } = req.body;
      const { completion_date } = req.body; // legacy param
      const completedAtIso = completed_at || completion_date;

      if (!lesson_id) {
        return res.status(400).json({ error: "lesson_id is required" });
      }

      if (
        video_index === undefined &&
        quiz_index === undefined &&
        lesson_completed === undefined
      ) {
        return res.status(400).json({
          error:
            "Either video_index, quiz_index, or lesson_completed must be provided",
        });
      }

      const userIdNum = parseInt(userId, 10);

      // ---------------------------
      // Database first strategy
      // ---------------------------
      try {
        // Fetch existing row (if any)
        const selectResult = await pool.query(
          "SELECT videos_watched, quizzes_completed FROM progress WHERE user_id = $1 AND lesson_id = $2",
          [userIdNum, lesson_id],
        );

        let videosWatched: number[] =
          selectResult.rows[0]?.videos_watched || [];
        let quizzesCompleted: number[] =
          selectResult.rows[0]?.quizzes_completed || [];

        if (
          typeof video_index === "number" &&
          !videosWatched.includes(video_index)
        ) {
          videosWatched.push(video_index);
        }

        if (
          typeof quiz_index === "number" &&
          !quizzesCompleted.includes(quiz_index)
        ) {
          quizzesCompleted.push(quiz_index);
        }

        // Upsert logic
        await pool.query(
          `INSERT INTO progress (user_id, lesson_id, videos_watched, quizzes_completed, completed_at, lesson_completed)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (user_id, lesson_id)
                 DO UPDATE SET videos_watched = EXCLUDED.videos_watched, quizzes_completed = EXCLUDED.quizzes_completed, lesson_completed = COALESCE(EXCLUDED.lesson_completed, progress.lesson_completed), completed_at = COALESCE(EXCLUDED.completed_at, progress.completed_at), updated_at = NOW()`,
          [
            userIdNum,
            lesson_id,
            videosWatched,
            quizzesCompleted,
            completedAtIso ? new Date(completedAtIso) : null,
            lesson_completed,
          ],
        );
      } catch (dbError) {
        // ---------------------------
        // Fallback to in-memory
        // ---------------------------
        req.logger?.warn("Database unavailable, syncing progress to memory", {
          userId,
        });
        let userProgress = inMemoryProgress.get(userIdNum) || [];

        const existing = userProgress.find((p) => p.lesson_id === lesson_id);

        if (existing) {
          if (
            typeof video_index === "number" &&
            !existing.videos_watched.includes(video_index)
          ) {
            existing.videos_watched.push(video_index);
          }
          if (
            typeof quiz_index === "number" &&
            !existing.quizzes_completed.includes(quiz_index)
          ) {
            existing.quizzes_completed.push(quiz_index);
          }
          if (lesson_completed !== undefined) {
            existing.lesson_completed = lesson_completed;
          }
          existing.updated_at = new Date();
        } else {
          userProgress.push({
            id: Date.now(), // temp id for in-memory
            user_id: userIdNum,
            lesson_id,
            videos_watched:
              typeof video_index === "number" ? [video_index] : [],
            quizzes_completed:
              typeof quiz_index === "number" ? [quiz_index] : [],
            lesson_completed: lesson_completed ?? false,
            completed_at: completedAtIso ? new Date(completedAtIso) : undefined,
            updated_at: new Date(),
          } as Progress);
        }

        inMemoryProgress.set(userIdNum, userProgress);
      }

      // For response, try DB first then memory
      let latestProgress: Progress[] = [];
      try {
        const result = await pool.query(
          "SELECT * FROM progress WHERE user_id = $1",
          [userIdNum],
        );
        latestProgress = result.rows;
      } catch {
        latestProgress = inMemoryProgress.get(userIdNum) || [];
      }

      res.json({ success: true, progress: latestProgress });
    } catch (error) {
      req.logger?.error("Error syncing progress:", {
        error,
        userId: req.params.userId,
      });
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// NEW: Unified progress update endpoint
app.post(
  "/api/users/:userId/progress/update",
  async (req: ExtendedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { lesson_id, item_type, item_index, completed } = req.body;

      if (!lesson_id) {
        return res.status(400).json({ error: "lesson_id is required" });
      }

      if (!["video", "quiz", "blooket", "origami"].includes(item_type)) {
        return res.status(400).json({
          error: "item_type must be video, quiz, blooket, or origami",
        });
      }

      if (
        (item_type === "video" || item_type === "quiz") &&
        typeof item_index !== "number"
      ) {
        return res
          .status(400)
          .json({ error: "item_index is required for video and quiz items" });
      }

      if (typeof completed !== "boolean") {
        return res.status(400).json({ error: "completed must be a boolean" });
      }

      const userIdNum = parseInt(userId, 10);

      // Helper function to update progress arrays/fields
      const updateProgress = (current: any) => {
        const updated = {
          videos_watched: current?.videos_watched || [],
          quizzes_completed: current?.quizzes_completed || [],
          blooket_completed: current?.blooket_completed || false,
          origami_completed: current?.origami_completed || false,
        };

        switch (item_type) {
          case "video":
            if (completed && !updated.videos_watched.includes(item_index)) {
              updated.videos_watched.push(item_index);
            } else if (!completed) {
              updated.videos_watched = updated.videos_watched.filter(
                (i: number) => i !== item_index,
              );
            }
            break;
          case "quiz":
            if (completed && !updated.quizzes_completed.includes(item_index)) {
              updated.quizzes_completed.push(item_index);
            } else if (!completed) {
              updated.quizzes_completed = updated.quizzes_completed.filter(
                (i: number) => i !== item_index,
              );
            }
            break;
          case "blooket":
            updated.blooket_completed = completed;
            break;
          case "origami":
            updated.origami_completed = completed;
            break;
        }

        return updated;
      };

      // Database first strategy
      try {
        const selectResult = await pool.query(
          "SELECT videos_watched, quizzes_completed, blooket_completed, origami_completed FROM progress WHERE user_id = $1 AND lesson_id = $2",
          [userIdNum, lesson_id],
        );

        const current = selectResult.rows[0];
        const updated = updateProgress(current);

        await pool.query(
          `INSERT INTO progress (user_id, lesson_id, videos_watched, quizzes_completed, blooket_completed, origami_completed, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())
                 ON CONFLICT (user_id, lesson_id)
                 DO UPDATE SET 
                   videos_watched = EXCLUDED.videos_watched, 
                   quizzes_completed = EXCLUDED.quizzes_completed,
                   blooket_completed = EXCLUDED.blooket_completed,
                   origami_completed = EXCLUDED.origami_completed,
                   updated_at = NOW()`,
          [
            userIdNum,
            lesson_id,
            updated.videos_watched,
            updated.quizzes_completed,
            updated.blooket_completed,
            updated.origami_completed,
          ],
        );

        req.logger?.info("Progress updated successfully", {
          userId,
          lesson_id,
          item_type,
          item_index,
          completed,
        });

        res.json({
          success: true,
          lesson_progress: {
            lesson_id,
            ...updated,
          },
        });
      } catch (dbError) {
        // Fallback to in-memory
        req.logger?.warn("Database unavailable, updating progress in memory", {
          userId,
        });
        let userProgress = inMemoryProgress.get(userIdNum) || [];

        const existing = userProgress.find((p) => p.lesson_id === lesson_id);
        const updated = updateProgress(existing);

        if (existing) {
          Object.assign(existing, updated);
          existing.updated_at = new Date();
        } else {
          userProgress.push({
            id: Date.now(),
            user_id: userIdNum,
            lesson_id,
            ...updated,
            lesson_completed: false, // Keep for compatibility
            updated_at: new Date(),
          } as Progress);
        }

        inMemoryProgress.set(userIdNum, userProgress);

        res.json({
          success: true,
          lesson_progress: {
            lesson_id,
            ...updated,
          },
        });
      }
    } catch (error) {
      req.logger?.error("Error updating progress:", {
        error,
        userId: req.params.userId,
      });
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Get bookmarks
app.get(
  "/api/users/:userId/bookmarks",
  async (req: ExtendedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      let bookmarks: Bookmark[] = [];

      try {
        const result = await pool.query(
          "SELECT * FROM bookmarks WHERE user_id = $1",
          [userId],
        );
        bookmarks = result.rows;
      } catch (dbError) {
        req.logger?.warn(
          "Database unavailable, getting bookmarks from memory",
          { userId },
        );
        bookmarks = inMemoryBookmarks.get(parseInt(userId, 10)) || [];
      }

      res.json({ bookmarks });
    } catch (error) {
      req.logger?.error("Error getting bookmarks:", {
        error,
        userId: req.params.userId,
      });
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Sync bookmarks
app.post(
  "/api/users/:userId/bookmarks/sync",
  async (req: ExtendedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { bookmarks } = req.body; // Expects an array from the client
      const userIdNum = parseInt(userId, 10);

      try {
        const client = await pool.connect();
        await client.query("BEGIN");
        await client.query("DELETE FROM bookmarks WHERE user_id = $1", [
          userIdNum,
        ]);
        if (bookmarks && bookmarks.length > 0) {
          for (const bookmark of bookmarks) {
            await client.query(
              `INSERT INTO bookmarks (user_id, bookmark_type, lesson_id, item_index, item_type, item_title)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                userId,
                bookmark.bookmark_type,
                bookmark.lesson_id,
                bookmark.item_index,
                bookmark.item_type,
                bookmark.item_title,
              ],
            );
          }
        }
        await client.query("COMMIT");
        client.release();
      } catch (dbError) {
        req.logger?.warn("Database unavailable, syncing bookmarks to memory", {
          userId,
        });
        inMemoryBookmarks.set(userIdNum, bookmarks || []);
      }

      res.json({
        success: true,
        bookmarks: inMemoryBookmarks.get(userIdNum) || [],
      });
    } catch (error) {
      req.logger?.error("Error syncing bookmarks:", {
        error,
        userId: req.params.userId,
      });
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    connectedUsers: connectedUsers.size,
    totalConnections: Array.from(connectedUsers.values()).reduce(
      (sum, sockets) => sum + sockets.size,
      0,
    ),
  });
});

// Real-time status endpoint
app.get("/api/realtime/status", (req: Request, res: Response) => {
  const userStats: { [key: string]: number } = {};
  connectedUsers.forEach((sockets, username) => {
    userStats[username] = sockets.size;
  });

  res.json({
    connectedUsers: connectedUsers.size,
    totalConnections: Array.from(connectedUsers.values()).reduce(
      (sum, sockets) => sum + sockets.size,
      0,
    ),
    userStats,
  });
});

// GET /api/leaderboard - Get top users by progress
app.get("/api/leaderboard", async (req: ExtendedRequest, res: Response) => {
  try {
    let leaderboard: LeaderboardEntry[] = [];

    // Database first strategy
    try {
      const query = `
              SELECT
                  u.username,
                  SUM(COALESCE(array_length(p.videos_watched, 1), 0)) as completed_videos,
                  SUM(COALESCE(array_length(p.quizzes_completed, 1), 0)) as completed_quizzes,
                  (SUM(COALESCE(array_length(p.videos_watched, 1), 0)) + SUM(COALESCE(array_length(p.quizzes_completed, 1), 0))) as total_completed
              FROM
                  progress p
              JOIN
                  users u ON p.user_id = u.id
              GROUP BY
                  u.id, u.username
              ORDER BY
                  total_completed DESC,
                  u.username ASC
              LIMIT 20;
          `;
      const result = await pool.query(query);

      leaderboard = result.rows.map((row, index) => ({
        rank: index + 1,
        username: row.username,
        completed_videos: parseInt(row.completed_videos, 10),
        completed_quizzes: parseInt(row.completed_quizzes, 10),
        total_completed: parseInt(row.total_completed, 10),
      }));
    } catch (dbError) {
      req.logger?.warn(
        "Database unavailable, building leaderboard from memory",
        { dbError },
      );
      // --- START OF CORRECTED FALLBACK LOGIC ---
      const userScores: Map<
        number,
        { username: string; videos: number; quizzes: number }
      > = new Map();

      // Step 1: Aggregate scores for each userId from the progress map
      for (const [userId, progresses] of inMemoryProgress.entries()) {
        let currentScore = userScores.get(userId) || {
          username: "",
          videos: 0,
          quizzes: 0,
        };
        for (const p of progresses) {
          currentScore.videos += p.videos_watched?.length || 0;
          currentScore.quizzes += p.quizzes_completed?.length || 0;
        }
        userScores.set(userId, currentScore);
      }

      // Step 2: Find the username for each scored userId
      for (const user of inMemoryUsers.values()) {
        if (userScores.has(user.id)) {
          const score = userScores.get(user.id)!;
          score.username = user.username;
        }
      }

      // Step 3: Calculate total, sort, rank, and format the output
      leaderboard = Array.from(userScores.values())
        // Filter out any users we couldn't find a username for
        .filter((score) => score.username !== "")
        .map((score) => ({
          ...score,
          total_completed: score.videos + score.quizzes,
        }))
        .sort(
          (a, b) =>
            b.total_completed - a.total_completed ||
            a.username.localeCompare(b.username),
        )
        .slice(0, 20)
        .map((score, index) => ({
          rank: index + 1,
          username: score.username,
          completed_videos: score.videos,
          completed_quizzes: score.quizzes,
          total_completed: score.total_completed,
        }));
      // --- END OF CORRECTED FALLBACK LOGIC ---
    }

    res.json({ success: true, leaderboard });
  } catch (error) {
    req.logger?.error("Error fetching leaderboard:", { error });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Initialize database using migrations
async function initializeDatabase(): Promise<void> {
  try {
    appLogger.info("Running database migrations...");

    const migrationRunner = new MigrationRunner(pool);
    await migrationRunner.runMigrations();

    appLogger.info("Database migrations completed successfully");
  } catch (error) {
    appLogger.error(
      "Database migration failed",
      { error },
      error instanceof Error ? error : undefined,
    );
    throw error;
  }
}

// Test database connection and initialize on startup
pool.connect(async (err, client, done) => {
  if (err) {
    appLogger.error(
      "Database connection failed",
      { error: err },
      err instanceof Error ? err : undefined,
    );
  } else {
    appLogger.info("Database connected successfully");
    done();

    // Initialize database tables
    try {
      await initializeDatabase();
      // Initialize real-time notifications after database is ready
      await initializeNotificationListener();
    } catch (initError) {
      appLogger.error(
        "Failed to initialize database",
        { error: initError },
        initError instanceof Error ? initError : undefined,
      );
    }
  }
});

// Add global error handler
app.use(errorHandler);

server.listen(port, () => {
  logStartupInfo(port);
});

export default app;
