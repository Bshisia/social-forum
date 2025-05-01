package handlers

import (
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"forum/utils"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins (adjust for production)
	},
}

var (
	clients      = make(map[*websocket.Conn]string) // Connected clients with userID
	broadcast    = make(chan Message)               // Broadcast channel
	privateMsg   = make(chan PrivateMessage)        // Private message channel
	onlineUsers  = make(map[string]bool)            // Track online users
	mutex        sync.Mutex                         // Mutex for thread safety
	statusUpdate = make(chan StatusUpdate)          // User status updates
)

// Message represents a WebSocket message
type Message struct {
	Type    string `json:"type"`    // Message type (e.g., "chat", "notification")
	Content string `json:"content"` // Message content
	Sender  string `json:"sender"`  // Sender ID or name
}

// PrivateMessage represents a private message between users
type PrivateMessage struct {
	Type      string `json:"type"`       // Always "private_message"
	SenderID  string `json:"sender_id"`  // Sender user ID
	ReceiverID string `json:"receiver_id"` // Receiver user ID
	Content   string `json:"content"`    // Message content
	Timestamp string `json:"timestamp"`  // Message timestamp
}

// StatusUpdate represents a user's online status
type StatusUpdate struct {
	UserID   string `json:"user_id"`
	IsOnline bool   `json:"is_online"`
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	userID, err := utils.ValidateSession(utils.GlobalDB, token)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	log.Printf("WebSocket connection established for user: %s", userID)

	// Proceed with WebSocket connection using userID if needed
}

// WebSocketHandler handles WebSocket connections
func WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Error upgrading to WebSocket: %v", err)
		return
	}
	defer ws.Close()

	// Get user ID from session cookie
	cookie, err := r.Cookie("session_token")
	if err != nil {
		log.Printf("No session cookie found for WebSocket connection")
		return
	}

	userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
	if err != nil {
		log.Printf("Invalid session for WebSocket connection: %v", err)
		return
	}

	// Add client to the map
	mutex.Lock()
	clients[ws] = userID
	onlineUsers[userID] = true
	mutex.Unlock()

	// Update user status in database
	_, err = utils.GlobalDB.Exec(`
		INSERT INTO user_status (user_id, is_online, last_seen) 
		VALUES (?, TRUE, ?)
		ON CONFLICT(user_id) DO UPDATE SET 
			is_online = TRUE,
			last_seen = ?
	`, userID, time.Now(), time.Now())
	if err != nil {
		log.Printf("Error updating user status: %v", err)
	}

	// Broadcast user online status
	statusUpdate <- StatusUpdate{UserID: userID, IsOnline: true}

	// Handle incoming messages
	for {
		var msg map[string]interface{}
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Printf("Error reading WebSocket message: %v", err)
			mutex.Lock()
			delete(clients, ws)
			delete(onlineUsers, userID)
			mutex.Unlock()

			// Update user status in database
			_, err = utils.GlobalDB.Exec(`
				UPDATE user_status 
				SET is_online = FALSE,
					last_seen = ?
				WHERE user_id = ?
			`, time.Now(), userID)
			if err != nil {
				log.Printf("Error updating user status: %v", err)
			}

			// Broadcast user offline status
			statusUpdate <- StatusUpdate{UserID: userID, IsOnline: false}
			break
		}

		// Handle different message types
		switch msg["type"] {
		case "private_message":
			handlePrivateMessage(msg, userID)
		default:
			// Handle other message types if needed
		}
	}
}

func handlePrivateMessage(msg map[string]interface{}, senderID string) {
	privateMsg <- PrivateMessage{
		Type:      "private_message",
		SenderID:  senderID,
		ReceiverID: msg["receiver_id"].(string),
		Content:   msg["content"].(string),
		Timestamp: time.Now().Format(time.RFC3339),
	}
}

// HandleMessages listens for incoming messages and broadcasts them
func HandleMessages() {
	for {
		select {
		case msg := <-broadcast:
			mutex.Lock()
			for client := range clients {
				err := client.WriteJSON(msg)
				if err != nil {
					log.Printf("Error writing WebSocket message: %v", err)
					client.Close()
					delete(clients, client)
				}
			}
			mutex.Unlock()

		case privateMsg := <-privateMsg:
			// Save message to database
			_, err := utils.GlobalDB.Exec(`
				INSERT INTO private_messages (sender_id, receiver_id, content, sent_at)
				VALUES (?, ?, ?, ?)
			`, privateMsg.SenderID, privateMsg.ReceiverID, privateMsg.Content, privateMsg.Timestamp)
			if err != nil {
				log.Printf("Error saving private message: %v", err)
				continue
			}

			// Send to receiver if online
			mutex.Lock()
			for client, userID := range clients {
				if userID == privateMsg.ReceiverID {
					err := client.WriteJSON(privateMsg)
					if err != nil {
						log.Printf("Error sending private message: %v", err)
						client.Close()
						delete(clients, client)
					}
				}
			}
			mutex.Unlock()

		case status := <-statusUpdate:
			// Broadcast status update to all clients
			mutex.Lock()
			for client := range clients {
				err := client.WriteJSON(map[string]interface{}{
					"type":      "status_update",
					"user_id":   status.UserID,
					"is_online": status.IsOnline,
				})
				if err != nil {
					log.Printf("Error sending status update: %v", err)
					client.Close()
					delete(clients, client)
				}
			}
			mutex.Unlock()
		}
	}
}

// GetOnlineUsers returns a list of online users
func GetOnlineUsers() []map[string]interface{} {
	mutex.Lock()
	defer mutex.Unlock()

	var onlineUsersList []map[string]interface{}
	for userID := range onlineUsers {
		var nickname string
		err := utils.GlobalDB.QueryRow(`
			SELECT nickname FROM users WHERE id = ?
		`, userID).Scan(&nickname)
		if err != nil {
			log.Printf("Error getting user nickname: %v", err)
			continue
		}

		onlineUsersList = append(onlineUsersList, map[string]interface{}{
			"id":       userID,
			"nickname": nickname,
		})
	}

	return onlineUsersList
}