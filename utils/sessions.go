package utils

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"fmt"
	"log"
	"time"
)

// Session-related error constants
var (
	ErrActiveSession = fmt.Errorf("user already has an active session")
	ErrNoSession     = fmt.Errorf("no active session found")
)

// GenerateSessionToken creates a new random session token
// Uses cryptographically secure random bytes encoded as base64
// @returns string - A new random session token
func GenerateSessionToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

// CreateSession creates a new session for a user
// Deletes any existing sessions for the user and creates a new one
// Also updates the user's online status
// @param db - Database connection
// @param userID - ID of the user to create a session for
// @returns string - The new session token
// @returns error - Any error that occurred
func CreateSession(db *sql.DB, userID string) (string, error) {
    // Delete any existing session for the user
    _, err := db.Exec(`
        DELETE FROM sessions
        WHERE user_id = ?
    `, userID)
    if err != nil {
        return "", fmt.Errorf("failed to delete existing session: %v", err)
    }

    // Generate new session
    sessionToken := GenerateSessionToken()
    expiresAt := time.Now().Add(24 * time.Hour)

    // Create new session
    _, err = db.Exec(`
        INSERT INTO sessions(id, user_id, expires_at)
        VALUES (?, ?, ?)
    `, sessionToken, userID, expiresAt)
    if err != nil {
        return "", fmt.Errorf("failed to create session: %v", err)
    }

    // Set user as online
    _, err = db.Exec(`
        UPDATE users
        SET is_online = 1
        WHERE id = ?
    `, userID)
    if err != nil {
        return "", fmt.Errorf("failed to update user online status: %v", err)
    }

    return sessionToken, nil
}

// ValidateSession checks if a session token is valid and not expired
// @param db - Database connection
// @param sessionToken - The session token to validate
// @returns string - The user ID associated with the session
// @returns error - Any error that occurred, or if the session is invalid
func ValidateSession(db *sql.DB, sessionToken string) (string, error) {
    var userID string
    err := db.QueryRow(`
        SELECT user_id FROM sessions
        WHERE id = ? AND expires_at > ?
    `, sessionToken, time.Now()).Scan(&userID)
    if err != nil {
        if err == sql.ErrNoRows {
            return "", fmt.Errorf("session expired or invalid")
        }
        return "", fmt.Errorf("error validating session: %v", err)
    }
    return userID, nil
}

// DeleteExpiredSessions removes all expired sessions from the database
// @param db - Database connection
// @returns int64 - Number of sessions deleted
// @returns error - Any error that occurred
func DeleteExpiredSessions(db *sql.DB) (int64, error) {
	result, err := db.Exec(`
		DELETE FROM sessions
		WHERE expires_at < ?
	`, time.Now())
	if err != nil {
		return 0, err
	}

	deletedSessions, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	return deletedSessions, nil
}

// StartSessionsCLeanUp starts a background goroutine that periodically cleans up expired sessions
// @param ctx - Context for cancellation
// @param db - Database connection
// @param interval - Time interval between cleanup runs
func StartSessionsCLeanUp(ctx context.Context, db *sql.DB, interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				rowsAffected, err := DeleteExpiredSessions(db)
				if err != nil {
					log.Printf("Failed to clean up expired sessions: %v", err)
				} else if rowsAffected > 0 {
					log.Printf("Cleaned up %d expired sessions", rowsAffected)
				}
			case <-ctx.Done():
				log.Println("Stopping session cleanup goroutine")
				return
			}
		}
	}()
}

// InitSessionManager initializes the session management system
// Sets up periodic cleanup of expired sessions
// @param db - Database connection
func InitSessionManager(db *sql.DB) {
	ctx := context.Background()
	interval := 1 * time.Hour
	StartSessionsCLeanUp(ctx, db, interval)
}
