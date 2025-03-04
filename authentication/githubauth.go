package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"forum/utils"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
)

// Global variables for GitHub OAuth
var (
	clientID     string
	clientSecret string
	redirectURI  string
)

func init() {
	// Load .env variables
	loadEnv(".env")

	// Retrieve environment variables
	clientID = os.Getenv("GITHUB_CLIENT_ID")
	clientSecret = os.Getenv("GITHUB_CLIENT_SECRET")
	redirectURI = os.Getenv("GITHUB_REDIRECT_URI")

	if clientID == "" || clientSecret == "" || redirectURI == "" {
		log.Fatal("Missing required environment variables")
	}
}

// HandleGitHubLogin redirects user to GitHub login
func HandleGitHubLogin(w http.ResponseWriter, r *http.Request) {
	authURL := fmt.Sprintf(
		"https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&scope=read:user",
		clientID, redirectURI,
	)
	http.Redirect(w, r, authURL, http.StatusSeeOther)
}

func getGithubAcccessToken(code string) (string, error) {
	data := url.Values{}
	data.Set("client_id", clientID)
	data.Set("client_secret", clientSecret)
	data.Set("code", code)
	data.Set("redirect_uri", redirectURI)

	resp, err := http.PostForm("https://github.com/login/oauth/access_token", data)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	values, err := url.ParseQuery(string(body))
	if err != nil {
		return "", err
	}

	return values.Get("access_token"), nil
}

func getGithubUser(token string) (map[string]interface{}, error) {
	req, err := http.NewRequest("GET", "http://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "token "+token)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var userData map[string]interface{}
	err = json.Unmarshal(body, &userData)
	if err != nil {
		return nil, err
	}

	return userData, nil
}

func HandleGitHubCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Code not found", http.StatusBadRequest)
		return
	}
	// exchange access token code
	token, err := getGithubAcccessToken(code)
	if err != nil {
		http.Error(w, "Failed to get access tokken", http.StatusInternalServerError)
		log.Println("Error getting token:", err)
		return
	}

	//fetch the user data
	userData, err := getGithubUser(token)
	if err != nil {
		http.Error(w, "Failed to get user data", http.StatusInternalServerError)
		log.Println("Error getting user data:", err)
		return
	}

	// userJSON, err := json.MarshalIndent(userData, "", "  ")
	// if err != nil {
	// 	http.Error(w, "Failed to encode user data", http.StatusInternalServerError)
	// 	log.Println("Error encoding JSON:", err)
	// 	return
	// }

	// // Print JSON to console
	// fmt.Println(string(userJSON))

	//extract the info needed
	username := userData["login"].(string)
	email := userData["email"]
	if email == nil {
		email = ""
	}
	profile_pic := userData["avatar_url"].(string)
	authoriser := "github"

	var userID string
	err = GlobalDB.QueryRow(`SELECT id FROM users WHERE username = ?`, username).Scan(&userID)
	if err == sql.ErrNoRows {
		userID = utils.GenerateId()

		_, err = GlobalDB.Exec(`INSERT INTO users (id, username, email, authoriser, profile_pic) VALUES (?, ?, ?, ?, ?)`, userID, username, email, authoriser, profile_pic)
		if err != nil {
			http.Error(w, "Failed to save user", http.StatusInternalServerError)
			log.Println("Database insert error:", err)
			return
		}
	} else if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Println("Database query error:", err)
		return
	}

	// Create session using UUID
	sessionToken, err := utils.CreateSession(GlobalDB, userID)
	if err != nil {
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		log.Println("Session creation error:", err)
		return
	}

	// Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    sessionToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   24 * 60 * 60,
	})

	log.Printf("User %s logged in with session %s", username, sessionToken)

	// Redirect to homepage after login
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
