package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var (
	// Chat clients map - maps user IDs to their WebSocket connections
	chatClients    = make(map[string]*websocket.Conn)
	chatClientsMux sync.RWMutex
)

// ChatMessage represents a message sent between users
type ChatMessage struct {
	Type      string `json:"type"`
	Sender    string `json:"sender"`
	Recipient string `json:"recipient"`
	Content   string `json:"content"`
	Timestamp string `json:"timestamp"`
}

// TypingIndicator represents a typing status update
type TypingIndicator struct {
	Type      string `json:"type"`
	Sender    string `json:"sender"`
	Recipient string `json:"recipient"`
}

// HandleChatWebSocket handles WebSocket connections for chat
func HandleChatWebSocket(w http.ResponseWriter, r *http.Request) {
	// Get user IDs from query parameters
	user1 := r.URL.Query().Get("user1")
	user2 := r.URL.Query().Get("user2")

	if user1 == "" || user2 == "" {
		log.Printf("Missing user parameters for chat WebSocket")
		http.Error(w, "Both user1 and user2 parameters required", http.StatusBadRequest)
		return
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	// Register client with their user ID
	chatClientsMux.Lock()
	chatClients[user1] = conn
	chatClientsMux.Unlock()

	log.Printf("Chat WebSocket connection established for user: %s", user1)

	// Clean up on disconnect
	defer func() {
		chatClientsMux.Lock()
		delete(chatClients, user1)
		chatClientsMux.Unlock()
		conn.Close()
		log.Printf("Chat WebSocket connection closed for user: %s", user1)
	}()

	// Listen for messages
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Error reading message: %v", err)
			break
		}

		// Parse the message
		var msg map[string]interface{}
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("Error parsing message: %v", err)
			continue
		}

		// Handle different message types
		msgType, ok := msg["type"].(string)
		if !ok {
			log.Printf("Invalid message type")
			continue
		}
		switch msgType {
		case "message":
			// Save message to database
			if msgObj, ok := msg["message"].(map[string]interface{}); ok {
				sender := msgObj["sender"].(string)
				recipient := msgObj["recipient"].(string)
				content := msgObj["content"].(string)
				timestamp := msgObj["timestamp"].(string)
				
				log.Printf("WebSocket: Saving message from %s to %s: %s", sender, recipient, content)

				// Parse the timestamp
				parsedTime, err := time.Parse(time.RFC3339, timestamp)
				if err != nil {
					log.Printf("Error parsing timestamp: %v, using current time instead", err)
					parsedTime = time.Now()
				}

				// Format the timestamp as a string
				sentAtStr := parsedTime.Format("2006-01-02 15:04:05")
				log.Printf("Formatted timestamp: %s", sentAtStr)

				// Ensure the messages table exists
				_, err = GlobalDB.Exec(`
					CREATE TABLE IF NOT EXISTS messages (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						sender_id TEXT NOT NULL,
						receiver_id TEXT NOT NULL,
						content TEXT NOT NULL,
						sent_at TIMESTAMP NOT NULL,
						read BOOLEAN DEFAULT 0
					)
				`)
				if err != nil {
					log.Printf("Error ensuring messages table exists: %v", err)
				}

				// Insert into database
				result, err := GlobalDB.Exec(
					"INSERT INTO messages (sender_id, receiver_id, content, sent_at, read) VALUES (?, ?, ?, ?, 0)",
					sender, recipient, content, sentAtStr,
				)
				if err != nil {
					log.Printf("Error saving message via WebSocket: %v", err)
				} else {
					if id, err := result.LastInsertId(); err == nil {
						log.Printf("Message saved via WebSocket with ID: %d", id)
						
						// Verify the message was saved
						var savedID int
						var savedContent string
						err = GlobalDB.QueryRow("SELECT id, content FROM messages WHERE id = ?", id).Scan(&savedID, &savedContent)
						if err != nil {
							log.Printf("Error verifying saved message: %v", err)
						} else {
							log.Printf("Verified saved message: ID=%d, Content=%s", savedID, savedContent)
						}
					}
				}

				// Forward message to recipient if online
				forwardMessageToUser(recipient, message)
			}
		case "typing", "stop_typing":
			// Forward typing indicator to the recipient
			if recipient, ok := msg["recipient"].(string); ok {
				forwardMessageToUser(recipient, message)
			}
		}
	}
}

// forwardMessageToUser sends a message to a specific user if they're connected
func forwardMessageToUser(userID string, message []byte) {
	chatClientsMux.RLock()
	conn, exists := chatClients[userID]
	chatClientsMux.RUnlock()

	if exists {
		if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Printf("Error forwarding message to user %s: %v", userID, err)
		}
	}
}
