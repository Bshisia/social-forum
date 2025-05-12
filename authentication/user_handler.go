package handlers

import (
    "database/sql"
    "encoding/json"
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

// GetUserHandler handles both listing all users and getting a single user
func GetUserHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    // Extract path to determine if we're getting all users or a specific user
    pathParts := strings.Split(r.URL.Path, "/")
    
    // If the path is just "/api/users/" or "/api/users", return all users
    if len(pathParts) <= 3 || pathParts[3] == "" {
        getAllUsers(w, r)
        return
    }
    
    // Otherwise, get a specific user
    userID := pathParts[3]
    getSingleUser(w, r, userID)
}

// getAllUsers fetches all users from the database
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
func getSingleUser(w http.ResponseWriter, r *http.Request, userID string) {
    log.Printf("Fetching user details for ID: %s", userID)
    
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