import eventBus from './js/utils/event-bus.js';

class UsersNavigation {
    constructor(updateCallback) {
        this.socket = null;
        this.currentUserId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.updateCallback = updateCallback;
        this.userStatuses = new Map(); // Track user statuses
        this.initializeWebSocket();
    }

    initializeWebSocket() {
        console.log('Initializing WebSocket...');

        this.currentUserId = localStorage.getItem('userId');
        if (!this.currentUserId) {
            console.log('No userId found in localStorage');
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws?user_id=${this.currentUserId}`;

        console.log('Connecting to WebSocket:', wsUrl);

        this.socket = new WebSocket(wsUrl);

        this.socket.addEventListener('open', () => {
            console.log('✅ Users navigation WebSocket connected successfully');
            this.reconnectAttempts = 0;
        });

        this.socket.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received WebSocket message:', data);
                if (data.type === 'user_status') {
                    console.log('Received status update:', data);

                    // Store the user status
                    this.userStatuses.set(data.user_id, data.is_online);

                    // Call the callback for UI updates in users_nav
                    if (this.updateCallback) {
                        this.updateCallback(data.user_id, data.is_online);
                    }

                    // Emit an event for other components to listen to
                    eventBus.emit('user_status_change', {
                        userId: data.user_id,
                        isOnline: data.is_online
                    });
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        });

        this.socket.addEventListener('close', () => {
            console.log('Users navigation WebSocket disconnected');
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => this.initializeWebSocket(), 3000);
            }
        });
    }

    /**
     * Get the online status of a user
     * @param {string} userId - The user ID to check
     * @returns {boolean} - True if the user is online, false otherwise
     */
    getUserStatus(userId) {
        return this.userStatuses.get(userId) || false;
    }

    cleanup() {
        if (this.socket) {
            this.socket.close();
        }
    }
}

export default UsersNavigation;