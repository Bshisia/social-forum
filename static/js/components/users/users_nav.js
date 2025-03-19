class UsersNavComponent {
    constructor(users = []) {
        this.users = users;
        this.container = document.getElementById('users-nav');
    }

    render() {
        return `
            <div class="users-filter-container">
                <h3>Users</h3>
                <ul class="users-list">
                    ${this.users.map(user => `
                        <li class="user-item">
                            <a href="/profile/${user.ID}" class="user-link">
                                <div class="user-avatar">
                                    ${user.ProfilePic ? 
                                        `<img src="${user.ProfilePic}" alt="${user.UserName}'s avatar" class="user-avatar-img">` :
                                        `<div class="user-avatar-placeholder">
                                            <i class="fas fa-user"></i>
                                        </div>`
                                    }
                                </div>
                                <span class="username">${user.UserName}</span>
                            </a>
                        </li>
                    `).join('')}
                </ul>
            </div>`;
    }

    mount() {
        this.container.innerHTML = this.render();
    }
}

export default UsersNavComponent;