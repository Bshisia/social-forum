class ChatComponent {
    constructor(container) {
        this.container = container;
        this.users = []; // List of users (online/offline with last message)
        this.currentChat = null;
        this.ws = null;
        this.messagePage = 1;
        this.loadingMessages = false;
        this.hasMoreMessages = true;
    }

    async initWebSocket() {
        // Connect to WebSocket
        this.ws = new WebSocket(`ws://${window.location.host}/ws`);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            switch(data.type) {
                case 'private_message':
                    this.handleIncomingMessage(data);
                    break;
                case 'status_update':
                    this.handleStatusUpdate(data);
                    break;
            }
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            // Try to reconnect after 5 seconds
            setTimeout(() => this.initWebSocket(), 5000);
        };
    }

    async fetchUsers() {
        try {
            // Fetch all users with their last message and online status
            const response = await fetch('/api/users', { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch users');
            
            const allUsers = await response.json();
            
            // Fetch online users
            const onlineResponse = await fetch('/api/online-users', { credentials: 'include' });
            const onlineUsers = onlineResponse.ok ? await onlineResponse.json() : [];
            
            // Fetch last messages for each conversation
            const currentUser = await AuthService.getCurrentUser();
            
            // Process users
            this.users = await Promise.all(allUsers.map(async user => {
                if (user.id === currentUser.id) return null;
                
                // Get last message in conversation
                const lastMsgResponse = await fetch(`/api/private-messages?user_id=${user.id}&limit=1`, {
                    credentials: 'include'
                });
                
                let lastMessage = null;
                if (lastMsgResponse.ok) {
                    const messages = await lastMsgResponse.json();
                    if (messages.length > 0) {
                        lastMessage = messages[0];
                    }
                }
                
                return {
                    id: user.id,
                    nickname: user.nickname,
                    profilePic: user.profile_pic || '',
                    isOnline: onlineUsers.some(u => u.id === user.id),
                    lastMessage: lastMessage,
                    unreadCount: 0 // We'll update this later
                };
            }));
            
            // Filter out current user and null values
            this.users = this.users.filter(u => u !== null);
            
            // Sort users: online first, then by last message date, then alphabetically
            this.users.sort((a, b) => {
                // Online users first
                if (a.isOnline !== b.isOnline) {
                    return a.isOnline ? -1 : 1;
                }
                
                // Then by last message date (most recent first)
                if (a.lastMessage && b.lastMessage) {
                    return new Date(b.lastMessage.sent_at) - new Date(a.lastMessage.sent_at);
                } else if (a.lastMessage) {
                    return -1;
                } else if (b.lastMessage) {
                    return 1;
                }
                
                // Finally alphabetically
                return a.nickname.localeCompare(b.nickname);
            });
            
            // Fetch unread counts
            await this.fetchUnreadCounts();
            
        } catch (error) {
            console.error('Error fetching users:', error);
            this.users = [];
        }
    }
    
    async fetchUnreadCounts() {
        try {
            const response = await fetch('/api/private-messages/unread-counts', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const counts = await response.json();
                this.users.forEach(user => {
                    const count = counts[user.id] || 0;
                    user.unreadCount = count;
                });
            }
        } catch (error) {
            console.error('Error fetching unread counts:', error);
        }
    }

    async mount() {
        if (!this.container) {
            console.error('Cannot mount ChatComponent: container not found');
            return;
        }

        await this.initWebSocket();
        await this.fetchUsers();
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="chat-container">
                <div class="users-panel">
                    <div class="users-header">
                        <h3>Chat</h3>
                        <div class="search-box">
                            <input type="text" placeholder="Search users..." class="search-input">
                        </div>
                    </div>
                    <ul class="users-list">
                        ${this.users.map(user => this.renderUserItem(user)).join('')}
                    </ul>
                </div>
                <div class="chat-panel">
                    <div class="chat-header">
                        ${this.currentChat ? `
                            <div class="chat-partner">
                                <span class="status-indicator ${this.currentChat.isOnline ? 'online' : 'offline'}"></span>
                                <span class="partner-name">${this.currentChat.nickname}</span>
                            </div>
                        ` : `
                            <div class="no-chat-selected">
                                <p>Select a user to start chatting</p>
                            </div>
                        `}
                    </div>
                    <div class="messages-container" id="messages-container">
                        ${this.currentChat ? this.renderMessages() : ''}
                    </div>
                    ${this.currentChat ? `
                        <div class="message-input">
                            <textarea placeholder="Type a message..." class="message-textarea"></textarea>
                            <button class="send-button">Send</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Add event listeners
        this.addEventListeners();
        
        // If there's a current chat, scroll to bottom
        if (this.currentChat) {
            this.scrollToBottom();
        }
    }

    renderUserItem(user) {
        return `
            <li class="user-item ${this.currentChat?.id === user.id ? 'active' : ''}" 
                data-user-id="${user.id}">
                <div class="user-avatar">
                    <img src="${user.profilePic || '/static/images/default-avatar.png'}" alt="${user.nickname}">
                    <span class="status-indicator ${user.isOnline ? 'online' : 'offline'}"></span>
                </div>
                <div class="user-info">
                    <span class="user-name">${user.nickname}</span>
                    ${user.lastMessage ? `
                        <span class="last-message">
                            ${user.lastMessage.sender_id === (AuthService.getCurrentUser()?.id) ? 
                                'You: ' : ''}
                            ${user.lastMessage.content.length > 30 ? 
                                user.lastMessage.content.substring(0, 30) + '...' : 
                                user.lastMessage.content}
                        </span>
                    ` : ''}
                </div>
                ${user.unreadCount > 0 ? `
                    <span class="unread-count">${user.unreadCount}</span>
                ` : ''}
            </li>
        `;
    }

    renderMessages() {
        if (!this.currentChat.messages) {
            return '<div class="loading-messages">Loading messages...</div>';
        }

        if (this.currentChat.messages.length === 0) {
            return '<div class="no-messages">No messages yet. Start the conversation!</div>';
        }

        return `
            <div class="messages-list" id="messages-list">
                ${this.currentChat.messages.map(msg => this.renderMessage(msg)).join('')}
                ${this.hasMoreMessages ? `
                    <div class="load-more-container">
                        <button class="load-more-btn">Load older messages</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderMessage(msg) {
        const isMe = msg.sender_id === (AuthService.getCurrentUser()?.id);
        const messageTime = new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="message ${isMe ? 'sent' : 'received'}">
                <div class="message-content">
                    ${!isMe ? `<span class="sender-name">${msg.sender_name}</span>` : ''}
                    <p>${msg.content}</p>
                    <span class="message-time">${messageTime}</span>
                </div>
            </div>
        `;
    }

    addEventListeners() {
        // User item click
        this.container.querySelectorAll('.user-item').forEach(item => {
            item.addEventListener('click', () => {
                const userId = item.getAttribute('data-user-id');
                this.openChat(userId);
            });
        });

        // Send message
        if (this.currentChat) {
            const textarea = this.container.querySelector('.message-textarea');
            const sendBtn = this.container.querySelector('.send-button');
            
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            sendBtn.addEventListener('click', () => this.sendMessage());
            
            // Load more messages when scrolling to top
            const messagesList = this.container.querySelector('#messages-list');
            if (messagesList) {
                messagesList.addEventListener('scroll', this.handleScroll.bind(this));
            }
            
            // Load more button
            const loadMoreBtn = this.container.querySelector('.load-more-btn');
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener('click', () => this.loadMoreMessages());
            }
        }
    }

    async openChat(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        this.currentChat = {
            id: user.id,
            nickname: user.nickname,
            isOnline: user.isOnline,
            messages: null
        };
        
        this.messagePage = 1;
        this.hasMoreMessages = true;
        
        // Show loading state
        this.render();
        
        // Fetch initial messages
        await this.fetchMessages();
        
        // Mark messages as read
        await this.markMessagesAsRead();
        
        // Update user's unread count
        user.unreadCount = 0;
        
        // Re-render
        this.render();
    }

    async fetchMessages() {
        if (this.loadingMessages || !this.currentChat) return;
        
        this.loadingMessages = true;
        
        try {
            const response = await fetch(
                `/api/private-messages?user_id=${this.currentChat.id}&page=${this.messagePage}`,
                { credentials: 'include' }
            );
            
            if (response.ok) {
                const messages = await response.json();
                
                if (messages.length === 0 && this.messagePage > 1) {
                    this.hasMoreMessages = false;
                } else {
                    if (!this.currentChat.messages) {
                        this.currentChat.messages = [];
                    }
                    
                    // For first page, replace messages
                    if (this.messagePage === 1) {
                        this.currentChat.messages = messages;
                    } else {
                        // For subsequent pages, prepend messages
                        this.currentChat.messages = [...messages, ...this.currentChat.messages];
                    }
                    
                    this.messagePage++;
                }
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            this.loadingMessages = false;
        }
    }

    async markMessagesAsRead() {
        if (!this.currentChat) return;
        
        try {
            await fetch('/api/mark-messages-read', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sender_id: this.currentChat.id
                })
            });
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    async sendMessage() {
        const textarea = this.container.querySelector('.message-textarea');
        const content = textarea.value.trim();
        
        if (!content || !this.currentChat) return;
        
        try {
            // Optimistically add message to UI
            const currentUser = await AuthService.getCurrentUser();
            const newMessage = {
                id: 'temp-' + Date.now(),
                sender_id: currentUser.id,
                receiver_id: this.currentChat.id,
                content: content,
                sent_at: new Date().toISOString(),
                is_read: false,
                sender_name: currentUser.nickname,
                receiver_name: this.currentChat.nickname,
                is_me: true
            };
            
            if (!this.currentChat.messages) {
                this.currentChat.messages = [];
            }
            
            this.currentChat.messages.push(newMessage);
            this.render();
            
            // Clear input
            textarea.value = '';
            
            // Send via WebSocket
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'private_message',
                    receiver_id: this.currentChat.id,
                    content: content
                }));
            }
            
            // Update last message in users list
            const user = this.users.find(u => u.id === this.currentChat.id);
            if (user) {
                user.lastMessage = {
                    sender_id: currentUser.id,
                    content: content,
                    sent_at: newMessage.sent_at
                };
                
                // Re-sort users
                this.users.sort((a, b) => {
                    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
                    if (a.lastMessage && b.lastMessage) {
                        return new Date(b.lastMessage.sent_at) - new Date(a.lastMessage.sent_at);
                    }
                    return a.nickname.localeCompare(b.nickname);
                });
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    handleIncomingMessage(data) {
        // Check if message is for current chat
        if (this.currentChat && data.sender_id === this.currentChat.id) {
            // Add to messages
            if (!this.currentChat.messages) {
                this.currentChat.messages = [];
            }
            
            this.currentChat.messages.push({
                ...data,
                is_me: false,
                sender_name: this.users.find(u => u.id === data.sender_id)?.nickname || 'Unknown'
            });
            
            // Re-render
            this.render();
            
            // Mark as read
            this.markMessagesAsRead();
        }
        
        // Update last message in users list
        const user = this.users.find(u => u.id === data.sender_id);
        if (user) {
            user.lastMessage = {
                sender_id: data.sender_id,
                content: data.content,
                sent_at: data.timestamp
            };
            
            // If not current chat, increment unread count
            if (!this.currentChat || this.currentChat.id !== data.sender_id) {
                user.unreadCount = (user.unreadCount || 0) + 1;
            }
            
            // Re-sort users
            this.users.sort((a, b) => {
                if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
                if (a.lastMessage && b.lastMessage) {
                    return new Date(b.lastMessage.sent_at) - new Date(a.lastMessage.sent_at);
                }
                return a.nickname.localeCompare(b.nickname);
            });
        }
    }

    handleStatusUpdate(data) {
        const user = this.users.find(u => u.id === data.user_id);
        if (user) {
            user.isOnline = data.is_online;
            
            // If this is the current chat, update its status
            if (this.currentChat && this.currentChat.id === data.user_id) {
                this.currentChat.isOnline = data.is_online;
            }
            
            // Re-render
            this.render();
        }
    }

    handleScroll() {
        const messagesList = this.container.querySelector('#messages-list');
        if (!messagesList || this.loadingMessages || !this.hasMoreMessages) return;
        
        // If scrolled near top, load more messages
        if (messagesList.scrollTop < 100) {
            this.loadMoreMessages();
        }
    }

    async loadMoreMessages() {
        if (this.loadingMessages || !this.hasMoreMessages) return;
        
        // Show loading indicator
        const messagesList = this.container.querySelector('#messages-list');
        if (messagesList) {
            const scrollHeight = messagesList.scrollHeight;
            const scrollTop = messagesList.scrollTop;
            
            await this.fetchMessages();
            
            // Restore scroll position
            requestAnimationFrame(() => {
                messagesList.scrollTop = messagesList.scrollHeight - scrollHeight + scrollTop;
            });
        }
    }

    scrollToBottom() {
        const messagesContainer = this.container.querySelector('#messages-container');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
}

export default ChatComponent;