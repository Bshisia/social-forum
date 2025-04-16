package handlers

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins (adjust for production)
	},
}

var (
	clients   = make(map[*websocket.Conn]bool) // Connected clients
	broadcast = make(chan Message)             // Broadcast channel
	mutex     sync.Mutex                       // Mutex for thread safety
)

// Message represents a WebSocket message
type Message struct {
	Type    string `json:"type"`    // Feature type (e.g., "chat", "notification")
	Content string `json:"content"` // Message content
	Sender  string `json:"sender"`  // Sender ID or name
}

// WebSocketHandler handles WebSocket connections
func WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Error upgrading to WebSocket: %v", err)
		return
	}
	defer ws.Close()

	mutex.Lock()
	clients[ws] = true
	mutex.Unlock()

	for {
		var msg Message
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Printf("Error reading WebSocket message: %v", err)
			mutex.Lock()
			delete(clients, ws)
			mutex.Unlock()
			break
		}
		broadcast <- msg
	}
}

// HandleMessages listens for incoming messages and broadcasts them to all clients
func HandleMessages() {
	for {
		msg := <-broadcast
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
	}
}
