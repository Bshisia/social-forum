class ChatComponent {
    constructor(currentUserId, otherUserId) {
        this.currentUserId = currentUserId; // ID of the current logged-in user
        this.otherUserId = otherUserId; // ID of the user being chatted with
        this.otherUserName = ''; // Name of the user being chatted with
        this.container = document.getElementById('main-content');
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
            this.otherUserName = user.username || user.name || 'Unknown User'; // Adjust based on your API response
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

        // Fetch the name of the user being chatted with
        await this.fetchOtherUserName();

        // Render the chat UI
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="chat-container">
                <div class="chat-header">
                    <button class="back-button" onclick="window.history.back()">Back</button>
                    <h2>Chat with ${this.otherUserName}</h2>
                </div>
                <div class="messages-container" id="messages-container">
                    <!-- Messages will be dynamically loaded here -->
                </div>
                <div class="message-input-container">
                    <textarea id="message-input" placeholder="Type your message here..." class="message-input"></textarea>
                    <button id="send-message-btn">Send</button>
                </div>
            </div>
        `;

        // Attach event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        const sendBtn = document.getElementById('send-message-btn');
        const messageInput = document.getElementById('message-input');

        if (sendBtn && messageInput) {
            sendBtn.addEventListener('click', () => this.handleSendMessage());
        }
    }

    async handleSendMessage() {
        const messageInput = document.getElementById('message-input');
        if (!messageInput) return;

        const content = messageInput.value.trim();
        if (!content) return;

        try {
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    sender: this.currentUserId,
                    recipient: this.otherUserId,
                    content,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            messageInput.value = ''; // Clear the input after sending
            console.log('Message sent successfully');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
}

export default ChatComponent;