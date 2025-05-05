class UsersNavComponent {
    constructor(users = [], currentUserId = null) {
        this.users = users;
        this.currentUserId = currentUserId;
        this.container = document.getElementById('users-nav');
    }

    render() {
        console.log('Users data in UsersNavComponent:', this.users);
        
        return `
            <div class="users-filter-container">
                <h3>Users</h3>
                <ul class="users-list">
                    ${this.users.length > 0 ? this.users.map(user => {
                        const userId = user.ID || user.id;
                        const userName = user.UserName || user.userName || user.Nickname || user.nickname || user.username || 'Unknown User';
                        
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
                            <li class="user-item">
                                <a href="/chat?user1=${this.currentUserId}&user2=${userId}" class="user-link" onclick="event.preventDefault(); window.navigation.navigateTo('/chat?user1=${this.currentUserId}&user2=${userId}')">
                                    <div class="user-avatar">
                                        ${profilePic ? 
                                            `<img src="${profilePic}" alt="${userName}'s avatar" class="user-avatar-img">` :
                                            `<div class="user-avatar-placeholder">
                                                <i class="fas fa-user"></i>
                                            </div>`
                                        }
                                    </div>
                                    <span class="username">${userName}</span>
                                </a>
                            </li>
                        `;
                    }).join('') : `
                        <li class="user-item no-users">
                            <div class="no-users-message">
                                <i class="fas fa-users-slash"></i>
                                <span>Users not available yet</span>
                            </div>
                        </li>
                    `}
                </ul>
            </div>`;
    }

    mount() {
        if (!this.container) {
            console.error('Cannot mount UsersNavComponent: container element not found');
            return;
        }
        
        this.container.innerHTML = this.render();
    }
}

export default UsersNavComponent;