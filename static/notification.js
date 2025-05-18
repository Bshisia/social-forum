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