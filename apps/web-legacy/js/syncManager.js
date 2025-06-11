// APStat Park Sync Manager with Real-time Support
// Handles synchronization between localStorage and database + WebSocket real-time updates

class SyncManager {
    constructor() {
        this.apiBaseUrl = 'https://apstat-park-api.up.railway.app/api';
        this.wsBaseUrl = 'https://apstat-park-api.up.railway.app'; // WebSocket connection
        this.currentUser = null;
        this.syncInProgress = false;
        this.offlineMode = false;
        
        // Real-time WebSocket connection
        this.socket = null;
        this.connectionAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000; // Start with 2 seconds
        
        // Real-time event callbacks
        this.realtimeCallbacks = {
            progress_updates: [],
            bookmark_updates: [],
            user_activity: [],
            device_connected: [],
            device_disconnected: [],
            leaderboard_updates: []
        };
        
        // Initialize user and real-time connection
        this.initializeUser();
        this.initializeRealtime();
    }

    // Initialize real-time WebSocket connection
    async initializeRealtime() {
        try {
            // Load Socket.io from CDN if not already loaded
            if (typeof io === 'undefined') {
                await this.loadSocketIO();
            }
            
            this.connectWebSocket();
        } catch (error) {
            console.warn('Failed to initialize real-time connection:', error);
            // Continue without real-time features
        }
    }

