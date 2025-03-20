package controllers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"forum/utils"
)

type PostHandler struct {
	imageHandler        *ImageHandler
	notificationHandler *NotificationHandler // Add this
}

func NewPostHandler() *PostHandler {
	return &PostHandler{
		imageHandler:        NewImageHandler(),
		notificationHandler: NewNotificationHandler(), // Add this
	}
}

// Update handler signatures to match http.HandlerFunc
func (ph *PostHandler) authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_token")
		if err != nil {
			http.Redirect(w, r, "/signin", http.StatusSeeOther)
			return
		}

		userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
		if err != nil {
			http.Redirect(w, r, "/signin", http.StatusSeeOther)
			return
		}

		// Store userID in request context
		ctx := context.WithValue(r.Context(), "userID", userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

func (ph *PostHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	// case "/create":
	// 	switch r.Method {
	// 	case http.MethodGet:
	// 		ph.authMiddleware(ph.displayCreateForm).ServeHTTP(w, r)
	// 	case http.MethodPost:
	// 		ph.authMiddleware(ph.handleCreatePost).ServeHTTP(w, r)
	// 	default:
	// 		utils.RenderErrorPage(w, http.StatusMethodNotAllowed, utils.ErrMethodNotAllowed)
	// 	}
	case "/react":
		if r.Method == http.MethodPost {
			ph.authMiddleware(ph.handleReactions).ServeHTTP(w, r)
		} else {
			utils.RenderErrorPage(w, http.StatusMethodNotAllowed, utils.ErrMethodNotAllowed)
		}
	case "/":
		if r.Method == http.MethodGet {
			postIDStr := r.URL.Query().Get("id")

			if postIDStr != "" {
				postIDStr = strings.TrimSpace(postIDStr)

				if postIDStr == "" {
					utils.RenderErrorPage(w, http.StatusNotFound, "Post ID cannot be empty")
					return
				}

				postID, err := strconv.Atoi(postIDStr)
				if err != nil || postID <= 0 {
					utils.RenderErrorPage(w, http.StatusNotFound, "Invalid post ID")
					return
				}

				// Check if post exists
				var exists bool
				if err := utils.GlobalDB.QueryRow("SELECT EXISTS(SELECT 1 FROM posts WHERE id = ?)", postID).Scan(&exists); err != nil || !exists {
					utils.RenderErrorPage(w, http.StatusNotFound, "Post not found")
					return
				}

				ph.handleSinglePost(w, r)
				return
			}
			ph.handleGetPosts(w, r)
		}
	case "/comment":
		if r.Method == http.MethodPost {
			ph.authMiddleware(ph.handleComment).ServeHTTP(w, r)
		} else {
			utils.RenderErrorPage(w, http.StatusMethodNotAllowed, utils.ErrMethodNotAllowed)
		}
	case "/commentreact":
		if r.Method == http.MethodPost {
			ph.authMiddleware(ph.handleCommentReactions).ServeHTTP(w, r)
		} else {
			utils.RenderErrorPage(w, http.StatusMethodNotAllowed, utils.ErrMethodNotAllowed)
		}
	case "/editcomment":
		if r.Method == http.MethodPost {
			ph.authMiddleware(ph.handleEditComment).ServeHTTP(w, r)
		} else {
			utils.RenderErrorPage(w, http.StatusMethodNotAllowed, utils.ErrMethodNotAllowed)
		}

	case "/deletecomment":
		if r.Method == http.MethodPost {
			ph.authMiddleware(ph.handleDeleteComment).ServeHTTP(w, r)
		} else {
			utils.RenderErrorPage(w, http.StatusMethodNotAllowed, utils.ErrMethodNotAllowed)
		}
	case "/edit-post":
		if r.Method == http.MethodGet {
			ph.authMiddleware(ph.handleGetEditPost).ServeHTTP(w, r)
		} else if r.Method == http.MethodPost {
			ph.authMiddleware(ph.handleUpdatePost).ServeHTTP(w, r)
		} else {
			utils.RenderErrorPage(w, http.StatusMethodNotAllowed, utils.ErrMethodNotAllowed)
		}
	case "/delete-post":
		if r.Method == http.MethodPost {
			ph.authMiddleware(ph.handleDeletePost).ServeHTTP(w, r)
		} else {
			utils.RenderErrorPage(w, http.StatusMethodNotAllowed, utils.ErrMethodNotAllowed)
		}

	default:
		utils.RenderErrorPage(w, http.StatusNotFound, utils.ErrPageNotFound)
	}
}

