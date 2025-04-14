class UsersNavComponent {
    constructor(users = []) {
        this.users = users;
        this.container = document.getElementById('users-nav');
    }

    render() {
        this.container.innerHTML = `
            <div class="users-filter-container">
                <h3>Users</h3>
                <ul class="users-list">
                    ${this.users.length > 0 ? this.users.map(user => {
                        const userId = user.id || user.ID;
                        const userName = user.username || user.UserName || 'Unknown User';
                        const profilePic = user.avatar || user.profilePic || 'default-profile-pic.png';

                        return `
                            <li class="user-item" data-user-id="${userId}" data-user-name="${userName}" data-user-avatar="${profilePic}">
                                <img src="${profilePic}" alt="${userName}" class="user-avatar">
                                <span class="user-name">${userName}</span>
                            </li>
                        `;
                    }).join('') : '<li>No users available</li>'}
                </ul>
            </div>
        `;

        this.attachEventListeners();
    }

    attachEventListeners() {
        const userItems = this.container.querySelectorAll('.user-item');
        userItems.forEach(item => {
            item.addEventListener('click', (event) => {
                const userId = event.currentTarget.getAttribute('data-user-id');
                const userName = event.currentTarget.getAttribute('data-user-name');
                const userAvatar = event.currentTarget.getAttribute('data-user-avatar');

                this.openChat(userId, userName, userAvatar);
            });
        });
    }

    openChat(userId, userName, userAvatar) {
        // Load the chat component with the selected user's data
        const chatContainer = document.getElementById('main-content');
        const chatComponent = new ChatComponent(chatContainer, {
            id: userId,
            username: userName,
            avatar: userAvatar
        });
        chatComponent.mount();
    }
}

// Export the component
export default UsersNavComponent;