// Function to mark a notification as read
export function markAsRead(notificationId) {
    return fetch('/notifications/mark-read', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            notification_id: notificationId
        })
    })
    .then(response => {
        if (response.ok) {
            // Remove unread styling
            const notificationElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (notificationElement) {
                notificationElement.classList.remove('unread');
            }

            // Update the notification count
            const dot = document.querySelector('.notification-dot');
            if (dot) {
                const currentCount = parseInt(dot.textContent);
                if (currentCount > 1) {
                    dot.textContent = currentCount - 1;
                } else {
                    dot.remove();
                }
            }
            return true;
        }
        return false;
    })
    .catch(error => {
        console.error('Error:', error);
        return false;
    });
}

// Function to mark all notifications as read
export function markAllAsRead() {
    return fetch('/notifications/mark-all-read', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {

        if (data.success) {
            // Remove unread styling from all notification elements
            const unreadNotifications = document.querySelectorAll('.notification-item.unread');
            unreadNotifications.forEach(element => {
                element.classList.remove('unread');
                // Remove the mark as read button
                const markReadBtn = element.querySelector('.mark-read-btn');
                if (markReadBtn) {
                    markReadBtn.remove();
                }
            });

            // Remove the notification count dot
            const dot = document.querySelector('.notification-dot');
            if (dot) {
                dot.remove();
            }

            return {
                success: true,
                markedAsRead: data.markedAsRead,
                message: data.message
            };
        }
        throw new Error(data.error || 'Failed to mark all notifications as read');
    })
    .catch(error => {
        console.error('Error marking all notifications as read:', error);
        return {
            success: false,
            error: error.message
        };
    });
}