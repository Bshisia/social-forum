package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"time"
)

// UserWithLastMessage represents a user with their last message timestamp
type UserWithLastMessage struct {
	ID         string     `json:"id"`
	UserName   string     `json:"userName"`
	ProfilePic string     `json:"profilePic"`
	IsOnline   bool       `json:"isOnline"`
	LastMessage *time.Time `json:"lastMessage,omitempty"`
}

// GetChatUsersHandler returns a list of users with their last message timestamps
func GetChatUsersHandler(w http.ResponseWriter, r *http.Request) {
	// Only allow GET method
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get current user ID from query parameter
	currentUserID := r.URL.Query().Get("currentUserId")
	if currentUserID == "" {
		http.Error(w, "currentUserId parameter is required", http.StatusBadRequest)
		return
	}

	log.Printf("Fetching chat users for user ID: %s", currentUserID)

	// First, get all users except the current user
	rows, err := GlobalDB.Query(`
		SELECT id, nickname, profile_pic, is_online
		FROM users
		WHERE id != ?
	`, currentUserID)
	
	if err != nil {
		log.Printf("Database error querying users: %v", err)
		http.Error(w, "Failed to query users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []UserWithLastMessage
	for rows.Next() {
		var user UserWithLastMessage
		var profilePic interface{} // Use interface{} to handle NULL values
		
		if err := rows.Scan(&user.ID, &user.UserName, &profilePic, &user.IsOnline); err != nil {
			log.Printf("Error scanning user row: %v", err)
			continue
		}
		
		// Handle NULL profile_pic
		if profilePic != nil {
			if s, ok := profilePic.(string); ok {
				user.ProfilePic = s
			}
		}
		
		users = append(users, user)
	}

	// For each user, get the timestamp of their last message with the current user
	for i := range users {
		var lastMessageTime string
		err := GlobalDB.QueryRow(`
			SELECT MAX(sent_at) 
			FROM messages 
			WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
		`, currentUserID, users[i].ID, users[i].ID, currentUserID).Scan(&lastMessageTime)
		
		if err != nil || lastMessageTime == "" {
			// No messages between these users
			continue
		}
		
		// Parse the timestamp
		parsedTime, err := time.Parse("2006-01-02 15:04:05", lastMessageTime)
		if err != nil {
			log.Printf("Error parsing timestamp %s: %v", lastMessageTime, err)
			continue
		}
		
		users[i].LastMessage = &parsedTime
	}

	// Sort users: first by last message time (most recent first), then alphabetically
	sort.Slice(users, func(i, j int) bool {
		// If both have messages, sort by most recent
		if users[i].LastMessage != nil && users[j].LastMessage != nil {
			return users[i].LastMessage.After(*users[j].LastMessage)
		}
		
		// If only one has messages, that one comes first
		if users[i].LastMessage != nil {
			return true
		}
		if users[j].LastMessage != nil {
			return false
		}
		
		// If neither has messages, sort alphabetically
		return users[i].UserName < users[j].UserName
	})

	// Return the sorted users as JSON
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(users); err != nil {
		log.Printf("Error encoding users to JSON: %v", err)
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}
