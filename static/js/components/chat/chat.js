import eventBus from '../../utils/event-bus.js';

class ChatComponent {
    constructor(currentUserId, otherUserId) {
        this.currentUserId = currentUserId; // ID of the current logged-in user
        this.otherUserId = otherUserId; // ID of the user being chatted with
        this.otherUserName = ''; // Name of the user being chatted with
        this.container = document.getElementById('main-content');
        this.messages = []; // Store messages
        this.socket = null; // WebSocket connection
        this.isTyping = false; // Typing indicator state
        this.typingTimer = null; // Timer for typing indicator
        this.page = 1;
        this.messagesPerPage = 10;
        this.hasMoreMessages = true;
        this.isLoadingMore = false;
        this.scrollThrottleTimer = null;
        this.statusEventUnsubscribe = null; // For event bus cleanup
    }

    async fetchMessageHistory(loadMore = false) {
        if (this.isLoadingMore) return;

        try {
            this.isLoadingMore = true;

            // Show loading state only on initial load
            if (!loadMore) {
                const messagesContainer = document.getElementById('messages-container');
                if (messagesContainer) {
                    messagesContainer.innerHTML = `
                        <div class="loading-messages">
                            <div class="loading-spinner"></div>
                            <p>Loading messages...</p>
                        </div>
                    `;
                }
            }

            console.log(`Fetching message history between ${this.currentUserId} and ${this.otherUserId}, page ${this.page}`);
            const timestamp = new Date().getTime();
            const response = await fetch(
                `/api/chat/history?user1=${this.currentUserId}&user2=${this.otherUserId}&page=${this.page}&limit=${this.messagesPerPage}&_=${timestamp}`,
                {
                    credentials: 'include',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Server error (${response.status}): ${errorText}`);
                throw new Error('Failed to fetch message history');
            }

            const data = await response.json();
            console.log('Message history received:', data);

            // Check if we have more messages to load
            this.hasMoreMessages = data.length === this.messagesPerPage;

            // Ensure messages is always an array
            const newMessages = Array.isArray(data) ? data : [];

            if (loadMore) {
                // Prepend new messages to existing ones
                this.messages = [...newMessages, ...this.messages];
            } else {
                // Replace messages on initial load
                this.messages = newMessages;
            }

            // Log each message for debugging
            this.messages.forEach((msg, index) => {
                console.log(`Message ${index + 1}:`, JSON.stringify(msg));
            });

            if (loadMore) {
                this.renderAdditionalMessages(newMessages);
            } else {
                this.renderMessages();
            }

            return true;
        } catch (error) {
            console.error('Error fetching message history:', error);
            if (!loadMore) {
                const messagesContainer = document.getElementById('messages-container');
                if (messagesContainer) {
                    messagesContainer.innerHTML = `
                        <div class="message-error">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Failed to load message history. Please try again.</p>
                            <button onclick="window.chatComponent.fetchMessageHistory()" class="retry-button">
                                <i class="fas fa-sync"></i> Retry
                            </button>
                        </div>
                    `;
                }
            }
            return false;
        } finally {
            this.isLoadingMore = false;
        }
    }

    async fetchOtherUserName() {
        try {
            console.log(`Fetching details for user ID: ${this.otherUserId}`);

            // Add a timestamp to prevent caching
            const timestamp = new Date().getTime();
            const response = await fetch(`/api/users/${this.otherUserId}?_=${timestamp}`, {
                credentials: 'include',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Server error (${response.status}): ${errorText}`);
                throw new Error(`Failed to fetch user details: ${response.status}`);
            }

            const user = await response.json();
            console.log('User details received:', user);

            // Use the first available name property
            this.otherUserName = user.nickname || user.username || user.email || `User ${this.otherUserId.substring(0, 8)}`;

            // Update the header with the user's name
            const chatHeader = document.querySelector('.chat-header h2');
            if (chatHeader) {
                chatHeader.textContent = `Chat with ${this.otherUserName}`;
            }

            return true;
        } catch (error) {
            console.error('Error fetching user details:', error);

            // Try fetching all users and finding the one we need
            try {
                const allUsersResponse = await fetch('/api/users', {
                    credentials: 'include',
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                });

                if (allUsersResponse.ok) {
                    const allUsers = await allUsersResponse.json();
                    const matchingUser = allUsers.find(u => u.id === this.otherUserId);

                    if (matchingUser) {
                        this.otherUserName = matchingUser.nickname || matchingUser.username ||
                                            matchingUser.email || `User ${this.otherUserId.substring(0, 8)}`;

                        // Update the header with the user's name
                        const chatHeader = document.querySelector('.chat-header h2');
                        if (chatHeader) {
                            chatHeader.textContent = `Chat with ${this.otherUserName}`;
                        }

                        return true;
                    }
                }
            } catch (fallbackError) {
                console.error('Error in fallback user fetch:', fallbackError);
            }

            // Use a fallback name if all else fails
            this.otherUserName = `User ${this.otherUserId.substring(0, 8)}`;

            // Update the header with the fallback name
            const chatHeader = document.querySelector('.chat-header h2');
            if (chatHeader) {
                chatHeader.textContent = `Chat with ${this.otherUserName}`;
            }

            // Show error message in the chat
            const messagesContainer = document.getElementById('messages-container');
            if (messagesContainer) {
                messagesContainer.innerHTML = `
                    <div class="chat-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Could not load user details. The user may not exist or there might be a connection issue.</p>
                        <button onclick="window.location.reload()" class="retry-button">
                            <i class="fas fa-sync"></i> Retry
                        </button>
                    </div>
                `;
            }

            return false;
        }
    }

