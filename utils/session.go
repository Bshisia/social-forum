package utils

import (
	"errors"
	"net/http"
	"time"

	//"github.com/google/uuid"
)

// Session represents a user session


// SessionManager manages user sessions
var SessionManager = make(map[string]Session)

// GetSession retrieves a session by ID
func GetSession(sessionID string) (*Session, error) {
	session, exists := SessionManager[sessionID]
	if !exists {
		return nil, errors.New("session not found")
	}

	// Check if session has expired
	if time.Now().After(session.ExpiresAt) {
		delete(SessionManager, sessionID)
		return nil, errors.New("session expired")
	}

	return &session, nil
}

// DeleteSession removes a session
func DeleteSession(sessionID string) {
	delete(SessionManager, sessionID)
	// You could also remove from database
}

// SetSessionCookie sets a session cookie
func SetSessionCookie(w http.ResponseWriter, sessionID string) {
	cookie := http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		MaxAge:   86400, // 24 hours in seconds
	}
	http.SetCookie(w, &cookie)
}

// ClearSessionCookie clears the session cookie
func ClearSessionCookie(w http.ResponseWriter) {
	cookie := http.Cookie{
		Name:     "session_id",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1, // Delete cookie
	}
	http.SetCookie(w, &cookie)
}

// GetSessionFromRequest gets the session from a request
func GetSessionFromRequest(r *http.Request) (*Session, error) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		return nil, err
	}

	return GetSession(cookie.Value)
}
