const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const port = process.env.PORT || 3000;

// Database connections
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Dedicated listener connection for PostgreSQL LISTEN/NOTIFY
let notificationListener = null;

// Track connected users for real-time updates
const connectedUsers = new Map(); // username -> Set of socket.ids

// Initialize PostgreSQL notification listener
async function initializeNotificationListener() {
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
function broadcastToUser(username, message) {
    const userSockets = connectedUsers.get(username);
    if (userSockets && userSockets.size > 0) {
        userSockets.forEach(socketId => {
            io.to(socketId).emit('realtime_update', message);
        });
        console.log(`📤 Broadcasted to ${userSockets.size} devices for user: ${username}`);
    }
}

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    
    // User joins with their username
    socket.on('join', ({ username }) => {
        if (!username) return;
        
        // Track this socket for the user
        if (!connectedUsers.has(username)) {
            connectedUsers.set(username, new Set());
        }
        connectedUsers.get(username).add(socket.id);
        
        // Store username on socket for cleanup
        socket.username = username;
        
        console.log(`👤 User ${username} connected (${connectedUsers.get(username).size} devices)`);
        
        // Notify other devices that a new device connected
        broadcastToUser(username, {
            type: 'device_connected',
            data: { 
                socketId: socket.id,
                deviceCount: connectedUsers.get(username).size
            }
        });
    });
    
    // Handle user activity (opening lessons, etc.)
    socket.on('user_activity', async (activity) => {
        if (!socket.username) return;
        
        try {
            // Notify PostgreSQL about user activity
            const activityPayload = JSON.stringify({
                username: socket.username,
                activity: activity,
                timestamp: new Date().toISOString()
            });
            await pool.query(`NOTIFY user_activity, '${activityPayload.replace(/'/g, "''")}'`);
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

const foods = [
    'mango', 'honey', 'berry', 'apple', 'lemon', 'peach', 'cocoa', 'mint', 
    'vanilla', 'caramel', 'cinnamon', 'ginger', 'nutmeg', 'papaya', 'kiwi'
];

// Generate random username
function generateUsername() {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const nouns = [...animals, ...plants, ...foods];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}${noun}${num}`;
}

// Get or create user
app.post('/api/users/get-or-create', async (req, res) => {
    try {
        console.log('Creating user request received');
        const { username } = req.body;
        
        if (username) {
            console.log('Checking for existing username:', username);
            
            // Validate custom username
            if (!/^[a-zA-Z0-9]+$/.test(username)) {
                return res.status(400).json({ error: 'Username can only contain letters and numbers' });
            }
            
            if (username.length < 3 || username.length > 20) {
                return res.status(400).json({ error: 'Username must be 3-20 characters long' });
            }
            
            // Try to get existing user
            const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
            if (result.rows.length > 0) {
                console.log('Found existing user');
                return res.json({ user: result.rows[0] });
            }
            
            // Create user with the custom username if it doesn't exist
            console.log('Creating new user with custom username:', username);
            try {
                const insertResult = await pool.query(
                    'INSERT INTO users (username) VALUES ($1) RETURNING *',
                    [username]
                );
                console.log('User created successfully with custom username:', insertResult.rows[0]);
                return res.json({ user: insertResult.rows[0] });
            } catch (dbError) {
                if (dbError.code === '23505') { // Unique constraint violation
                    return res.status(409).json({ error: 'Username already taken' });
                }
                throw dbError;
            }
        }
        
        // Generate new random username if none provided
        let newUsername;
        let attempts = 0;
        
        do {
            newUsername = generateUsername();
            attempts++;
            
            // Check if this generated username already exists
            const existingResult = await pool.query('SELECT * FROM users WHERE username = $1', [newUsername]);
            if (existingResult.rows.length === 0) {
                break; // Username is available
            }
        } while (attempts < 10); // Prevent infinite loop
        
        console.log('Creating new user with generated username:', newUsername);
        
        // Create new user
        const insertResult = await pool.query(
            'INSERT INTO users (username) VALUES ($1) RETURNING *',
            [newUsername]
        );
        
        console.log('User created successfully:', insertResult.rows[0]);
        res.json({ user: insertResult.rows[0] });
    } catch (error) {
        console.error('Error in get-or-create user:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
        res.status(500).json({ 
            error: error.message,
            code: error.code,
            detail: error.detail
        });
    }
});

// Get user progress
app.get('/api/users/:userId/progress', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM progress WHERE user_id = $1',
            [userId]
        );
        
        res.json({ progress: result.rows });
    } catch (error) {
        console.error('Error getting progress:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sync progress - NOW WITH REAL-TIME NOTIFICATIONS!
app.post('/api/users/:userId/progress/sync', async (req, res) => {
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
                // Get existing progress
                const existingResult = await client.query(
                    'SELECT * FROM progress WHERE user_id = $1 AND lesson_id = $2',
                    [userId, lessonId]
                );
                
                if (existingResult.rows.length > 0) {
                    // Merge progress (union of arrays, latest completion)
                    const existing = existingResult.rows[0];
                    const mergedVideos = [...new Set([...existing.videos_watched, ...localProgress.videosWatched])];
                    const mergedQuizzes = [...new Set([...existing.quizzes_completed, ...localProgress.quizzesCompleted])];
                    const lessonCompleted = existing.lesson_completed || localProgress.lessonCompleted;
                    const completedAt = lessonCompleted ? 
                        (localProgress.completedAt && new Date(localProgress.completedAt) > new Date(existing.completed_at) ? 
                         localProgress.completedAt : existing.completed_at) : null;
                    
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
                        [userId, lessonId, localProgress.videosWatched, localProgress.quizzesCompleted, 
                         localProgress.lessonCompleted, localProgress.completedAt]
                    );
                }
            }
            
            // Update user's last sync time
            await client.query('UPDATE users SET last_sync = NOW() WHERE id = $1', [userId]);
            
            await client.query('COMMIT');
            
            // 🚀 REAL-TIME MAGIC: Notify other devices about progress update
            const notificationPayload = JSON.stringify({
                username: username,
                userId: userId,
                progressData: progressData,
                timestamp: new Date().toISOString()
            });
            await pool.query(`NOTIFY progress_updates, '${notificationPayload.replace(/'/g, "''")}'`);
            
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
        res.status(500).json({ error: error.message });
    }
});

