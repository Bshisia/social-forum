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
    }

    async fetchMessageHistory() {
        try {
            // Show loading state
            const messagesContainer = document.getElementById('messages-container');
            if (messagesContainer) {
                messagesContainer.innerHTML = `
                    <div class="loading-messages">
                        <div class="loading-spinner"></div>
                        <p>Loading messages...</p>
                    </div>
                `;
            }

            const response = await fetch(`/api/chat/history?user1=${this.currentUserId}&user2=${this.otherUserId}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch message history');
            }

            this.messages = await response.json();
            this.renderMessages();
        } catch (error) {
            console.error('Error fetching message history:', error);
            const messagesContainer = document.getElementById('messages-container');
            if (messagesContainer) {
                messagesContainer.innerHTML = `
                    <div class="message-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <button onclick="window.chatComponent.fetchMessageHistory()" class="retry-button">
                            <i class="fas fa-sync"></i> Retry
                        </button>
                    </div>
                `;
            }
        }
    }

    async fetchOtherUserName() {
        try {
            const response = await fetch(`/api/users/${this.otherUserId}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user details');
            }

            const user = await response.json();
            // Handle different API response formats
            this.otherUserName = user.username || user.UserName || user.name || user.Nickname || user.nickname || 'Unknown User';
            
            // Update the header with the user's name
            const chatHeader = document.querySelector('.chat-header h2');
            if (chatHeader) {
                chatHeader.textContent = `Chat with ${this.otherUserName}`;
            }
        } catch (error) {
            console.error('Error fetching user details:', error);
            this.otherUserName = 'Unknown User'; // Fallback in case of an error
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
        await this.fetchMessageHistory();
        
        // Initialize WebSocket connection
        this.initializeWebSocket();
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
                    <span>${this.otherUserName} is typing...</span>
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
        this.socket = new WebSocket(`${protocol}//${host}/ws/chat?user1=${this.currentUserId}&user2=${this.otherUserId}`);
        
        // Connection opened
        this.socket.addEventListener('open', (event) => {
            console.log('WebSocket connection established');
            this.updateConnectionStatus(true);
        });
        
        // Listen for messages
        this.socket.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            
            // Handle different message types
            switch(data.type) {
                case 'message':
                    this.handleIncomingMessage(data.message);
                    break;
                case 'typing':
                    this.showTypingIndicator(true);
                    break;
                case 'stop_typing':
                    this.showTypingIndicator(false);
                    break;
                case 'user_status':
                    this.updateUserStatus(data.status === 'online');
                    break;
                default:
                    console.log('Unknown message type:', data.type);
            }
        });
        
        // Connection closed
        this.socket.addEventListener('close', (event) => {
            console.log('WebSocket connection closed');
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
        // If the user is already marked as typing, clear the previous timer
        if (this.isTyping) {
            clearTimeout(this.typingTimer);
        } else {
            // If not already typing, send typing indicator
            this.isTyping = true;
            this.sendTypingStatus(true);
        }
        
        // Set a timer to stop typing indicator after some inactivity
        this.typingTimer = setTimeout(() => {
            this.isTyping = false;
            this.sendTypingStatus(false);
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
    }
    
    showTypingIndicator(show) {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.style.display = show ? 'block' : 'none';
        }
    }

    async handleSendMessage() {
        const messageInput = document.getElementById('message-input');
        if (!messageInput) return;

        const content = messageInput.value.trim();
        if (!content) return;

        try {
            // Create message object
            const messageObj = {
                sender: this.currentUserId,
                recipient: this.otherUserId,
                content,
                timestamp: new Date().toISOString()
            };

            // Clear the input after sending
            messageInput.value = '';
            
            // Stop typing indicator
            this.isTyping = false;
            this.sendTypingStatus(false);
            
            // Add message to UI immediately for better UX
            this.addMessageToUI(messageObj, true);

            // Send message via WebSocket if connected
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: 'message',
                    message: messageObj
                }));
            } else {
                // Fallback to REST API if WebSocket is not connected
                const response = await fetch('/api/chat/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(messageObj),
                });

                if (!response.ok) {
                    throw new Error('Failed to send message');
                }
            }

            console.log('Message sent successfully');
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
        // Add the new message to our messages array
        this.messages.push(message);
        
        // Add message to the UI
        this.addMessageToUI(message, false);
        
        // Play notification sound if the message is from the other user
        if (message.sender === this.otherUserId) {
            this.playNotificationSound();
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
        
        // Format the timestamp
        const timestamp = new Date(message.timestamp);
        const formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Set message content
        messageDiv.innerHTML = `
            <div class="message-content">${this.formatMessageContent(message.content)}</div>
            <div class="message-time">${formattedTime}</div>
        `;
        
        // Add message to container
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to the bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
        this.messages.forEach(message => {
            const isSent = message.sender === this.currentUserId;
            this.addMessageToUI(message, isSent);
        });
        
        // Scroll to the bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
        
        // Remove global reference
        delete window.chatComponent;
    }
}

export default ChatComponent;