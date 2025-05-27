package controllers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"forum/utils"
)

// NotificationHandler manages user notifications
type NotificationHandler struct{}

// NewNotificationHandler creates a new notification handler instance
func NewNotificationHandler() *NotificationHandler {
	return &NotificationHandler{}
}

// ServeHTTP handles HTTP requests for notifications
// Routes:
// - GET /notifications - Display user notifications
// - GET /api/notifications - Get notifications as JSON
// - GET /api/notifications/count - Get unread notification count as JSON
// - POST /notifications/mark-read - Mark a notification as read
// - POST /notifications/mark-all-read - Mark all notifications as read
func (nh *NotificationHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == http.MethodGet && r.URL.Path == "/notifications":
		nh.handleGetNotifications(w, r)
	case r.Method == http.MethodGet && r.URL.Path == "/api/notifications":
		nh.handleGetNotificationsJSON(w, r)
	case r.Method == http.MethodGet && r.URL.Path == "/api/notifications/count":
		nh.handleGetNotificationCount(w, r)
	case r.Method == http.MethodPost && r.URL.Path == "/notifications/mark-read":
		nh.handleMarkAsRead(w, r)
	case r.Method == http.MethodPost && r.URL.Path == "/notifications/mark-all-read":
		nh.handleMarkAllAsRead(w, r)
	default:
		utils.RenderErrorPage(w, http.StatusMethodNotAllowed, utils.ErrMethodNotAllowed)
	}
}

// handleGetNotifications displays the user's notifications page
// Since we're using a SPA, this just serves the index.html file
func (nh *NotificationHandler) handleGetNotifications(w http.ResponseWriter, r *http.Request) {
	// Just serve the SPA index page
	http.ServeFile(w, r, "templates/index.html")
}

// getUserNotifications retrieves all notifications for a user
// Returns the notifications, unread count, and any error
// @param userID - The ID of the user to get notifications for
// @returns []utils.Notification - Array of notification objects
// @returns int - Count of unread notifications
// @returns error - Any error that occurred
func (nh *NotificationHandler) getUserNotifications(userID string) ([]utils.Notification, int, error) {
	rows, err := utils.GlobalDB.Query(`
		SELECT n.id, n.type, n.created_at, n.post_id, u.nickname, u.profile_pic, n.is_read, n.actor_id
		FROM notifications n
		JOIN users u ON n.actor_id = u.id
		WHERE n.user_id = ?
		ORDER BY n.created_at DESC
	`, userID)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var notifications []utils.Notification
	unreadCount := 0

	for rows.Next() {
		var n utils.Notification
		var profilePic sql.NullString // Use sql.NullString to handle NULL values
		var postID sql.NullInt64      // Use sql.NullInt64 to handle NULL post_id values
		var actorID string            // Store the actor ID for message notifications

		// Scan into the notification struct and the nullable fields
		err := rows.Scan(&n.ID, &n.Type, &n.CreatedAt, &postID, &n.ActorName, &profilePic, &n.IsRead, &actorID)
		if err != nil {
			log.Printf("Error scanning notification: %v", err)
			continue
		}

		// Handle nullable post_id
		if postID.Valid {
			n.PostID = int(postID.Int64)
		} else {
			n.PostID = 0 // Default value for message notifications
		}

		// Handle the nullable profile_pic
		if profilePic.Valid {
			n.ActorProfilePic = profilePic.String
		} else {
			n.ActorProfilePic = "" // Default empty string for NULL profile pics
		}

		// Store the actor ID for message notifications
		n.ActorID = actorID

		if !n.IsRead {
			unreadCount++
		}
		n.CreatedAtFormatted = FormatTimeAgo(n.CreatedAt)
		notifications = append(notifications, n)
	}
	return notifications, unreadCount, nil
}

// handleMarkAsRead marks a specific notification as read
// Accepts POST requests with notification_id in the request body
func (nh *NotificationHandler) handleMarkAsRead(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_token")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var requestData struct {
		NotificationID int `json:"notification_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	_, err = utils.GlobalDB.Exec(`
		UPDATE notifications
		SET is_read = true
		WHERE id = ? AND user_id = ?
	`, requestData.NotificationID, userID)

	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// handleMarkAllAsRead marks all notifications as read for the current user
// Accepts POST requests and marks all unread notifications as read
func (nh *NotificationHandler) handleMarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	cookie, err := r.Cookie("session_token")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "Unauthorized - No session found",
		})
		return
	}

	userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "Unauthorized - Invalid session",
		})
		return
	}

	// Mark all notifications as read for this user
	result, err := utils.GlobalDB.Exec(`
		UPDATE notifications
		SET is_read = true
		WHERE user_id = ? AND is_read = false
	`, userID)

	if err != nil {
		log.Printf("Error marking all notifications as read: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "Failed to mark notifications as read",
		})
		return
	}

	// Get the number of affected rows
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting affected rows: %v", err)
		rowsAffected = 0
	}

	// Return success response with the number of notifications marked as read
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":        true,
		"message":        "All notifications marked as read",
		"markedAsRead":   rowsAffected,
		"newUnreadCount": 0,
	})
}

// handleGetNotificationsJSON returns notifications as JSON
// Used by the frontend to fetch notifications via AJAX
func (nh *NotificationHandler) handleGetNotificationsJSON(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	cookie, err := r.Cookie("session_token")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "Unauthorized - No session found",
		})
		return
	}

	userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "Unauthorized - Invalid session",
		})
		return
	}

	notifications, unreadCount, err := nh.getUserNotifications(userID)
	if err != nil {
		log.Printf("Error fetching notifications: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": fmt.Sprintf("Error fetching notifications: %v", err),
		})
		return
	}

	// Return notifications without marking them as read
	// (unlike the HTML endpoint which marks them as read)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"Notifications": notifications,
		"UnreadCount":   unreadCount,
		"CurrentUserID": userID,
	})
}

// GetUnreadCount returns the number of unread notifications for a user
// @param userID - The ID of the user to get the unread count for
// @returns int - The number of unread notifications
// @returns error - Any error that occurred during the query
func (nh *NotificationHandler) GetUnreadCount(userID string) (int, error) {
	var count int
	err := utils.GlobalDB.QueryRow(`
		SELECT COUNT(*)
		FROM notifications
		WHERE user_id = ? AND is_read = false
	`, userID).Scan(&count)

	return count, err
}

// handleGetNotificationCount returns the unread notification count as JSON
// Used by the frontend to fetch the notification count via AJAX
func (nh *NotificationHandler) handleGetNotificationCount(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	cookie, err := r.Cookie("session_token")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "Unauthorized - No session found",
		})
		return
	}

	userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "Unauthorized - Invalid session",
		})
		return
	}

	count, err := nh.GetUnreadCount(userID)
	if err != nil {
		log.Printf("Error fetching notification count: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": fmt.Sprintf("Error fetching notification count: %v", err),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"count": count,
	})
}
