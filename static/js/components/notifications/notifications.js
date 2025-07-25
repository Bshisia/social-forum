/**
 * Notifications Component
 * Displays and manages user notifications
 */

import AuthService from '../../services/auth-service.js';
import { markAsRead as markNotificationAsRead, markAllAsRead as markAllNotificationsAsRead } from '/static/notification.js';
import eventBus from '../../utils/event-bus.js';

class NotificationsComponent {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.currentUserId = AuthService.getCurrentUser()?.id;
        this.mainContainer = document.getElementById('main-content');
        this.isLoading = true;
    }

    /**
     * Fetch notifications from the server
     * @returns {Promise} Promise that resolves when notifications are fetched
     */
    async fetchNotifications() {
        try {
            this.isLoading = true;

            // First try to get the unread count from the navbar
            const notificationDot = document.querySelector('.notification-dot');
            if (notificationDot) {
                this.unreadCount = parseInt(notificationDot.textContent) || 0;
            }

            // Fetch real notifications from the server using the API endpoint
            const response = await fetch('/api/notifications', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch notifications: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.Notifications) {
                this.notifications = data.Notifications;
                this.unreadCount = data.UnreadCount || 0;
            } else if (data && data.error) {
                throw new Error(data.error);
            } else {
                // If the response doesn't have the expected structure
                console.warn('Unexpected response structure:', data);
                this.notifications = [];
            }

            this.isLoading = false;
            return this.notifications;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            this.isLoading = false;
            throw error;
        }
    }

    /**
     * Mark a notification as read
     * @param {number} notificationId - ID of the notification to mark as read
     * @returns {Promise} Promise that resolves when the notification is marked as read
     */
    async markAsRead(notificationId) {
        try {
            // Use the imported markNotificationAsRead function
            const success = await markNotificationAsRead(notificationId);

            if (!success) {
                throw new Error('Failed to mark notification as read');
            }

            // Update local state
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.isRead = true;
                this.unreadCount = Math.max(0, this.unreadCount - 1);
            }

            // Update notification count in navbar
            this.updateNotificationCount();

            return true;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }
    }

    /**
     * Mark all notifications as read
     * @returns {Promise} Promise that resolves when all notifications are marked as read
     */
    async markAllAsRead() {
        try {
            // Show loading state on the button
            const markAllBtn = document.querySelector('.mark-all-read-btn');
            if (markAllBtn) {
                markAllBtn.disabled = true;
                markAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Marking as read...';
            }

            // Use the imported markAllNotificationsAsRead function
            const result = await markAllNotificationsAsRead();

            if (!result.success) {
                throw new Error(result.error || 'Failed to mark all notifications as read');
            }

            // Update local state - mark all notifications as read
            this.notifications.forEach(notification => {
                notification.isRead = true;
            });
            this.unreadCount = 0;

            // Update notification count in navbar
            this.updateNotificationCount();

            // Re-render the component to update the UI
            this.mainContainer.innerHTML = this.render();

            // Show success message
            this.showSuccessMessage(`${result.markedAsRead} notifications marked as read`);

            return true;
        } catch (error) {
            console.error('Error marking all notifications as read:', error);

            // Reset button state
            const markAllBtn = document.querySelector('.mark-all-read-btn');
            if (markAllBtn) {
                markAllBtn.disabled = false;
                markAllBtn.innerHTML = '<i class="fas fa-check-double"></i> Mark All as Read';
            }

            // Show error message
            this.showErrorMessage('Failed to mark all notifications as read');
            return false;
        }
    }

    /**
     * Update the notification count in the navbar
     */
    updateNotificationCount() {
        console.log('NotificationsComponent: Updating notification count to', this.unreadCount);

        // Use the global navbar component if available
        if (window.navbarComponent && typeof window.navbarComponent.updateNotificationCount === 'function') {
            console.log('Using navbar component to update notification count');
            window.navbarComponent.updateNotificationCount(this.unreadCount);
        } else {
            console.log('Navbar component not available, updating DOM directly');

            const dot = document.querySelector('.notification-dot');
            if (this.unreadCount > 0) {
                if (dot) {
                    dot.textContent = this.unreadCount;
                } else {
                    const notificationBtn = document.querySelector('.notification-btn');
                    if (notificationBtn) {
                        const newDot = document.createElement('span');
                        newDot.className = 'notification-dot';
                        newDot.textContent = this.unreadCount;
                        notificationBtn.appendChild(newDot);
                    }
                }
            } else if (dot) {
                dot.remove();
            }
        }

        // Also emit an event for other components that might need to know about the count change
        eventBus.emit('update_notification_count', this.unreadCount);
    }

    /**
     * Format notification message based on type
     * @param {Object} notification - Notification object
     * @returns {string} Formatted message
     */
    formatNotificationMessage(notification) {
        switch (notification.type) {
            case 'like':
                return `<strong>${notification.actorName}</strong> liked your post`;
            case 'comment':
                return `<strong>${notification.actorName}</strong> commented on your post`;
            case 'message':
                return `<strong>${notification.actorName}</strong> sent you a message`;
            default:
                return `<strong>${notification.actorName}</strong> interacted with your content`;
        }
    }

    /**
     * Get the appropriate link for a notification
     * @param {Object} notification - Notification object
     * @returns {string} URL to navigate to
     */
    getNotificationLink(notification) {
        switch (notification.type) {
            case 'like':
            case 'comment':
                return `/?id=${notification.postID}`;
            case 'message':
                // For message notifications, we use the actorID (sender's ID)
                // Make sure we have a valid currentUserId before constructing the URL
                if (this.currentUserId) {
                    return `/chat?user1=${this.currentUserId}&user2=${notification.actorID}`;
                } else {
                    console.warn('Current user ID not available for chat link');
                    return '/chat';
                }
            default:
                return '/';
        }
    }

    /**
     * Render the notifications component
     * @returns {string} HTML for the component
     */
    render() {
        if (this.isLoading) {
            return `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Loading notifications...</p>
                </div>
            `;
        }

        if (this.notifications.length === 0) {
            return `
                <div class="notifications-container">
                    <div class="notifications-header">
                        <h1>Notifications</h1>
                        <button onclick="window.navigation.navigateTo('/')" class="btn btn-outline">
                            <i class="fas fa-arrow-left"></i> Back
                        </button>
                    </div>
                    <div class="notifications-content">
                        <div class="no-notifications">
                            <i class="fas fa-bell-slash"></i>
                            <p>You don't have any notifications yet.</p>
                            <p class="notification-info">Notifications will appear here when someone interacts with your posts or mentions you.</p>
                            <button onclick="window.navigation.navigateTo('/')" class="btn btn-primary mt-3">
                                <i class="fas fa-home"></i> Back to Home
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        let notificationsHtml = this.notifications.map(notification => {
            const message = this.formatNotificationMessage(notification);
            const link = this.getNotificationLink(notification);
            const timeAgo = notification.createdAtFormatted || 'recently';
            const unreadClass = notification.isRead ? '' : 'unread';
            const profilePic = notification.actorProfilePic || '';

            return `
                <div class="notification-item ${unreadClass}" data-notification-id="${notification.id}">
                    <div class="notification-avatar">
                        ${profilePic ?
                            `<img class="notification-avatar-img" src="${profilePic}" alt="${notification.actorName}">` :
                            `<div class="notification-avatar-placeholder">${notification.actorName.charAt(0).toUpperCase()}</div>`
                        }
                    </div>
                    <div class="notification-content">
                        <div class="notification-message">${message}</div>
                        <div class="notification-time">${timeAgo}</div>
                    </div>
                    <a href="javascript:void(0)" class="notification-link" onclick="window.navigation.navigateTo('${link}')">
                        <i class="fas fa-arrow-right"></i>
                    </a>
                    ${!notification.isRead ?
                        `<button class="mark-read-btn" onclick="notificationsComponent.markAsRead(${notification.id})">
                            <i class="fas fa-check"></i>
                        </button>` :
                        ''
                    }
                </div>
            `;
        }).join('');

        // Check if there are any unread notifications
        const hasUnreadNotifications = this.notifications.some(n => !n.isRead);

        return `
            <div class="notifications-container">
                <div class="notifications-header">
                    <div class="notifications-header-left">
                        <h1>Notifications</h1>
                        ${this.unreadCount > 0 ? `<span class="unread-count-badge">${this.unreadCount} unread</span>` : ''}
                    </div>
                    <div class="notifications-header-right">
                        ${hasUnreadNotifications ? `
                            <button onclick="notificationsComponent.markAllAsRead()" class="btn btn-primary mark-all-read-btn">
                                <i class="fas fa-check-double"></i> Mark All as Read
                            </button>
                        ` : ''}
                        <button onclick="window.navigation.navigateTo('/')" class="btn btn-outline">
                            <i class="fas fa-arrow-left"></i> Back
                        </button>
                    </div>
                </div>
                <div class="notifications-list">
                    ${notificationsHtml}
                </div>
            </div>
        `;
    }

    /**
     * Mount the component to the DOM
     */
    mount() {
        if (!this.mainContainer) {
            console.error('Cannot mount NotificationsComponent: main container not found');
            return;
        }

        // Make the component accessible globally for event handlers
        window.notificationsComponent = this;

        // Show loading state
        this.mainContainer.innerHTML = this.render();

        // Subscribe to real-time notification events
        this.notificationEventUnsubscribe = eventBus.on('new_notification', (data) => {
            console.log('Received real-time notification:', data);

            // Update the unread count
            this.unreadCount = data.unreadCount;

            // Check if the notification is already in the list
            const existingIndex = this.notifications.findIndex(n => n.id === data.notification.id);

            if (existingIndex >= 0) {
                // Update existing notification
                this.notifications[existingIndex] = {
                    ...this.notifications[existingIndex],
                    ...data.notification,
                    isRead: false
                };
            } else {
                // Add new notification to the beginning of the list
                this.notifications.unshift({
                    id: data.notification.id,
                    type: data.notification.type,
                    postID: data.notification.postID || 0,
                    actorName: data.notification.actorName,
                    actorID: data.notification.actorID,
                    actorProfilePic: data.notification.actorProfilePic,
                    createdAtFormatted: 'Just now',
                    isRead: false
                });
            }

            // Re-render the component
            this.mainContainer.innerHTML = this.render();

            // Show a toast notification
            this.showToastNotification(data.notification);
        });

        // Subscribe to notification count updates
        this.countUpdateUnsubscribe = eventBus.on('update_notification_count', (count) => {
            console.log('Received notification count update:', count);
            this.unreadCount = count;

            // Update the UI if we're on the notifications page
            if (window.location.pathname === '/notifications') {
                this.mainContainer.innerHTML = this.render();
            }
        });

        // Fetch notifications and update the view
        this.fetchNotifications()
            .then(() => {
                this.mainContainer.innerHTML = this.render();
            })
            .catch(error => {
                this.mainContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error loading notifications: ${error.message}</p>
                        <button onclick="window.navigation.reloadPage()" class="btn btn-primary mt-3">
                            <i class="fas fa-sync"></i> Retry
                        </button>
                    </div>
                `;
            });
    }

    /**
     * Show a toast notification for a new notification
     * @param {Object} notification - The notification object
     */
    showToastNotification(notification) {
        // Create toast content
        const message = this.formatNotificationMessage(notification);
        const link = this.getNotificationLink(notification);
        const profilePic = notification.actorProfilePic || '';

        // Get notification icon based on type
        let notificationIcon = 'fa-bell';
        switch (notification.type) {
            case 'like':
                notificationIcon = 'fa-heart';
                break;
            case 'comment':
                notificationIcon = 'fa-comment';
                break;
            case 'message':
                notificationIcon = 'fa-envelope';
                break;
        }

        // Create the notification content HTML
        const notificationContent = `
            <div class="toast-header">
                <i class="fas ${notificationIcon} notification-icon"></i>
                <strong>New Notification</strong>
                <button class="toast-close">&times;</button>
            </div>
            <div class="toast-body">
                <div class="notification-avatar">
                    ${profilePic ?
                        `<img class="notification-avatar-img" src="${profilePic}" alt="${notification.actorName}">` :
                        `<div class="notification-avatar-placeholder">${notification.actorName ? notification.actorName.charAt(0).toUpperCase() : 'U'}</div>`
                    }
                </div>
                <div class="notification-content">
                    ${message}
                </div>
            </div>
            <div class="toast-footer">
                <button class="toast-action">View</button>
            </div>
        `;

        // Step 1: Create the popup that appears in the center of the screen
        const popup = document.createElement('div');
        popup.className = 'notification-popup';
        popup.innerHTML = notificationContent;
        document.body.appendChild(popup);

        // Add event listeners
        popup.querySelector('.toast-close').addEventListener('click', () => {
            popup.remove();
        });

        popup.querySelector('.toast-action').addEventListener('click', () => {
            window.navigation.navigateTo(link);
            popup.remove();
        });

        // Step 2: Show the popup in the center of the screen
        setTimeout(() => {
            popup.classList.add('show');
        }, 10);

        // Step 3: After a delay, animate the popup flying to the notification icon
        setTimeout(() => {
            popup.classList.add('fly');

            // Animate the notification icon in the navbar
            this.animateNotificationIcon();

            // Remove the popup after the animation completes
            setTimeout(() => {
                popup.remove();

                // Step 4: After the popup flies to the icon, show the regular toast notification
                this.showRegularToast(notificationContent, link);
            }, 800); // Match this with the animation duration
        }, 1500); // Show the popup for 1.5 seconds before it flies
    }

    /**
     * Show a regular toast notification
     * @param {string} content - The HTML content for the toast
     * @param {string} link - The link to navigate to when clicking the toast
     */
    showRegularToast(content, link) {
        // Check if toast container exists, create if not
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast notification-toast';
        toast.innerHTML = content;

        // Add to container
        toastContainer.appendChild(toast);

        // Add event listeners
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('toast-hiding');
            setTimeout(() => toast.remove(), 300);
        });

        toast.querySelector('.toast-action').addEventListener('click', () => {
            window.navigation.navigateTo(link);
            toast.remove();
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('toast-hiding');
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);

        // Add animation class after a small delay to trigger animation
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 10);
    }

    /**
     * Animate the notification icon in the navbar
     */
    animateNotificationIcon() {
        const notificationIcon = document.querySelector('.notification-btn i');
        if (notificationIcon) {
            // Add the animation class
            notificationIcon.classList.add('notification-pulse');

            // Remove the animation class after it completes (3 seconds)
            setTimeout(() => {
                notificationIcon.classList.remove('notification-pulse');
            }, 3000);
        }
    }

    /**
     * Show a success message
     * @param {string} message - The success message to display
     */
    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    /**
     * Show an error message
     * @param {string} message - The error message to display
     */
    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    /**
     * Show a message with the specified type
     * @param {string} message - The message to display
     * @param {string} type - The type of message ('success' or 'error')
     */
    showMessage(message, type) {
        // Remove any existing messages
        const existingMessage = document.querySelector('.notification-message-toast');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `notification-message-toast ${type}`;
        messageElement.innerHTML = `
            <div class="message-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="message-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to page
        document.body.appendChild(messageElement);

        // Show the message
        setTimeout(() => {
            messageElement.classList.add('show');
        }, 10);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.classList.add('hiding');
                setTimeout(() => messageElement.remove(), 300);
            }
        }, 5000);
    }

    /**
     * Clean up when component is unmounted
     */
    unmount() {
        // Remove global reference
        if (window.notificationsComponent === this) {
            delete window.notificationsComponent;
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
    }
}

export default NotificationsComponent;