    async mount() {
        if (!this.container) {
            console.error('ChatComponent: main-content container not found');
            return;
        }

        // Make the component accessible globally for event handlers
        window.chatComponent = this;

        // Render the chat UI
        this.render();

        // Fetch the name of the user being chatted with
        await this.fetchOtherUserName();

        // Fetch message history
        this.page = 1; // Reset to first page
        const historyLoaded = await this.fetchMessageHistory();

        if (!historyLoaded) {
            console.warn('Failed to load message history, will try again after WebSocket connection');
        }

        // Initialize WebSocket connection
        this.initializeWebSocket();

        // Check if the global users navigation WebSocket is available
        if (window.globalUsersNav) {
            // Get the initial status of the other user
            const isOnline = window.globalUsersNav.getUserStatus(this.otherUserId);
            console.log(`Initial status of user ${this.otherUserId}: ${isOnline ? 'Online' : 'Offline'}`);
            this.updateUserStatus(isOnline);
        }

        // Subscribe to user status changes
        this.statusEventUnsubscribe = eventBus.on('user_status_change', (data) => {
            // Check if this status update is for the user we're chatting with
            if (data.userId === this.otherUserId) {
                console.log(`Status update for chat partner: ${data.isOnline ? 'Online' : 'Offline'}`);
                this.updateUserStatus(data.isOnline);
            }
        });

        // Setup scroll listener for pagination
        this.setupScrollListener();

        // Add event listener for page unload to clean up resources
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    render() {
        this.container.innerHTML = `
            <div class="chat-container">
                <div class="chat-header">
                    <button class="back-button" onclick="window.history.back()">
                        <i class="fas fa-arrow-left"></i> Back
                    </button>
                    <h2>Chat with ${this.otherUserName}</h2>
                    <div class="chat-status" id="connection-status">
                        <span class="status-indicator offline"></span>
                        <span class="status-text">Offline</span>
                    </div>
                </div>
                <div class="messages-container" id="messages-container">
                    <!-- Messages will be dynamically loaded here -->
                    <div class="loading-messages">
                        <div class="loading-spinner"></div>
                        <p>Loading messages...</p>
                    </div>
                </div>
                <div class="typing-indicator" id="typing-indicator" style="display: none;">
                    <span>${this.otherUserName} is typing</span>
                    <div class="dots">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </div>
                </div>
                <div class="message-input-container">
                    <textarea
                        id="message-input"
                        placeholder="Type your message here..."
                        class="message-input"
                        onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); window.chatComponent.handleSendMessage(); }"
                        onkeyup="window.chatComponent.handleTyping()"
                    ></textarea>
                    <button id="send-message-btn" onclick="window.chatComponent.handleSendMessage()">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;
    }

    initializeWebSocket() {
        // Get the protocol (ws or wss)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;

        // Create WebSocket connection
        // The order of user1 and user2 is important - user1 is the current user, user2 is the chat partner
        this.socket = new WebSocket(`${protocol}//${host}/ws/chat?user1=${this.currentUserId}&user2=${this.otherUserId}`);

        // Connection opened
        this.socket.addEventListener('open', () => {
            console.log('WebSocket connection established for chat with', this.otherUserId);
            this.updateConnectionStatus(true);
        });

        // Listen for messages
        this.socket.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            console.log('Received WebSocket message:', data);

            // Validate that the message is intended for this chat
            if (data.type === 'message' && data.message) {
                const sender = data.message.sender;
                const recipient = data.message.recipient;

                // Only process messages that are part of this conversation
                if ((sender === this.currentUserId && recipient === this.otherUserId) ||
                    (sender === this.otherUserId && recipient === this.currentUserId)) {
                    this.handleIncomingMessage(data.message);
                } else {
                    console.log('Ignoring message not related to this chat');
                }
            } else if (data.type === 'typing' || data.type === 'stop_typing') {
                const sender = data.sender;
                const recipient = data.recipient;

                // Only process typing indicators that are part of this conversation
                if (sender === this.otherUserId && recipient === this.currentUserId) {
                    this.showTypingIndicator(data.type === 'typing');

                    // Also emit an event for the users_nav component
                    eventBus.emit('user_typing_status', {
                        userId: sender,
                        recipientId: recipient,
                        isTyping: data.type === 'typing'
                    });
                }
            } else {
                console.log('Unknown message type:', data.type);
            }
        });

