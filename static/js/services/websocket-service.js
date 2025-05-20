/**
 * WebSocket Service
 * Manages WebSocket connections and real-time notifications
 */
import eventBus from '../utils/event-bus.js';
import AuthService from './auth-service.js';

class WebSocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 3000; // 3 seconds
        this.userStatuses = new Map(); // Track user statuses
        this.currentUserId = null;
        this.pendingMessages = []; // Store messages that couldn't be sent due to disconnection
    }

    /**
     * Initialize the WebSocket connection
     * @returns {Promise} Promise that resolves when the connection is established
     */
    initialize() {
        return new Promise((resolve, reject) => {
            if (this.socket && this.connected) {
                console.log('WebSocket already connected');
                resolve();
                return;
            }

            // Get the current user ID
            this.currentUserId = AuthService.getCurrentUser()?.id;
            if (!this.currentUserId) {
                console.warn('No user ID found, cannot initialize WebSocket');
                reject(new Error('No user ID found'));
                return;
            }

            // Create the WebSocket connection
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}/ws?user_id=${this.currentUserId}`;

            console.log('Connecting to WebSocket:', wsUrl);
            this.socket = new WebSocket(wsUrl);

            // Set up event handlers
            this.socket.addEventListener('open', () => {
                console.log('✅ WebSocket connected successfully');
                this.connected = true;
                this.reconnectAttempts = 0;

                // Send any pending messages
                if (this.pendingMessages.length > 0) {
                    console.log(`Sending ${this.pendingMessages.length} pending messages`);
                    this.pendingMessages.forEach(msg => this.send(msg));
                    this.pendingMessages = [];
                }

                // Emit connection event
                eventBus.emit('websocket_connected');
                resolve();
            });

            this.socket.addEventListener('message', this.handleMessage.bind(this));

            this.socket.addEventListener('close', () => {
                console.log('WebSocket disconnected');
                this.connected = false;

                // Emit disconnection event
                eventBus.emit('websocket_disconnected');

                // Try to reconnect
                this.reconnect();
                reject(new Error('WebSocket disconnected'));
            });

            this.socket.addEventListener('error', (error) => {
                console.error('WebSocket error:', error);
                this.connected = false;

                // Emit error event
                eventBus.emit('websocket_error', error);
                reject(error);
            });
        });
    }

    /**
     * Handle incoming WebSocket messages
     * @param {MessageEvent} event - The WebSocket message event
     */
    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('Received WebSocket message type:', data.type);

            switch (data.type) {
                case 'user_status':
                    this.handleUserStatus(data);
                    break;
                case 'new_user':
                    this.handleNewUser(data);
                    break;
                case 'message':
                case 'refresh_users':
                    this.handleRefreshUsers(data);
                    break;
                case 'new_notification':
                    this.handleNewNotification(data);
                    break;
                case 'users_list':
                    this.handleUsersList(data);
                    break;
                case 'typing':
                case 'stop_typing':
                    this.handleTypingStatus(data);
                    break;
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    }

    /**
     * Handle typing status updates
     * @param {Object} data - The typing status data
     */
    handleTypingStatus(data) {
        console.log('Received typing status update:', data);

        // Forward the typing status to the chat component via event bus
        // No notification will be sent for typing events
        eventBus.emit('user_typing_status', {
            userId: data.sender,
            recipientId: data.recipient,
            isTyping: data.type === 'typing'
        });
    }

    /**
     * Handle user status updates
     * @param {Object} data - The status update data
     */
    handleUserStatus(data) {
        console.log('Received status update:', data);

        // Store the user status
        this.userStatuses.set(data.user_id, data.is_online);

        // Emit an event for components to listen to
        eventBus.emit('user_status_change', {
            userId: data.user_id,
            isOnline: data.is_online
        });
    }

    /**
     * Handle new user notifications
     * @param {Object} data - The new user data
     */
    handleNewUser(data) {
        console.log('Received new user notification:', data);

        // Store the user status
        if (data.user && data.user.id) {
            this.userStatuses.set(data.user.id, data.user.is_online || true);

            // Emit an event for components to listen to
            eventBus.emit('user_signup', data.user);
        }
    }

    /**
     * Handle refresh users notifications
     * @param {Object} data - The refresh data
     */
    handleRefreshUsers(data) {
        console.log('Received message or refresh notification:', data);

        // Emit an event to refresh the users list
        eventBus.emit('refresh_users_list');
    }

    /**
     * Handle new notifications
     * @param {Object} data - The notification data
     */
    handleNewNotification(data) {
        console.log('Received new notification:', data);

        // Only process if this notification is for the current user
        if (data.receiverID === this.currentUserId) {
            // Show notification popup
            this.showNotificationPopup(data.notification);

            // Emit an event for the notification component to handle
            eventBus.emit('new_notification', {
                notification: data.notification,
                unreadCount: data.unreadCount
            });

            // Update the notification count in the navbar
            if (window.navbarComponent && typeof window.navbarComponent.updateNotificationCount === 'function') {
                window.navbarComponent.updateNotificationCount(data.unreadCount);
            }
        }
    }

    /**
     * Handle users list updates
     * @param {Object} data - The users list data
     */
    handleUsersList(data) {
        console.log('Received users list update:', data);

        // Update user statuses from the list
        if (data.users && Array.isArray(data.users)) {
            data.users.forEach(user => {
                if (user.ID || user.id) {
                    const userId = user.ID || user.id;
                    this.userStatuses.set(userId, user.isOnline || user.is_online || false);
                }
            });
        }

        // Emit an event for the users_nav component
        eventBus.emit('users_list_update', data.users);
    }

    // Notification sound removed as per user request

    /**
     * Show a notification popup
     * @param {Object} notification - The notification data
     */
    showNotificationPopup(notification) {
        // This will be handled by the notifications component
        eventBus.emit('show_notification_popup', notification);
    }

    /**
     * Get the online status of a user
     * @param {string} userId - The user ID to check
     * @returns {boolean} - True if the user is online, false otherwise
     */
    getUserStatus(userId) {
        return this.userStatuses.get(userId) || false;
    }

    /**
     * Send a message through the WebSocket
     * @param {Object} message - The message to send
     * @returns {boolean} - True if the message was sent, false otherwise
     */
    send(message) {
        if (!this.socket || !this.connected) {
            console.warn('Cannot send message: WebSocket not connected');
            // Store the message to send later
            this.pendingMessages.push(message);
            return false;
        }

        try {
            this.socket.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Error sending WebSocket message:', error);
            return false;
        }
    }

    /**
     * Try to reconnect to the WebSocket
     */
    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn('Max reconnect attempts reached, giving up');
            return;
        }

        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

        setTimeout(() => {
            this.initialize().catch(() => {
                // If reconnection fails, the close event will trigger another reconnect attempt
            });
        }, this.reconnectInterval);
    }

    /**
     * Send typing status to another user
     * @param {string} recipientId - The ID of the user receiving the typing status
     * @param {boolean} isTyping - Whether the current user is typing or not
     * @returns {boolean} - True if the status was sent, false otherwise
     */
    sendTypingStatus(recipientId, isTyping) {
        if (!this.currentUserId || !recipientId) {
            console.warn('Cannot send typing status: Missing user IDs');
            return false;
        }

        const message = {
            type: isTyping ? 'typing' : 'stop_typing',
            sender: this.currentUserId,
            recipient: recipientId
        };

        // Send via WebSocket
        const sent = this.send(message);

        // Also emit an event for local components
        eventBus.emit('user_typing_status', {
            userId: this.currentUserId,
            recipientId: recipientId,
            isTyping: isTyping
        });

        return sent;
    }

    /**
     * Close the WebSocket connection
     */
    close() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this.connected = false;
        }
    }
}

// Create a singleton instance
const websocketService = new WebSocketService();

// Export the singleton
export default websocketService;
