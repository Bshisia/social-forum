package handlers

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var (
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
	clients    = make(map[string]*websocket.Conn)
	clientsMux sync.RWMutex
)

type StatusMessage struct {
	Type     string `json:"type"`
	UserID   string `json:"user_id"`
	IsOnline bool   `json:"is_online"`
}

func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Add debug logging
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
}
