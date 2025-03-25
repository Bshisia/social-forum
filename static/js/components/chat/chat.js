class ChatComponent {
    constructor() {
        this.container = null;
        this.messages = [];
        this.currentUser = {
            id: 1,
            username: "CurrentUser",
            avatar: "https://via.placeholder.com/40"
        };
        
        // Mock data for testing
        this.mockMessages = [
            {
                id: 1,
                senderId: 2,
                senderName: "John Doe",
                senderAvatar: "https://via.placeholder.com/40",
                content: "Hey, how are you?",
                timestamp: "2024-03-24T10:00:00"
            },
            {
                id: 2,
                senderId: 1,
                senderName: "CurrentUser",
                senderAvatar: "https://via.placeholder.com/40",
                content: "I'm good, thanks! How about you?",
                timestamp: "2024-03-24T10:01:00"
            },
            {
                id: 3,
                senderId: 2,
                senderName: "John Doe",
                senderAvatar: "https://via.placeholder.com/40",
                content: "Doing great! Working on the new project.",
                timestamp: "2024-03-24T10:02:00"
            }
        ];
    }

    mount(container = document.getElementById('main-content')) {
        this.container = container;
        if (!this.container) {
            console.error('Cannot mount ChatComponent: container not found');
            return;
        }

        this.messages = this.mockMessages; // In real app, fetch from API
        this.render();
        this.attachEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="chat-container">
                <div class="chat-header post-card">
                    <div class="chat-user-info">
                        <img src="${this.mockMessages[0].senderAvatar}" alt="User avatar" class="avatar">
                        <span class="username">${this.mockMessages[0].senderName}</span>
                    </div>
                </div>
                <div class="chat-messages post-card" id="chat-messages">
                    ${this.renderMessages()}
                </div>
                <div class="chat-input-container post-card">
                    <input type="text" id="chat-input" class="form-group" placeholder="Type a message...">
                    <button id="send-message" class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;

        // Auto scroll to bottom of messages
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    renderMessages() {
        return this.messages.map(message => {
            const isCurrentUser = message.senderId === this.currentUser.id;
            return `
                <div class="message ${isCurrentUser ? 'message-sent' : 'message-received'}">
                    ${!isCurrentUser ? `
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
            `;
        }).join('');
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
    }

    attachEventListeners() {
        const input = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-message');

        const sendMessage = () => {
            const content = input.value.trim();
            if (content) {
                this.addMessage({
                    id: this.messages.length + 1,
                    senderId: this.currentUser.id,
                    senderName: this.currentUser.username,
                    senderAvatar: this.currentUser.avatar,
                    content: content,
                    timestamp: new Date().toISOString()
                });
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

    addMessage(message) {
        this.messages.push(message);
        this.render();
    }
}

export default ChatComponent;