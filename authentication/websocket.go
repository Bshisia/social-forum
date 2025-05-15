package handlers

import (
	"log"
	"net/http"
	"sync"
	"database/sql"
    "time"

	"github.com/gorilla/websocket"
)

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
	clients    = make(map[string]*websocket.Conn)
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
		ID        string `json:"id"`
		Nickname  string `json:"nickname"`
		IsOnline  bool   `json:"is_online"`
	} `json:"user"`
}

// NewMessageNotification represents a notification about a new chat message
type NewMessageNotification struct {
	Type       string `json:"type"`
	SenderID   string `json:"sender_id"`
	ReceiverID string `json:"receiver_id"`
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

	// Register client
	clientsMux.Lock()
	clients[userID] = conn
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

	clientsMux.RLock()
	defer clientsMux.RUnlock()

	for _, conn := range clients {
		err := conn.WriteJSON(status)
		if err != nil {
			log.Printf("Error broadcasting status: %v", err)
			continue
		}
	}
	log.Printf("Broadcasted status update for user %s: online=%v", userID, isOnline)

	// After sending the status update, also broadcast the updated users list
	go BroadcastUsersList()
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

	clientsMux.RLock()
	defer clientsMux.RUnlock()

	for _, conn := range clients {
		err := conn.WriteJSON(newUserMsg)
		if err != nil {
			log.Printf("Error broadcasting new user notification: %v", err)
			continue
		}
	}
	log.Printf("Broadcasted new user notification for user %s", userID)

	// After sending the notification, also broadcast the updated users list
	go BroadcastUsersList()
}

// BroadcastNewMessage notifies clients that a new message has been sent
func BroadcastNewMessage(senderID string, receiverID string) {
	log.Printf("Broadcasting new message notification from %s to %s", senderID, receiverID)

	notification := NewMessageNotification{
		Type:       "refresh_users",
		SenderID:   senderID,
		ReceiverID: receiverID,
	}

	clientsMux.RLock()
	defer clientsMux.RUnlock()

	for _, conn := range clients {
		err := conn.WriteJSON(notification)
		if err != nil {
			log.Printf("Error broadcasting message notification: %v", err)
			continue
		}
	}
	log.Printf("Broadcasted message notification from %s to %s", senderID, receiverID)

	// After sending the notification, also broadcast the updated users list
	go BroadcastUsersList()
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
			id        string
			nickname  string
			email     string
			firstName sql.NullString
			lastName  sql.NullString
			age       sql.NullInt64
			gender    sql.NullString
			profilePic sql.NullString
			createdAt time.Time
			isOnline  bool
			lastSeen  sql.NullTime
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
			"ID":        id,
			"UserName":  nickname,
			"Email":     email,
			"isOnline":  isOnline,
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
	defer clientsMux.RUnlock()

	for _, conn := range clients {
		err := conn.WriteJSON(message)
		if err != nil {
			log.Printf("Error broadcasting users list: %v", err)
			continue
		}
	}

	log.Printf("Broadcasted users list with %d users", len(users))
}
