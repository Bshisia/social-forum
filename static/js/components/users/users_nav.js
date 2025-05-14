import UsersNavigation from '../../../websocket.js';
import eventBus from '../../utils/event-bus.js';

class UsersNavComponent {
    constructor(users = [], currentUserId = null) {
        this.users = users;
        this.currentUserId = currentUserId || localStorage.getItem('userId');
        this.container = document.getElementById('users-nav');
        this.usersNav = null;
        this.typingUsers = new Map(); // Track which users are typing
        this.typingTimers = new Map(); // Timers to auto-clear typing status
        this.typingEventUnsubscribe = null; // For event bus cleanup
    }


    render() {
        // Filter out the current user from the users list
        const filteredUsers = this.users.filter(user => {
            const userId = user.ID || user.id;
            return userId !== this.currentUserId;
        });

        return `
            <div class="users-filter-container">
                <div class="users-nav-header">
                    <h3>Users</h3>
                    <button class="refresh-btn" id="refresh-users-btn" title="Refresh users list" onclick="window.usersNavComponent.refreshUsersList()">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
                <ul class="users-list">
                    ${filteredUsers.map(user => {
            const userId = user.ID || user.id;
            const userName = user.UserName || user.userName || user.Nickname || user.nickname || user.username || 'Unknown User';
            const isOnline = user.isOnline || user.is_online || false;

            // Get last message time if available
            let lastMessageTime = null;
            if (user.last_message_time) {
                lastMessageTime = new Date(user.last_message_time);
            } else if (user.lastMessageTime) {
                lastMessageTime = new Date(user.lastMessageTime);
            }

            // Format the last message time
            let formattedTime = '';
            if (lastMessageTime) {
                const now = new Date();
                const diffMs = now - lastMessageTime;
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                if (diffDays === 0) {
                    // Today - show time
                    formattedTime = lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else if (diffDays === 1) {
                    // Yesterday
                    formattedTime = 'Yesterday';
                } else if (diffDays < 7) {
                    // Within a week - show day name
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    formattedTime = days[lastMessageTime.getDay()];
                } else {
                    // Older - show date
                    formattedTime = lastMessageTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
                }
            }

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
                            <div class="user-status-indicator"></div>
                        </div>
                        <div class="user-info">
                            <div class="user-info-row">
                                <span class="username">${userName}</span>
                                ${formattedTime ? `<span class="last-message-time">${formattedTime}</span>` : ''}
                            </div>
                            <span class="status" id="status-${userId}">
                                ${this.typingUsers.has(userId) ?
                                    '<span class="typing-indicator-text">typing<span class="typing-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span></span>' :
                                    isOnline ? '🟢 Online' : '⚫ Offline'
                                }
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

        // Subscribe to typing status events
        this.typingEventUnsubscribe = eventBus.on('user_typing_status', (data) => {
            // Only process if the typing user is not the current user
            if (data.userId !== this.currentUserId && data.recipientId === this.currentUserId) {
                this.handleTypingStatus(data.userId, data.isTyping);
            }
        });

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
            const response = await fetch(`/api/users/with-last-message?current_user=${this.currentUserId}`);
            if (!response.ok) {
                // Fallback to regular users endpoint if the with-last-message endpoint is not available
                console.warn('Falling back to regular users endpoint');
                return this.fetchUsersWithoutMessages();
            }

            const users = await response.json();
            console.log('Users with last messages fetched successfully:', users);

            // Filter out current user
            this.users = users.filter(user => {
                const userId = user.id || user.ID;
                return userId !== this.currentUserId;
            });

            // Sort users by last message timestamp (most recent first)
            // Users without messages (last_message_time is null) will be sorted alphabetically
            this.sortUsers();

            return this.users;
        } catch (error) {
            console.error('Error fetching users with messages:', error);
            // Fallback to regular users endpoint
            return this.fetchUsersWithoutMessages();
        }
    }

    async fetchUsersWithoutMessages() {
        try {
            // Fetch all users without message data
            const response = await fetch('/api/users');
            if (!response.ok) {
                throw new Error(`Failed to fetch users: ${response.status}`);
            }

            const users = await response.json();
            console.log('Basic users fetched successfully:', users);

            // Filter out current user
            this.users = users.filter(user => {
                const userId = user.id || user.ID;
                return userId !== this.currentUserId;
            });

            // Sort users alphabetically since we don't have message data
            this.sortUsers(true);

            return this.users;
        } catch (error) {
            console.error('Error fetching basic users:', error);
            // Use empty array if fetch fails
            this.users = [];
            return this.users;
        }
    }

    sortUsers(alphabeticalOnly = false) {
        if (!this.users || this.users.length === 0) return;

        console.log('Before sorting:', this.users.map(u => ({
            name: u.UserName || u.userName || u.Nickname || u.nickname || u.username,
            lastMessage: u.last_message_time || u.lastMessageTime
        })));

        this.users.sort((a, b) => {
            // Get usernames for comparison
            const userNameA = a.UserName || a.userName || a.Nickname || a.nickname || a.username || '';
            const userNameB = b.UserName || b.userName || b.Nickname || b.nickname || b.username || '';

            if (alphabeticalOnly) {
                // Sort alphabetically by username
                return userNameA.localeCompare(userNameB);
            }

            const lastMessageTimeA = a.last_message_time || a.lastMessageTime || null;
            const lastMessageTimeB = b.last_message_time || b.lastMessageTime || null;

            // If both users have message timestamps, sort by most recent
            if (lastMessageTimeA && lastMessageTimeB) {
                return new Date(lastMessageTimeB) - new Date(lastMessageTimeA);
            }

            // If only one user has a message timestamp, prioritize that user
            if (lastMessageTimeA) return -1;
            if (lastMessageTimeB) return 1;

            // If neither user has a message timestamp, sort alphabetically
            return userNameA.localeCompare(userNameB);
        });

        console.log('After sorting:', this.users.map(u => ({
            name: u.UserName || u.userName || u.Nickname || u.nickname || u.username,
            lastMessage: u.last_message_time || u.lastMessageTime
        })));
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
        // Clear all typing timers
        this.typingTimers.forEach(timer => clearTimeout(timer));
        this.typingTimers.clear();

        // Unsubscribe from typing events
        if (this.typingEventUnsubscribe) {
            this.typingEventUnsubscribe();
        }

        if (this.usersNav) {
            this.usersNav.cleanup();
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    // Handle typing status updates
    handleTypingStatus(userId, isTyping) {
        console.log(`User ${userId} is ${isTyping ? 'typing' : 'stopped typing'}`);

        // Clear any existing timer for this user
        if (this.typingTimers.has(userId)) {
            clearTimeout(this.typingTimers.get(userId));
            this.typingTimers.delete(userId);
        }

        if (isTyping) {
            // Set typing status
            this.typingUsers.set(userId, true);

            // Update the UI
            this.updateTypingStatus(userId, true);

            // Set a timer to automatically clear typing status after 3 seconds
            // (in case we don't receive a stop_typing event)
            const timer = setTimeout(() => {
                this.typingUsers.delete(userId);
                this.updateTypingStatus(userId, false);
                this.typingTimers.delete(userId);
            }, 3000);

            this.typingTimers.set(userId, timer);
        } else {
            // Clear typing status
            this.typingUsers.delete(userId);

            // Update the UI
            this.updateTypingStatus(userId, false);
        }
    }

    // Update the UI to show typing status
    updateTypingStatus(userId, isTyping) {
        const statusElement = this.container.querySelector(`#status-${userId}`);
        if (!statusElement) return;

        const userElement = this.container.querySelector(`[data-user-id="${userId}"]`);
        if (!userElement) return;

        const userLink = userElement.querySelector('.user-link');
        const isOnline = userElement.getAttribute('data-online') === 'true';

        if (isTyping) {
            // Update status text
            statusElement.innerHTML = '<span class="typing-indicator-text">typing<span class="typing-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span></span>';

            // Add is-typing class to the user link
            if (userLink) {
                userLink.classList.add('is-typing');
                // We don't move users to the top when typing anymore
                // Only actual messages will trigger sorting
            }
        } else {
            // Update status text
            statusElement.innerHTML = isOnline ? '🟢 Online' : '⚫ Offline';

            // Remove is-typing class from the user link
            if (userLink) {
                userLink.classList.remove('is-typing');
            }
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

        // Add rotating animation to the refresh button
        const refreshButton = document.getElementById('refresh-users-btn');
        if (refreshButton) {
            refreshButton.classList.add('rotating');
        }

        try {
            await this.fetchUsers();
            // Note: fetchUsers already includes sorting logic
            this.container.innerHTML = this.render();
            console.log('Users list refreshed successfully');

            // Remove the rotating class after a delay
            setTimeout(() => {
                const newRefreshButton = document.getElementById('refresh-users-btn');
                if (newRefreshButton) {
                    newRefreshButton.classList.remove('rotating');
                }
            }, 1000);

            // Show a success notification
            this.showNotification('Users list refreshed successfully', 'success');

            return true;
        } catch (error) {
            console.error('Error refreshing users list:', error);

            // Remove the rotating class on error
            setTimeout(() => {
                const newRefreshButton = document.getElementById('refresh-users-btn');
                if (newRefreshButton) {
                    newRefreshButton.classList.remove('rotating');
                }
            }, 1000);

            // Show an error notification
            this.showNotification('Failed to refresh users list. Please try again.', 'error');

            return false;
        }
    }

    // Helper method to show notifications
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `users-nav-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add to container
        this.container.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
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

        // Re-sort the users array
        this.sortUsers();

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
                        <div class="user-status-indicator"></div>
                    </div>
                    <div class="user-info">
                        <div class="user-info-row">
                            <span class="username">${userName}</span>
                            <!-- New users won't have a last message time -->
                        </div>
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
