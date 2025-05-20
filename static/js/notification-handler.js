/**
 * Global Notification Handler
 * A standalone module to handle notifications across the application
 */

import eventBus from './utils/event-bus.js';

class NotificationHandler {
    constructor() {
        this.initialize();
    }

    /**
     * Initialize the notification handler
     */
    initialize() {
        console.log('NotificationHandler: Initializing');

        // Subscribe to notification events
        this.showNotificationSubscription = eventBus.on('show_notification_popup', (notification) => {
            console.log('NotificationHandler: Received show_notification_popup event with:', notification);
            this.showToastNotification(notification);
        });
    }

    /**
     * Show a toast notification for a new notification
     * @param {Object} notification - The notification object
     */
    showToastNotification(notification) {
        console.log('NotificationHandler: Showing toast notification for:', notification);

        // Make sure we have a valid notification object
        if (!notification) {
            console.error('Cannot show notification: notification is null or undefined');
            return;
        }

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
        toast.innerHTML = notificationContent;

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

        // Add animation class after a small delay to trigger animation
        setTimeout(() => {
            toast.classList.add('toast-show');

            // Animate the notification icon in the navbar
            this.animateNotificationIcon();

            // After showing the toast, animate it flying to the notification icon
            setTimeout(() => {
                toast.classList.add('toast-fly-to-icon');

                // Remove the toast after the animation completes
                setTimeout(() => {
                    toast.classList.add('toast-hiding');
                    setTimeout(() => toast.remove(), 300);
                }, 800); // Match this with the animation duration
            }, 2000); // Show the toast for 2 seconds before it flies
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
        console.log('Getting notification link for:', notification);

        // Extract post ID from notification, handling different field names
        const postId = notification.postID || notification.post_id;
        // Extract actor ID from notification, handling different field names
        const actorId = notification.actorID || notification.actor_id;

        switch (notification.type) {
            case 'like':
            case 'comment':
                if (!postId) {
                    console.warn('No post ID found in notification:', notification);
                    return '/';
                }
                console.log(`Creating link for post ID: ${postId}`);
                return `/?id=${postId}`;
            case 'message':
                // For message notifications, we use the actorID (sender's ID)
                const currentUserId = localStorage.getItem('userId');
                if (currentUserId && actorId) {
                    return `/chat?user1=${currentUserId}&user2=${actorId}`;
                } else {
                    console.warn('User IDs not available for chat link. Current:', currentUserId, 'Actor:', actorId);
                    return '/chat';
                }
            default:
                return '/';
        }
    }

    /**
     * Clean up when the handler is destroyed
     */
    destroy() {
        if (this.showNotificationSubscription) {
            this.showNotificationSubscription();
            this.showNotificationSubscription = null;
        }
    }
}

// Create and export a singleton instance
const notificationHandler = new NotificationHandler();
export default notificationHandler;
