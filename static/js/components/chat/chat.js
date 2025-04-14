class ChatComponent {
    constructor(container, selectedUser) {
        this.container = container;
        this.selectedUser = selectedUser; // The user to chat with
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
            }
        ];
    }

    mount() {
        if (!this.container) {
            console.error('Cannot mount ChatComponent: container not found');
            return;
        }

        this.messages = this.mockMessages.filter(
            msg => msg.senderId === parseInt(this.selectedUser.id) || msg.senderId === this.currentUser.id
        ); // Filter messages for the selected user
        this.render();
        this.attachEventListeners();
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