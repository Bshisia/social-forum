package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/websocket"
)

// Message represents a chat message structure
type Message struct {
	ID         int       `json:"id"`
	SenderID   string    `json:"sender_id"`
	ReceiverID string    `json:"receiver_id"`
	Content    string    `json:"content"`
	SentAt     time.Time `json:"sent_at"`
	Read       bool      `json:"read"`
}

// GetChatHistoryHandler fetches chat history between two users with pagination
func GetChatHistoryHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Get query parameters
	user1 := r.URL.Query().Get("user1")
	user2 := r.URL.Query().Get("user2")

	// Pagination parameters
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1
	limit := 10

	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	offset := (page - 1) * limit

	if user1 == "" || user2 == "" {
		log.Printf("Missing user parameters: user1=%s, user2=%s", user1, user2)
		http.Error(w, "Both user1 and user2 parameters are required", http.StatusBadRequest)
		return
	}

	log.Printf("Fetching chat history between users %s and %s (page %d, limit %d)", user1, user2, page, limit)

	// Query the database for messages between these users with pagination
	rows, err := GlobalDB.Query(`
		SELECT id, sender_id, receiver_id, content, sent_at, read
		FROM messages
		WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
		ORDER BY sent_at DESC
		LIMIT ? OFFSET ?
	`, user1, user2, user2, user1, limit, offset)
	if err != nil {
		log.Printf("Database error querying messages: %v", err)
		http.Error(w, "Failed to query messages", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var messages []map[string]interface{}
	for rows.Next() {
		var id int
		var senderID, receiverID, content string
		var sentAt string
		var read bool

		if err := rows.Scan(&id, &senderID, &receiverID, &content, &sentAt, &read); err != nil {
			log.Printf("Error scanning message row: %v", err)
			continue
		}

		// Format the message in the format expected by the client
		messages = append(messages, map[string]interface{}{
			"id":        id,
			"sender":    senderID,
			"recipient": receiverID,
			"content":   content,
			"timestamp": sentAt,
			"read":      read,
		})
	}

	// If no messages were found, return an empty array rather than null
	if messages == nil {
		messages = []map[string]interface{}{}
		log.Printf("No messages found between users %s and %s for page %d", user1, user2, page)
	} else {
		log.Printf("Found %d messages between users %s and %s for page %d", len(messages), user1, user2, page)
		// Reverse the order to get chronological order (oldest first)
		for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
			messages[i], messages[j] = messages[j], messages[i]
		}
	}

	// Return the messages as JSON
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(messages); err != nil {
		log.Printf("Error encoding messages to JSON: %v", err)
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}

// GetNewMessagesHandler fetches only new messages since a specific message ID
func GetNewMessagesHandler(w http.ResponseWriter, r *http.Request) {
	senderID := r.URL.Query().Get("sender_id")
	receiverID := r.URL.Query().Get("receiver_id")
	lastIDStr := r.URL.Query().Get("last_id")

	if senderID == "" || receiverID == "" {
		http.Error(w, "Both sender_id and receiver_id are required", http.StatusBadRequest)
		return
	}

	lastID, err := strconv.Atoi(lastIDStr)
	if err != nil {
		lastID = 0 // Default to 0 if not provided or invalid
	}

	// Query the database for new messages between these users
	rows, err := GlobalDB.Query(`
		SELECT id, sender_id, receiver_id, content, sent_at
		FROM messages
		WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
		AND id > ?
		ORDER BY sent_at ASC
	`, senderID, receiverID, receiverID, senderID, lastID)
	if err != nil {
		http.Error(w, "Failed to query new messages", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var msg Message
		if err := rows.Scan(&msg.ID, &msg.SenderID, &msg.ReceiverID, &msg.Content, &msg.SentAt); err != nil {
			http.Error(w, "Failed to scan message", http.StatusInternalServerError)
			return
		}
		messages = append(messages, msg)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"messages": messages,
	})
}

// SendMessageHandler handles sending a new message via HTTP API
func SendMessageHandler(w http.ResponseWriter, r *http.Request) {
	// Only allow POST method
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse request body
	var requestBody struct {
		SenderID   string `json:"sender_id"`
		ReceiverID string `json:"receiver_id"`
		Content    string `json:"content"`
		Timestamp  string `json:"timestamp,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request data
	if requestBody.SenderID == "" || requestBody.ReceiverID == "" || requestBody.Content == "" {
		http.Error(w, "sender_id, receiver_id, and content are required", http.StatusBadRequest)
		return
	}

	log.Printf("Saving message: From %s to %s: %s", requestBody.SenderID, requestBody.ReceiverID, requestBody.Content)

	// Get current time for message timestamp
	var sentAt time.Time
	if requestBody.Timestamp != "" {
		// Try to parse the provided timestamp
		var err error
		sentAt, err = time.Parse(time.RFC3339, requestBody.Timestamp)
		if err != nil {
			log.Printf("Error parsing timestamp %s: %v", requestBody.Timestamp, err)
			sentAt = time.Now()
		}
	} else {
		sentAt = time.Now()
	}

	// Format the timestamp as a string
	sentAtStr := sentAt.Format("2006-01-02 15:04:05")
	log.Printf("Formatted timestamp: %s", sentAtStr)

	// Insert message into database
	result, err := GlobalDB.Exec(`
		INSERT INTO messages (sender_id, receiver_id, content, sent_at, read)
		VALUES (?, ?, ?, ?, 0)
	`, requestBody.SenderID, requestBody.ReceiverID, requestBody.Content, sentAtStr)
	if err != nil {
		log.Printf("Database error saving message: %v", err)
		http.Error(w, "Failed to save message", http.StatusInternalServerError)
		return
	}

	// Get the ID of the inserted message
	messageID, err := result.LastInsertId()
	if err != nil {
		log.Printf("Error getting last insert ID: %v", err)
		http.Error(w, "Failed to get message ID", http.StatusInternalServerError)
		return
	}

	log.Printf("Message saved successfully with ID: %d", messageID)

	// Verify the message was saved by retrieving it
	var savedID int
	var savedContent string
	err = GlobalDB.QueryRow("SELECT id, content FROM messages WHERE id = ?", messageID).Scan(&savedID, &savedContent)
	if err != nil {
		log.Printf("Error verifying saved message: %v", err)
	} else {
		log.Printf("Verified saved message: ID=%d, Content=%s", savedID, savedContent)
	}

	// Notify any connected WebSocket clients about the new message
	// Broadcast a notification to update the users_nav component
	go BroadcastNewMessage(requestBody.SenderID, requestBody.ReceiverID)

	// Return success response with the saved message in the format expected by the client
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": map[string]interface{}{
			"id":        messageID,
			"sender":    requestBody.SenderID,
			"recipient": requestBody.ReceiverID,
			"content":   requestBody.Content,
			"timestamp": sentAt.Format(time.RFC3339),
		},
	})
}

// HandleChatMessage processes an incoming chat message from WebSocket
func HandleChatMessage(conn *websocket.Conn, message map[string]interface{}) {
	// Extract message data
	messageData, ok := message["message"].(map[string]interface{})
	if !ok {
		log.Printf("Invalid message format: %v", message)
		return
	}

	// Extract sender and recipient
	sender, ok1 := messageData["sender"].(string)
	recipient, ok2 := messageData["recipient"].(string)
	content, ok3 := messageData["content"].(string)

	if !ok1 || !ok2 || !ok3 {
		log.Printf("Missing required message fields: %v", messageData)
		return
	}

	// Get timestamp or use current time
	var timestamp string
	if ts, ok := messageData["timestamp"].(string); ok && ts != "" {
		timestamp = ts
	} else {
		timestamp = time.Now().Format(time.RFC3339)
	}

	log.Printf("Processing chat message from %s to %s: %s", sender, recipient, content)

	// Store message in database
	var messageID int64
	result, err := GlobalDB.Exec(`
		INSERT INTO messages (sender_id, receiver_id, content, sent_at, read)
		VALUES (?, ?, ?, ?, false)
	`, sender, recipient, content, timestamp)
	if err != nil {
		log.Printf("Error storing message in database: %v", err)
		return
	}

	messageID, err = result.LastInsertId()
	if err != nil {
		log.Printf("Error getting last insert ID: %v", err)
		return
	}

	log.Printf("Message stored in database with ID: %d", messageID)

	// Create response message
	responseMessage := map[string]interface{}{
		"type": "message",
		"message": map[string]interface{}{
			"id":        messageID,
			"sender":    sender,
			"recipient": recipient,
			"content":   content,
			"timestamp": timestamp,
			"read":      false,
		},
	}

	// Send to sender for confirmation
	err = conn.WriteJSON(responseMessage)
	if err != nil {
		log.Printf("Error sending message confirmation to sender: %v", err)
	}

	// Find recipient's connection and send message
	clientsMux.RLock()
	recipientConn, exists := clients[recipient]
	clientsMux.RUnlock()

	if exists {
		err = recipientConn.WriteJSON(responseMessage)
		if err != nil {
			log.Printf("Error sending message to recipient: %v", err)
		} else {
			log.Printf("Message delivered to recipient %s", recipient)
		}
	} else {
		log.Printf("Recipient %s is not connected, message will be delivered when they connect", recipient)
	}

	// Broadcast to all clients that a new message was sent to update their user lists
	go BroadcastMessageNotification(sender, recipient)
}

// BroadcastMessageNotification notifies all clients that a new message has been sent
// This is a separate function from BroadcastNewMessage in websocket.go to avoid name conflicts
func BroadcastMessageNotification(senderID string, receiverID string) {
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
