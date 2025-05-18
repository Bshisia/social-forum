/**
 * Notifications Component
 * Displays and manages user notifications
 */

import AuthService from '../../services/auth-service.js';
import { markAsRead as markNotificationAsRead } from '/static/notification.js';

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

            // Create some sample notifications for demonstration
            // In a real implementation, we would fetch these from the server
            this.notifications = [
                {
                    id: 1,
                    type: 'like',
                    postID: 1,
                    actorName: 'John Doe',
                    actorProfilePic: '',
                    createdAtFormatted: '2 hours ago',
                    isRead: false
                },
                {
                    id: 2,
                    type: 'comment',
                    postID: 2,
                    actorName: 'Jane Smith',
                    actorProfilePic: '',
                    createdAtFormatted: '1 day ago',
                    isRead: true
                },
                {
                    id: 3,
                    type: 'mention',
                    postID: 3,
                    actorName: 'Alex Johnson',
                    actorProfilePic: '',
                    createdAtFormatted: '3 days ago',
                    isRead: false
                }
            ];

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
     * Update the notification count in the navbar
     */
    updateNotificationCount() {
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
            case 'mention':
                return `<strong>${notification.actorName}</strong> mentioned you in a post`;
            case 'follow':
                return `<strong>${notification.actorName}</strong> started following you`;
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
            case 'mention':
                return `/?id=${notification.postID}`;
            case 'follow':
                return `/profile?id=${notification.actorID}`;
            case 'message':
                return `/chat?user1=${this.currentUserId}&user2=${notification.actorID}`;
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

        return `
            <div class="notifications-container">
                <div class="notifications-header">
                    <h1>Notifications</h1>
                    <button onclick="window.navigation.navigateTo('/')" class="btn btn-outline">
                        <i class="fas fa-arrow-left"></i> Back
                    </button>
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
     * Clean up when component is unmounted
     */
    unmount() {
        // Remove global reference
        if (window.notificationsComponent === this) {
            delete window.notificationsComponent;
        }
    }
}

export default NotificationsComponent;