// Get bookmarks
app.get('/api/users/:userId/bookmarks', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        
        res.json({ bookmarks: result.rows });
    } catch (error) {
        console.error('Error getting bookmarks:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sync bookmarks - NOW WITH REAL-TIME NOTIFICATIONS!
app.post('/api/users/:userId/bookmarks/sync', async (req, res) => {
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
            
            // 🚀 REAL-TIME MAGIC: Notify other devices about bookmark update
            const bookmarkNotificationPayload = JSON.stringify({
                username: username,
                userId: userId,
                bookmarks: bookmarks,
                timestamp: new Date().toISOString()
            });
            await pool.query(`NOTIFY bookmark_updates, '${bookmarkNotificationPayload.replace(/'/g, "''")}'`);
            
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
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        connectedUsers: connectedUsers.size,
        totalConnections: Array.from(connectedUsers.values()).reduce((sum, sockets) => sum + sockets.size, 0)
    });
});

// Real-time status endpoint
app.get('/api/realtime/status', (req, res) => {
    const userStats = {};
    connectedUsers.forEach((sockets, username) => {
        userStats[username] = sockets.size;
    });
    
    res.json({
        totalUsers: connectedUsers.size,
        totalConnections: Array.from(connectedUsers.values()).reduce((sum, sockets) => sum + sockets.size, 0),
        userConnections: userStats
    });
});

// 🌟 GOLD STAR SYSTEM ENDPOINTS 🌟

