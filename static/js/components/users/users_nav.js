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
                    ${this.users.map(user => {
                        const userPicPath = user.ProfilePic && user.ProfilePic.Valid ? 
                            user.ProfilePic.String : null;
                        
                        return `
                            <li class="user-item">
                                <a href="#" onclick="window.navigation.navigateTo('/profile?id=${user.ID}')" class="user-link">
                                    <div class="user-avatar">
                                        ${userPicPath ? 
                                            `<img src="${userPicPath}" alt="${user.UserName}'s avatar" class="user-avatar-img">` :
                                            `<div class="user-avatar-placeholder">
                                                <i class="fas fa-user"></i>
                                            </div>`
                                        }
                                    </div>
                                    <span class="username">${user.UserName}</span>
                                </a>
                            </li>`;
                    }).join('')}
                </ul>
            </div>`;
    }

    mount() {
        this.container.innerHTML = this.render();
    }
}