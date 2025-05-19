package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// ClientConnection represents a WebSocket connection with a mutex for thread safety
type ClientConnection struct {
	Conn  *websocket.Conn
	Mutex sync.Mutex // Protects writes to this connection
}

// WriteJSON safely writes a JSON message to the WebSocket connection
// It uses a mutex to ensure only one goroutine can write at a time
func (c *ClientConnection) WriteJSON(v interface{}) error {
	c.Mutex.Lock()
	defer c.Mutex.Unlock()
	return c.Conn.WriteJSON(v)
}

// WebSocket configuration and client management
var (
	// upgrader handles WebSocket protocol upgrade
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
	// clients maps user IDs to their WebSocket connections
	clients = make(map[string]*ClientConnection)
	// clientsMux protects concurrent access to the clients map
	clientsMux sync.RWMutex
)

// StatusMessage represents a user's online status update
type StatusMessage struct {
	Type     string `json:"type"`
	UserID   string `json:"user_id"`
	IsOnline bool   `json:"is_online"`
}

// NewUserMessage represents a notification about a new user registration
type NewUserMessage struct {
	Type string `json:"type"`
	User struct {
		ID       string `json:"id"`
		Nickname string `json:"nickname"`
		IsOnline bool   `json:"is_online"`
	} `json:"user"`
}

// NewMessageNotification represents a notification about a new chat message
type NewMessageNotification struct {
	Type       string `json:"type"`
	SenderID   string `json:"sender_id"`
	ReceiverID string `json:"receiver_id"`
}

// NotificationMessage represents a notification event
type NotificationMessage struct {
	Type         string      `json:"type"`
	Notification interface{} `json:"notification"`
	UnreadCount  int         `json:"unread_count"`
	ReceiverID   string      `json:"receiver_id"`
}

// UsersListMessage represents a list of all users and their statuses
type UsersListMessage struct {
	Type  string      `json:"type"`
	Users interface{} `json:"users"`
}

// HandleWebSocket upgrades HTTP connection to WebSocket and manages user connections
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	log.Printf("Received WebSocket connection request from: %s", r.RemoteAddr)

	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		log.Printf("Missing user_id parameter from: %s", r.RemoteAddr)
		http.Error(w, "user_id parameter required", http.StatusBadRequest)
		return
	}

	log.Printf("Attempting WebSocket upgrade for user: %s", userID)

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error for user %s: %v", userID, err)
		return
	}

	log.Printf("WebSocket connection established for user: %s", userID)

	defer conn.Close()

	// Create a new client connection with mutex
	clientConn := &ClientConnection{
		Conn: conn,
	}

	// Register client
	clientsMux.Lock()
	clients[userID] = clientConn
	clientsMux.Unlock()

	// Broadcast user online status
	broadcastUserStatus(userID, true)

	defer func() {
		clientsMux.Lock()
		delete(clients, userID)
		clientsMux.Unlock()
		conn.Close()
		// Broadcast user offline status
		broadcastUserStatus(userID, false)
	}()

	// Keep connection alive and handle disconnection
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

// broadcastUserStatus updates a user's online status and notifies all clients
func broadcastUserStatus(userID string, isOnline bool) {
	// Update database first
	_, err := GlobalDB.Exec("UPDATE users SET is_online = ? WHERE id = ?", isOnline, userID)
	if err != nil {
		log.Printf("Error updating user online status in database: %v", err)
	}

	status := StatusMessage{
		Type:     "user_status",
		UserID:   userID,
		IsOnline: isOnline,
	}

	// Use a separate goroutine for broadcasting to avoid blocking
	go func() {
		clientsMux.RLock()
		clientsCopy := make(map[string]*ClientConnection)
		for id, conn := range clients {
			clientsCopy[id] = conn
		}
		clientsMux.RUnlock()

		// Now we can safely iterate through our copy without holding the lock
		for _, conn := range clientsCopy {
			err := conn.WriteJSON(status)
			if err != nil {
				log.Printf("Error broadcasting status: %v", err)
				continue
			}
		}
		log.Printf("Broadcasted status update for user %s: online=%v", userID, isOnline)

		// After sending the status update, also broadcast the updated users list
		// Use a small delay to avoid concurrent writes
		time.Sleep(100 * time.Millisecond)
		BroadcastUsersList()
	}()
}