    // Load Socket.io from CDN
    loadSocketIO() {
        return new Promise((resolve, reject) => {
            if (typeof io !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Connect to WebSocket server
    connectWebSocket() {
        // Prevent multiple connections
        if (this.socket && (this.socket.connected || this.socket.connecting)) {
            console.log('🔌 WebSocket already connected/connecting, skipping...');
            return;
        }

        // Clean up any existing socket
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        try {
            console.log('🔌 Connecting to real-time server...');
            
            this.socket = io(this.wsBaseUrl, {
                transports: ['websocket', 'polling'],
                timeout: 10000,
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: this.reconnectDelay,
                forceNew: true // Force new connection instead of reusing
            });

            this.setupSocketEventListeners();
            
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.scheduleReconnect();
        }
    }

    // Set up WebSocket event listeners
    setupSocketEventListeners() {
        this.socket.on('connect', () => {
            console.log('🚀 Real-time connection established!');
            this.connectionAttempts = 0;
            this.reconnectDelay = 2000; // Reset delay
            
            // Join with username if we have one
            if (this.currentUser && !this.currentUser.offline) {
                this.socket.emit('join', { username: this.currentUser.username });
                console.log(`👤 Joined real-time updates for: ${this.currentUser.username}`);
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.log('📡 Real-time connection lost:', reason);
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, don't reconnect automatically
                return;
            }
            this.scheduleReconnect();
        });

        this.socket.on('connect_error', (error) => {
            console.warn('WebSocket connection error:', error);
            this.scheduleReconnect();
        });

        // Real-time update handler - THIS IS THE MAGIC! ✨
        this.socket.on('realtime_update', (update) => {
            console.log('📥 Real-time update received:', update.type, update.data);
            this.handleRealtimeUpdate(update);
        });
    }

    // Handle incoming real-time updates
    async handleRealtimeUpdate(update) {
        try {
            switch (update.type) {
                case 'progress_updates':
                    await this.handleProgressUpdate(update.data);
                    break;
                case 'bookmark_updates':
                    await this.handleBookmarkUpdate(update.data);
                    break;
                case 'user_activity':
                    this.handleUserActivity(update.data);
                    break;
                case 'device_connected':
                case 'device_disconnected':
                    this.handleDeviceUpdate(update.type, update.data);
                    break;
                case 'leaderboard_updates':
                    this.handleLeaderboardUpdate(update.data);
                    break;
                default:
                    console.log('Unknown real-time update type:', update.type);
            }
            
            // Trigger callbacks for this update type
            const callbacks = this.realtimeCallbacks[update.type] || [];
            callbacks.forEach(callback => {
                try {
                    callback(update.data);
                } catch (error) {
                    console.error('Real-time callback error:', error);
                }
            });
            
        } catch (error) {
            console.error('Error handling real-time update:', error);
        }
    }

    // Handle real-time progress updates
    async handleProgressUpdate(data) {
        // Only process if it's not from this user (avoid echo)
        if (data.username === this.currentUser?.username) {
            console.log('📤 Ignoring own progress update');
            return;
        }

        console.log('📥 Processing real-time progress update from another device');
        
        // Refresh progress from server
        try {
            await this.syncProgress();
            
            // Trigger page refresh for main app elements
            this.refreshPageProgress();
            
        } catch (error) {
            console.error('Failed to sync progress after real-time update:', error);
        }
    }

    // Handle real-time bookmark updates
    async handleBookmarkUpdate(data) {
        // Check if this is from our own recent sync (timing-based approach)
        const timeSinceLastSync = Date.now() - (this.lastBookmarkSyncTime || 0);
        const isFromOwnSync = timeSinceLastSync < 2000; // 2 seconds tolerance
        
        if (isFromOwnSync && data.username === this.currentUser?.username) {
            console.log('📤 Ignoring own recent bookmark update');
            return;
        }

        console.log('📥 Processing real-time bookmark update from another device');
        
        // Refresh bookmarks from server
        try {
            await this.syncBookmarks();
            
            // Trigger page refresh for bookmark elements
            this.refreshPageBookmarks();
            
        } catch (error) {
            console.error('Failed to sync bookmarks after real-time update:', error);
        }
    }

    // Handle user activity updates
    handleUserActivity(data) {
        console.log('👀 User activity:', data.username, data.activity);
        // Can be used for "user is active in lesson X" features
    }

    // Handle device connection updates
    handleDeviceUpdate(type, data) {
        const action = type === 'device_connected' ? 'connected' : 'disconnected';
        console.log(`📱 Device ${action}, total devices: ${data.deviceCount}`);
    }

    // Handle leaderboard updates
    handleLeaderboardUpdate(data) {
        console.log('🏆 Leaderboard update:', data.username, data.action, data.data);
        // Can be used to refresh leaderboard displays or show notifications
    }

    // Refresh page progress elements (called after real-time updates)
    refreshPageProgress() {
        // Trigger refresh of progress displays
        if (typeof updateBookmarkButton === 'function') {
            updateBookmarkButton();
        }
        if (typeof updateLessonBookmarkButton === 'function') {
            updateLessonBookmarkButton();
        }
        if (typeof calculateNextDeadline === 'function') {
            calculateNextDeadline();
        }
        if (typeof initializeUnitsData === 'function') {
            initializeUnitsData();
        }
        if (typeof generateUnitsGrid === 'function') {
            generateUnitsGrid();
        }
        
        // Trigger storage event to notify other tabs
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'apStatsProgress',
            newValue: localStorage.getItem('apStatsProgress')
        }));
    }

    // Refresh page bookmark elements (called after real-time updates)
    refreshPageBookmarks() {
        // Add delay to prevent rapid-fire updates
        setTimeout(() => {
            // Trigger refresh of bookmark displays
            if (typeof updateBookmarkButton === 'function') {
                updateBookmarkButton();
            }
            if (typeof updateLessonBookmarkButton === 'function') {
                updateLessonBookmarkButton();
            }
            
            // Trigger storage event to notify other tabs (with delay to prevent loops)
            setTimeout(() => {
                window.dispatchEvent(new StorageEvent('storage', {
                    key: 'item_bookmarks',
                    newValue: localStorage.getItem('item_bookmarks')
                }));
                window.dispatchEvent(new StorageEvent('storage', {
                    key: 'bookmarked_lessons',
                    newValue: localStorage.getItem('bookmarked_lessons')
                }));
            }, 50);
        }, 100);
    }

    // Schedule reconnection with exponential backoff
    scheduleReconnect() {
        if (this.connectionAttempts >= this.maxReconnectAttempts) {
            console.log('🚫 Max reconnection attempts reached, giving up');
            return;
        }

        this.connectionAttempts++;
        
        console.log(`🔄 Scheduling reconnect attempt ${this.connectionAttempts} in ${this.reconnectDelay}ms`);
        
        setTimeout(() => {
            this.connectWebSocket();
        }, this.reconnectDelay);
        
        // Exponential backoff: 2s, 4s, 8s, 16s, 32s
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 32000);
    }

    // Send user activity to real-time server
    sendUserActivity(activity) {
        if (this.socket && this.socket.connected && this.currentUser && !this.currentUser.offline) {
            this.socket.emit('user_activity', activity);
        }
    }

    // Register callback for real-time updates
    onRealtimeUpdate(type, callback) {
        if (this.realtimeCallbacks[type]) {
            this.realtimeCallbacks[type].push(callback);
        }
    }

