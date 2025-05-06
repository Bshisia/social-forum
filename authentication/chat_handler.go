package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"
)

type Message struct {
	ID         int       `json:"id"`
	SenderID   string    `json:"sender_id"`
	ReceiverID string    `json:"receiver_id"`
	Content    string    `json:"content"`
	SentAt     time.Time `json:"sent_at"`
}

func GetChatHistoryHandler(w http.ResponseWriter, r *http.Request) {
	// Get query parameters
	senderID := r.URL.Query().Get("sender_id")
	receiverID := r.URL.Query().Get("receiver_id")

	if senderID == "" || receiverID == "" {
		http.Error(w, "Both sender_id and receiver_id are required", http.StatusBadRequest)
		return
	}

	// Query the database for messages between these users
	rows, err := GlobalDB.Query(`
		SELECT id, sender_id, receiver_id, content, sent_at 
		FROM messages 
		WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
		ORDER BY sent_at ASC
	`, senderID, receiverID, receiverID, senderID)
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
	json.NewEncoder(w).Encode(map[string]interface{}{
		"messages": messages,
	})
}

func GetUserHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Path[len("/api/users/"):]
	if userID == "" {
		http.Error(w, "User ID is required", http.StatusBadRequest)
		return
	}

	var user struct {
		ID         string         `json:"id"`
		Nickname   string         `json:"nickname"`
		UserName   string         `json:"user_name"`
		ProfilePic sql.NullString `json:"profile_pic"`
	}

	err := GlobalDB.QueryRow(`
		SELECT id, nickname, first_name || ' ' || last_name as user_name, profile_pic 
		FROM users 
		WHERE id = ?
	`, userID).Scan(&user.ID, &user.Nickname, &user.UserName, &user.ProfilePic)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to query user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}
