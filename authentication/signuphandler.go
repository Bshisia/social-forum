package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"forum/utils"

	"golang.org/x/crypto/bcrypt"
)

var GlobalDB *sql.DB

func InitDB(database *sql.DB) {
	GlobalDB = database
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Invalid request method",
			"success": false,
		})
		return
	}

	var user struct {
		Nickname  string `json:"nickname"`
		Age       int    `json:"age"`
		Gender    string `json:"gender"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Email     string `json:"email"`
		Password  string `json:"password"`
	}

	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Invalid request body",
			"success": false,
		})
		return
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Failed to hash password",
			"success": false,
		})
		return
	}

	// Generate a unique ID for the user
	userID := utils.GenerateId()

	// Insert the user into the database
	_, err = GlobalDB.Exec(`
        INSERT INTO users (id, nickname, age, gender, first_name, last_name, email, password)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, userID, user.Nickname, user.Age, user.Gender, user.FirstName, user.LastName, user.Email, hashedPassword)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Failed to create user",
			"success": false,
		})
		return
	}

	// Respond with success
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "User registered successfully",
		"success": true,
	})
}
