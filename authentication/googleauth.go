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

var (
	Google_clientID     string
	Google_clientSecret string
	Google_redirectURI  string
	authURL             string
	tokenURL            string
	userInfoURL         string
	oauthState          string
)

func init() {
	// Load .env variables
	loadEnv(".env")

	// Retrieve environment variables
	Google_clientID = os.Getenv("GOOGLE_CLIENT_ID")
	Google_clientSecret = os.Getenv("GOOGLE_CLIENT_SECRET")
	Google_redirectURI = os.Getenv("GOOGLE_REDIRECT_URI")
	authURL = os.Getenv("GOOGLE_AUTH_URL")
	tokenURL = os.Getenv("GOOGLE_TOKEN_URL")
	userInfoURL = os.Getenv("GOOGLE_USER_INFO_URL")
	oauthState = "OAUTH_STATE"

	if clientID == "" || clientSecret == "" || redirectURI == "" {
		log.Fatal("Missing required environment variables")
	}
}

// HandleGoogleLogin redirects the user to Google's OAuth2 login page
func HandleGoogleLogin(w http.ResponseWriter, r *http.Request) {
	params := url.Values{}
	params.Set("client_id", Google_clientID)
	params.Set("redirect_uri", Google_redirectURI)
	params.Set("response_type", "code")
	params.Set("scope", "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email")
	params.Set("state", oauthState)

	loginURL := fmt.Sprintf("%s?%s", authURL, params.Encode())
	http.Redirect(w, r, loginURL, http.StatusSeeOther)
}

func getGoogleAccessToken(code string) (string, error) {
	data := url.Values{}
	data.Set("client_id", Google_clientID)
	data.Set("client_secret", Google_clientSecret)
	data.Set("code", code)
	data.Set("grant_type", "authorization_code")
	data.Set("redirect_uri", Google_redirectURI)

	resp, err := http.PostForm(tokenURL, data)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var tokenData map[string]interface{}
	if err := json.Unmarshal(body, &tokenData); err != nil {
		return "", err
	}
	token, ok := tokenData["access_token"].(string)
	if !ok {
		return "", err
	}

	return token, nil
}

func getGoogleUser(token string) (map[string]interface{}, error) {
	req, err := http.NewRequest("GET", userInfoURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user info: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Parse JSON response
	var userData map[string]interface{}
	if err := json.Unmarshal(body, &userData); err != nil {
		return nil, fmt.Errorf("failed to parse user info: %w", err)
	}

	return userData, nil
}

func HandleGoogleCallback(w http.ResponseWriter, r *http.Request) {
	// 1️⃣ Validate state parameter to prevent CSRF
	state := r.URL.Query().Get("state")
	if state != oauthState {
		http.Error(w, "Invalid OAuth state", http.StatusBadRequest)
		log.Println("OAuth state mismatch. Possible CSRF attack.")
		return
	}

	// 2️⃣ Extract authorization code from URL
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Authorization code not found", http.StatusBadRequest)
		return
	}

	// 3️⃣ Exchange code for access token
	token, err := getGoogleAccessToken(code)
	if err != nil {
		http.Error(w, "Failed to get access token", http.StatusInternalServerError)
		log.Println("Error getting token:", err)
		return
	}

	// 4️⃣ Fetch user info from Google
	userData, err := getGoogleUser(token)
	if err != nil {
		http.Error(w, "Failed to get user data", http.StatusInternalServerError)
		log.Println("Error getting user data:", err)
		return
	}

	// 5️⃣ Extract user details
	username := userData["name"].(string)
	email := userData["email"].(string)
	profilePic := userData["picture"].(string)
	authoriser := "google"

	// 6️⃣ Check if user exists in the database
	var userID string
	err = GlobalDB.QueryRow(`SELECT id FROM users WHERE email = ?`, email).Scan(&userID)
	if err == sql.ErrNoRows {
		// If user does not exist, create a new user
		userID = utils.GenerateId()
		_, err := GlobalDB.Exec(`INSERT INTO users (id, username, email, authoriser, profile_pic) VALUES (?, ?, ?, ?, ?)`,
			userID, username, email, authoriser, profilePic)
		if err != nil {
			http.Error(w, "Failed to save user", http.StatusInternalServerError)
			log.Println("Database insert error:", err)
			return
		}
	}

	// 7️⃣ Create a session
	sessionToken, err := utils.CreateSession(GlobalDB, userID)
	if err != nil {
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		log.Println("Session creation error:", err)
		return
	}

	// 8️⃣ Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    sessionToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   24 * 60 * 60, // Expires in 1 day
	})

	log.Printf("User %s logged in with session %s", username, sessionToken)

	// 9️⃣ Redirect to homepage
	http.Redirect(w, r, "/", http.StatusSeeOther)
}
