class ChatComponent {
    constructor(container, selectedUser = null) {
        this.container = container;
        this.selectedUser = selectedUser; // The user to chat with (null if listing users)
        this.messages = [];
        this.currentUser = {
            id: 1,
            username: "CurrentUser",
            avatar: "https://via.placeholder.com/40"
        };
        this.users = []; // List of available users
    }

    async fetchUsers() {
        try {
            const response = await fetch('/api/users', { credentials: 'include' });
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            this.users = await response.json();
        } catch (error) {
            console.error('Error fetching users:', error);
            // Use mock data if API fails
            this.users = [
                { id: 2, username: 'John Doe', avatar: 'https://via.placeholder.com/40' },
                { id: 3, username: 'Jane Smith', avatar: 'https://via.placeholder.com/40' }
            ];
        }
    }

    async mount() {
        if (!this.container) {
            console.error('Cannot mount ChatComponent: container not found');
            return;
        }

        if (!this.selectedUser) {
            // Fetch and display the list of users
            await this.fetchUsers();
            this.renderUserList();
        } else {
            // Display the chat interface for the selected user
            this.render();
            this.attachEventListeners();
        }
    }

    renderUserList() {
        this.container.innerHTML = `
            <div class="chat-users-container">
                <h2>Available Users</h2>
                <ul class="users-list">
                    ${this.users.map(user => `
                        <li class="user-item" data-user-id="${user.id}" data-user-name="${user.username}" data-user-avatar="${user.avatar}">
                            <img src="${user.avatar}" alt="${user.username}" class="user-avatar">
                            <span class="user-name">${user.username}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;

        // Attach click event listeners to user items
        const userItems = this.container.querySelectorAll('.user-item');
        userItems.forEach(item => {
            item.addEventListener('click', (event) => {
                const userId = event.currentTarget.getAttribute('data-user-id');
                const userName = event.currentTarget.getAttribute('data-user-name');
                const userAvatar = event.currentTarget.getAttribute('data-user-avatar');

                // Open chat with the selected user
                this.selectedUser = { id: userId, username: userName, avatar: userAvatar };
                this.mount();
            });
        });
    }

    render() {
        this.container.innerHTML = `
            <div class="chat-container">
                <div class="chat-header">
                    <div class="chat-user-info">
                        <img src="${this.selectedUser.avatar}" alt="User avatar" class="avatar">
                        <span class="username">${this.selectedUser.username}</span>
                    </div>
                </div>
                <div class="chat-messages" id="chat-messages">
                    ${this.renderMessages()}
                </div>
                <div class="chat-input-container">
                    <input type="text" id="chat-input" placeholder="Type a message...">
                    <button id="send-message" class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;

        // Auto scroll to the bottom of the messages
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    renderMessages() {
        return this.messages.map(message => `
            <div class="message ${message.senderId === this.currentUser.id ? 'message-sent' : 'message-received'}">
                ${message.senderId !== this.currentUser.id ? `
                    <img src="${message.senderAvatar}" alt="Avatar" class="message-avatar">
                ` : ''}
                <div class="message-content">
                    <div class="message-bubble">
                        ${message.content}
                    </div>
                    <div class="message-info">
                        <span class="message-time">${this.formatTime(message.timestamp)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    attachEventListeners() {
        const input = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-message');

        const sendMessage = () => {
            const content = input.value.trim();
            if (content) {
                const message = {
                    id: this.messages.length + 1,
                    senderId: this.currentUser.id,
                    senderName: this.currentUser.username,
                    senderAvatar: this.currentUser.avatar,
                    content: content,
                    timestamp: new Date().toISOString()
                };
                this.messages.push(message);
                this.render();
                input.value = '';
            }
        };

        sendButton.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
}

// Export the component
export default ChatComponent;