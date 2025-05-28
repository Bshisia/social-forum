package controllers

import (
    "encoding/json"
    "log"
    "net/http"
    "forum/utils"
)

// GetUserStatus returns the current user's authentication status and notification count
// Used by the frontend to determine if a user is logged in and display notification badges
func GetUserStatus(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")

    // Default status - not logged in
    userStatus := struct {
        IsLoggedIn    bool   `json:"isLoggedIn"`
        CurrentUserID string `json:"currentUserID"`
        UnreadCount   int    `json:"unreadCount"`
    }{
        IsLoggedIn:    false,
        CurrentUserID: "",
        UnreadCount:   0,
    }

    // Check for session cookie
    cookie, err := r.Cookie("session_token")
    if err != nil {
        json.NewEncoder(w).Encode(userStatus)
        return
    }

    // Validate session and get userID
    userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
    if err != nil {
        json.NewEncoder(w).Encode(userStatus)
        return
    }

    // Get unread notifications count
    var unreadCount int
    err = utils.GlobalDB.QueryRow(`
        SELECT COUNT(*)
        FROM notifications
        WHERE user_id = ? AND is_read = false
    `, userID).Scan(&unreadCount)
    if err != nil {
        log.Printf("Error getting unread count: %v", err)
    }

    // Update status with logged in user info
    userStatus.IsLoggedIn = true
    userStatus.CurrentUserID = userID
    userStatus.UnreadCount = unreadCount

    json.NewEncoder(w).Encode(userStatus)
}