package controllers

import (
	"database/sql"
	"html/template"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"forum/utils"
)

type ProfileHandler struct {
	imageHandler *ImageHandler
}

type ProfileData struct {
	Username      string
	Email         string
	ProfilePic    sql.NullString
	IsLoggedIn    bool
	IsOwnProfile  bool
	UserID        string
	ErrorMessage  string
	PostCount     int
	CommentCount  int
	LikesReceived int
	UnreadCount   int
}

func NewProfileHandler() *ProfileHandler {
	return &ProfileHandler{
		imageHandler: NewImageHandler(),
	}
}

func (ph *ProfileHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Extract userID from URL path
	urlPath := r.URL.Path
	targetUserID := strings.TrimPrefix(urlPath, "/profile/")

	// Check if viewing own profile
	var currentUserID string
	isLoggedIn := false

	// Check if user is logged in
	if cookie, err := r.Cookie("session_token"); err == nil {
		if userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value); err == nil {
			currentUserID = userID
			isLoggedIn = true
		}
	}

	// Handle profile updates only for own profile
	if r.Method == "POST" && targetUserID == currentUserID {
		ph.handleProfileUpdate(w, r, currentUserID)
		return
	}

	ph.displayUserProfile(w, targetUserID, currentUserID, isLoggedIn)
}

func (ph *ProfileHandler) displayUserProfile(w http.ResponseWriter, targetUserID string, currentUserID string, isLoggedIn bool) {
	var profile ProfileData

	// Get user profile data
	err := utils.GlobalDB.QueryRow(`
        SELECT username, email, profile_pic 
        FROM users 
        WHERE id = ?
    `, targetUserID).Scan(&profile.Username, &profile.Email, &profile.ProfilePic)
	if err != nil {
		log.Printf("Error getting user profile: %v", err)
		utils.RenderErrorPage(w, http.StatusNotFound, utils.ErrNotFound)
		return
	}

	// Get post count
	err = utils.GlobalDB.QueryRow(`
        SELECT COUNT(*) 
        FROM posts 
        WHERE user_id = ?
    `, targetUserID).Scan(&profile.PostCount)
	if err != nil {
		log.Printf("Error getting post count: %v", err)
	}

	// Get comment count
	err = utils.GlobalDB.QueryRow(`
        SELECT COUNT(*) 
        FROM comments 
        WHERE user_id = ?
    `, targetUserID).Scan(&profile.CommentCount)
	if err != nil {
		log.Printf("Error getting comment count: %v", err)
	}

	// Get likes received
	err = utils.GlobalDB.QueryRow(`
        SELECT COUNT(*) 
        FROM reaction l
        JOIN posts p ON l.post_id = p.id
        WHERE p.user_id = ? AND l.like = 1
    `, targetUserID).Scan(&profile.LikesReceived)
	if err != nil {
		log.Printf("Error getting likes received: %v", err)
	}

	// Get unread notifications if viewing own profile
	if isLoggedIn && targetUserID == currentUserID {
		err = utils.GlobalDB.QueryRow(`
            SELECT COUNT(*) 
            FROM notifications 
            WHERE user_id = ? AND is_read = false
        `, currentUserID).Scan(&profile.UnreadCount)
		if err != nil {
			log.Printf("Error getting unread notifications: %v", err)
		}
	}

	// Set profile flags
	profile.UserID = targetUserID
	profile.IsLoggedIn = isLoggedIn
	profile.IsOwnProfile = targetUserID == currentUserID

	// Render template
	tmpl, err := template.ParseFiles("templates/profile.html")
	if err != nil {
		log.Printf("Error parsing template: %v", err)
		utils.RenderErrorPage(w, http.StatusInternalServerError, utils.ErrInternalServer)
		return
	}

	if err := tmpl.Execute(w, profile); err != nil {
		log.Printf("Error executing template: %v", err)
		utils.RenderErrorPage(w, http.StatusInternalServerError, utils.ErrInternalServer)
	}
}
func (ph *ProfileHandler) handleProfileUpdate(w http.ResponseWriter, r *http.Request, userID string) {
	// Get current user profile data
	var profile ProfileData
	err := utils.GlobalDB.QueryRow(`
        SELECT id, username, email, COALESCE(profile_pic, '') as profile_pic 
        FROM users 
        WHERE id = ?
    `, userID).Scan(&profile.UserID, &profile.Username, &profile.Email, &profile.ProfilePic)
	if err != nil {
		log.Printf("Error fetching profile: %v", err)
		utils.RenderErrorPage(w, http.StatusInternalServerError, utils.ErrInternalServer)
		return
	}

	profile.IsLoggedIn = true
	profile.IsOwnProfile = true

	tmpl, err := template.ParseFiles("templates/profile.html")
	if err != nil {
		log.Printf("Error parsing template: %v", err)
		utils.RenderErrorPage(w, http.StatusInternalServerError, utils.ErrInternalServer)
		return
	}

	// Check file size before processing
	if err := r.ParseMultipartForm(20 << 20); err != nil {
		profile.ErrorMessage = "File size too large. Maximum size is 20MB"
		tmpl.Execute(w, profile)
		return
	}

	file, header, err := r.FormFile("profile_pic")
	if err != nil {
		profile.ErrorMessage = "Error uploading image: " + err.Error()
		tmpl.Execute(w, profile)
		return
	}
	defer file.Close()

	// Validate file size explicitly
	if header.Size > 20<<20 {
		profile.ErrorMessage = "Image size must be less than 20MB"
		tmpl.Execute(w, profile)
		return
	}

	// Validate file type
	if !isValidImageType(header.Header.Get("Content-Type")) {
		profile.ErrorMessage = "Invalid file type. Please upload an image (JPEG, PNG, GIF)"
		tmpl.Execute(w, profile)
		return
	}

	// Get old profile pic path
	var oldImagePath sql.NullString
	err = utils.GlobalDB.QueryRow("SELECT profile_pic FROM users WHERE id = ?", userID).Scan(&oldImagePath)
	if err != nil {
		profile.ErrorMessage = "Error retrieving old profile picture"
		tmpl.Execute(w, profile)
		return
	}

	// Process new image
	imagePath, err := ph.imageHandler.ProcessImage(file, header)
	if err != nil {
		profile.ErrorMessage = "Error processing image: " + err.Error()
		tmpl.Execute(w, profile)
		return
	}

	// Update database with new image path
	_, err = utils.GlobalDB.Exec(`
        UPDATE users 
        SET profile_pic = ? 
        WHERE id = ?
    `, imagePath, userID)
	if err != nil {
		// Clean up new image if database update fails
		os.Remove(imagePath)
		profile.ErrorMessage = "Error updating profile picture in database"
		tmpl.Execute(w, profile)
		return
	}

	// Delete old profile pic if it exists
	if oldImagePath.Valid && oldImagePath.String != "" {
		oldPath := filepath.Join("uploads", filepath.Base(oldImagePath.String))
		if err := os.Remove(oldPath); err != nil {
			log.Printf("Error removing old profile picture: %v", err)
		}
	}

	// Redirect back to profile page
	http.Redirect(w, r, "/profile/"+userID, http.StatusSeeOther)
}
func isValidImageType(contentType string) bool {
	validTypes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/gif":  true,
	}
	return validTypes[contentType]
}
