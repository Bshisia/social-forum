package handlers

import (
	"database/sql"
	"encoding/json"
	"forum/utils"
	"log"
	"net/http"
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

	var storedPassword string
	var userId string
	var nickname string
	err = GlobalDB.QueryRow("SELECT id, password, nickname FROM users WHERE email = ?", credentials.Email).Scan(&userId, &storedPassword, &nickname)
	if err != nil {
		if err == sql.ErrNoRows {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"message": "Invalid email or password",
				"success": false,
			})
		} else {
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
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Invalid email or password",
			"success": false,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":  "Login successful",
		"success":  true,
		"userId":   userId,
		"nickname": nickname,
	})

	sessionToken, err := utils.CreateSession(GlobalDB, userId)
	if err != nil {
		utils.RenderErrorPage(w, http.StatusInternalServerError, http.StatusText(http.StatusInternalServerError))
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    sessionToken,
		Path:     "/",
		HttpOnly: false,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   24 * 60 * 60,
	})

	log.Printf("Set session cookie: %s", sessionToken)

}
