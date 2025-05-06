package handlers

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var clients = make(map[string]*websocket.Conn)

func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Get user ID from query params
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "user_id parameter required", http.StatusBadRequest)
		return
	}

	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	// Register client
	clients[userID] = conn
	log.Printf("User %s connected", userID)

	// Handle messages
	for {
		var msg struct {
			SenderID   string `json:"sender_id"`
			ReceiverID string `json:"receiver_id"`
			Content    string `json:"content"`
		}

		if err := conn.ReadJSON(&msg); err != nil {
			log.Printf("User %s disconnected: %v", userID, err)
			delete(clients, userID)
			return
		}

		// Store message in database
		_, err := GlobalDB.Exec(
			"INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
			msg.SenderID, msg.ReceiverID, msg.Content,
		)
		if err != nil {
			log.Println("Failed to save message:", err)
			continue
		}

		// Forward message to recipient if online
		if recipientConn, ok := clients[msg.ReceiverID]; ok {
			if err := recipientConn.WriteJSON(msg); err != nil {
				log.Println("Failed to send message to recipient:", err)
			}
		}
	}
}
