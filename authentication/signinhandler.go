package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"forum/utils"
)

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Invalid request method",
			"success": false,
		})
		return
	}

	var credentials struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	err := json.NewDecoder(r.Body).Decode(&credentials)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Invalid request body",
			"success": false,
		})
		return
	}

	// Debug logging
	log.Printf("Login attempt for email: %s", credentials.Email)

	var storedPassword string
	var userId string
	var nickname string
	err = GlobalDB.QueryRow("SELECT id, password, nickname FROM users WHERE email = ?", credentials.Email).Scan(&userId, &storedPassword, &nickname)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("Login failed: email not found: %s", credentials.Email)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"message": "Invalid email or password",
				"success": false,
			})
		} else {
			log.Printf("Database error during login: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"message": "Failed to query database",
				"success": false,
			})
		}
		return
	}

	isValidPassword := utils.CheckPasswordsHash(storedPassword, credentials.Password)
	if !isValidPassword {
		log.Printf("Login failed: invalid password for user: %s", userId)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Invalid email or password",
			"success": false,
		})
		return
	}

	// Create the session before returning a response
	sessionToken, err := utils.CreateSession(GlobalDB, userId)
	if err != nil {
		log.Printf("Failed to create session: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Failed to create session",
			"success": false,
		})
		return
	}

	// Set cookie with the same settings as in api_handler.go for consistency
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    sessionToken,
		Path:     "/",
		HttpOnly: true,                    // Changed to true for security
		Secure:   r.TLS != nil,            // Set based on connection
		SameSite: http.SameSiteStrictMode, // Match API handler
		MaxAge:   24 * 60 * 60,            // 1 day
	})

	log.Printf("Login successful for user: %s, session created: %s", userId, sessionToken)

	// Now send the success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":  "Login successful",
		"success":  true,
		"userId":   userId,
		"nickname": nickname,
	})
}
