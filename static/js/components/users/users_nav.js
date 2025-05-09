import UsersNavigation from '../../../websocket.js';

class UsersNavComponent {
    constructor(users = [], currentUserId = null) {
        this.users = users;
        this.currentUserId = currentUserId || localStorage.getItem('userId');
        this.container = document.getElementById('users-nav');
        this.usersNav = null;
    }


    render() {
        return `
            <div class="users-filter-container">
                <h3>Users</h3>
                <ul class="users-list">
                    ${this.users.map(user => {
            const userId = user.ID || user.id;
            const userName = user.UserName || user.userName || user.Nickname || user.nickname || user.username || 'Unknown User';
            const isOnline = user.isOnline || user.is_online || false;


            let profilePic = null;
            if (user.ProfilePic && user.ProfilePic.Valid) {
                profilePic = user.ProfilePic.String;
            } else if (user.ProfilePic && typeof user.ProfilePic === 'string') {
                profilePic = user.ProfilePic;
            } else if (user.profilePic && user.profilePic.Valid) {
                profilePic = user.profilePic.String;
            } else if (user.profilePic && typeof user.profilePic === 'string') {
                profilePic = user.profilePic;
            }

            return `
                <li class="user-item" data-online="${isOnline}" data-user-id="${userId}">
                    <a href="/chat?user1=${this.currentUserId}&user2=${userId}" class="user-link" onclick="event.preventDefault(); window.navigation.navigateTo('/chat?user1=${this.currentUserId}&user2=${userId}')">
                        <div class="user-avatar">
                            ${profilePic ?
                    `<img src="${profilePic}" alt="${userName}'s avatar" class="user-avatar-img">` :
                    `<div class="user-avatar-placeholder">
                        <i class="fas fa-user"></i>
                    </div>`
                }
                        </div>
                        <div class="user-info">
                            <span class="username">${userName}</span>
                            <span class="status" id="status-${userId}">
                                ${isOnline ? '🟢 Online' : '⚫ Offline'}
                            </span>
                        </div>
                    </a>
                </li>
            `;
        }).join('')}
                </ul>
            </div>`;
    }

    mount() {
        if (!this.container) {
            console.error('Cannot mount UsersNavComponent: container element not found');
            return;
        }

        // Get currentUserId if not set in constructor
        if (!this.currentUserId) {
            this.currentUserId = localStorage.getItem('userId');
        }

        this.container.innerHTML = this.render();

        // Initialize WebSocket connection with status update callback
        if (this.currentUserId) {
            console.log('Initializing UsersNavigation with currentUserId:', this.currentUserId);
            // Pass the updateUserStatus method as a callback
            this.usersNav = new UsersNavigation((userId, isOnline) => {
                this.updateUserStatus(userId, isOnline);
            });
        } else {
            console.error('No currentUserId available for WebSocket initialization');
            // Try to get from AuthService as fallback
            const currentUser = window.AuthService?.getCurrentUser();
            if (currentUser?.id) {
                this.currentUserId = currentUser.id;
                console.log('Retrieved currentUserId from AuthService:', this.currentUserId);
                this.usersNav = new UsersNavigation((userId, isOnline) => {
                    this.updateUserStatus(userId, isOnline);
                });
            }
        }

        // Add event listeners for filter buttons
        const filterButtons = this.container.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Toggle active class
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Filter users
                const filter = button.dataset.filter;
                const userItems = this.container.querySelectorAll('.user-item');

                userItems.forEach(item => {
                    if (filter === 'all') {
                        item.style.display = 'block';
                    } else if (filter === 'online') {
                        if (item.dataset.online === 'true') {
                            item.style.display = 'block';
                        } else {
                            item.style.display = 'none';
                        }
                    }
                });
            });
        });
    }

    // Add unmount method to clean up
    unmount() {
        if (this.usersNav) {
            this.usersNav.cleanup();
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    updateUserStatus(userId, isOnline) {
        // Find the user element
        const userElement = this.container.querySelector(`[data-user-id="${userId}"]`);
        if (userElement) {
            // Update the data-online attribute
            userElement.setAttribute('data-online', isOnline);

            // Update the status text
            const statusElement = userElement.querySelector('.status');
            if (statusElement) {
                statusElement.innerHTML = isOnline ? '🟢 Online' : '⚫ Offline';
            }

            // If we're filtering by online users, show/hide accordingly
            const activeFilter = this.container.querySelector('.filter-btn.active');
            if (activeFilter && activeFilter.dataset.filter === 'online') {
                userElement.style.display = isOnline ? 'block' : 'none';
            }
        }
    }
}

export default UsersNavComponent;