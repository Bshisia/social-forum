import eventBus from '../../utils/event-bus.js';
import websocketService from '../../services/websocket-service.js';

class UsersNavComponent {
    constructor(users = [], currentUserId = null) {
        this.users = users;
        this.currentUserId = currentUserId || localStorage.getItem('userId');
        this.container = document.getElementById('users-nav');
        this.usersNav = null;
        this.typingUsers = new Map(); // Track which users are typing
        this.typingTimers = new Map(); // Timers to auto-clear typing status
        this.typingEventUnsubscribe = null; // For event bus cleanup
        this.refreshEventUnsubscribe = null; // For event bus cleanup
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
                    <h3><i class="fas fa-users"></i> Users</h3>
                    <button class="refresh-btn" id="refresh-users-btn" title="Refresh users list" onclick="window.usersNavComponent.refreshUsersList(true)">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
                <ul class="users-list">
                    ${filteredUsers.map(user => {
            const userId = user.ID || user.id;
            const userName = user.UserName || user.userName || user.Nickname || user.nickname || user.username || 'Unknown User';
            const isOnline = user.isOnline || user.is_online || false;
            const unreadCount = user.unreadCount || 0;

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
                    <a href="/chat?user1=${this.currentUserId}&user2=${userId}" class="user-link" onclick="event.preventDefault(); window.location.href = '/chat?user1=${this.currentUserId}&user2=${userId}'">
                        <div class="user-avatar">
                            ${profilePic ?
                    `<img src="${profilePic}" alt="${userName}'s avatar" class="user-avatar-img">` :
                    `<div class="user-avatar-placeholder">
                        <i class="fas fa-user"></i>
                    </div>`
                }
                            <span class="status-indicator ${isOnline ? 'online' : 'offline'}"></span>
                        </div>
                        <div class="user-info">
                            <div class="user-info-row">
                                <span class="username">${userName}</span>
                                <div class="user-info-right">
                                    ${unreadCount > 0 ?
                                        `<span class="unread-count">${unreadCount}</span>` :
                                        ''}
                                    ${formattedTime ? `<span class="last-message-time">${formattedTime}</span>` : ''}
                                </div>
                            </div>
                            <span class="status" id="status-${userId}">
                                ${this.typingUsers.has(userId) ?
                                    '<span class="typing-indicator-text">typing<span class="typing-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span></span>' :
                                    isOnline ? '<span class="status-text online"><i class="fas fa-circle"></i> Online</span>' :
                                    '<span class="status-text offline"><i class="fas fa-circle"></i> Offline</span>'
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

        // Subscribe to refresh users list events
        this.refreshEventUnsubscribe = eventBus.on('refresh_users_list', () => {
            this.refreshUsersList(false); 
        });

        // If we don't have users data yet, fetch it
        if (!this.users || this.users.length === 0) {
            this.fetchUsers().then(() => {
                this.container.innerHTML = this.render();
                this.initializeWebSocket();
            });
        } else {
            this.container.innerHTML = this.render();
            this.initializeWebSocket();
        }
    }

    async fetchUsers() {
        try {
            // Fetch all users with their last message timestamp
            const response = await fetch(`/api/chat/users?currentUserId=${this.currentUserId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const users = await response.json();
            console.log('Users with last messages fetched successfully:', users);

            // Filter out current user
            this.users = users.filter(user => user.id !== this.currentUserId);

            // Preserve unread counts from previous state if they exist
            // This prevents the unread count from disappearing when refreshing
            if (this.users && this.users.length > 0) {
                this.users.forEach(user => {
                    // If unreadCount is 0 or undefined, check if we have a previous count
                    if (!user.unreadCount || user.unreadCount === 0) {
                        const userId = user.id || user.ID;
                        const previousUser = this.findUserById(userId);
                        if (previousUser && previousUser.unreadCount && previousUser.unreadCount > 0) {
                            console.log(`Preserving unread count for user ${userId}: ${previousUser.unreadCount}`);
                            user.unreadCount = previousUser.unreadCount;
                        }
                    }
                });
            }

            // Render the users list
            this.renderUsers();
        } catch (error) {
            console.error('Error fetching users:', error);
            // Fallback to regular users endpoint if needed
            this.fetchUsersWithoutMessages();
        }
    }

    // Helper method to find a user by ID in the current users array
    findUserById(userId) {
        if (!this.users) return null;

        return this.users.find(user => {
            const id = user.id || user.ID;
            return id === userId;
        });
    }

    renderUsers() {
        if (!this.container) return;

        // Clear the container
        this.container.innerHTML = '';

        // Create the users list
        const usersList = document.createElement('div');
        usersList.className = 'users-list';

        if (this.users.length === 0) {
            usersList.innerHTML = '<div class="no-users">No users found</div>';
        } else {
            // Sort users: first by online status, then by last message time, then alphabetically
            const sortedUsers = [...this.users].sort((a, b) => {
                // First sort by online status
                if (a.isOnline && !b.isOnline) return -1;
                if (!a.isOnline && b.isOnline) return 1;

                // Then by last message time
                if (a.lastMessage && b.lastMessage) {
                    return new Date(b.lastMessage) - new Date(a.lastMessage);
                } else if (a.lastMessage) {
                    return -1;
                } else if (b.lastMessage) {
                    return 1;
                }

                // Finally alphabetically
                return a.userName.localeCompare(b.userName);
            });

            // Create user items
            sortedUsers.forEach(user => {
                const userItem = document.createElement('div');
                userItem.className = `user-item ${user.isOnline ? 'online' : 'offline'}`;
                userItem.dataset.userId = user.id;

                // Format last message time if exists
                let lastMessageTime = '';
                if (user.lastMessage) {
                    const messageDate = new Date(user.lastMessage);
                    const today = new Date();

                    if (messageDate.toDateString() === today.toDateString()) {
                        // Today - show time
                        lastMessageTime = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } else {
                        // Not today - show date
                        lastMessageTime = messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    }
                }

                // Get unread count if available
                const unreadCount = user.unreadCount || 0;

                userItem.innerHTML = `
                    <div class="user-avatar">
                        ${user.profilePic ? `<img src="${user.profilePic}" alt="${user.userName}">` :
                        `<div class="default-avatar">${user.userName.charAt(0).toUpperCase()}</div>`}
                        <span class="status-indicator ${user.isOnline ? 'online' : 'offline'}"></span>
                    </div>
                    <div class="user-info">
                        <div class="user-info-row">
                            <span class="username">${user.userName}</span>
                            <div class="user-info-right">
                                ${unreadCount > 0 ?
                                    `<span class="unread-count">${unreadCount}</span>` :
                                    ''}
                                ${lastMessageTime ? `<span class="last-message-time">${lastMessageTime}</span>` : ''}
                            </div>
                        </div>
                        <span class="status" id="status-${user.id}">
                            ${user.isOnline ?
                                '<span class="status-text online"><i class="fas fa-circle"></i> Online</span>' :
                                '<span class="status-text offline"><i class="fas fa-circle"></i> Offline</span>'
                            }
                        </span>
                    </div>
                `;

                // Add click event to open chat
                userItem.addEventListener('click', () => {
                    window.location.href = `/chat?user1=${this.currentUserId}&user2=${user.id}`;
                });

                usersList.appendChild(userItem);
            });
        }

        this.container.appendChild(usersList);
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
        // Use the global WebSocket service instead of creating a new one
        if (!this.currentUserId) {
            console.error('No currentUserId available for WebSocket initialization');
            return;
        }

        console.log('Setting up WebSocket event handlers for UsersNavComponent');

        // Set up event listeners for WebSocket events
        this.userStatusUnsubscribe = eventBus.on('user_status_change', (data) => {
            console.log('Received user_status_change event:', data);
            this.updateUserStatus(data.userId, data.isOnline);
        });

        this.userSignupUnsubscribe = eventBus.on('user_signup', (data) => {
            console.log('Received user_signup event:', data);
            this.addNewUser(data);
        });

        this.usersListUpdateUnsubscribe = eventBus.on('users_list_update', (users) => {
            console.log('Received users_list_update event:', users);

            // Store current users to preserve unread counts
            const currentUsers = this.users ? [...this.users] : [];

            // Filter out current user
            const filteredUsers = users.filter(user => {
                const userId = user.ID || user.id;
                return userId !== this.currentUserId;
            });

            // Preserve unread counts from current state
            if (currentUsers.length > 0 && filteredUsers.length > 0) {
                filteredUsers.forEach(user => {
                    const userId = user.ID || user.id;
                    // Find the user in the current list
                    const currentUser = currentUsers.find(u => {
                        const id = u.ID || u.id;
                        return id === userId;
                    });

                    // If the user exists and has an unread count, preserve it
                    if (currentUser && currentUser.unreadCount && currentUser.unreadCount > 0) {
                        console.log(`Preserving unread count for user ${userId} in users_list_update: ${currentUser.unreadCount}`);
                        user.unreadCount = currentUser.unreadCount;
                    }
                });
            }

            this.users = filteredUsers;
            this.container.innerHTML = this.render();
        });

        // Initialize the WebSocket service if not already initialized
        if (!websocketService.connected) {
            websocketService.initialize()
                .then(() => {
                    console.log('WebSocket service initialized successfully for UsersNavComponent');
                })
                .catch(error => {
                    console.warn('WebSocket initialization failed in UsersNavComponent:', error);
                });
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

        // Unsubscribe from events
        if (this.typingEventUnsubscribe) {
            this.typingEventUnsubscribe();
            this.typingEventUnsubscribe = null;
        }

        if (this.refreshEventUnsubscribe) {
            this.refreshEventUnsubscribe();
            this.refreshEventUnsubscribe = null;
        }

        // Unsubscribe from WebSocket events
        if (this.userStatusUnsubscribe) {
            this.userStatusUnsubscribe();
            this.userStatusUnsubscribe = null;
        }

        if (this.userSignupUnsubscribe) {
            this.userSignupUnsubscribe();
            this.userSignupUnsubscribe = null;
        }

        if (this.usersListUpdateUnsubscribe) {
            this.usersListUpdateUnsubscribe();
            this.usersListUpdateUnsubscribe = null;
        }

        if (this.container) {
            this.container.innerHTML = '';
        }

        // Remove global reference
        delete window.usersNavComponent;
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
            statusElement.innerHTML = isOnline ?
                '<span class="status-text online"><i class="fas fa-circle"></i> Online</span>' :
                '<span class="status-text offline"><i class="fas fa-circle"></i> Offline</span>';

            // Remove is-typing class from the user link
            if (userLink) {
                userLink.classList.remove('is-typing');
            }
        }
    }

    updateUserStatus(userId, isOnline) {
        console.log(`Updating user ${userId} status to ${isOnline ? 'online' : 'offline'}`);

        // Update our internal users array
        const userIndex = this.users.findIndex(user => {
            const id = user.ID || user.id;
            return id === userId;
        });

        if (userIndex !== -1) {
            this.users[userIndex].isOnline = isOnline;
        }

        // Find the user element in the DOM
        const userElement = this.container.querySelector(`[data-user-id="${userId}"]`);
        if (userElement) {
            // Update the data-online attribute
            userElement.setAttribute('data-online', isOnline);

            // Update the status text
            const statusElement = userElement.querySelector('.status');
            if (statusElement) {
                statusElement.innerHTML = isOnline ?
                    '<span class="status-text online"><i class="fas fa-circle"></i> Online</span>' :
                    '<span class="status-text offline"><i class="fas fa-circle"></i> Offline</span>';
            }

            // Update the status indicator
            const statusIndicator = userElement.querySelector('.status-indicator');
            if (statusIndicator) {
                statusIndicator.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
            }

            // If we're filtering by online users, show/hide accordingly
            const activeFilter = this.container.querySelector('.filter-btn.active');
            if (activeFilter && activeFilter.dataset.filter === 'online') {
                userElement.style.display = isOnline ? 'block' : 'none';
            }

            // Add a brief highlight effect to show the status change
            userElement.classList.add('status-change');
            setTimeout(() => {
                userElement.classList.remove('status-change');
            }, 2000);
        } else {
            console.warn(`User element for ${userId} not found in DOM`);
        }
    }

    // Add a method to refresh the users list
    async refreshUsersList(showNotification = false) {
        console.log('Refreshing users list...');

        // Store a copy of the current users with their unread counts
        const previousUsers = this.users ? [...this.users] : [];

        // Add rotating animation to the refresh button
        const refreshButton = document.getElementById('refresh-users-btn');
        if (refreshButton) {
            refreshButton.classList.add('rotating');
        }

        try {
            // The fetchUsers method now handles preserving unread counts
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

            // Show a success notification only if explicitly requested (manual refresh)
            if (showNotification) {
                this.showNotification('Users list refreshed successfully', 'success');
            }

            return true;
        } catch (error) {
            console.error('Error refreshing users list:', error);

            // Restore previous users if fetch failed
            if (previousUsers.length > 0) {
                this.users = previousUsers;
                this.container.innerHTML = this.render();
            }

            // Remove the rotating class on error
            setTimeout(() => {
                const newRefreshButton = document.getElementById('refresh-users-btn');
                if (newRefreshButton) {
                    newRefreshButton.classList.remove('rotating');
                }
            }, 1000);

            // Show an error notification only if explicitly requested (manual refresh)
            if (showNotification) {
                this.showNotification('Failed to refresh users list. Please try again.', 'error');
            }

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
                <a href="/chat?user1=${this.currentUserId}&user2=${userId}" class="user-link" onclick="event.preventDefault(); window.location.href = '/chat?user1=${this.currentUserId}&user2=${userId}'">
                    <div class="user-avatar">
                        ${profilePic ?
                        `<img src="${profilePic}" alt="${userName}'s avatar" class="user-avatar-img">` :
                        `<div class="user-avatar-placeholder">
                            <i class="fas fa-user"></i>
                        </div>`
                        }
                        <span class="status-indicator ${isOnline ? 'online' : 'offline'}"></span>
                    </div>
                    <div class="user-info">
                        <div class="user-info-row">
                            <span class="username">${userName}</span>
                            <!-- New users won't have a last message time -->
                        </div>
                        <span class="status" id="status-${userId}">
                            ${isOnline ?
                            '<span class="status-text online"><i class="fas fa-circle"></i> Online</span>' :
                            '<span class="status-text offline"><i class="fas fa-circle"></i> Offline</span>'}
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
