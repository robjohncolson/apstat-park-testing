import express, { Request, Response, NextFunction } from 'express';
import { Pool, Client } from 'pg';
import cors from 'cors';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import {
  User,
  Progress,
  Bookmark,
  SyncProgressRequest,
  LeaderboardEntry,
} from './types';

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

interface Logger {
  info: (msg: string, context?: any) => void;
  warn: (msg: string, context?: any) => void;
  error: (msg: string, context?: any) => void;
  debug: (msg: string, context?: any) => void;
  child: (context: any) => Logger;
}

interface ExtendedRequest extends Request {
  requestId?: string;
  logger?: Logger;
}

interface CustomSocket extends Socket {
  username?: string;
}

// Simple structured logger
const logger: Logger = {
  info: (msg: string, context?: any) => console.log(`[INFO] ${msg}`, context || ''),
  warn: (msg: string, context?: any) => console.warn(`[WARN] ${msg}`, context || ''),
  error: (msg: string, context?: any) => console.error(`[ERROR] ${msg}`, context || ''),
  debug: (msg: string, context?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${msg}`, context || '');
    }
  },
  child: (context: any) => logger
};

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const port = process.env.PORT || 3000;

// Add request ID middleware for better debugging
app.use((req: ExtendedRequest, res: Response, next: NextFunction) => {
  const requestId = Math.random().toString(36).substring(2, 15);
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  const childLogger = logger.child({ requestId });
  req.logger = childLogger;
  
  childLogger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  next();
});

// Database connections
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 1 // Single dedicated connection for notifications
        });
        
        const client = await notificationListener.connect();
        
        // Listen for progress, bookmark, and leaderboard updates
        await client.query('LISTEN progress_updates');
        await client.query('LISTEN bookmark_updates');
        await client.query('LISTEN user_activity');
        await client.query('LISTEN leaderboard_updates');
        
        client.on('notification', (msg) => {
            try {
                if (!msg.payload) return;
                const data = JSON.parse(msg.payload);
                console.log(`📡 Real-time notification: ${msg.channel}`, data);
                
                // Broadcast to user's connected devices
                broadcastToUser(data.username, {
                    type: msg.channel,
                    data: data
                });
            } catch (error) {
                console.error('Error processing notification:', error);
            }
        });
        
        console.log('🚀 PostgreSQL notification listener initialized');
        
    } catch (error) {
        console.error('❌ Failed to initialize notification listener:', error);
    }
}

// Broadcast message to all of a user's connected devices
function broadcastToUser(username: string, message: any): void {
    const userSockets = connectedUsers.get(username);
    if (userSockets && userSockets.size > 0) {
        userSockets.forEach(socketId => {
            io.to(socketId).emit('realtime_update', message);
        });
        console.log(`📤 Broadcasted to ${userSockets.size} devices for user: ${username}`);
    }
}

// WebSocket connection handling
io.on('connection', (socket: CustomSocket) => {
    console.log('🔌 Client connected:', socket.id);
    
    // User joins with their username
    socket.on('join', ({ username }: { username: string }) => {
        if (!username) return;
        
        // Track this socket for the user
        if (!connectedUsers.has(username)) {
            connectedUsers.set(username, new Set());
        }
        connectedUsers.get(username)!.add(socket.id);
        
        // Store username on socket for cleanup
        socket.username = username;
        
        console.log(`👤 User ${username} connected (${connectedUsers.get(username)!.size} devices)`);
        
        // Notify other devices that a new device connected
        broadcastToUser(username, {
            type: 'device_connected',
            data: { 
                socketId: socket.id,
                deviceCount: connectedUsers.get(username)!.size
            }
        });
    });
    
    // Handle user activity (opening lessons, etc.)
    socket.on('user_activity', async (activity: any) => {
        if (!socket.username) return;
        
        try {
            // Notify PostgreSQL about user activity
            const activityPayload = JSON.stringify({
                username: socket.username,
                activity: activity,
                timestamp: new Date().toISOString()
            });
            await pool.query(`NOTIFY user_activity, $1`, [activityPayload]);
        } catch (error) {
            console.error('Error notifying user activity:', error);
        }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        if (socket.username) {
            const userSockets = connectedUsers.get(socket.username);
            if (userSockets) {
                userSockets.delete(socket.id);
                
                if (userSockets.size === 0) {
                    connectedUsers.delete(socket.username);
                } else {
                    // Notify remaining devices
                    broadcastToUser(socket.username, {
                        type: 'device_disconnected',
                        data: { 
                            socketId: socket.id,
                            deviceCount: userSockets.size
                        }
                    });
                }
            }
            console.log(`👋 User ${socket.username} disconnected`);
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

// Username generation lists
const adjectives = [
    'happy', 'cheerful', 'wise', 'brave', 'calm', 'bright', 'clever', 'gentle', 
    'swift', 'kind', 'bold', 'quick', 'smart', 'cool', 'warm', 'sunny'
];

const animals = [
    'otter', 'panda', 'fox', 'owl', 'cat', 'dog', 'bear', 'wolf', 'hawk', 
    'deer', 'rabbit', 'turtle', 'dolphin', 'seal', 'penguin', 'koala'
];

const plants = [
    'oak', 'maple', 'willow', 'cedar', 'pine', 'sage', 'fern', 'moss', 
    'ivy', 'rose', 'lily', 'iris', 'mint', 'basil', 'lavender', 'bamboo'
];

function generateUsername(): string {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const nature = Math.random() < 0.5 ? 
        animals[Math.floor(Math.random() * animals.length)] : 
        plants[Math.floor(Math.random() * plants.length)];
    const number = Math.floor(Math.random() * 100);
    return `${adjective}${nature}${number}`;
}

// API Routes

// Generate username
app.get('/api/generate-username', (req: Request, res: Response) => {
    const username = generateUsername();
    res.json({ username });
});

// Get or create user
app.post('/api/users/get-or-create', async (req: ExtendedRequest, res: Response) => {
    try {
        const { username } = req.body;
        
        if (!username || typeof username !== 'string') {
            return res.status(400).json({ error: 'Valid username is required' });
        }

        let user: User;

        try {
            // Try to use database first
            let result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
            
            if (result.rows.length === 0) {
                // Create new user
                result = await pool.query(
                    'INSERT INTO users (username) VALUES ($1) RETURNING *',
                    [username]
                );
                req.logger?.info('Created new user in database', { username });
            } else {
                req.logger?.info('Found existing user in database', { username });
            }

            user = result.rows[0];
        } catch (dbError) {
            // Fallback to in-memory storage if database is not available
            req.logger?.warn('Database unavailable, using in-memory storage', { username });
            
            // Check if user exists in memory
            if (inMemoryUsers.has(username)) {
                user = inMemoryUsers.get(username)!;
                req.logger?.info('Found existing user in memory', { username });
            } else {
                // Create new user in memory
                user = {
                    id: nextUserId++,
                    username: username,
                    created_at: new Date(),
                    last_sync: new Date()
                };
                inMemoryUsers.set(username, user);
                req.logger?.info('Created new user in memory', { username });
            }
        }

        res.json({ user });
    } catch (error) {
        req.logger?.error('Error in get-or-create user', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user progress
app.get('/api/users/:userId/progress', async (req: ExtendedRequest, res: Response) => {
    try {
        const { userId } = req.params;
        let progress: Progress[] = [];

        try {
            // Try to use database first
            const result = await pool.query('SELECT * FROM progress WHERE user_id = $1', [userId]);
            progress = result.rows;
        } catch (dbError) {
            req.logger?.warn('Database unavailable, getting progress from memory', { userId });
            progress = inMemoryProgress.get(parseInt(userId, 10)) || [];
        }
        
        res.json(progress); // Return the progress data directly as array
    } catch (error) {
        req.logger?.error('Error getting progress:', { error, userId: req.params.userId });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Sync progress with real-time notifications
app.post('/api/users/:userId/progress/sync', async (req: ExtendedRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const { lesson_id, video_index, quiz_index, completed_at, lesson_completed } = req.body;
        const { completion_date } = req.body; // legacy param
        const completedAtIso = completed_at || completion_date;

        if (!lesson_id) {
            return res.status(400).json({ error: 'lesson_id is required' });
        }

        if (video_index === undefined && quiz_index === undefined && lesson_completed === undefined) {
            return res.status(400).json({ error: 'Either video_index, quiz_index, or lesson_completed must be provided' });
        }

        const userIdNum = parseInt(userId, 10);

        // ---------------------------
        // Database first strategy
        // ---------------------------
        try {
            // Fetch existing row (if any)
            const selectResult = await pool.query(
                'SELECT videos_watched, quizzes_completed FROM progress WHERE user_id = $1 AND lesson_id = $2',
                [userIdNum, lesson_id]
            );

            let videosWatched: number[] = selectResult.rows[0]?.videos_watched || [];
            let quizzesCompleted: number[] = selectResult.rows[0]?.quizzes_completed || [];

            if (typeof video_index === 'number' && !videosWatched.includes(video_index)) {
                videosWatched.push(video_index);
            }

            if (typeof quiz_index === 'number' && !quizzesCompleted.includes(quiz_index)) {
                quizzesCompleted.push(quiz_index);
            }

            // Upsert logic
            await pool.query(
                `INSERT INTO progress (user_id, lesson_id, videos_watched, quizzes_completed, completed_at, lesson_completed)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (user_id, lesson_id)
                 DO UPDATE SET videos_watched = EXCLUDED.videos_watched, quizzes_completed = EXCLUDED.quizzes_completed, lesson_completed = COALESCE(EXCLUDED.lesson_completed, progress.lesson_completed), completed_at = COALESCE(EXCLUDED.completed_at, progress.completed_at), updated_at = NOW()`,
                [userIdNum, lesson_id, videosWatched, quizzesCompleted, completedAtIso ? new Date(completedAtIso) : null, lesson_completed]
            );
        } catch (dbError) {
            // ---------------------------
            // Fallback to in-memory
            // ---------------------------
            req.logger?.warn('Database unavailable, syncing progress to memory', { userId });
            let userProgress = inMemoryProgress.get(userIdNum) || [];

            const existing = userProgress.find(p => p.lesson_id === lesson_id);

            if (existing) {
                if (typeof video_index === 'number' && !existing.videos_watched.includes(video_index)) {
                    existing.videos_watched.push(video_index);
                }
                if (typeof quiz_index === 'number' && !existing.quizzes_completed.includes(quiz_index)) {
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
                    videos_watched: typeof video_index === 'number' ? [video_index] : [],
                    quizzes_completed: typeof quiz_index === 'number' ? [quiz_index] : [],
                    lesson_completed: lesson_completed ?? false,
                    completed_at: completedAtIso ? new Date(completedAtIso) : undefined,
                    updated_at: new Date()
                } as Progress);
            }

            inMemoryProgress.set(userIdNum, userProgress);
        }

        // For response, try DB first then memory
        let latestProgress: Progress[] = [];
        try {
            const result = await pool.query('SELECT * FROM progress WHERE user_id = $1', [userIdNum]);
            latestProgress = result.rows;
        } catch {
            latestProgress = inMemoryProgress.get(userIdNum) || [];
        }

        res.json({ success: true, progress: latestProgress });

    } catch (error) {
        req.logger?.error('Error syncing progress:', { error, userId: req.params.userId });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get bookmarks
app.get('/api/users/:userId/bookmarks', async (req: ExtendedRequest, res: Response) => {
    try {
        const { userId } = req.params;
        let bookmarks: Bookmark[] = [];

        try {
            const result = await pool.query('SELECT * FROM bookmarks WHERE user_id = $1', [userId]);
            bookmarks = result.rows;
        } catch (dbError) {
            req.logger?.warn('Database unavailable, getting bookmarks from memory', { userId });
            bookmarks = inMemoryBookmarks.get(parseInt(userId, 10)) || [];
        }
        
        res.json({ bookmarks });
    } catch (error) {
        req.logger?.error('Error getting bookmarks:', { error, userId: req.params.userId });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Sync bookmarks
app.post('/api/users/:userId/bookmarks/sync', async (req: ExtendedRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const { bookmarks } = req.body; // Expects an array from the client
        const userIdNum = parseInt(userId, 10);

        try {
            const client = await pool.connect();
            await client.query('BEGIN');
            await client.query('DELETE FROM bookmarks WHERE user_id = $1', [userIdNum]);
            if (bookmarks && bookmarks.length > 0) {
                for (const bookmark of bookmarks) {
                     await client.query(
                        `INSERT INTO bookmarks (user_id, bookmark_type, lesson_id, item_index, item_type, item_title)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [userId, bookmark.bookmark_type, bookmark.lesson_id, bookmark.item_index, bookmark.item_type, bookmark.item_title]
                    );
                }
            }
            await client.query('COMMIT');
            client.release();
        } catch (dbError) {
            req.logger?.warn('Database unavailable, syncing bookmarks to memory', { userId });
            inMemoryBookmarks.set(userIdNum, bookmarks || []);
        }

        res.json({ success: true, bookmarks: inMemoryBookmarks.get(userIdNum) || [] });

    } catch (error) {
        req.logger?.error('Error syncing bookmarks:', { error, userId: req.params.userId });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        connectedUsers: connectedUsers.size,
        totalConnections: Array.from(connectedUsers.values()).reduce((sum, sockets) => sum + sockets.size, 0)
    });
});