// Calculate gold star when lesson is completed
app.post('/api/users/:userId/gold-star', async (req, res) => {
    try {
        const { userId } = req.params;
        const { lessonId, completionTime } = req.body;
        
        if (!lessonId || !completionTime) {
            return res.status(400).json({ error: 'Missing lessonId or completionTime' });
        }
        
        // Get user info
        const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const username = userResult.rows[0].username;
        
        // Get user's completed lessons count
        const progressResult = await pool.query(
            'SELECT COUNT(*) as completed_count FROM progress WHERE user_id = $1 AND lesson_completed = true',
            [userId]
        );
        const completedCount = parseInt(progressResult.rows[0].completed_count);
        
        // Calculate dynamic target time
        const apExamDate = new Date('2026-05-07T00:00:00Z');
        const completionDateTime = new Date(completionTime);
        const msUntilExam = apExamDate.getTime() - completionDateTime.getTime();
        const daysUntilExam = msUntilExam / (24 * 60 * 60 * 1000);
        
        const totalLessons = 89; // Could be made dynamic
        const remainingLessons = totalLessons - completedCount;
        const hoursPerLesson = remainingLessons > 0 ? (daysUntilExam * 24) / remainingLessons : 0;
        
        // Get user's gold star data
        let goldStarResult = await pool.query(
            'SELECT * FROM gold_stars WHERE user_id = $1',
            [userId]
        );
        
        let currentStreak = 0;
        let totalStars = 0;
        let lastLessonTime = null;
        
        if (goldStarResult.rows.length > 0) {
            const goldStarData = goldStarResult.rows[0];
            currentStreak = goldStarData.current_streak || 0;
            totalStars = goldStarData.total_stars || 0;
            lastLessonTime = goldStarData.last_lesson_time;
        }
        
        // Calculate time since last lesson (if any)
        let timeSinceLastLesson = null;
        let earnedGoldStar = false;
        let targetHours = hoursPerLesson;
        
        if (lastLessonTime) {
            const lastTime = new Date(lastLessonTime);
            timeSinceLastLesson = (completionDateTime - lastTime) / (1000 * 60 * 60); // hours
            
            // Check if they earned a gold star (completed within target window)
            earnedGoldStar = timeSinceLastLesson <= targetHours;
        } else {
            // First lesson - calculate initial target based on total time divided by total lessons
            const initialHoursPerLesson = (daysUntilExam * 24) / totalLessons;
            targetHours = initialHoursPerLesson;
            earnedGoldStar = true; // First lesson completion is always a gold star!
        }
        
        if (earnedGoldStar) {
            currentStreak += 1;
            totalStars += 1;
        } else {
            currentStreak = 0; // Reset streak
        }
        
        // Update or insert gold star data
        await pool.query(`
            INSERT INTO gold_stars (user_id, total_stars, current_streak, last_lesson_time, last_target_hours, updated_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                total_stars = $2,
                current_streak = $3,
                last_lesson_time = $4,
                last_target_hours = $5,
                updated_at = CURRENT_TIMESTAMP
        `, [userId, totalStars, currentStreak, completionTime, targetHours]);
        
        // Calculate next lesson target
        const nextRemainingLessons = remainingLessons - 1;
        const nextTargetHours = nextRemainingLessons > 0 ? 
            (daysUntilExam * 24) / nextRemainingLessons : 0;
        
        const response = {
            earnedGoldStar,
            currentStreak,
            totalStars,
            timeSinceLastLesson,
            currentTargetHours: targetHours,
            nextTargetHours,
            remainingLessons: nextRemainingLessons,
            daysUntilExam: Math.round(daysUntilExam * 10) / 10
        };
        
        // 🚀 REAL-TIME LEADERBOARD UPDATE
        const leaderboardPayload = JSON.stringify({ 
            username, 
            userId,
            action: 'gold_star_update',
            data: response,
            timestamp: new Date().toISOString() 
        });
        await pool.query(`NOTIFY leaderboard_updates, '${leaderboardPayload.replace(/'/g, "''")}'`);
        
        res.json(response);
        
    } catch (error) {
        console.error('Gold star calculation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.username, g.total_stars, g.current_streak, g.last_lesson_time, g.updated_at
            FROM gold_stars g
            JOIN users u ON g.user_id = u.id
            ORDER BY g.current_streak DESC, g.total_stars DESC, g.updated_at DESC
            LIMIT 20
        `);
        
        const leaderboard = result.rows.map(row => ({
            username: row.username,
            totalStars: row.total_stars || 0,
            currentStreak: row.current_streak || 0,
            lastActive: row.updated_at
        }));
        
        res.json({ leaderboard });
        
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user's gold star stats
app.get('/api/users/:userId/gold-stars', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM gold_stars WHERE user_id = $1',
            [userId]
        );
        
        if (result.rows.length === 0) {
            return res.json({
                totalStars: 0,
                currentStreak: 0,
                lastTargetHours: null,
                nextTargetHours: null
            });
        }
        
        const data = result.rows[0];
        
        // Calculate next target hours
        const progressResult = await pool.query(
            'SELECT COUNT(*) as completed_count FROM progress WHERE user_id = $1 AND lesson_completed = true',
            [userId]
        );
        const completedCount = parseInt(progressResult.rows[0].completed_count);
        
        const apExamDate = new Date('2026-05-07T00:00:00Z');
        const now = new Date();
        const msUntilExam = apExamDate.getTime() - now.getTime();
        const daysUntilExam = msUntilExam / (24 * 60 * 60 * 1000);
        
        const totalLessons = 89;
        const remainingLessons = totalLessons - completedCount;
        const nextTargetHours = remainingLessons > 0 ? (daysUntilExam * 24) / remainingLessons : 0;
        
        res.json({
            totalStars: data.total_stars || 0,
            currentStreak: data.current_streak || 0,
            lastTargetHours: data.last_target_hours,
            nextTargetHours: Math.round(nextTargetHours * 10) / 10,
            remainingLessons,
            daysUntilExam: Math.round(daysUntilExam * 10) / 10
        });
        
    } catch (error) {
        console.error('Gold star stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 🚨 DANGER ZONE: Reset endpoints for testing
// TODO: Remove in production or add proper authentication

// Reset all progress and gold stars (for testing only)
app.post('/api/reset-all-data', async (req, res) => {
    try {
        // Only allow in development or with specific key
        const { resetKey } = req.body;
        if (resetKey !== 'RESET_TESTING_2024') {
            return res.status(403).json({ error: 'Invalid reset key' });
        }
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Delete all progress data
            const progressResult = await client.query('DELETE FROM progress');
            console.log(`🗑️ Deleted ${progressResult.rowCount} progress records`);
            
            // Delete all gold star data
            const goldStarResult = await client.query('DELETE FROM gold_stars');
            console.log(`🗑️ Deleted ${goldStarResult.rowCount} gold star records`);
            
            // Reset user sync times
            await client.query('UPDATE users SET last_sync = NOW()');
            
            await client.query('COMMIT');
            
            res.json({ 
                success: true, 
                message: 'All progress and gold star data has been reset',
                deletedProgress: progressResult.rowCount,
                deletedGoldStars: goldStarResult.rowCount
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Reset error:', error);
        res.status(500).json({ error: 'Reset failed: ' + error.message });
    }
});

// Reset specific user's data
app.post('/api/users/:userId/reset', async (req, res) => {
    try {
        const { userId } = req.params;
        const { resetKey } = req.body;
        
        if (resetKey !== 'RESET_TESTING_2024') {
            return res.status(403).json({ error: 'Invalid reset key' });
        }
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Delete user's progress
            const progressResult = await client.query('DELETE FROM progress WHERE user_id = $1', [userId]);
            
            // Delete user's gold stars
            const goldStarResult = await client.query('DELETE FROM gold_stars WHERE user_id = $1', [userId]);
            
            // Reset user sync time
            await client.query('UPDATE users SET last_sync = NOW() WHERE id = $1', [userId]);
            
            await client.query('COMMIT');
            
            res.json({ 
                success: true, 
                message: 'User data has been reset',
                deletedProgress: progressResult.rowCount,
                deletedGoldStars: goldStarResult.rowCount
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('User reset error:', error);
        res.status(500).json({ error: 'User reset failed: ' + error.message });
    }
});

// Initialize database tables on startup
async function initializeDatabase() {
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

module.exports = app; 