// BroadcastNewUser notifies all connected clients about a new user registration
func BroadcastNewUser(userID string, nickname string) {
	log.Printf("Broadcasting new user notification for user %s (%s)", userID, nickname)

	newUserMsg := NewUserMessage{
		Type: "new_user",
	}
	newUserMsg.User.ID = userID
	newUserMsg.User.Nickname = nickname
	newUserMsg.User.IsOnline = true

	// Use a separate goroutine for broadcasting to avoid blocking
	go func() {
		clientsMux.RLock()
		clientsCopy := make(map[string]*ClientConnection)
		for id, conn := range clients {
			clientsCopy[id] = conn
		}
		clientsMux.RUnlock()

		// Now we can safely iterate through our copy without holding the lock
		for _, conn := range clientsCopy {
			err := conn.WriteJSON(newUserMsg)
			if err != nil {
				log.Printf("Error broadcasting new user notification: %v", err)
				continue
			}
		}
		log.Printf("Broadcasted new user notification for user %s", userID)

		// After sending the notification, also broadcast the updated users list
		// Use a small delay to avoid concurrent writes
		time.Sleep(100 * time.Millisecond)
		BroadcastUsersList()
	}()
}

// BroadcastNewMessage notifies clients that a new message has been sent
func BroadcastNewMessage(senderID string, receiverID string) {
	log.Printf("Broadcasting new message notification from %s to %s", senderID, receiverID)

	notification := NewMessageNotification{
		Type:       "refresh_users",
		SenderID:   senderID,
		ReceiverID: receiverID,
	}

	// Use a separate goroutine for broadcasting to avoid blocking
	go func() {
		clientsMux.RLock()
		clientsCopy := make(map[string]*ClientConnection)
		for id, conn := range clients {
			clientsCopy[id] = conn
		}
		clientsMux.RUnlock()

		// Now we can safely iterate through our copy without holding the lock
		for _, conn := range clientsCopy {
			err := conn.WriteJSON(notification)
			if err != nil {
				log.Printf("Error broadcasting message notification: %v", err)
				continue
			}
		}
		log.Printf("Broadcasted message notification from %s to %s", senderID, receiverID)

		// After sending the notification, also broadcast the updated users list
		// Use a small delay to avoid concurrent writes
		time.Sleep(100 * time.Millisecond)
		BroadcastUsersList()

		// Also broadcast a real-time notification to the receiver
		// Use another small delay to avoid concurrent writes
		time.Sleep(100 * time.Millisecond)
		// Call directly since BroadcastNotification already uses a goroutine internally
		BroadcastNotification(receiverID, senderID, "message")
	}()
}