type createPostData struct {
	ErrorMessage  string
	Title         string
	Content       string
	Categories    []utils.Category
	SelectedCats  []string
	IsLoggedIn    bool
	CurrentUserID string
}

func (ph *PostHandler) getBaseTemplateData(r *http.Request) (utils.PageData, error) {
	var data utils.PageData
	data.IsLoggedIn = false
	data.UnreadCount = 0

	cookie, err := r.Cookie("session_token")
	if err != nil {
		return data, nil // Not logged in, return default data
	}

	userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
	if err != nil {
		return data, nil // Invalid session, return default data
	}

	// User is logged in
	data.IsLoggedIn = true
	data.CurrentUserID = userID

	// Get unread notification count
	unreadCount, err := ph.notificationHandler.GetUnreadCount(userID)
	if err != nil {
		return data, err
	}
	data.UnreadCount = unreadCount

	return data, nil
}

func (ph *PostHandler) displayCreateForm(w http.ResponseWriter, r *http.Request) {
	categories, err := ph.getAllCategories()
	if err != nil {
		log.Printf("Error getting categories: %v", err)
		utils.RenderErrorPage(w, http.StatusInternalServerError, utils.ErrInternalServer)
		return
	}

	userID := r.Context().Value("userID").(string)
	data := createPostData{
		Categories:    categories,
		IsLoggedIn:    userID != "",
		CurrentUserID: userID,
	}

	tmpl, err := template.ParseFiles("templates/createpost.html")
	if err != nil {
		log.Printf("Error parsing template: %v", err)
		utils.RenderErrorPage(w, http.StatusInternalServerError, utils.ErrTemplateLoad)
		return
	}

	if err := tmpl.Execute(w, data); err != nil {
		log.Printf("Error executing template: %v", err)
	}
}

func (ph *PostHandler) getAllCategories() ([]utils.Category, error) {
	rows, err := utils.GlobalDB.Query("SELECT id, name FROM categories")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []utils.Category
	for rows.Next() {
		var category utils.Category
		if err := rows.Scan(&category.ID, &category.Name); err != nil {
			log.Printf("Error scanning category: %v", err)
			continue
		}
		categories = append(categories, category)
	}

	return categories, rows.Err()
}

func (ph *PostHandler) handleGetPosts(w http.ResponseWriter, r *http.Request) {
	baseData, err := ph.getBaseTemplateData(r)
	if err != nil {
		log.Printf("Error getting base template data: %v", err)
	}

	posts, err := ph.getAllPosts()
	if err != nil {
		log.Printf("Error fetching posts: %v", err)
		utils.RenderErrorPage(w, http.StatusInternalServerError, utils.ErrTemplateExec)
		return
	}

	users, err := ph.getAllUsers()
	if err != nil {
		log.Printf("Error fetching users: %v", err)
	}

	pageData := utils.PageData{
		IsLoggedIn:    baseData.IsLoggedIn,
		CurrentUserID: baseData.CurrentUserID,
		UnreadCount:   baseData.UnreadCount,
		Posts:         posts,
		Users:         users,
	}

	tmpl, err := template.ParseFiles("templates/index.html")
	if err != nil {
		log.Printf("Error parsing template: %v", err)
		utils.RenderErrorPage(w, http.StatusInternalServerError, utils.ErrTemplateLoad)
		return
	}

	if err := tmpl.Execute(w, pageData); err != nil {
		log.Printf("Error executing template: %v", err)
		utils.RenderErrorPage(w, http.StatusInternalServerError, utils.ErrTemplateExec)
	}
}

