import AuthService from '../../services/auth-service.js';
import websocketService from '../../services/websocket-service.js';
import eventBus from '../../utils/event-bus.js';

class NavbarComponent {
    constructor(isLoggedIn, currentUserID, unreadCount, nickname = '') {
        this.isLoggedIn = isLoggedIn;
        this.currentUserID = currentUserID;
        this.unreadCount = unreadCount;
        this.nickname = nickname;
        this.notificationEventUnsubscribe = null;
        this.countUpdateUnsubscribe = null;
        this.websocketUnsubscribe = null;

        // If nickname is not provided, try to get it from AuthService
        if (!this.nickname && this.isLoggedIn) {
            const currentUser = AuthService.getCurrentUser();
            if (currentUser && currentUser.nickname) {
                this.nickname = currentUser.nickname;
            }
        }

        // Log the initial notification count
        console.log('NavbarComponent: Initial notification count:', this.unreadCount);
    }

    render() {
        // Get user data if logged in but no nickname
        if (this.isLoggedIn && !this.nickname) {
            const currentUser = AuthService.getCurrentUser();
            if (currentUser && currentUser.nickname) {
                this.nickname = currentUser.nickname;
            } else {
                // Fallback to a default name if no nickname is available
                this.nickname = 'User';
            }
        }

        const template = `
            <div class="mobile-menu-overlay"></div>
            <nav class="navbar">
                <div class="nav-container">
                    <a href="/" class="logo-link">
                        <h1 class="logo">Forum</h1>
                    </a>
                    <button class="hamburger-btn">
                        <i class="fas fa-bars"></i>
                    </button>
                    <div class="nav-right">
                        ${this.isLoggedIn ? `
                            <button id="create-post-btn" class="btn btn-primary" onclick="window.navigation.navigateTo('/create')">
                                <i class="fas fa-plus"></i> Create Post
                            </button>
                        ` : ''}
                        ${!this.isLoggedIn ? this.renderLoggedOutButtons() : this.renderLoggedInButtons()}
                        ${this.renderMobileMenu()}
                    </div>
                </div>
            </nav>`;

        return template;
    }

    renderLoggedOutButtons() {
        return `
            <button class="btn btn-outline" onclick="window.navigation.navigateTo('/signin')">
                <i class="fas fa-sign-in-alt"></i> Login
            </button>
            <button class="btn btn-primary" onclick="window.navigation.navigateTo('/signup')">
                <i class="fas fa-user-plus"></i> Sign Up
            </button>`;
    }

    renderLoggedInButtons() {
        return `
            <button class="btn btn-outline notification-btn" onclick="window.navigation.navigateTo('/notifications')">
                <i class="fas fa-bell"></i>
                ${this.unreadCount > 0 ? `<span class="notification-dot">${this.unreadCount}</span>` : ''}
            </button>
            <button class="btn btn-outline" onclick="window.navigation.navigateTo('/profile?id=${this.currentUserID}')">
                <i class="fas fa-user"></i> ${this.nickname || 'Profile'}
            </button>
            <button class="btn btn-primary" id="signout-btn">
                <i class="fas fa-sign-out-alt"></i> Sign Out
            </button>`;
    }

