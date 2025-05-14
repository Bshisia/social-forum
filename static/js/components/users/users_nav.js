import UsersNavigation from '../../../websocket.js';

class UsersNavComponent {
    constructor(users = [], currentUserId = null) {
        this.users = users;
        this.currentUserId = currentUserId || localStorage.getItem('userId');
        this.container = document.getElementById('users-nav');
        this.usersNav = null;
    }


    render() {
        // Filter out the current user from the users list
        const filteredUsers = this.users.filter(user => {
            const userId = user.ID || user.id;
            return userId !== this.currentUserId;
        });

        return `
            <div class="users-filter-container">
                <h3>Users</h3>
                <ul class="users-list">
                    ${filteredUsers.map(user => {
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

        // Make the component accessible globally for event handlers
        window.usersNavComponent = this;

        // Get currentUserId if not set in constructor
        if (!this.currentUserId) {
            this.currentUserId = localStorage.getItem('userId');
        }

        // If we don't have users data yet, fetch it
        if (!this.users || this.users.length === 0) {
            this.fetchUsers().then(() => {
                this.container.innerHTML = this.render();
                
                // Use existing WebSocket if available, otherwise initialize a new one
                if (window.globalUsersNav) {
                    console.log('Using existing WebSocket connection');
                    this.usersNav = window.globalUsersNav;
                    // Update the callback to point to this component
                    this.usersNav.updateCallback = (updateType, data) => {
                        if (updateType === 'refresh') {
                            console.log('Refreshing users list due to WebSocket notification');
                            this.refreshUsersList();
                        } else if (updateType === 'new_user' && data) {
                            console.log('Adding new user to list:', data);
                            this.addNewUser(data);
                        } else {
                            console.log('Updating user status:', updateType, data);
                            this.updateUserStatus(updateType, data);
                        }
                    };
                } else {
                    this.initializeWebSocket();
                }
            });
        } else {
            this.container.innerHTML = this.render();
            
            // Use existing WebSocket if available, otherwise initialize a new one
            if (window.globalUsersNav) {
                console.log('Using existing WebSocket connection');
                this.usersNav = window.globalUsersNav;
                // Update the callback to point to this component
                this.usersNav.updateCallback = (updateType, data) => {
                    if (updateType === 'refresh') {
                        console.log('Refreshing users list due to WebSocket notification');
                        this.refreshUsersList();
                    } else if (updateType === 'new_user' && data) {
                        console.log('Adding new user to list:', data);
                        this.addNewUser(data);
                    } else {
                        console.log('Updating user status:', updateType, data);
                        this.updateUserStatus(updateType, data);
                    }
                };
            } else {
                this.initializeWebSocket();
            }
        }
    }

    async fetchUsers() {
        try {
            // Fetch all users with their last message timestamp
            const response = await fetch('/api/users/with-last-message?current_user=' + this.currentUserId);
            if (!response.ok) {
                throw new Error(`Failed to fetch users: ${response.status}`);
            }
            
            const users = await response.json();
            console.log('Users fetched successfully:', users);
            
            // Filter out current user
            this.users = users.filter(user => {
                const userId = user.id || user.ID;
                return userId !== this.currentUserId;
            });
            
            return this.users;
        } catch (error) {
            console.error('Error fetching users:', error);
            // Use empty array if fetch fails
            this.users = [];
            return this.users;
        }
    }

    initializeWebSocket() {
        // Initialize WebSocket connection with status update callback
        if (this.currentUserId) {
            console.log('Initializing UsersNavigation with currentUserId:', this.currentUserId);
            // Pass the callback function that handles different types of updates
            this.usersNav = new UsersNavigation((updateType, data) => {
                if (updateType === 'refresh') {
                    // Refresh the entire users list
                    console.log('Refreshing users list due to WebSocket notification');
                    this.refreshUsersList();
                } else if (updateType === 'new_user' && data) {
                    // Add the new user to the list without a full refresh
                    console.log('Adding new user to list:', data);
                    this.addNewUser(data);
                } else {
                    // Regular status update
                    console.log('Updating user status:', updateType, data);
                    this.updateUserStatus(updateType, data);
                }
            });
        } else {
            console.error('No currentUserId available for WebSocket initialization');
            // Try to get from AuthService as fallback
            const currentUser = window.AuthService?.getCurrentUser();
            if (currentUser?.id) {
                this.currentUserId = currentUser.id;
                console.log('Retrieved currentUserId from AuthService:', this.currentUserId);
                this.usersNav = new UsersNavigation((updateType, data) => {
                    if (updateType === 'refresh') {
                        // Refresh the entire users list
                        console.log('Refreshing users list due to WebSocket notification');
                        this.refreshUsersList();
                    } else if (updateType === 'new_user' && data) {
                        // Add the new user to the list without a full refresh
                        console.log('Adding new user to list:', data);
                        this.addNewUser(data);
                    } else {
                        // Regular status update
                        console.log('Updating user status:', updateType, data);
                        this.updateUserStatus(updateType, data);
                    }
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

    // Add a method to refresh the users list
    async refreshUsersList() {
        console.log('Refreshing users list...');
        try {
            await this.fetchUsers();
            this.container.innerHTML = this.render();
            console.log('Users list refreshed successfully');
            return true;
        } catch (error) {
            console.error('Error refreshing users list:', error);
            return false;
        }
    }

    // Add a method to add a new user to the list without refreshing
    addNewUser(userData) {
        console.log('Adding new user to list:', userData);
        
        // Check if this user is already in our list
        const existingUser = this.users.find(user => {
            const userId = user.ID || user.id;
            return userId === userData.id;
        });
        
        if (existingUser) {
            console.log('User already exists in list, skipping add');
            return;
        }
        
        // Format the user data to match our expected format
        const newUser = {
            ID: userData.id,
            UserName: userData.nickname || userData.username || 'New User',
            ProfilePic: userData.profile_pic || '',
            isOnline: userData.is_online || false
        };
        
        // Add to our users array
        this.users.push(newUser);
        
        // Get the users list element
        const usersList = this.container.querySelector('.users-list');
        if (!usersList) {
            console.error('Users list element not found');
            return;
        }
        
        // Create the new user HTML
        const userId = newUser.ID;
        const userName = newUser.UserName;
        const isOnline = newUser.isOnline;
        const profilePic = newUser.ProfilePic;
        
        const userHTML = `
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
        
        // Add the new user to the list with a highlight effect
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = userHTML;
        const newUserElement = tempDiv.firstElementChild;
        newUserElement.classList.add('new-user-highlight');
        usersList.appendChild(newUserElement);
        
        // Remove the highlight effect after a delay
        setTimeout(() => {
            newUserElement.classList.remove('new-user-highlight');
        }, 3000);
        
        console.log('New user added to list successfully');
    }
}

export default UsersNavComponent;
