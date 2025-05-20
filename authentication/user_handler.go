package handlers

import (
	"database/sql"
	"encoding/json"
	"forum/utils"
	"log"
	"net/http"
	"strings"
)

// UserResponse is the standardized user response structure
type UserResponse struct {
	ID         string `json:"id"`
	Nickname   string `json:"nickname"`
	UserName   string `json:"username"`
	Email      string `json:"email,omitempty"`
	ProfilePic string `json:"profile_pic,omitempty"`
	IsOnline   bool   `json:"is_online"`
}

// UserResponseWithLastMessage extends UserResponse with last message timestamp
type UserResponseWithLastMessage struct {
	UserResponse
	LastMessageTime string `json:"last_message_time,omitempty"`
}

// GetUserHandler handles both listing all users and getting a single user
// Routes:
// - GET /api/users/ - Get all users
// - GET /api/users/{id} - Get a specific user
// - GET /api/users/with-last-message - Get all users with their last message timestamps
func GetUserHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Extract path to determine if we're getting all users or a specific user
	pathParts := strings.Split(r.URL.Path, "/")

	// Check for with-last-message parameter
	if len(pathParts) > 3 && pathParts[3] == "with-last-message" {
		getUsersWithLastMessage(w, r)
		return
	}

	// If the path is just "/api/users/" or "/api/users", return all users
	if len(pathParts) <= 3 || pathParts[3] == "" {
		getAllUsers(w, r)
		return
	}

	// Otherwise, get a specific user
	userID := pathParts[3]
	getSingleUser(w, r, userID)
}

// getUsersWithLastMessage fetches all users with their last message timestamp
// Used for sorting users in chat interface by most recent conversation
func getUsersWithLastMessage(w http.ResponseWriter, r *http.Request) {
	log.Printf("Fetching all users with last message timestamps")

	// Get the current user ID from the query parameter
	currentUserID := r.URL.Query().Get("current_user")
	if currentUserID == "" {
		log.Printf("No current_user parameter provided")
		http.Error(w, "current_user parameter is required", http.StatusBadRequest)
		return
	}

	// Query all users with their last message timestamp
	rows, err := GlobalDB.Query(`
        SELECT u.id, u.nickname, u.email, u.profile_pic, u.is_online,
               (SELECT MAX(timestamp)
                FROM messages
                WHERE (sender_id = u.id AND receiver_id = ?)
                   OR (sender_id = ? AND receiver_id = u.id)) as last_message_time
        FROM users u
        ORDER BY
            CASE WHEN (SELECT MAX(timestamp)
                      FROM messages
                      WHERE (sender_id = u.id AND receiver_id = ?)
                         OR (sender_id = ? AND receiver_id = u.id)) IS NULL THEN 1 ELSE 0 END,
            last_message_time DESC,
            nickname ASC
    `, currentUserID, currentUserID, currentUserID, currentUserID)

	if err != nil {
		log.Printf("Error querying users with messages: %v", err)
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []UserResponseWithLastMessage
	for rows.Next() {
		var user UserResponseWithLastMessage
		var profilePic sql.NullString
		var lastMessageTime sql.NullString

		// Scan the row into our user struct
		err := rows.Scan(&user.ID, &user.Nickname, &user.Email, &profilePic, &user.IsOnline, &lastMessageTime)
		if err != nil {
			log.Printf("Error scanning user row: %v", err)
			continue
		}

		// Handle NULL profile_pic
		if profilePic.Valid {
			user.ProfilePic = profilePic.String
		}

		// Handle NULL last_message_time
		if lastMessageTime.Valid {
			user.LastMessageTime = lastMessageTime.String
		}

		// Set username to nickname if not explicitly set
		if user.UserName == "" {
			user.UserName = user.Nickname
		}

		users = append(users, user)
	}

	// If no users were found, return an empty array rather than nil
	if users == nil {
		users = []UserResponseWithLastMessage{}
	}

	log.Printf("Returning %d users with last message timestamps", len(users))
	json.NewEncoder(w).Encode(users)
}

// getAllUsers fetches all users from the database
// Returns a list of all users sorted alphabetically by nickname
func getAllUsers(w http.ResponseWriter, r *http.Request) {
	log.Printf("Fetching all users")

	// Query all users
	rows, err := GlobalDB.Query(`
        SELECT id, nickname, email, profile_pic, is_online
        FROM users
        ORDER BY nickname ASC
    `)
	if err != nil {
		log.Printf("Error querying users: %v", err)
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []UserResponse
	for rows.Next() {
		var user UserResponse
		var profilePic sql.NullString

		// Scan the row into our user struct
		err := rows.Scan(&user.ID, &user.Nickname, &user.Email, &profilePic, &user.IsOnline)
		if err != nil {
			log.Printf("Error scanning user row: %v", err)
			continue
		}

		// Handle NULL profile_pic
		if profilePic.Valid {
			user.ProfilePic = profilePic.String
		}

		// Set username to nickname if not explicitly set
		if user.UserName == "" {
			user.UserName = user.Nickname
		}

		users = append(users, user)
	}

	// If no users were found, return an empty array rather than nil
	if users == nil {
		users = []UserResponse{}
	}

	log.Printf("Returning %d users", len(users))
	json.NewEncoder(w).Encode(users)
}

// getSingleUser fetches a single user by ID
// Returns detailed information about a specific user
func getSingleUser(w http.ResponseWriter, r *http.Request, userID string) {
	log.Printf("Fetching user details for ID: %s", userID)

	// Check for special endpoints that shouldn't be treated as user IDs
	if userID == "stats" || userID == "profile" || userID == "profile-pic" {
		log.Printf("Invalid user ID format (special endpoint): %s", userID)
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Validate user ID format using our validation utility
	if err := utils.ValidateUserID(userID); err != nil {
		log.Printf("Invalid user ID format: %s, error: %v", userID, err)
		http.Error(w, "Invalid user ID format", http.StatusBadRequest)
		return
	}

	var user UserResponse
	var profilePic sql.NullString

	// Query the user
	err := GlobalDB.QueryRow(`
        SELECT id, nickname, email, profile_pic, is_online
        FROM users
        WHERE id = ?
    `, userID).Scan(&user.ID, &user.Nickname, &user.Email, &profilePic, &user.IsOnline)

	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("User not found with ID: %s", userID)
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		log.Printf("Database error when fetching user %s: %v", userID, err)
		http.Error(w, "Failed to query user", http.StatusInternalServerError)
		return
	}

	// Handle NULL profile_pic
	if profilePic.Valid {
		user.ProfilePic = profilePic.String
	}

	// Set username to nickname if not explicitly set
	if user.UserName == "" {
		user.UserName = user.Nickname
	}

	log.Printf("Successfully found user: %+v", user)
	json.NewEncoder(w).Encode(user)
}
