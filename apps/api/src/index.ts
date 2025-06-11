import express, { Request, Response, NextFunction } from 'express';
import { Pool, Client } from 'pg';
import cors from 'cors';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

// Types
interface User {
  id: number;
  username: string;
  created_at: Date;
  last_sync: Date;
}

interface Progress {
  id: number;
  user_id: number;
  lesson_id: string;
  videos_watched: number[];
  quizzes_completed: number[];
  lesson_completed: boolean;
  completed_at?: Date;
  updated_at: Date;
}

interface Bookmark {
  id: number;
  user_id: number;
  bookmark_type: string;
  lesson_id: string;
  item_index?: number;
  item_type?: string;
  item_title?: string;
  created_at: Date;
}

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

        // Try to find existing user
        let result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (result.rows.length === 0) {
            // Create new user
            result = await pool.query(
                'INSERT INTO users (username) VALUES ($1) RETURNING *',
                [username]
            );
            req.logger?.info('Created new user', { username });
        } else {
            req.logger?.info('Found existing user', { username });
        }

        const user: User = result.rows[0];
        res.json({ user });
    } catch (error) {
        req.logger?.error('Error in get-or-create user', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user progress
app.get('/api/users/:userId/progress', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM progress WHERE user_id = $1',
            [userId]
        );
        
        res.json({ progress: result.rows });
    } catch (error) {
        console.error('Error getting progress:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Sync progress with real-time notifications
app.post('/api/users/:userId/progress/sync', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { progressData } = req.body;
        
        // Get username for notifications
        const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const username = userResult.rows[0].username;
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            for (const [lessonId, localProgress] of Object.entries(progressData)) {
                const progress = localProgress as any; // Type assertion for now
                
                // Get existing progress
                const existingResult = await client.query(
                    'SELECT * FROM progress WHERE user_id = $1 AND lesson_id = $2',
                    [userId, lessonId]
                );
                
                if (existingResult.rows.length > 0) {
                    // Merge progress (union of arrays, latest completion)
                    const existing = existingResult.rows[0];
                    const mergedVideos = [...new Set([...existing.videos_watched, ...progress.videosWatched])];
                    const mergedQuizzes = [...new Set([...existing.quizzes_completed, ...progress.quizzesCompleted])];
                    const lessonCompleted = existing.lesson_completed || progress.lessonCompleted;
                    const completedAt = lessonCompleted ? 
                        (progress.completedAt && new Date(progress.completedAt) > new Date(existing.completed_at) ? 
                         progress.completedAt : existing.completed_at) : null;
                    
                    await client.query(
                        `UPDATE progress SET 
                         videos_watched = $3, 
                         quizzes_completed = $4, 
                         lesson_completed = $5, 
                         completed_at = $6,
                         updated_at = NOW()
                         WHERE user_id = $1 AND lesson_id = $2`,
                        [userId, lessonId, mergedVideos, mergedQuizzes, lessonCompleted, completedAt]
                    );
                } else {
                    // Insert new progress
                    await client.query(
                        `INSERT INTO progress (user_id, lesson_id, videos_watched, quizzes_completed, lesson_completed, completed_at)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [userId, lessonId, progress.videosWatched, progress.quizzesCompleted, 
                         progress.lessonCompleted, progress.completedAt]
                    );
                }
            }
            
            // Update user's last sync time
            await client.query('UPDATE users SET last_sync = NOW() WHERE id = $1', [userId]);
            
            await client.query('COMMIT');
            
            // Real-time notification
            const notificationPayload = JSON.stringify({
                username: username,
                userId: userId,
                progressData: progressData,
                timestamp: new Date().toISOString()
            });
            await pool.query(`NOTIFY progress_updates, $1`, [notificationPayload]);
            
            // Return updated progress
            const finalResult = await client.query(
                'SELECT * FROM progress WHERE user_id = $1',
                [userId]
            );
            
            res.json({ success: true, progress: finalResult.rows });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Error syncing progress:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get bookmarks
app.get('/api/users/:userId/bookmarks', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        
        res.json({ bookmarks: result.rows });
    } catch (error) {
        console.error('Error getting bookmarks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Sync bookmarks with real-time notifications
app.post('/api/users/:userId/bookmarks/sync', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { bookmarks } = req.body;
        
        // Get username for notifications
        const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const username = userResult.rows[0].username;
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Clear existing bookmarks (since we only allow one bookmark at a time)
            await client.query('DELETE FROM bookmarks WHERE user_id = $1', [userId]);
            
            // Insert new bookmark if provided
            if (bookmarks && bookmarks.length > 0) {
                const bookmark = bookmarks[0]; // Only take the latest one
                await client.query(
                    `INSERT INTO bookmarks (user_id, bookmark_type, lesson_id, item_index, item_type, item_title)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [userId, bookmark.type, bookmark.lessonId, bookmark.index, bookmark.itemType, bookmark.title]
                );
            }
            
            await client.query('COMMIT');
            
            // Real-time notification
            const bookmarkNotificationPayload = JSON.stringify({
                username: username,
                userId: userId,
                bookmarks: bookmarks,
                timestamp: new Date().toISOString()
            });
            await pool.query(`NOTIFY bookmark_updates, $1`, [bookmarkNotificationPayload]);
            
            // Return updated bookmarks
            const result = await pool.query(
                'SELECT * FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC',
                [userId]
            );
            
            res.json({ success: true, bookmarks: result.rows });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Error syncing bookmarks:', error);
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