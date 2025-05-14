import UsersNavigation from '../../../websocket.js';
import eventBus from '../../utils/event-bus.js';

class UsersNavComponent {
    constructor(users = [], currentUserId = null) {
        this.users = users;
        this.currentUserId = currentUserId || localStorage.getItem('userId');
        this.container = document.getElementById('users-nav');
        this.usersNav = null;
        this.usersWithLastMessage = []; // Store users with last message data
        this.typingUsers = new Map(); // Track which users are typing
        this.typingTimers = new Map(); // Timers to auto-clear typing status
        this.eventUnsubscribe = null; // For event bus cleanup
        this.refreshInterval = null; // Timer for periodic refresh
        this.refreshIntervalTime = 5000; // Refresh every 5 seconds
        this.isRefreshing = false; // Flag to prevent multiple simultaneous refreshes
        this.refreshDebounceTimer = null; // Timer for debouncing refresh calls
    }

    // Fetch users with their last message timestamps
    async fetchUsersWithLastMessages() {
        try {
            const response = await fetch(`/api/chat/users?currentUserId=${this.currentUserId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('Failed to fetch users with last messages:', response.status);
                return false;
            }

            this.usersWithLastMessage = await response.json();
            console.log('Users with last messages:', this.usersWithLastMessage);
            return true;
        } catch (error) {
            console.error('Error fetching users with last messages:', error);
            return false;
        }
    }


    render() {
        // Use the sorted users with last message data if available
        let usersToRender = [];

        if (this.usersWithLastMessage && this.usersWithLastMessage.length > 0) {
            // Use the pre-sorted users from the API
            usersToRender = this.usersWithLastMessage;
        } else {
            // Fallback to the original users list
            usersToRender = this.users.filter(user => {
                const userId = user.ID || user.id;
                return userId !== this.currentUserId;
            });

            // Sort alphabetically as fallback
            usersToRender.sort((a, b) => {
                const nameA = (a.UserName || a.userName || a.Nickname || a.nickname || a.username || '').toLowerCase();
                const nameB = (b.UserName || b.userName || b.Nickname || b.nickname || b.username || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
        }

        return `
            <div class="users-filter-container">
                <h3>Chats</h3>
                <ul class="users-list">
                    ${usersToRender.map(user => {
                        const userId = user.ID || user.id;
                        const userName = user.UserName || user.userName || user.Nickname || user.nickname || user.username || 'Unknown User';
                        const isOnline = user.IsOnline || user.isOnline || user.is_online || false;

                        // Format last message time if available
                        let lastMessageTime = '';
                        if (user.LastMessage) {
                            const date = new Date(user.LastMessage);
                            const now = new Date();
                            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

                            if (diffDays === 0) {
                                // Today - show time
                                lastMessageTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            } else if (diffDays === 1) {
                                // Yesterday
                                lastMessageTime = 'Yesterday';
                            } else if (diffDays < 7) {
                                // This week - show day name
                                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                lastMessageTime = days[date.getDay()];
                            } else {
                                // Older - show date
                                lastMessageTime = date.toLocaleDateString();
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
                                    </div>
                                    <div class="user-info">
                                        <div class="user-info-row">
                                            <div class="user-name-with-status">
                                                <span class="username">${userName}</span>
                                                <span class="status-indicator-dot">${isOnline ? '🟢' : '⚫'}</span>
                                            </div>
                                            ${lastMessageTime ? `<span class="last-message-time">${lastMessageTime}</span>` : ''}
                                        </div>
                                        <div class="user-status-container">
                                            <span class="status" id="status-${userId}"></span>
                                        </div>
                                    </div>
                                </a>
                            </li>
                        `;
                    }).join('')}
                </ul>
            </div>`;
    }

    async mount() {
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

        // First try to fetch users with last message data
        const success = await this.fetchUsersWithLastMessages();

        // If that fails, fall back to regular user fetching
        if (!success && (!this.users || this.users.length === 0)) {
            await this.fetchUsers();
        }

        // Render the component with whatever data we have
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

        // Make the WebSocket instance globally accessible
        window.globalUsersNav = this.usersNav;

        // Subscribe to typing status events
        this.eventUnsubscribe = eventBus.on('user_typing_status', (data) => {
            this.handleTypingStatus(data);
        });

        // Subscribe to refresh users list events
        this.refreshUnsubscribe = eventBus.on('refresh_users_list', () => {
            console.log('Received refresh_users_list event, refreshing users list');
            this.refreshUsersList();
        });

        // Subscribe to new user signup events
        this.signupUnsubscribe = eventBus.on('user_signup', (userData) => {
            console.log('Received user_signup event, adding new user:', userData);
            this.addNewUser(userData);
        });

        // Subscribe to new message events
        this.messageUnsubscribe = eventBus.on('new_message_sent', (messageData) => {
            console.log('Received new_message_sent event:', messageData);
            this.refreshUsersList();
        });

        // Subscribe to users list update events from WebSocket
        this.usersListUnsubscribe = eventBus.on('users_list_update', (usersData) => {
            console.log('Received users_list_update event with', usersData.length, 'users');
            this.handleUsersListUpdate(usersData);
        });

        // Start periodic refresh of users list as a fallback
        this.startPeriodicRefresh();
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
                } else if (updateType === 'users_list' && data) {
                    // Update the entire users list from WebSocket data
                    console.log('Updating users list from WebSocket data');
                    this.handleUsersListUpdate(data);
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
                    } else if (updateType === 'users_list' && data) {
                        // Update the entire users list from WebSocket data
                        console.log('Updating users list from WebSocket data');
                        this.handleUsersListUpdate(data);
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

    // Handle user typing status
    handleTypingStatus(data) {
        // Only care about typing status directed to the current user
        if (data.recipientId !== this.currentUserId) {
            return;
        }

        const userId = data.userId;
        const isTyping = data.isTyping;

        console.log(`User ${userId} is ${isTyping ? 'typing' : 'stopped typing'} to ${data.recipientId}`);

        // Clear any existing timer for this user
        if (this.typingTimers.has(userId)) {
            clearTimeout(this.typingTimers.get(userId));
            this.typingTimers.delete(userId);
        }

        if (isTyping) {
            // Set typing status
            this.typingUsers.set(userId, true);

            // Update UI
            this.updateTypingIndicator(userId, true);

            // Set a timer to automatically clear typing status after 5 seconds
            // (in case we miss the stop_typing event)
            const timer = setTimeout(() => {
                this.typingUsers.set(userId, false);
                this.updateTypingIndicator(userId, false);
                this.typingTimers.delete(userId);
            }, 5000);

            this.typingTimers.set(userId, timer);
        } else {
            // Clear typing status
            this.typingUsers.set(userId, false);

            // Update UI
            this.updateTypingIndicator(userId, false);
        }
    }

    // Update the typing indicator in the UI
    updateTypingIndicator(userId, isTyping) {
        const statusElement = this.container.querySelector(`#status-${userId}`);
        if (!statusElement) return;

        if (isTyping) {
            statusElement.innerHTML = `
                <span class="user-typing">
                    typing
                    <span class="typing-dots">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </span>
                </span>
            `;
        } else {
            // Clear the typing indicator
            statusElement.innerHTML = '';
        }
    }

    // Start periodic refresh of users list
    startPeriodicRefresh() {
        // Clear any existing interval first
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Set up a new interval to refresh the users list periodically
        this.refreshInterval = setInterval(() => {
            console.log('Periodic refresh of users list');
            this.refreshUsersList();
        }, this.refreshIntervalTime);

        console.log(`Started periodic refresh every ${this.refreshIntervalTime/1000} seconds`);
    }

    // Pause the periodic refresh
    pausePeriodicRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('Paused periodic refresh');
        }
    }

    // Resume the periodic refresh
    resumePeriodicRefresh() {
        if (!this.refreshInterval) {
            this.startPeriodicRefresh();
            console.log('Resumed periodic refresh');
        }
    }

    // Add unmount method to clean up
    unmount() {
        // Clear all typing timers
        this.typingTimers.forEach(timer => clearTimeout(timer));
        this.typingTimers.clear();

        // Clear the refresh interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        // Clear the debounce timer
        if (this.refreshDebounceTimer) {
            clearTimeout(this.refreshDebounceTimer);
            this.refreshDebounceTimer = null;
        }

        // Reset the refreshing flag
        this.isRefreshing = false;

        // Unsubscribe from all event bus subscriptions
        if (this.eventUnsubscribe) {
            this.eventUnsubscribe();
        }

        if (this.refreshUnsubscribe) {
            this.refreshUnsubscribe();
        }

        if (this.signupUnsubscribe) {
            this.signupUnsubscribe();
        }

        if (this.messageUnsubscribe) {
            this.messageUnsubscribe();
        }

        if (this.usersListUnsubscribe) {
            this.usersListUnsubscribe();
        }

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

            // Update the status dot
            const statusDot = userElement.querySelector('.status-indicator-dot');
            if (statusDot) {
                statusDot.textContent = isOnline ? '🟢 Online' : '⚫ Offline';
            }

            // If we're filtering by online users, show/hide accordingly
            const activeFilter = this.container.querySelector('.filter-btn.active');
            if (activeFilter && activeFilter.dataset.filter === 'online') {
                userElement.style.display = isOnline ? 'block' : 'none';
            }
        }
    }

    // Handle users list update from WebSocket
    handleUsersListUpdate(usersData) {
        if (!Array.isArray(usersData) || usersData.length === 0) {
            console.log('No users data received or empty array');
            return;
        }

        console.log('Processing users list update with', usersData.length, 'users');

        // Pause the periodic refresh while we process this update
        this.pausePeriodicRefresh();

        // Update our users array with the new data
        // Filter out the current user
        this.users = usersData.filter(user => {
            const userId = user.ID || user.id;
            return userId !== this.currentUserId;
        });

        // Sort users by last message time if available
        if (typeof this.sortUsers === 'function') {
            this.sortUsers();
        } else {
            // Default sorting by nickname if sortUsers is not defined
            this.users.sort((a, b) => {
                const nameA = a.UserName || a.nickname || '';
                const nameB = b.UserName || b.nickname || '';
                return nameA.localeCompare(nameB);
            });
        }

        // Update the UI
        this.container.innerHTML = this.render();

        console.log('Users list updated from WebSocket data');

        // Resume periodic refresh as a fallback
        this.resumePeriodicRefresh();
    }

    // Add a method to refresh the users list with debouncing
    async refreshUsersList() {
        // If already refreshing or a refresh is scheduled, don't start another one
        if (this.isRefreshing || this.refreshDebounceTimer) {
            console.log('Refresh already in progress or scheduled, skipping');
            return false;
        }

        // Set a debounce timer to prevent too frequent refreshes
        clearTimeout(this.refreshDebounceTimer);
        this.refreshDebounceTimer = setTimeout(async () => {
            // Clear the debounce timer
            this.refreshDebounceTimer = null;

            // If already refreshing, don't start another refresh
            if (this.isRefreshing) {
                console.log('Refresh already in progress, skipping');
                return false;
            }

            // Set the refreshing flag
            this.isRefreshing = true;

            console.log('Refreshing users list...');
            try {
                // First try to fetch users with last message data
                const success = await this.fetchUsersWithLastMessages();

                // If that fails, fall back to regular user fetching
                if (!success) {
                    await this.fetchUsers();
                }

                this.container.innerHTML = this.render();
                console.log('Users list refreshed successfully');

                // Clear the refreshing flag
                this.isRefreshing = false;
                return true;
            } catch (error) {
                console.error('Error refreshing users list:', error);
                // Clear the refreshing flag even on error
                this.isRefreshing = false;
                return false;
            }
        }, 300); // 300ms debounce time

        return true; // Return true to indicate a refresh was scheduled
    }

    // Add a method to add a new user to the list without refreshing
    addNewUser(userData) {
        console.log('Adding new user to list:', userData);

        // Extract user ID from the data structure
        let newUserId = null;
        if (userData.id) {
            newUserId = userData.id;
        } else if (userData.ID) {
            newUserId = userData.ID;
        } else if (userData.user && userData.user.id) {
            newUserId = userData.user.id;
        }

        if (!newUserId) {
            console.error('Cannot add user: no valid user ID found in data', userData);
            return;
        }

        // Check if this user is already in our list
        const existingUser = this.users.find(user => {
            const existingId = user.ID || user.id;
            return existingId === newUserId;
        });

        if (existingUser) {
            console.log('User already exists in list, skipping add');
            return;
        }

        // Extract nickname/username from the data structure
        let nickname = 'New User';
        if (userData.nickname) {
            nickname = userData.nickname;
        } else if (userData.username) {
            nickname = userData.username;
        } else if (userData.UserName) {
            nickname = userData.UserName;
        } else if (userData.user && userData.user.nickname) {
            nickname = userData.user.nickname;
        }

        // Extract online status from the data structure
        let userIsOnline = false;
        if (userData.is_online !== undefined) {
            userIsOnline = userData.is_online;
        } else if (userData.isOnline !== undefined) {
            userIsOnline = userData.isOnline;
        } else if (userData.IsOnline !== undefined) {
            userIsOnline = userData.IsOnline;
        } else if (userData.user && userData.user.is_online !== undefined) {
            userIsOnline = userData.user.is_online;
        }

        // Format the user data to match our expected format
        const newUser = {
            ID: newUserId,
            UserName: nickname,
            ProfilePic: userData.profile_pic || userData.ProfilePic || '',
            isOnline: userIsOnline
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
        const userName = newUser.UserName;
        const profilePic = newUser.ProfilePic;

        const userHTML = `
            <li class="user-item" data-online="${newUser.isOnline}" data-user-id="${newUser.ID}">
                <a href="/chat?user1=${this.currentUserId}&user2=${newUser.ID}" class="user-link" onclick="event.preventDefault(); window.navigation.navigateTo('/chat?user1=${this.currentUserId}&user2=${newUser.ID}')">
                    <div class="user-avatar">
                        ${profilePic ?
                        `<img src="${profilePic}" alt="${userName}'s avatar" class="user-avatar-img">` :
                        `<div class="user-avatar-placeholder">
                            <i class="fas fa-user"></i>
                        </div>`
                        }
                    </div>
                    <div class="user-info">
                        <div class="user-info-row">
                            <div class="user-name-with-status">
                                <span class="username">${userName}</span>
                                <span class="status-indicator-dot">${newUser.isOnline ? '🟢' : '⚫'}</span>
                            </div>
                        </div>
                        <div class="user-status-container">
                            <span class="status" id="status-${newUser.ID}"></span>
                        </div>
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
