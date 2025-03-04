package controllers

import (
	"encoding/json"
	"html/template"
	"log"
	"net/http"

	"forum/utils"
)

type NotificationHandler struct{}

func NewNotificationHandler() *NotificationHandler {
	return &NotificationHandler{}
}

func (nh *NotificationHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		nh.handleGetNotifications(w, r)
	case http.MethodPost:
		if r.URL.Path == "/notifications/mark-read" {
			nh.handleMarkAsRead(w, r)
		} else {
			utils.RenderErrorPage(w, http.StatusMethodNotAllowed, utils.ErrMethodNotAllowed)
		}
	default:
		utils.RenderErrorPage(w, http.StatusMethodNotAllowed, utils.ErrMethodNotAllowed)
	}
}

func (nh *NotificationHandler) handleGetNotifications(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_token")
	if err != nil {
		http.Redirect(w, r, "/signin", http.StatusSeeOther)
		return
	}

	userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
	if err != nil {
		http.Redirect(w, r, "/signin", http.StatusSeeOther)
		return
	}

	notifications, unreadCount, err := nh.getUserNotifications(userID)
	if err != nil {
		log.Printf("Error fetching notifications: %v", err)
		utils.RenderErrorPage(w, http.StatusInternalServerError, utils.ErrInternalServer)
		return
	}

	// Mark all notifications as read when viewing the page
	if unreadCount > 0 {
		_, err = utils.GlobalDB.Exec(`
            UPDATE notifications 
            SET is_read = true 
            WHERE user_id = ? AND is_read = false
        `, userID)
		if err != nil {
			log.Printf("Error marking notifications as read: %v", err)
		}
	}

	data := struct {
		Notifications []utils.Notification
		UnreadCount   int
		IsLoggedIn    bool
		CurrentUserID string
	}{
		Notifications: notifications,
		UnreadCount:   0, // Set to 0 since we've marked all as read
		IsLoggedIn:    true,
		CurrentUserID: userID,
	}

	tmpl, err := template.ParseFiles("templates/notifications.html")
	if err != nil {
		log.Printf("Error parsing template: %v", err)
		utils.RenderErrorPage(w, http.StatusInternalServerError, utils.ErrTemplateLoad)
		return
	}

	if err := tmpl.Execute(w, data); err != nil {
		log.Printf("Error executing template: %v", err)
		utils.RenderErrorPage(w, http.StatusInternalServerError, utils.ErrTemplateExec)
	}
}
func (nh *NotificationHandler) getUserNotifications(userID string) ([]utils.Notification, int, error) {
	rows, err := utils.GlobalDB.Query(`
		SELECT n.id, n.type, n.created_at, n.post_id, u.username, u.profile_pic, n.is_read
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
		err := rows.Scan(&n.ID, &n.Type, &n.CreatedAt, &n.PostID, &n.ActorName, &n.ActorProfilePic, &n.IsRead)
		if err != nil {
			log.Printf("Error scanning notification: %v", err)
			continue
		}
		if !n.IsRead {
			unreadCount++
		}
		n.CreatedAtFormatted = FormatTimeAgo(n.CreatedAt)
		notifications = append(notifications, n)
	}
	return notifications, unreadCount, nil
}

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

// GetUnreadCount returns the number of unread notifications for a user
func (nh *NotificationHandler) GetUnreadCount(userID string) (int, error) {
	var count int
	err := utils.GlobalDB.QueryRow(`
		SELECT COUNT(*) 
		FROM notifications 
		WHERE user_id = ? AND is_read = false
	`, userID).Scan(&count)

	return count, err
}