    // Remove callback for real-time updates
    offRealtimeUpdate(type, callback) {
        if (this.realtimeCallbacks[type]) {
            const index = this.realtimeCallbacks[type].indexOf(callback);
            if (index > -1) {
                this.realtimeCallbacks[type].splice(index, 1);
            }
        }
    }

    // Calculate gold star when lesson is completed
    async calculateGoldStar(lessonId) {
        if (!this.currentUser || this.currentUser.offline) {
            console.log('Cannot calculate gold star: offline or no user');
            return null;
        }

        try {
            const response = await this.fetchWithTimeout(
                `/users/${this.currentUser.id}/gold-star`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lessonId: lessonId,
                        completionTime: new Date().toISOString()
                    })
                }
            );

            if (response.ok) {
                const result = await response.json();
                console.log('🌟 Gold star calculation result:', result);
                return result;
            }
        } catch (error) {
            console.error('Failed to calculate gold star:', error);
        }
        return null;
    }

    // Get user's gold star stats
    async getGoldStarStats() {
        if (!this.currentUser || this.currentUser.offline) {
            return { totalStars: 0, currentStreak: 0, nextTargetHours: null };
        }

        try {
            const response = await this.fetchWithTimeout(
                `/users/${this.currentUser.id}/gold-stars`
            );

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Failed to get gold star stats:', error);
        }
        return { totalStars: 0, currentStreak: 0, nextTargetHours: null };
    }

    // Get leaderboard
    async getLeaderboard() {
        try {
            const response = await this.fetchWithTimeout(
                `/leaderboard`
            );

            if (response.ok) {
                const result = await response.json();
                return result.leaderboard || [];
            }
        } catch (error) {
            console.error('Failed to get leaderboard:', error);
        }
        return [];
    }

    // Initialize or get existing user
    async initializeUser() {
        try {
            // Check if we have a stored user
            const storedUser = localStorage.getItem('apstat_user');
            if (storedUser) {
                this.currentUser = JSON.parse(storedUser);
                console.log('Loaded existing user:', this.currentUser.username);
                
                // Join real-time room if connected
                if (this.socket && this.socket.connected) {
                    this.socket.emit('join', { username: this.currentUser.username });
                }
                
                // Try to sync in background (non-blocking)
                this.backgroundSync();
                return this.currentUser;
            }

            // Try to get or create a new user
            const response = await this.fetchWithTimeout('/users/get-or-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            }, 5000);

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                localStorage.setItem('apstat_user', JSON.stringify(this.currentUser));
                console.log('Created new user:', this.currentUser.username);
                
                // Join real-time room
                if (this.socket && this.socket.connected) {
                    this.socket.emit('join', { username: this.currentUser.username });
                }
                
                // Initial sync
                this.backgroundSync();
                return this.currentUser;
            } else {
                throw new Error('Failed to create user');
            }
        } catch (error) {
            console.warn('Failed to initialize user online, using offline mode:', error);
            this.offlineMode = true;
            
            // Create temporary offline user
            this.currentUser = {
                id: 'offline',
                username: 'offline-user',
                offline: true
            };
            
            return this.currentUser;
        }
    }

    // Get current user info (for displaying username)
    getCurrentUser() {
        return this.currentUser;
    }

    // Background sync (non-blocking)
    async backgroundSync() {
        if (this.syncInProgress || this.offlineMode) return;
        
        try {
            console.log('Starting background sync...');
            await Promise.race([
                this.fullSync(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Sync timeout')), 10000))
            ]);
            console.log('Background sync completed');
        } catch (error) {
            console.warn('Background sync failed:', error);
            // Don't set offline mode for background sync failures
        }
    }

    // Quick sync for individual actions (video/quiz completion)
    async quickSync(type, data) {
        if (this.syncInProgress || this.offlineMode) return { success: false, reason: 'offline' };
        
        try {
            const result = await Promise.race([
                this.syncData(type, data),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Quick sync timeout')), 3000))
            ]);
            return { success: true, data: result };
        } catch (error) {
            console.warn('Quick sync failed:', error);
            return { success: false, reason: 'timeout' };
        }
    }

    // Persistent sync for lesson completion
    async persistentSync(type, data) {
        if (this.offlineMode) return { success: false, reason: 'offline' };
        
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            try {
                this.syncInProgress = true;
                const result = await Promise.race([
                    this.syncData(type, data),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Persistent sync timeout')), 10000))
                ]);
                
                this.syncInProgress = false;
                return { success: true, data: result };
            } catch (error) {
                attempts++;
                console.warn(`Persistent sync attempt ${attempts} failed:`, error);
                
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Exponential backoff
                }
            }
        }
        
        this.syncInProgress = false;
        return { success: false, reason: 'max_attempts_reached' };
    }

    // Full sync (used for background sync)
    async fullSync() {
        if (!this.currentUser || this.currentUser.offline) return;
        
        this.syncInProgress = true;
        
        try {
            // Sync progress
            await this.syncProgress();
            
            // Sync bookmarks
            await this.syncBookmarks();
            
            console.log('Full sync completed successfully');
        } finally {
            this.syncInProgress = false;
        }
    }

    // Sync progress data
    async syncProgress() {
        if (!this.currentUser || this.currentUser.offline) return;
        
        // Track sync time to avoid processing our own real-time updates
        this.lastProgressSyncTime = Date.now();
        
        // Get local progress
        const localProgress = this.getLocalProgressForSync();
        
        const response = await this.fetchWithTimeout(`/users/${this.currentUser.id}/progress/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ progressData: localProgress })
        });
        
        if (!response.ok) throw new Error('Progress sync failed');
        
        const data = await response.json();
        
        // Update local storage with merged data
        this.updateLocalProgressFromSync(data.progress);
        
        return data;
    }

    // Sync bookmarks
    async syncBookmarks() {
        if (!this.currentUser || this.currentUser.offline) return;
        
        // Track sync time to avoid processing our own real-time updates
        this.lastBookmarkSyncTime = Date.now();
        
        // Get local bookmarks
        const localBookmarks = this.getLocalBookmarksForSync();
        
        const response = await this.fetchWithTimeout(`/users/${this.currentUser.id}/bookmarks/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookmarks: localBookmarks })
        });
        
        if (!response.ok) throw new Error('Bookmark sync failed');
        
        const data = await response.json();
        
        // Update local storage with synced bookmarks
        this.updateLocalBookmarksFromSync(data.bookmarks);
        
        return data;
    }

    // Generic sync data method
    async syncData(type, data) {
        switch (type) {
            case 'progress':
                return await this.syncProgress();
            case 'bookmarks':
                return await this.syncBookmarks();
            default:
                throw new Error(`Unknown sync type: ${type}`);
        }
    }

    // Helper: Get local progress in sync format
    getLocalProgressForSync() {
        const progressData = {};
        
        // Get main app progress
        const saved = localStorage.getItem('apStatsProgress');
        if (saved) {
            const mainProgress = JSON.parse(saved);
            
            // Convert completed lessons to individual progress entries
            for (const lessonId of mainProgress.completedLessons || []) {
                progressData[lessonId] = {
                    lessonCompleted: true,
                    completedAt: new Date().toISOString(),
                    videosWatched: [],
                    quizzesCompleted: []
                };
            }
        }
        
        // Get detailed lesson progress
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('lesson_progress_')) {
                const lessonId = key.replace('lesson_progress_', '');
                const lessonProgress = JSON.parse(localStorage.getItem(key));
                
                if (!progressData[lessonId]) {
                    progressData[lessonId] = {};
                }
                
                Object.assign(progressData[lessonId], {
                    videosWatched: lessonProgress.videosWatched || [],
                    quizzesCompleted: lessonProgress.quizzesCompleted || [],
                    lessonCompleted: lessonProgress.lessonCompleted || false
                });
            }
        }
        
        return progressData;
    }

    // Helper: Update local progress from sync
    updateLocalProgressFromSync(serverProgress) {
        const completedLessons = [];
        
        for (const progress of serverProgress) {
            // Update detailed lesson progress
            localStorage.setItem(`lesson_progress_${progress.lesson_id}`, JSON.stringify({
                videosWatched: progress.videos_watched || [],
                quizzesCompleted: progress.quizzes_completed || [],
                lessonCompleted: progress.lesson_completed || false
            }));
            
            // Collect completed lessons
            if (progress.lesson_completed) {
                completedLessons.push(progress.lesson_id);
            }
        }
        
        // Update main app progress
        const mainProgress = {
            completedLessons: completedLessons,
            currentLesson: completedLessons.length > 0 ? completedLessons[completedLessons.length - 1] : '1-1'
        };
        
        localStorage.setItem('apStatsProgress', JSON.stringify(mainProgress));
    }

    // Helper: Get local bookmarks in sync format
    getLocalBookmarksForSync() {
        const bookmarks = [];
        
        // Get lesson bookmarks
        const lessonBookmarks = JSON.parse(localStorage.getItem('bookmarked_lessons') || '[]');
        for (const lessonId of lessonBookmarks) {
            bookmarks.push({
                type: 'lesson',
                lessonId: lessonId
            });
        }
        
        // Get item bookmarks
        const itemBookmarks = JSON.parse(localStorage.getItem('item_bookmarks') || '[]');
        for (const item of itemBookmarks) {
            bookmarks.push({
                type: 'item',
                lessonId: item.lessonId,
                index: item.index,
                itemType: item.type,
                title: item.title
            });
        }
        
        return bookmarks;
    }

    // Helper: Update local bookmarks from sync
    updateLocalBookmarksFromSync(serverBookmarks) {
        const lessonBookmarks = [];
        const itemBookmarks = [];
        
        for (const bookmark of serverBookmarks) {
            if (bookmark.bookmark_type === 'lesson') {
                lessonBookmarks.push(bookmark.lesson_id);
            } else if (bookmark.bookmark_type === 'item') {
                itemBookmarks.push({
                    lessonId: bookmark.lesson_id,
                    type: bookmark.item_type,
                    index: bookmark.item_index,
                    title: bookmark.item_title
                });
            }
        }
        
        // Update local storage
        localStorage.setItem('bookmarked_lessons', JSON.stringify(lessonBookmarks));
        localStorage.setItem('item_bookmarks', JSON.stringify(itemBookmarks));
    }

    // Helper: Fetch with timeout
    async fetchWithTimeout(endpoint, options, timeout = 5000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(this.apiBaseUrl + endpoint, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    // Public method to trigger sync for external use
    async triggerSync(type = 'full', data = null) {
        if (type === 'quick') {
            // Quick sync includes both progress and bookmarks
            try {
                await this.syncProgress();
                await this.syncBookmarks();
                return { success: true };
            } catch (error) {
                console.warn('Quick sync failed:', error);
                return { success: false, reason: 'sync_failed' };
            }
        } else if (type === 'persistent') {
            return await this.persistentSync('progress', data);
        } else {
            return await this.fullSync();
        }
    }
    
    // Check if online/offline
    isOnline() {
        return !this.offlineMode && navigator.onLine;
    }

    // Check if real-time connection is active
    isRealtimeConnected() {
        return this.socket && this.socket.connected;
    }

    // Method to switch to a different username
    async switchToUsername(newUsername) {
        if (!newUsername || typeof newUsername !== 'string') {
            throw new Error('Invalid username');
        }
        
        // Clean up the username
        newUsername = newUsername.trim().toLowerCase();
        
        if (!/^[a-zA-Z0-9]+$/.test(newUsername)) {
            throw new Error('Username can only contain letters and numbers');
        }
        
        if (newUsername.length < 3 || newUsername.length > 20) {
            throw new Error('Username must be 3-20 characters long');
        }
        
        // Check if it's the same username
        if (this.currentUser && this.currentUser.username === newUsername) {
            throw new Error('You are already using this username');
        }
        
        try {
            // Try to find existing user or create new one with specific username
            const response = await this.fetchWithTimeout('/users/get-or-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: newUsername })
            }, 10000);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Store the new user info
            this.currentUser = data.user;
            this.offlineMode = false; // Reset offline mode if switching worked
            localStorage.setItem('apstat_user', JSON.stringify(this.currentUser));
            
            // Join new real-time room
            if (this.socket && this.socket.connected) {
                this.socket.emit('join', { username: this.currentUser.username });
                console.log(`👤 Joined real-time updates for new username: ${this.currentUser.username}`);
            }
            
            // Sync to download progress from new account
            try {
                await this.fullSync();
            } catch (syncError) {
                console.warn('Initial sync after username switch failed:', syncError);
                // Don't fail the switch if sync fails
            }
            
            console.log(`Successfully switched to username: ${newUsername}`);
            return this.currentUser;
            
        } catch (error) {
            console.error('Failed to switch username:', error);
            if (error.message.includes('fetch') || error.message.includes('network')) {
                throw new Error('Network error - please check your internet connection');
            }
            throw error;
        }
    }
}

// Create global sync manager instance
window.syncManager = new SyncManager(); 