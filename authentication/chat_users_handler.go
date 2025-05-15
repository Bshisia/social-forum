package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
)

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

	// Query all users with their last message timestamp
	rows, err := GlobalDB.Query(`
		SELECT u.id, u.nickname, u.profile_pic, u.is_online,
			   (SELECT MAX(sent_at)
				FROM messages
				WHERE (sender_id = u.id AND receiver_id = ?)
				   OR (sender_id = ? AND receiver_id = u.id)) as last_message_time
		FROM users u
		WHERE u.id != ?
		ORDER BY
			CASE WHEN (SELECT MAX(sent_at)
					  FROM messages
					  WHERE (sender_id = u.id AND receiver_id = ?)
						 OR (sender_id = ? AND receiver_id = u.id)) IS NULL THEN 1 ELSE 0 END,
			last_message_time DESC,
			nickname ASC
	`, currentUserID, currentUserID, currentUserID, currentUserID, currentUserID)
	if err != nil {
		log.Printf("Error querying users with messages: %v", err)
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []map[string]interface{}
	for rows.Next() {
		var id, nickname string
		var profilePic sql.NullString
		var isOnline bool
		var lastMessageTime sql.NullString

		if err := rows.Scan(&id, &nickname, &profilePic, &isOnline, &lastMessageTime); err != nil {
			log.Printf("Error scanning user row: %v", err)
			continue
		}

		user := map[string]interface{}{
			"id":       id,
			"userName": nickname,
			"isOnline": isOnline,
		}

		if profilePic.Valid {
			user["profilePic"] = profilePic.String
		} else {
			user["profilePic"] = ""
		}

		if lastMessageTime.Valid {
			user["lastMessage"] = lastMessageTime.String
		} else {
			user["lastMessage"] = nil
		}

		users = append(users, user)
	}

	// If no users were found, return an empty array rather than null
	if users == nil {
		users = []map[string]interface{}{}
	}

	// Return the users as JSON
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(users); err != nil {
		log.Printf("Error encoding users to JSON: %v", err)
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
		return
	}
}
