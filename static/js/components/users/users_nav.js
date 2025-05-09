class UsersNavComponent {
    constructor(users = [], currentUserId = null) {
        this.users = users;
        this.currentUserId = currentUserId;
        this.container = document.getElementById('users-nav');
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
                            <li class="user-item" data-online="${isOnline}">
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
                                        <span class="status ${isOnline ? 'online' : 'offline'}">
                                            ${isOnline ? 'Online' : 'Offline'}
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
        
        this.container.innerHTML = this.render();
        
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
}

export default UsersNavComponent;