function markAsRead(notificationId) {
    fetch('/notifications/mark-read', {
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
            document.querySelector(`[data-notification-id="${notificationId}"]`)
                .classList.remove('unread');
            
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
        }
    })
    .catch(error => console.error('Error:', error));
}