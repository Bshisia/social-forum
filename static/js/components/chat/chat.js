class ChatComponent {
    constructor(container) {
        this.container = container;
        this.users = []; // List of online users
    }

    async fetchOnlineUsers() {
        try {
            const response = await fetch('/api/online-users', { credentials: 'include' });
            if (!response.ok) {
                throw new Error('Failed to fetch online users');
            }
            this.users = await response.json();
        } catch (error) {
            console.error('Error fetching online users:', error);
            this.users = []; // Fallback to an empty list
        }
    }

    async mount() {
        if (!this.container) {
            console.error('Cannot mount ChatComponent: container not found');
            return;
        }

        // Fetch and display the list of online users
        await this.fetchOnlineUsers();
        this.renderUserList();
    }

    renderUserList() {
        this.container.innerHTML = `
            <div class="chat-users-container">
                <h2>Online Users</h2>
                <ul class="users-list">
                    ${this.users.length > 0
                        ? this.users.map(user => `
                            <li class="user-item" data-user-id="${user.id}" data-user-name="${user.username}">
                                <span class="user-name">${user.username}</span>
                            </li>
                        `).join('')
                        : '<li>No users online</li>'}
                </ul>
            </div>
        `;

        // Attach click event listeners to user items
        const userItems = this.container.querySelectorAll('.user-item');
        userItems.forEach(item => {
            item.addEventListener('click', (event) => {
                const userId = event.currentTarget.getAttribute('data-user-id');
                const userName = event.currentTarget.getAttribute('data-user-name');

                // Open chat with the selected user
                this.openChat(userId, userName);
            });
        });
    }

    openChat(userId, userName) {
        console.log(`Opening chat with user: ${userName} (ID: ${userId})`);
        // Implement chat opening logic here
    }
}

// Export the component
export default ChatComponent;