// Real-time status endpoint
app.get('/api/realtime/status', (req: Request, res: Response) => {
    const userStats: { [key: string]: number } = {};
    connectedUsers.forEach((sockets, username) => {
        userStats[username] = sockets.size;
    });
    
    res.json({
        connectedUsers: connectedUsers.size,
        totalConnections: Array.from(connectedUsers.values()).reduce((sum, sockets) => sum + sockets.size, 0),
        userStats
    });
});

// GET /api/leaderboard - Get top users by progress
app.get('/api/leaderboard', async (req: ExtendedRequest, res: Response) => {
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
          req.logger?.warn('Database unavailable, building leaderboard from memory', { dbError });
          // Fallback to in-memory
          const userScores: { [userId: number]: { username: string, videos: number, quizzes: number } } = {};

          for (const [userId, progresses] of inMemoryProgress.entries()) {
              const user = inMemoryUsers.get(userId);
              if (!user) continue;

              if (!userScores[userId]) {
                  userScores[userId] = { username: user.username, videos: 0, quizzes: 0 };
              }
              
              for (const p of progresses) {
                  userScores[userId].videos += p.videos_watched?.length || 0;
                  userScores[userId].quizzes += p.quizzes_completed?.length || 0;
              }
          }
          
          leaderboard = Object.values(userScores)
              .map(score => ({
                  username: score.username,
                  completed_videos: score.videos,
                  completed_quizzes: score.quizzes,
                  total_completed: score.videos + score.quizzes,
              }))
              .sort((a, b) => b.total_completed - a.total_completed || a.username.localeCompare(b.username))
              .slice(0, 20)
              .map((score, index) => ({
                  rank: index + 1,
                  ...score,
              }));
      }

      res.json({ success: true, leaderboard });

  } catch (error) {
      req.logger?.error('Error fetching leaderboard:', { error });
      res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize database tables on startup
async function initializeDatabase(): Promise<void> {
    try {
        console.log('Initializing database...');
        
        // Create tables if they don't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS progress (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                lesson_id VARCHAR(20) NOT NULL,
                videos_watched INTEGER[] DEFAULT '{}',
                quizzes_completed INTEGER[] DEFAULT '{}',
                lesson_completed BOOLEAN DEFAULT FALSE,
                completed_at TIMESTAMP WITH TIME ZONE,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, lesson_id)
            );
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bookmarks (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                bookmark_type VARCHAR(20) NOT NULL,
                lesson_id VARCHAR(20) NOT NULL,
                item_index INTEGER,
                item_type VARCHAR(20),
                item_title VARCHAR(200),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS gold_stars (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
                total_stars INTEGER DEFAULT 0,
                current_streak INTEGER DEFAULT 0,
                last_lesson_time TIMESTAMP WITH TIME ZONE,
                last_target_hours DECIMAL(8,2),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        
        // Create indexes
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_progress_user_lesson ON progress(user_id, lesson_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_gold_stars_user ON gold_stars(user_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_gold_stars_leaderboard ON gold_stars(current_streak DESC, total_stars DESC);`);
        
        console.log('Database initialized successfully');
        
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}

// Test database connection and initialize on startup
pool.connect(async (err, client, done) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Database connected successfully');
        done();
        
        // Initialize database tables
        try {
            await initializeDatabase();
            // Initialize real-time notifications after database is ready
            await initializeNotificationListener();
        } catch (initError) {
            console.error('Failed to initialize database:', initError);
        }
    }
});

server.listen(port, () => {
    console.log(`🚀 APStat Park API with real-time sync running on port ${port}`);
    console.log(`📡 WebSocket server ready for real-time updates`);
    console.log(`Database URL: ${process.env.DATABASE_URL ? 'Set from environment' : 'Using fallback'}`);
});

export default app; 