        // Connection closed
        this.socket.addEventListener('close', () => {
            console.log('WebSocket connection closed for chat with', this.otherUserId);
            this.updateConnectionStatus(false);

            // Try to reconnect after a delay
            setTimeout(() => {
                if (document.getElementById('messages-container')) {  // Check if component is still mounted
                    this.initializeWebSocket();
                }
            }, 3000);
        });

        // Connection error
        this.socket.addEventListener('error', (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus(false);
        });
    }

    updateConnectionStatus(isConnected) {
        const statusIndicator = document.querySelector('#connection-status .status-indicator');
        const statusText = document.querySelector('#connection-status .status-text');

        if (statusIndicator && statusText) {
            if (isConnected) {
                statusIndicator.classList.remove('offline');
                statusIndicator.classList.add('online');
                statusText.textContent = 'Online';
            } else {
                statusIndicator.classList.remove('online');
                statusIndicator.classList.add('offline');
                statusText.textContent = 'Offline';
            }
        }
    }

    updateUserStatus(isOnline) {
        // Update the UI to show if the other user is online or offline
        const statusIndicator = document.querySelector('#connection-status .status-indicator');
        const statusText = document.querySelector('#connection-status .status-text');

        if (statusIndicator && statusText) {
            if (isOnline) {
                statusIndicator.classList.remove('offline');
                statusIndicator.classList.add('online');
                statusText.textContent = `${this.otherUserName} is online`;
            } else {
                statusIndicator.classList.remove('online');
                statusIndicator.classList.add('offline');
                statusText.textContent = `${this.otherUserName} is offline`;
            }
        }
    }

    handleTyping() {
        const messageInput = document.getElementById('message-input');

        // If the user is already marked as typing, clear the previous timer
        if (this.isTyping) {
            clearTimeout(this.typingTimer);
        } else {
            // If not already typing, send typing indicator
            this.isTyping = true;
            this.sendTypingStatus(true);

            // Add typing animation to the input field
            if (messageInput) {
                messageInput.classList.add('typing');
            }
        }

        // Set a timer to stop typing indicator after some inactivity
        this.typingTimer = setTimeout(() => {
            this.isTyping = false;
            this.sendTypingStatus(false);

            // Remove typing animation from the input field
            if (messageInput) {
                messageInput.classList.remove('typing');
            }
        }, 2000);
    }

    sendTypingStatus(isTyping) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: isTyping ? 'typing' : 'stop_typing',
                sender: this.currentUserId,
                recipient: this.otherUserId
            }));
        }

        // Also emit an event for the users_nav component
        eventBus.emit('user_typing_status', {
            userId: this.currentUserId,
            recipientId: this.otherUserId,
            isTyping: isTyping
        });
    }

    showTypingIndicator(show) {
        const typingIndicator = document.getElementById('typing-indicator');
        if (!typingIndicator) return;

        if (show) {
            // Add fade-in animation
            typingIndicator.style.opacity = '0';
            typingIndicator.style.display = 'flex';

            // Trigger reflow to ensure the animation works
            void typingIndicator.offsetWidth;

            // Apply fade-in
            typingIndicator.style.transition = 'opacity 0.3s ease-in-out';
            typingIndicator.style.opacity = '1';
        } else {
            // Fade out
            typingIndicator.style.opacity = '0';

            // Hide after animation completes
            setTimeout(() => {
                if (typingIndicator.style.opacity === '0') {
                    typingIndicator.style.display = 'none';
                }
            }, 300);
        }
    }

    async handleSendMessage() {
        const messageInput = document.getElementById('message-input');
        if (!messageInput) return;

        const content = messageInput.value.trim();
        if (!content) return;

        try {
            console.log(`Sending message to ${this.otherUserId}: ${content}`);

            // Create message object
            const messageObj = {
                sender_id: this.currentUserId,
                receiver_id: this.otherUserId,
                content,
                timestamp: new Date().toISOString()
            };

            // Clear the input after sending
            messageInput.value = '';

            // Stop typing indicator
            this.isTyping = false;
            this.sendTypingStatus(false);

            // Add message to UI immediately for better UX
            const tempId = Date.now(); // Temporary ID
            const uiMessage = {
                id: tempId,
                sender: this.currentUserId,
                recipient: this.otherUserId,
                content,
                timestamp: messageObj.timestamp
            };
            this.addMessageToUI(uiMessage, true);

            // Simulate status updates (in a real app, these would come from the server)
            this.simulateMessageStatusUpdates(tempId);

            // Send message via WebSocket if connected
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                console.log('Sending message via WebSocket');
                this.socket.send(JSON.stringify({
                    type: 'message',
                    message: {
                        sender: this.currentUserId,
                        recipient: this.otherUserId,
                        content,
                        timestamp: messageObj.timestamp
                    }
                }));
            } else {
                // Fallback to REST API if WebSocket is not connected
                console.log('WebSocket not connected, using REST API fallback');
                const response = await fetch('/api/chat/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(messageObj),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Server error (${response.status}): ${errorText}`);
                    throw new Error('Failed to send message');
                }

                const result = await response.json();
                console.log('Message sent successfully via REST API:', result);

                // If the message was sent via REST API, add it to our messages array
                if (result.success && result.message) {
                    const savedMessage = {
                        id: result.message.id,
                        sender: result.message.sender_id,
                        recipient: result.message.receiver_id,
                        content: result.message.content,
                        timestamp: result.message.sent_at
                    };
                    this.messages.push(savedMessage);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Show error message
            const messagesContainer = document.getElementById('messages-container');
            if (messagesContainer) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'message-sending-error';
                errorDiv.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Failed to send message. Please try again.</span>
                `;
                messagesContainer.appendChild(errorDiv);

                // Auto-remove error after some time
                setTimeout(() => {
                    errorDiv.remove();
                }, 5000);
            }
        }
    }

    handleIncomingMessage(message) {
        console.log('Received message:', JSON.stringify(message));

        // Verify this message belongs to the current chat conversation
        if ((message.sender === this.currentUserId && message.recipient === this.otherUserId) ||
            (message.sender === this.otherUserId && message.recipient === this.currentUserId)) {

            // Add the new message to our messages array
            this.messages.push(message);

            // Add message to the UI
            const isSent = message.sender === this.currentUserId;
            this.addMessageToUI(message, isSent);

            // Play notification sound if the message is from the other user
            if (message.sender === this.otherUserId) {
                this.playNotificationSound();
            }
        } else {
            console.log('Ignoring message not related to this chat conversation');
        }
    }

    playNotificationSound() {
        // Create and play a notification sound
        const audio = new Audio('/static/notification.mp3');
        audio.play().catch(err => console.log('Error playing notification sound:', err));
    }

    addMessageToUI(message, isSent) {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;

        // Clear any loading or empty state messages
        if (messagesContainer.querySelector('.loading-messages') ||
            messagesContainer.querySelector('.empty-chat')) {
            messagesContainer.innerHTML = '';
        }

        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        messageDiv.dataset.id = message.id; // Store message ID for reference

        // Add initial hidden state for animation
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = `translateY(${isSent ? '10px' : '-10px'})`;
        messageDiv.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';

        // Format the timestamp
        let formattedTime = 'Unknown time';
        try {
            const timestamp = new Date(message.timestamp);
            if (!isNaN(timestamp.getTime())) {
                formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else {
                console.warn('Invalid timestamp format:', message.timestamp);
                // Try alternative format (SQLite format)
                const parts = message.timestamp.split(/[- :]/);
                if (parts.length >= 6) {
                    const altTimestamp = new Date(
                        parts[0], parts[1]-1, parts[2], parts[3], parts[4], parts[5]
                    );
                    formattedTime = altTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
            }
        } catch (e) {
            console.error('Error formatting timestamp:', e, message.timestamp);
        }

        // Set message content with status indicator for sent messages
        messageDiv.innerHTML = `
            <div class="message-content">${this.formatMessageContent(message.content)}</div>
            <div class="message-time">
                ${formattedTime}
                ${isSent ? `<span class="message-status sent" data-message-id="${message.id}">
                    <i class="fas fa-check"></i>
                </span>` : ''}
            </div>
        `;

        // Add message to container
        messagesContainer.appendChild(messageDiv);

        // Trigger animation after a small delay (allows DOM to update)
        setTimeout(() => {
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        }, 10);

        // Scroll to the bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Add a subtle highlight effect that fades out
        setTimeout(() => {
            const contentEl = messageDiv.querySelector('.message-content');
            if (contentEl) {
                contentEl.style.transition = 'box-shadow 1.5s ease-out';
                contentEl.style.boxShadow = `0 0 10px ${isSent ? 'rgba(79, 70, 229, 0.5)' : 'rgba(255, 255, 255, 0.3)'}`;

                setTimeout(() => {
                    contentEl.style.boxShadow = 'none';
                }, 1500);
            }
        }, 300);
    }

    formatMessageContent(content) {
        // Basic formatting: Convert URLs to clickable links
        return content.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
    }

    renderMessages() {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;

        // Clear messages container
        messagesContainer.innerHTML = '';

        console.log(`Rendering ${this.messages.length} messages`);

        if (this.messages.length === 0) {
            // Show empty state
            messagesContainer.innerHTML = `
                <div class="empty-chat">
                    <i class="fas fa-comments"></i>
                    <p>No messages yet. Send a message to start the conversation!</p>
                </div>
            `;
            return;
        }

        // Render all messages
        this.messages.forEach((message, index) => {
            console.log('Rendering message:', JSON.stringify(message));
            // Determine if this message was sent by the current user
            const isSent = message.sender === this.currentUserId;
            this.addMessageToUI(message, isSent);

            // For sent messages, update status based on position
            // This simulates different statuses for demonstration
            if (isSent) {
                // Use setTimeout to stagger the animations
                setTimeout(() => {
                    // Messages at the end are "sent", older ones are "delivered" or "read"
                    const totalMessages = this.messages.length;
                    if (index >= totalMessages - 1) {
                        // Most recent message is just "sent"
                        this.updateMessageStatus(message.id, 'sent');
                    } else if (index >= totalMessages - 2) {
                        // Second most recent is "delivered"
                        this.updateMessageStatus(message.id, 'delivered');
                    } else {
                        // Older messages are "read"
                        this.updateMessageStatus(message.id, 'read');
                    }
                }, index * 100); // Stagger the animations
            }
        });

        // Scroll to the bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Update message status (sent, delivered, read)
    updateMessageStatus(messageId, status) {
        // Find all status indicators for this message
        const statusElements = document.querySelectorAll(`.message-status[data-message-id="${messageId}"]`);

        if (statusElements.length === 0) {
            console.warn(`No status element found for message ID: ${messageId}`);
            return;
        }

        statusElements.forEach(element => {
            // Remove previous status classes
            element.classList.remove('sent', 'delivered', 'read');

            // Add new status class
            element.classList.add(status);

            // Add animation class
            element.classList.add('animate');

            // Update the icon based on status
            let icon = 'fa-check';
            if (status === 'delivered') {
                icon = 'fa-check-double';
            } else if (status === 'read') {
                icon = 'fa-check-double';
            }

            element.innerHTML = `<i class="fas ${icon}"></i>`;

            // Remove animation class after animation completes
            setTimeout(() => {
                element.classList.remove('animate');
            }, 300);
        });
    }

    // Simulate status updates for demo purposes
    simulateMessageStatusUpdates(messageId) {
        // Simulate delivered status after a short delay
        setTimeout(() => {
            this.updateMessageStatus(messageId, 'delivered');

            // Simulate read status after another delay
            setTimeout(() => {
                this.updateMessageStatus(messageId, 'read');
            }, 2000);
        }, 1000);
    }

    // Clean up resources when navigating away
    cleanup() {
        // Close WebSocket connection
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        // Clear typing timer
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
            this.typingTimer = null;
        }

        // Unsubscribe from event bus
        if (this.statusEventUnsubscribe) {
            this.statusEventUnsubscribe();
            this.statusEventUnsubscribe = null;
        }

        // Remove global reference
        delete window.chatComponent;
    }

    async checkDatabaseConnection() {
        try {
            console.log('Checking database connection...');
            const response = await fetch(`/api/debug/messages?user1=${this.currentUserId}&user2=${this.otherUserId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('Database check failed:', response.status);
                return false;
            }

            const data = await response.json();
            console.log('Database check result:', data);

            // Display the result in the UI for debugging
            const messagesContainer = document.getElementById('messages-container');
            if (messagesContainer) {
                messagesContainer.innerHTML = `
                    <div class="debug-info">
                        <h3>Database Check</h3>
                        <p>Found ${data.count} messages between users</p>
                        <pre>${JSON.stringify(data.messages, null, 2)}</pre>
                        <button onclick="window.chatComponent.fetchMessageHistory()" class="retry-button">
                            <i class="fas fa-sync"></i> Load Normal Chat
                        </button>
                    </div>
                `;
            }

            return data.count > 0;
        } catch (error) {
            console.error('Error checking database:', error);
            return false;
        }
    }

    setupScrollListener() {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;

        messagesContainer.addEventListener('scroll', () => {
            // Throttle scroll events
            if (this.scrollThrottleTimer) return;

            this.scrollThrottleTimer = setTimeout(() => {
                this.scrollThrottleTimer = null;

                // Check if we're near the top and have more messages to load
                if (messagesContainer.scrollTop < 50 && this.hasMoreMessages && !this.isLoadingMore) {
                    this.page++;
                    this.fetchMessageHistory(true);
                }
            }, 200); // 200ms throttle
        });
    }

    renderAdditionalMessages(newMessages) {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;

        // Remember scroll height before adding new messages
        const scrollHeightBefore = messagesContainer.scrollHeight;

        // Create document fragment for better performance
        const fragment = document.createDocumentFragment();

        // Render new messages at the top
        newMessages.forEach(message => {
            const isSent = message.sender === this.currentUserId;
            const messageDiv = this.createMessageElement(message, isSent);
            fragment.appendChild(messageDiv);
        });

        // Insert at the beginning
        if (messagesContainer.firstChild) {
            messagesContainer.insertBefore(fragment, messagesContainer.firstChild);
        } else {
            messagesContainer.appendChild(fragment);
        }

        // Adjust scroll position to maintain view
        const newScrollHeight = messagesContainer.scrollHeight;
        messagesContainer.scrollTop = newScrollHeight - scrollHeightBefore;
    }
}

export default ChatComponent;