// BroadcastNotification sends a real-time notification to a specific user
// receiverID: the user who should receive the notification
// actorID: the user who triggered the notification (sender, commenter, etc.)
// notificationType: the type of notification (message, like, comment, etc.)
func BroadcastNotification(receiverID string, actorID string, notificationType string) {
	// Use a separate goroutine to avoid blocking and potential deadlocks
	go func() {
		log.Printf("Broadcasting %s notification from %s to %s", notificationType, actorID, receiverID)

		var notificationID int
		var unreadCount int
		var actorName string
		var profilePic sql.NullString

		// For message notifications, we need to create a notification record first
		if notificationType == "message" {
			// Get a dummy post ID (0 is fine for messages as they don't relate to posts)
			dummyPostID := 0

			// Insert notification for the message
			result, err := GlobalDB.Exec(`
				INSERT INTO notifications (user_id, actor_id, post_id, type, created_at, is_read)
				VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, false)
			`, receiverID, actorID, dummyPostID, notificationType)

			if err != nil {
				log.Printf("Error creating message notification: %v", err)
				// Continue anyway to try to send the notification
			} else {
				// Get the ID of the inserted notification
				if id, err := result.LastInsertId(); err == nil {
					notificationID = int(id)
					log.Printf("Created message notification with ID: %d", notificationID)
				}
			}
		}

		// Get the actor's details (sender's name and profile pic)
		err := GlobalDB.QueryRow(`
			SELECT nickname, profile_pic FROM users WHERE id = ?
		`, actorID).Scan(&actorName, &profilePic)

		if err != nil {
			log.Printf("Error fetching actor details: %v", err)
			return
		}

		// If we didn't create a new notification (for non-message types), get the existing one
		if notificationID == 0 && notificationType != "message" {
			// Get the latest notification of this type
			err := GlobalDB.QueryRow(`
				SELECT n.id
				FROM notifications n
				WHERE n.user_id = ? AND n.actor_id = ? AND n.type = ?
				ORDER BY n.created_at DESC
				LIMIT 1
			`, receiverID, actorID, notificationType).Scan(&notificationID)

			if err != nil {
				log.Printf("Error fetching notification details: %v", err)
				return
			}
		}

		// Get the unread count
		err = GlobalDB.QueryRow(`
			SELECT COUNT(*)
			FROM notifications
			WHERE user_id = ? AND is_read = false
		`, receiverID).Scan(&unreadCount)

		if err != nil {
			log.Printf("Error fetching unread count: %v", err)
			return
		}

		// Create notification data
		var profilePicStr string
		if profilePic.Valid {
			profilePicStr = profilePic.String
		}

		notificationData := map[string]interface{}{
			"id":              notificationID,
			"type":            notificationType,
			"actorName":       actorName,
			"actorID":         actorID,
			"actorProfilePic": profilePicStr,
		}

		// Create the notification message
		message := NotificationMessage{
			Type:         "new_notification",
			Notification: notificationData,
			UnreadCount:  unreadCount,
			ReceiverID:   receiverID,
		}

		// Send only to the specific receiver
		clientsMux.RLock()
		conn, exists := clients[receiverID]
		clientsMux.RUnlock()

		if exists {
			err := conn.WriteJSON(message)
			if err != nil {
				log.Printf("Error sending notification to user %s: %v", receiverID, err)
				return
			}
			log.Printf("Successfully sent %s notification to user %s", notificationType, receiverID)
		} else {
			log.Printf("User %s is not connected, notification will be delivered when they connect", receiverID)
		}
	}()
}

// TriggerUsersListBroadcast is a handler that can be called from HTTP endpoints
// to manually trigger a broadcast of the users list
func TriggerUsersListBroadcast(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests
	if r.Method != "POST" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		w.Write([]byte("Method not allowed"))
		return
	}

	// Trigger the broadcast
	go BroadcastUsersList()

	// Return success
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Users list broadcast triggered"))
}

// BroadcastUsersList sends the current list of users to all connected clients
func BroadcastUsersList() {
	log.Printf("Broadcasting users list to all clients")

	// Get all users from the database
	rows, err := GlobalDB.Query(`
		SELECT id, nickname, email, first_name, last_name, age, gender, profile_pic, created_at, is_online, last_seen
		FROM users
		ORDER BY nickname ASC
	`)
	if err != nil {
		log.Printf("Error querying users for broadcast: %v", err)
		return
	}
	defer rows.Close()

	var users []map[string]interface{}
	for rows.Next() {
		var (
			id         string
			nickname   string
			email      string
			firstName  sql.NullString
			lastName   sql.NullString
			age        sql.NullInt64
			gender     sql.NullString
			profilePic sql.NullString
			createdAt  time.Time
			isOnline   bool
			lastSeen   sql.NullTime
		)

		err := rows.Scan(
			&id, &nickname, &email, &firstName, &lastName,
			&age, &gender, &profilePic, &createdAt, &isOnline, &lastSeen,
		)
		if err != nil {
			log.Printf("Error scanning user row: %v", err)
			continue
		}

		user := map[string]interface{}{
			"ID":       id,
			"UserName": nickname,
			"Email":    email,
			"isOnline": isOnline,
		}

		if profilePic.Valid {
			user["ProfilePic"] = profilePic.String
		} else {
			user["ProfilePic"] = ""
		}

		users = append(users, user)
	}

	if users == nil {
		users = []map[string]interface{}{}
	}

	// Create the users list message
	message := UsersListMessage{
		Type:  "users_list",
		Users: users,
	}

	// Broadcast to all clients
	clientsMux.RLock()
	clientsCopy := make(map[string]*ClientConnection)
	for id, conn := range clients {
		clientsCopy[id] = conn
	}
	clientsMux.RUnlock()

	// Now we can safely iterate through our copy without holding the lock
	for _, conn := range clientsCopy {
		err := conn.WriteJSON(message)
		if err != nil {
			log.Printf("Error broadcasting users list: %v", err)
			continue
		}
	}

	log.Printf("Broadcasted users list with %d users", len(users))
}
