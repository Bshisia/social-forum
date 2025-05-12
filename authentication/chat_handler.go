package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

type Message struct {
	ID         int       `json:"id"`
	SenderID   string    `json:"sender_id"`
	ReceiverID string    `json:"receiver_id"`
	Content    string    `json:"content"`
	SentAt     time.Time `json:"sent_at"`
}

// GetChatHistoryHandler fetches full chat history between two users
// GetChatHistoryHandler fetches full chat history between two users
func GetChatHistoryHandler(w http.ResponseWriter, r *http.Request) {
	// Get query parameters
	user1 := r.URL.Query().Get("user1")
	user2 := r.URL.Query().Get("user2")

	if user1 == "" || user2 == "" {
		http.Error(w, "Both user1 and user2 are required", http.StatusBadRequest)
		return
	}

	// Query the database for messages between these users
	rows, err := GlobalDB.Query(`
        SELECT id, sender_id, receiver_id, content, sent_at 
        FROM messages 
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY sent_at ASC
    `, user1, user2, user2, user1)
	if err != nil {
		http.Error(w, "Failed to query messages", http.StatusInternalServerError)
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
	json.NewEncoder(w).Encode(messages)
}

// GetNewMessagesHandler fetches only new messages since a specific message ID
func GetNewMessagesHandler(w http.ResponseWriter, r *http.Request) {
	// Get query parameters
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

// SendMessageHandler handles sending a new message
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
	}

	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request data
	if requestBody.SenderID == "" || requestBody.ReceiverID == "" || requestBody.Content == "" {
		http.Error(w, "sender_id, receiver_id, and content are required", http.StatusBadRequest)
		return
	}

	// Get current time for message timestamp
	now := time.Now()

	// Insert message into database
	result, err := GlobalDB.Exec(`
		INSERT INTO messages (sender_id, receiver_id, content, sent_at)
		VALUES (?, ?, ?, ?)
	`, requestBody.SenderID, requestBody.ReceiverID, requestBody.Content, now)
	if err != nil {
		http.Error(w, "Failed to save message", http.StatusInternalServerError)
		return
	}

	// Get the ID of the inserted message
	messageID, err := result.LastInsertId()
	if err != nil {
		http.Error(w, "Failed to get message ID", http.StatusInternalServerError)
		return
	}

	// Create response message
	message := Message{
		ID:         int(messageID),
		SenderID:   requestBody.SenderID,
		ReceiverID: requestBody.ReceiverID,
		Content:    requestBody.Content,
		SentAt:     now,
	}

	// Return success response with the saved message
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": message,
	})
}

// GetUserHandler fetches user details by ID
// func GetUserHandler(w http.ResponseWriter, r *http.Request) {
// 	userID := r.URL.Path[len("/api/users/"):]
// 	if userID == "" {
// 		http.Error(w, "User ID is required", http.StatusBadRequest)
// 		return
// 	}

// 	var user struct {
// 		ID         string         `json:"id"`
// 		Nickname   string         `json:"nickname"`
// 		UserName   string         `json:"user_name"`
// 		ProfilePic sql.NullString `json:"profile_pic"`
// 	}

// 	err := GlobalDB.QueryRow(`
// 		SELECT id, nickname, first_name || ' ' || last_name as user_name, profile_pic
// 		FROM users
// 		WHERE id = ?
// 	`, userID).Scan(&user.ID, &user.Nickname, &user.UserName, &user.ProfilePic)
// 	if err != nil {
// 		if err == sql.ErrNoRows {
// 			http.Error(w, "User not found", http.StatusNotFound)
// 			return
// 		}
// 		http.Error(w, "Failed to query user", http.StatusInternalServerError)
// 		return
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(user)
// }