func (ph *PostHandler) getAllUsers() ([]utils.User, error) {
	rows, err := utils.GlobalDB.Query(`
        SELECT id, username, profile_pic 
        FROM users 
        ORDER BY username ASC
    `)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []utils.User
	for rows.Next() {
		var user utils.User
		err := rows.Scan(&user.ID, &user.Nickname, &user.ImageURL)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, nil
}

func (ph *PostHandler) getAllPosts() ([]utils.Post, error) {
	query := `
        SELECT p.id, p.user_id, p.title, p.content, p.imagepath, p.post_at, 
               u.username, 
               (SELECT COUNT(*) FROM reaction WHERE post_id = p.id AND like = 1) as likes,
               (SELECT COUNT(*) FROM reaction WHERE post_id = p.id AND like = 0) as dislikes,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments,
               u.profile_pic
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.post_at DESC
    `

	rows, err := utils.GlobalDB.Query(query)
	if err != nil {
		log.Printf("Error querying posts: %v", err)
		return nil, err
	}
	defer rows.Close()

	var posts []utils.Post
	for rows.Next() {
		var post utils.Post
		var postTime time.Time

		err := rows.Scan(
			&post.ID,
			&post.UserID,
			&post.Title,
			&post.Content,
			&post.ImagePath,
			&postTime,
			&post.Username,
			&post.Likes,
			&post.Dislikes,
			&post.Comments,
			&post.ProfilePic,
		)
		if err != nil {
			log.Printf("Error scanning post row: %v", err)
			continue // Skip this post but continue with others
		}

		// Format the time
		post.PostTime = FormatTimeAgo(postTime)

		// Get categories for this post
		categories, err := ph.getPostCategories(int64(post.ID))
		if err != nil {
			log.Printf("Error getting categories for post %d: %v", post.ID, err)
			// Continue anyway, just with empty categories
			post.Categories = []utils.Category{}
		} else {
			post.Categories = categories
		}

		posts = append(posts, post)
	}

	// If no posts were found, return an empty array rather than nil
	if posts == nil {
		posts = []utils.Post{}
	}

	return posts, nil
}

func (ph *PostHandler) handleCreatePost(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(string)

	tmpl, err := template.ParseFiles("templates/createpost.html")
	if err != nil {
		log.Printf("Error parsing template: %v", err)
		utils.RenderErrorPage(w, http.StatusInternalServerError, utils.ErrTemplateLoad)
		return
	}

	data := createPostData{
		IsLoggedIn:    true,
		CurrentUserID: userID,
	}

	if err := r.ParseMultipartForm(20 << 20); err != nil {
		data.ErrorMessage = "File size too large. Maximum size is 20MB"
		tmpl.Execute(w, data)
		return
	}

	data.Title = r.FormValue("title")
	data.Content = r.FormValue("content")
	data.SelectedCats = r.Form["categories[]"]

	if data.Title == "" || data.Content == "" || len(data.SelectedCats) == 0 {
		data.ErrorMessage = "Title, content, and at least one category are required"
		tmpl.Execute(w, data)
		return
	}

	// Handle image upload
	var imagePath string
	file, header, err := r.FormFile("image")
	if err == nil {
		defer file.Close()

		// Check file size
		if header.Size > 20<<20 { // 20 MB
			data.ErrorMessage = "Image size must be less than 20MB"
			tmpl.Execute(w, data)
			return
		}

		imagePath, err = ph.imageHandler.ProcessImage(file, header)
		if err != nil {
			data.ErrorMessage = "Error processing image: " + err.Error()
			tmpl.Execute(w, data)
			return
		}
	}

	currentTime := time.Now()
	stmt, err := utils.GlobalDB.Prepare(`
        INSERT INTO posts (user_id, title, content, imagepath, post_at)
        VALUES (?, ?, ?, ?, ?)
    `)
	if err != nil {
		data.ErrorMessage = "Error creating post"
		tmpl.Execute(w, data)
		return
	}
	defer stmt.Close()

	result, err := stmt.Exec(userID, data.Title, data.Content, imagePath, currentTime)
	if err != nil {
		data.ErrorMessage = "Error saving post"
		tmpl.Execute(w, data)
		return
	}

	postID, _ := result.LastInsertId()

	for _, categoryName := range data.SelectedCats {
		categoryID, err := getCategoryIDByName(categoryName)
		if err != nil {
			continue
		}
		utils.GlobalDB.Exec(`
            INSERT INTO post_categories (post_id, category_id) 
            VALUES (?, ?)
        `, postID, categoryID)
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func getCategoryIDByName(name string) (int, error) {
	var id int
	err := utils.GlobalDB.QueryRow("SELECT id FROM categories WHERE name = ?", name).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func FormatTimeAgo(t time.Time) string {
	now := time.Now()
	diff := now.Sub(t)

	switch {
	case diff < time.Minute:
		return "just now"
	case diff < time.Hour:
		minutes := int(diff.Minutes())
		if minutes == 1 {
			return "1 minute ago"
		}
		return fmt.Sprintf("%d minutes ago", minutes)
	case diff < 24*time.Hour:
		hours := int(diff.Hours())
		if hours == 1 {
			return "1 hour ago"
		}
		return fmt.Sprintf("%d hours ago", hours)
	case diff < 48*time.Hour:
		return "yesterday"
	case diff < 7*24*time.Hour:
		days := int(diff.Hours() / 24)
		if days == 1 {
			return "1 day ago"
		}
		return fmt.Sprintf("%d days ago", days)
	case diff < 30*24*time.Hour:
		weeks := int(diff.Hours() / 24 / 7)
		if weeks == 1 {
			return "1 week ago"
		}
		return fmt.Sprintf("%d weeks ago", weeks)
	default:
		return t.Format("Jan 2, 2006")
	}
}

func (ph *PostHandler) handleSinglePost(w http.ResponseWriter, r *http.Request) {
	baseData, err := ph.getBaseTemplateData(r)
	if err != nil {
		log.Printf("Error getting base template data: %v", err)
	}

	postIDStr := r.URL.Query().Get("id")
	if postIDStr == "" {
		http.Error(w, "Post ID is required", http.StatusBadRequest)
		return
	}

	postID, err := strconv.ParseInt(postIDStr, 10, 64)
	if err != nil {
		log.Printf("Invalid post ID: %v", err)
		utils.RenderErrorPage(w, http.StatusBadRequest, utils.ErrPostNotFound)
		return
	}

	post, comments, err := ph.getPostByID(postID)
	if err != nil {
		log.Printf("Error fetching post: %v", err)
		utils.RenderErrorPage(w, http.StatusBadRequest, utils.ErrPostNotFound)
		return
	}

	data := struct {
		Post          *utils.Post
		Comments      []utils.Comment
		IsLoggedIn    bool
		CurrentUserID string
		UnreadCount   int
	}{
		Post:          post,
		Comments:      comments,
		IsLoggedIn:    baseData.IsLoggedIn,
		CurrentUserID: baseData.CurrentUserID,
		UnreadCount:   baseData.UnreadCount,
	}

	tmpl, err := template.ParseFiles("templates/post.html")
	if err != nil {
		log.Printf("Template parsing error: %v", err)
		utils.RenderErrorPage(w, http.StatusInternalServerError, utils.ErrTemplateExec)
		return
	}

	if err := tmpl.Execute(w, data); err != nil {
		utils.RenderErrorPage(w, http.StatusInternalServerError, utils.ErrTemplateExec)
	}
}

func (ph *PostHandler) getCommentsForPost(postID int64) ([]utils.Comment, error) {
	rows, err := utils.GlobalDB.Query(`
		SELECT c.id, c.post_id, c.user_id, c.content, c.comment_at, 
			   u.username, u.profile_pic
		FROM comments c
		JOIN users u ON c.user_id = u.id
		WHERE c.post_id = ?
		ORDER BY c.comment_at ASC
	`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []utils.Comment
	for rows.Next() {
		var comment utils.Comment
		var commentTime time.Time
		if err := rows.Scan(
			&comment.ID,
			&comment.PostID,
			&comment.UserID,
			&comment.Content,
			&commentTime,
			&comment.Username,
			&comment.ProfilePic,
		); err != nil {
			return nil, err
		}
		comment.CommentTime = commentTime
		comments = append(comments, comment)
	}

	return comments, rows.Err()
}

// Add this helper method to fetch a single post
func (ph *PostHandler) getPostByID(postID int64) (*utils.Post, []utils.Comment, error) {
	// Get post with user info
	var postTime time.Time
	post := &utils.Post{}
	err := utils.GlobalDB.QueryRow(`
        SELECT p.id, p.user_id, p.title, p.content, p.imagepath, p.post_at, 
               u.username, 
               (SELECT COUNT(*) FROM reaction WHERE post_id = p.id AND like = 1) as likes,
               (SELECT COUNT(*) FROM reaction WHERE post_id = p.id AND like = 0) as dislikes,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments,
               u.profile_pic
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
    `, postID).Scan(
		&post.ID, &post.UserID, &post.Title, &post.Content, &post.ImagePath,
		&postTime, &post.Username, &post.Likes, &post.Dislikes, &post.Comments,
		&post.ProfilePic,
	)
	if err != nil {
		return nil, nil, err
	}
	post.PostTime = FormatTimeAgo(postTime)

	// Get categories for the post
	categories, err := ph.getPostCategories(postID)
	if err != nil {
		log.Printf("Error getting categories for post %d: %v", postID, err)
		post.Categories = []utils.Category{}
	} else {
		post.Categories = categories
	}

	// Get comments
	comments, err := ph.getCommentsForPost(postID)
	if err != nil {
		return nil, nil, err
	}

	return post, comments, nil
}

func (ph *PostHandler) checkAuthStatus(r *http.Request) bool {
	cookie, err := r.Cookie("session_token")
	if err != nil {
		return false
	}
	_, err = utils.ValidateSession(utils.GlobalDB, cookie.Value)
	return err == nil
}

func (ph *PostHandler) handleReactions(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(string)
	if userID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var req struct {
		PostID int `json:"post_id"`
		Like   int `json:"like"` // 1 for like, 0 for dislike
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	if req.Like != 0 && req.Like != 1 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid reaction type"})
		return
	}

	// Check if the user already has a reaction
	var existingLike int
	err := utils.GlobalDB.QueryRow("SELECT like FROM reaction WHERE user_id = ? AND post_id = ?", userID, req.PostID).Scan(&existingLike)
	if err != nil && err != sql.ErrNoRows {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	if err == sql.ErrNoRows {
		// Insert new reaction
		_, err = utils.GlobalDB.Exec("INSERT INTO reaction (user_id, post_id, like) VALUES (?, ?, ?)", userID, req.PostID, req.Like)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
			return
		}
	} else {
		if existingLike == req.Like {
			// User is unliking or undisliking
			_, err = utils.GlobalDB.Exec("DELETE FROM reaction WHERE user_id = ? AND post_id = ?", userID, req.PostID)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
				return
			}
		} else {
			// Update existing reaction
			_, err = utils.GlobalDB.Exec("UPDATE reaction SET like = ? WHERE user_id = ? AND post_id = ?", req.Like, userID, req.PostID)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
				return
			}
		}
	}

	// Fetch updated like and dislike counts
	var likes, dislikes int
	err = utils.GlobalDB.QueryRow("SELECT likes, dislikes FROM posts WHERE id = ?", req.PostID).Scan(&likes, &dislikes)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]int{
		"likes":    likes,
		"dislikes": dislikes,
	})
}

func (ph *PostHandler) handleComment(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(string)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	postID, err := strconv.Atoi(r.FormValue("post_id"))
	if err != nil {
		http.Error(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	content := r.FormValue("content")
	if content == "" {
		http.Error(w, "Comment cannot be empty", http.StatusBadRequest)
		return
	}

	_, err = utils.GlobalDB.Exec(`
        INSERT INTO comments (post_id, user_id, content) 
        VALUES (?, ?, ?)`,
		postID, userID, content,
	)
	if err != nil {
		log.Printf("Error creating comment: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	_, err = utils.GlobalDB.Exec(`
        UPDATE posts SET comments = comments + 1 
        WHERE id = ?`, postID)
	if err != nil {
		log.Printf("Error updating comment count: %v", err)
	}

	http.Redirect(w, r, fmt.Sprintf("/?id=%d", postID), http.StatusSeeOther)
}

// handleCommentReactions processes a user's like/dislike on a comment.
func (ph *PostHandler) handleCommentReactions(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(string)
	if userID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var req struct {
		CommentID int `json:"comment_id"`
		Like      int `json:"like"` // 1 for like, 0 for dislike
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	if req.Like != 0 && req.Like != 1 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid reaction type"})
		return
	}

	// Check if the user already reacted to this comment by querying comment_reaction
	var existingIsLike int
	err := utils.GlobalDB.QueryRow("SELECT is_like FROM comment_reaction WHERE user_id = ? AND comment_id = ?", userID, req.CommentID).Scan(&existingIsLike)
	if err != nil && err != sql.ErrNoRows {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error (select)"})
		return
	}

	if err == sql.ErrNoRows {
		// No reaction exists—insert a new reaction
		_, err = utils.GlobalDB.Exec("INSERT INTO comment_reaction (user_id, comment_id, is_like) VALUES (?, ?, ?)", userID, req.CommentID, req.Like)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Database error (insert)"})
			return
		}
	} else {
		if existingIsLike == req.Like {
			// Same reaction exists; remove it
			_, err = utils.GlobalDB.Exec("DELETE FROM comment_reaction WHERE user_id = ? AND comment_id = ?", userID, req.CommentID)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "Database error (delete)"})
				return
			}
		} else {
			// Reaction exists but is different; update it
			_, err = utils.GlobalDB.Exec("UPDATE comment_reaction SET is_like = ? WHERE user_id = ? AND comment_id = ?", req.Like, userID, req.CommentID)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "Database error (update)"})
				return
			}
		}
	}

	// Get updated likes and dislikes counts
	var likes, dislikes int
	err = utils.GlobalDB.QueryRow("SELECT likes, dislikes FROM comments WHERE id = ?", req.CommentID).Scan(&likes, &dislikes)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error (get counts)"})
		return
	}

	// Return success response with updated counts
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"likes":    likes,
		"dislikes": dislikes,
	})
}

func (ph *PostHandler) handleEditComment(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(string)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	commentID, err := strconv.Atoi(r.FormValue("comment_id"))
	if err != nil {
		http.Error(w, "Invalid comment ID", http.StatusBadRequest)
		return
	}

	newContent := strings.TrimSpace(r.FormValue("content"))
	if newContent == "" {
		http.Error(w, "Comment cannot be empty", http.StatusBadRequest)
		return
	}

	// Ensure user owns the comment
	var ownerID string
	err = utils.GlobalDB.QueryRow("SELECT user_id FROM comments WHERE id = ?", commentID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		http.Error(w, "Comment not found", http.StatusNotFound)
		return
	} else if err != nil {
		log.Printf("Error checking comment ownership: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if ownerID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Update the comment
	result, err := utils.GlobalDB.Exec("UPDATE comments SET content = ? WHERE id = ?", newContent, commentID)
	if err != nil {
		log.Printf("Error updating comment: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
	} else if rowsAffected == 0 {
		log.Printf("No rows were updated for comment ID: %d", commentID)
	}

	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

func (ph *PostHandler) handleDeleteComment(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(string)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	commentID, err := strconv.Atoi(r.FormValue("comment_id"))
	if err != nil {
		http.Error(w, "Invalid comment ID", http.StatusBadRequest)
		return
	}

	// Get the post ID before deleting the comment (for updating comment count)
	var postID int
	err = utils.GlobalDB.QueryRow("SELECT post_id FROM comments WHERE id = ?", commentID).Scan(&postID)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("Error getting post ID: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Ensure user owns the comment
	var ownerID string
	err = utils.GlobalDB.QueryRow("SELECT user_id FROM comments WHERE id = ?", commentID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		http.Error(w, "Comment not found", http.StatusNotFound)
		return
	} else if err != nil {
		log.Printf("Error checking comment ownership: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if ownerID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Delete the comment
	_, err = utils.GlobalDB.Exec("DELETE FROM comments WHERE id = ?", commentID)
	if err != nil {
		log.Printf("Error deleting comment: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Update the post's comment count
	if postID > 0 {
		_, err = utils.GlobalDB.Exec(`
			UPDATE posts 
			SET comments = (
				SELECT COUNT(*) 
				FROM comments 
				WHERE post_id = ?
			) 
			WHERE id = ?`, postID, postID)
		if err != nil {
			log.Printf("Error updating post comment count: %v", err)
		}
	}

	http.Redirect(w, r, r.Header.Get("Referer"), http.StatusSeeOther)
}

func (ph *PostHandler) handleGetEditPost(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(string)
	postID, err := strconv.ParseInt(r.URL.Query().Get("id"), 10, 64)
	if err != nil {
		utils.RenderErrorPage(w, http.StatusBadRequest, "Invalid post ID")
		return
	}

	// Fetch the post
	post, _, err := ph.getPostByID(postID)
	if err != nil {
		utils.RenderErrorPage(w, http.StatusNotFound, "Post not found")
		return
	}

	// Verify ownership
	if post.UserID != userID {
		utils.RenderErrorPage(w, http.StatusForbidden, "You don't have permission to edit this post")
		return
	}

	data := struct {
		Post          *utils.Post
		IsLoggedIn    bool
		CurrentUserID string
		ErrorMessage  string
	}{
		Post:          post,
		IsLoggedIn:    true,
		CurrentUserID: userID,
	}

	tmpl, err := template.ParseFiles("templates/edit_post.html")
	if err != nil {
		log.Printf("Error parsing template: %v", err)
		utils.RenderErrorPage(w, http.StatusInternalServerError, utils.ErrTemplateLoad)
		return
	}

	if err := tmpl.Execute(w, data); err != nil {
		log.Printf("Error executing template: %v", err)
		utils.RenderErrorPage(w, http.StatusInternalServerError, utils.ErrTemplateExec)
	}
}

func (ph *PostHandler) handleUpdatePost(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(string)

	if err := r.ParseForm(); err != nil {
		utils.RenderErrorPage(w, http.StatusBadRequest, "Invalid form data")
		return
	}

	postID, err := strconv.ParseInt(r.FormValue("post_id"), 10, 64)
	if err != nil {
		utils.RenderErrorPage(w, http.StatusBadRequest, "Invalid post ID")
		return
	}

	// Verify post exists and user owns it
	var postOwnerID string
	err = utils.GlobalDB.QueryRow("SELECT user_id FROM posts WHERE id = ?", postID).Scan(&postOwnerID)
	if err != nil {
		utils.RenderErrorPage(w, http.StatusNotFound, "Post not found")
		return
	}

	if postOwnerID != userID {
		utils.RenderErrorPage(w, http.StatusForbidden, "You don't have permission to edit this post")
		return
	}

	title := r.FormValue("title")
	content := r.FormValue("content")

	if title == "" || content == "" {
		utils.RenderErrorPage(w, http.StatusBadRequest, "Title and content are required")
		return
	}

	// Update the post
	_, err = utils.GlobalDB.Exec("UPDATE posts SET title = ?, content = ? WHERE id = ?",
		title, content, postID)
	if err != nil {
		log.Printf("Error updating post: %v", err)
		utils.RenderErrorPage(w, http.StatusInternalServerError, "Error updating post")
		return
	}

	http.Redirect(w, r, fmt.Sprintf("/?id=%d", postID), http.StatusSeeOther)
}

func (ph *PostHandler) handleDeletePost(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userID").(string)

	postID, err := strconv.ParseInt(r.FormValue("post_id"), 10, 64)
	if err != nil {
		utils.RenderErrorPage(w, http.StatusBadRequest, "Invalid post ID")
		return
	}

	// Verify post exists and user owns it
	var postOwnerID string
	err = utils.GlobalDB.QueryRow("SELECT user_id FROM posts WHERE id = ?", postID).Scan(&postOwnerID)
	if err != nil {
		utils.RenderErrorPage(w, http.StatusNotFound, "Post not found")
		return
	}

	if postOwnerID != userID {
		utils.RenderErrorPage(w, http.StatusForbidden, "You don't have permission to delete this post")
		return
	}

	// Start transaction
	tx, err := utils.GlobalDB.Begin()
	if err != nil {
		utils.RenderErrorPage(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer tx.Rollback()

	// Delete related records first
	_, err = tx.Exec("DELETE FROM post_categories WHERE post_id = ?", postID)
	if err != nil {
		utils.RenderErrorPage(w, http.StatusInternalServerError, "Error deleting post categories")
		return
	}

	_, err = tx.Exec("DELETE FROM reaction WHERE post_id = ?", postID)
	if err != nil {
		utils.RenderErrorPage(w, http.StatusInternalServerError, "Error deleting reactions")
		return
	}

	_, err = tx.Exec("DELETE FROM comments WHERE post_id = ?", postID)
	if err != nil {
		utils.RenderErrorPage(w, http.StatusInternalServerError, "Error deleting comments")
		return
	}

	// Finally delete the post
	_, err = tx.Exec("DELETE FROM posts WHERE id = ?", postID)
	if err != nil {
		utils.RenderErrorPage(w, http.StatusInternalServerError, "Error deleting post")
		return
	}

	if err := tx.Commit(); err != nil {
		utils.RenderErrorPage(w, http.StatusInternalServerError, "Error completing deletion")
		return
	}

	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func (ph *PostHandler) getPostsByCategoryName(categoryName string) ([]utils.Post, error) {
	rows, err := utils.GlobalDB.Query(`
        SELECT p.id, p.user_id, p.title, p.content, p.imagepath, p.post_at, p.likes, p.dislikes, p.comments,
               u.username, u.profile_pic, c.id AS category_id, c.name AS category_name
        FROM posts p
        JOIN users u ON p.user_id = u.id
        JOIN post_categories pc ON p.id = pc.post_id
        JOIN categories c ON pc.category_id = c.id
        WHERE c.name = ?
        ORDER BY p.post_at DESC
    `, categoryName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return ph.scanPosts(rows)
}

// getPostCategories retrieves all categories for a given post
func (ph *PostHandler) getPostCategories(postID int64) ([]utils.Category, error) {
	query := `
		SELECT c.id, c.name 
		FROM categories c
		JOIN post_categories pc ON c.id = pc.category_id
		WHERE pc.post_id = ?
	`

	rows, err := utils.GlobalDB.Query(query, postID)
	if err != nil {
		log.Printf("Error querying categories for post %d: %v", postID, err)
		return nil, err
	}
	defer rows.Close()

	var categories []utils.Category
	for rows.Next() {
		var category utils.Category
		if err := rows.Scan(&category.ID, &category.Name); err != nil {
			log.Printf("Error scanning category row: %v", err)
			continue
		}
		categories = append(categories, category)
	}

	return categories, nil
}

func (ph *PostHandler) scanPosts(rows *sql.Rows) ([]utils.Post, error) {
	postMap := make(map[int64]utils.Post)
	for rows.Next() {
		var post utils.Post
		var postTime time.Time
		var categoryID sql.NullInt64
		var categoryName sql.NullString

		// Scan row into post struct
		err := rows.Scan(
			&post.ID,
			&post.UserID,
			&post.Title,
			&post.Content,
			&post.ImagePath,
			&postTime,
			&post.Likes,
			&post.Dislikes,
			&post.Comments,
			&post.Username,
			&post.ProfilePic,
			&categoryID,
			&categoryName,
		)
		if err != nil {
			return nil, err
		}

		post.PostTime = FormatTimeAgo(postTime)

		if existingPost, ok := postMap[post.ID]; ok {
			if categoryID.Valid && categoryName.Valid {
				existingPost.Categories = append(existingPost.Categories, utils.Category{
					ID:   int(categoryID.Int64),
					Name: categoryName.String,
				})
				postMap[post.ID] = existingPost
			}
		} else {
			post.Categories = make([]utils.Category, 0)
			if categoryID.Valid && categoryName.Valid {
				post.Categories = append(post.Categories, utils.Category{
					ID:   int(categoryID.Int64),
					Name: categoryName.String,
				})
			}
			postMap[post.ID] = post
		}
	}

	var posts []utils.Post
	for _, post := range postMap {
		posts = append(posts, post)
	}
	return posts, nil
}

func (ph *PostHandler) getUserProfile(userID string) (*ProfileData, error) {
	var profile ProfileData

	// Validate userID
	if userID == "" {
		return nil, fmt.Errorf("invalid user ID")
	}

	// First check if user exists
	var exists bool
	err := utils.GlobalDB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE id = ?)", userID).Scan(&exists)
	if err != nil {
		return nil, fmt.Errorf("error checking user existence: %v", err)
	}
	if !exists {
		return nil, fmt.Errorf("user not found")
	}

	// Get user profile data
	err = utils.GlobalDB.QueryRow(`
        SELECT username, email, COALESCE(profile_pic, '') as profile_pic
        FROM users 
        WHERE id = ?
    `, userID).Scan(&profile.Username, &profile.Email, &profile.ProfilePic)
	if err != nil {
		return nil, fmt.Errorf("error getting user profile: %v", err)
	}

	// Get post count
	err = utils.GlobalDB.QueryRow(`
        SELECT COUNT(*) 
        FROM posts 
        WHERE user_id = ?
    `, userID).Scan(&profile.PostCount)
	if err != nil {
		return nil, fmt.Errorf("error getting post count: %v", err)
	}

	// Get comment count
	err = utils.GlobalDB.QueryRow(`
        SELECT COUNT(*) 
        FROM comments 
        WHERE user_id = ?
    `, userID).Scan(&profile.CommentCount)
	if err != nil {
		return nil, fmt.Errorf("error getting comment count: %v", err)
	}

	// Get likes received
	err = utils.GlobalDB.QueryRow(`
        SELECT COUNT(*) 
        FROM reaction l
        JOIN posts p ON l.post_id = p.id
        WHERE p.user_id = ? AND l.like = 1
    `, userID).Scan(&profile.LikesReceived)
	if err != nil {
		return nil, fmt.Errorf("error getting likes received: %v", err)
	}

	profile.UserID = userID
	profile.IsLoggedIn = true    // Set based on session
	profile.IsOwnProfile = false // Set based on comparison with current user

	return &profile, nil
}
