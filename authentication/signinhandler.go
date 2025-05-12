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

	log.Printf("Login attempt for email: %s", credentials.Email)

	var storedPassword string
	var userId string
	var nickname string
	err = GlobalDB.QueryRow("SELECT id, password, nickname FROM users WHERE email = ?", credentials.Email).
		Scan(&userId, &storedPassword, &nickname)
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

	go broadcastUserStatus(userId, true)

	// ✅ Mark user as online
	_, err = GlobalDB.Exec("UPDATE users SET is_online = TRUE WHERE id = ?", userId)
	if err != nil {
		log.Printf("Error updating user online status: %v", err)
	}

	// ✅ Create session
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

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    sessionToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   r.TLS != nil,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   24 * 60 * 60, // 1 day
	})

	log.Printf("Login successful for user: %s, session created: %s", userId, sessionToken)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":  "Login successful",
		"success":  true,
		"userId":   userId,
		"nickname": nickname,
	})
}

func GetUsersWithStatus(w http.ResponseWriter, r *http.Request) {
    // Query users with their online status
    rows, err := GlobalDB.Query(`
        SELECT id, nickname, first_name || ' ' || last_name as user_name, profile_pic, is_online 
        FROM users
        ORDER BY is_online DESC, nickname ASC
    `)
    if err != nil {
        http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    var users []struct {
        ID        string         `json:"id"`
        Username  string         `json:"username"`
        Nickname  string         `json:"nickname"`
        ProfilePic sql.NullString `json:"profile_pic"`
        IsOnline  bool           `json:"is_online"`
    }

    for rows.Next() {
        var user struct {
            ID        string         `json:"id"`
            Username  string         `json:"username"`
            Nickname  string         `json:"nickname"`
            ProfilePic sql.NullString `json:"profile_pic"`
            IsOnline  bool           `json:"is_online"`
        }
        if err := rows.Scan(&user.ID, &user.Nickname, &user.Username, &user.ProfilePic, &user.IsOnline); err != nil {
            http.Error(w, "Failed to parse user data", http.StatusInternalServerError)
            return
        }
        users = append(users, user)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(users)
}