    renderMobileMenu() {
        return `
            <div class="mobile-menu-section">
                <button class="menu-toggle-btn">
                    Categories <i class="fas fa-chevron-down"></i>
                </button>
                <div class="mobile-menu-content">
                    <ul>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/?category=Tech')">Tech</a></li>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/?category=Programming')">Programming</a></li>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/?category=Business')">Business</a></li>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/?category=Lifestyle')">Lifestyle</a></li>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/?category=Football')">Football</a></li>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/?category=Politics')">Politics</a></li>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/?category=General%20News')">General News</a></li>
                    </ul>
                </div>
            </div>

            ${this.isLoggedIn ? `
            <div class="mobile-menu-section">
                <button class="menu-toggle-btn">
                    Filters <i class="fas fa-chevron-down"></i>
                </button>
                <div class="mobile-menu-content">
                    <ul>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/created')">Created Posts</a></li>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/liked')">Reacted Posts</a></li>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/commented')">Commented Posts</a></li>
                    </ul>
                </div>
            </div>
            ` : ''}`;
    }

    mount(element) {
        // Add null check to prevent errors
        if (!element) {
            console.warn('Cannot mount NavbarComponent: element is null');
            return;
        }

        // Make the component accessible globally for event handlers
        window.navbarComponent = this;

        element.innerHTML = this.render();
        this.attachEventListeners();

        // Subscribe to notification events
        this.notificationEventUnsubscribe = eventBus.on('new_notification', (data) => {
            console.log('NavbarComponent: Received notification event with count', data.unreadCount);
            this.updateNotificationCount(data.unreadCount);
        });

        // Also subscribe to update_notification_count events
        this.countUpdateUnsubscribe = eventBus.on('update_notification_count', (count) => {
            console.log('NavbarComponent: Received notification count update:', count);
            this.updateNotificationCount(count);
        });

        // Subscribe to WebSocket events directly
        if (websocketService && websocketService.socket) {
            console.log('NavbarComponent: Subscribing to WebSocket events');

            // Define the message handler
            const handleWebSocketMessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('NavbarComponent: Received WebSocket message:', data);

                    // Handle notification events
                    if (data.type === 'notification' && data.receiverID === this.currentUserID) {
                        console.log('NavbarComponent: Received notification WebSocket event with count', data.unreadCount);
                        this.updateNotificationCount(data.unreadCount);
                    }
                } catch (error) {
                    console.error('NavbarComponent: Error handling WebSocket message:', error);
                }
            };

            // Add the event listener
            websocketService.socket.addEventListener('message', handleWebSocketMessage);

            // Store the handler for cleanup
            this.websocketHandler = handleWebSocketMessage;
        } else {
            console.warn('NavbarComponent: WebSocket service not available');
        }

        // Log the current notification count
        console.log('NavbarComponent: Mounted with notification count:', this.unreadCount);
    }

    /**
     * Update the notification count in the navbar
     * @param {number} count - The new notification count
     */
    updateNotificationCount(count) {
        // Ensure count is a number
        const numCount = parseInt(count, 10) || 0;

        // Only update if the count has changed
        if (this.unreadCount === numCount) {
            console.log('NavbarComponent: Notification count unchanged, skipping update');
            return;
        }

        console.log('NavbarComponent: Updating notification count from', this.unreadCount, 'to', numCount);
        this.unreadCount = numCount;

        // Find the notification button
        const notificationBtn = document.querySelector('.notification-btn');
        if (!notificationBtn) {
            console.warn('Cannot update notification count: notification button not found');
            return;
        }

        // Find existing notification dot
        let notificationDot = notificationBtn.querySelector('.notification-dot');

        if (numCount > 0) {
            // If we have notifications, update or create the dot
            if (notificationDot) {
                // Update existing dot
                notificationDot.textContent = numCount;
                // Add a small animation to make the update noticeable
                notificationDot.classList.remove('bounceIn');
                void notificationDot.offsetWidth; // Force reflow to restart animation
                notificationDot.classList.add('bounceIn');
            } else {
                // Create new dot
                notificationDot = document.createElement('span');
                notificationDot.className = 'notification-dot bounceIn';
                notificationDot.textContent = numCount;
                notificationBtn.appendChild(notificationDot);
            }
        } else if (notificationDot) {
            // If no notifications, remove the dot
            notificationDot.remove();
        }

        // Update the global notification count for other components to access
        window.notificationCount = numCount;

        // Also emit an event for other components that might need to know about the count change
        eventBus.emit('update_notification_count', numCount);
    }

    attachEventListeners() {
        const hamburgerBtn = document.querySelector('.hamburger-btn');
        const navRight = document.querySelector('.nav-right');
        const overlay = document.querySelector('.mobile-menu-overlay');
        const menuToggles = document.querySelectorAll('.menu-toggle-btn');
        const signoutBtn = document.getElementById('signout-btn');

        // Function to close the mobile menu
        const closeMenu = () => {
            navRight.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        };

        // Function to toggle the mobile menu
        const toggleMenu = () => {
            navRight.classList.toggle('active');
            overlay.classList.toggle('active');
            document.body.style.overflow = navRight.classList.contains('active') ? 'hidden' : '';
        };

        // Toggle menu when clicking hamburger button
        if (hamburgerBtn && navRight && overlay) {
            hamburgerBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling to document
                toggleMenu();
            });
        }

        // Close menu when clicking overlay
        if (overlay) {
            overlay.addEventListener('click', closeMenu);
        }

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            // Only process if menu is open
            if (navRight && navRight.classList.contains('active')) {
                // Check if click is outside the menu
                if (!navRight.contains(e.target) && e.target !== hamburgerBtn) {
                    closeMenu();
                }
            }
        });

        // Prevent clicks inside the menu from closing it
        if (navRight) {
            navRight.addEventListener('click', (e) => {
                e.stopPropagation(); // Stop clicks from reaching the document
            });
        }

        menuToggles.forEach(toggle => {
            if (toggle && toggle.nextElementSibling) {
                toggle.addEventListener('click', () => {
                    toggle.nextElementSibling.classList.toggle('active');
                });
            }
        });

        // Add sign out functionality
        if (signoutBtn) {
            signoutBtn.addEventListener('click', () => {
                AuthService.signOut().then(() => {
                    // Force a full page reload instead of using navigation
                    window.location.href = '/signin';
                }).catch(error => {
                    console.error('Error signing out:', error);
                });
            });
        }

        // Toggle icon for menu buttons
        menuToggles.forEach(toggle => {
            if (toggle && toggle.nextElementSibling) {
                toggle.addEventListener('click', (e) => {
                    const icon = e.currentTarget.querySelector('i.fas');
                    if (icon) {
                        if (toggle.nextElementSibling.classList.contains('active')) {
                            icon.classList.remove('fa-chevron-up');
                            icon.classList.add('fa-chevron-down');
                        } else {
                            icon.classList.remove('fa-chevron-down');
                            icon.classList.add('fa-chevron-up');
                        }
                    }
                });
            }
        });
    }

    /**
     * Clean up when component is unmounted
     */
    unmount() {
        // Remove global reference
        if (window.navbarComponent === this) {
            delete window.navbarComponent;
        }

        // Unsubscribe from event bus
        if (this.notificationEventUnsubscribe) {
            this.notificationEventUnsubscribe();
            this.notificationEventUnsubscribe = null;
        }

        // Unsubscribe from count update events
        if (this.countUpdateUnsubscribe) {
            this.countUpdateUnsubscribe();
            this.countUpdateUnsubscribe = null;
        }

        // Remove WebSocket event listener
        if (websocketService && websocketService.socket && this.websocketHandler) {
            console.log('NavbarComponent: Removing WebSocket event listener');
            websocketService.socket.removeEventListener('message', this.websocketHandler);
            this.websocketHandler = null;
        }

        // Reset body overflow in case menu was open when component unmounted
        document.body.style.overflow = '';
    }
}

// Export the component
export default NavbarComponent;
