package controllers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"forum/utils"
)

type APIHandler struct {
	postHandler *PostHandler
}

func NewAPIHandler() *APIHandler {
	return &APIHandler{
		postHandler: NewPostHandler(),
	}
}

func (ah *APIHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers for API requests
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	// Handle preflight requests
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	switch r.URL.Path {
	case "/api/posts":
		ah.handlePosts(w, r)
	case "/api/posts/single":
		ah.handleSinglePost(w, r)
	case "/api/users":
		ah.handleUsers(w, r)
	case "/api/posts/filter":
		ah.handleFilteredPosts(w, r)
	case "/api/posts/category":
		ah.handleCategoryPosts(w, r)
	case "/api/posts/create":
		if !ah.checkAuth(w, r) {
			return
		}
		ah.handleCreatePost(w, r)
	case "/api/posts/react":
		if !ah.checkAuth(w, r) {
			return
		}
		ah.handleReaction(w, r)
	case "/api/user-status":
		ah.handleUserStatus(w, r)
	case "/api/validate-session":
		ah.handleValidateSession(w, r)
	case "/api/posts/comment":
		if !ah.checkAuth(w, r) {
			return
		}
		ah.handleComment(w, r)
	case "/api/posts/edit":
		if !ah.checkAuth(w, r) {
			return
		}
		ah.handleEditPost(w, r)
	case "/api/posts/created":
		if !ah.checkAuth(w, r) {
			return
		}
		ah.handleCreatedPosts(w, r)
	case "/api/posts/liked":
		if !ah.checkAuth(w, r) {
			return
		}
		ah.handleLikedPosts(w, r)
	case "/api/posts/commented":
		if !ah.checkAuth(w, r) {
			return
		}
		ah.handleCommentedPosts(w, r)
	case "/api/posts/delete":
		if !ah.checkAuth(w, r) {
			return
		}
		ah.handleDeletePost(w, r)
	case "/api/comments/edit":
		if !ah.checkAuth(w, r) {
			return
		}
		ah.handleEditComment(w, r)
	case "/login": // Add this new endpoint
		ah.handleLogin(w, r)
	case "/register": // Add this new endpoint
		ah.handleRegister(w, r)
	case "/signout": // Add this new endpoint
		ah.handleSignout(w, r)
	case "/api/comments/delete":
		if !ah.checkAuth(w, r) {
			return
		}
		ah.handleDeleteComment(w, r)
	case "/api/users/profile":
		if r.Method == "GET" {
			ah.handleGetProfile(w, r)
			return
		}

	case "/api/users/profile-pic":
		if r.Method == "POST" {
			ah.handleUpdateProfilePic(w, r)
			return
		}

	case "/api/users/stats":
		ah.handleUserStats(w, r)
		return

	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

func (ah *APIHandler) checkAuth(w http.ResponseWriter, r *http.Request) bool {
	// Get the session cookie
	cookie, err := r.Cookie("session_token")
	if err != nil {
		log.Printf("Authentication failed: No session cookie found - Error: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "No session found. Please log in."})
		return false
	}

	// Log the cookie value for debugging (partial for security)
	cookiePreview := ""
	if len(cookie.Value) > 10 {
		cookiePreview = cookie.Value[:10] + "..."
	} else {
		cookiePreview = cookie.Value
	}
	log.Printf("Found session cookie: %s", cookiePreview)

	// Validate the session
	userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
	if err != nil {
		log.Printf("Session validation failed: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid or expired session. Please log in again."})
		return false
	}

	log.Printf("Session validated successfully for user: %s", userID)

	// Add userID to request context
	ctx := context.WithValue(r.Context(), "userID", userID)
	*r = *r.WithContext(ctx)
	return true
}

// Update the handlePosts function to include profile pictures correctly
func (ah *APIHandler) handlePosts(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")

    // Query posts with user information including profile pictures
    query := `
        SELECT p.id, p.title, p.content, p.imagepath, p.post_at, p.user_id, 
               u.nickname, u.profile_pic,
               (SELECT COUNT(*) FROM reaction WHERE post_id = p.id AND like = 1) as likes,
               (SELECT COUNT(*) FROM reaction WHERE post_id = p.id AND like = 0) as dislikes,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.post_at DESC
    `

    rows, err := utils.GlobalDB.Query(query)
    if err != nil {
        log.Printf("Error querying posts: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to get posts"})
        return
    }
    defer rows.Close()

    var posts []utils.Post
    for rows.Next() {
        var post utils.Post
        var postTime string
        var profilePic sql.NullString

        err := rows.Scan(
            &post.ID, &post.Title, &post.Content, &post.ImagePath, &postTime, &post.UserID,
            &post.Username, &profilePic, &post.Likes, &post.Dislikes, &post.Comments,
        )
        if err != nil {
            log.Printf("Error scanning post row: %v", err)
            continue
        }

        // Format the time
        post.PostTime = postTime

        // Handle profile picture
        if profilePic.Valid {
            post.ProfilePic = profilePic.String
        } else {
            post.ProfilePic = ""
        }

        // Get categories for this post
        categories, err := ah.postHandler.getPostCategories(int64(post.ID))
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

    json.NewEncoder(w).Encode(posts)
}

// Update the handleSinglePost function to include profile pictures correctly
func (ah *APIHandler) handleSinglePost(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")

    // Get post ID from query parameter
    postIDStr := r.URL.Query().Get("id")
    if postIDStr == "" {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Post ID is required"})
        return
    }

    postID, err := strconv.Atoi(postIDStr)
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid post ID"})
        return
    }

    // Query post with user information including profile picture
    query := `
        SELECT p.id, p.title, p.content, p.imagepath, p.post_at, p.user_id, 
               u.nickname, u.profile_pic,
               (SELECT COUNT(*) FROM reaction WHERE post_id = p.id AND like = 1) as likes,
               (SELECT COUNT(*) FROM reaction WHERE post_id = p.id AND like = 0) as dislikes,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
    `

    var post utils.Post
    var postTime string
    var profilePic sql.NullString

    err = utils.GlobalDB.QueryRow(query, postID).Scan(
        &post.ID, &post.Title, &post.Content, &post.ImagePath, &postTime, &post.UserID,
        &post.Username, &profilePic, &post.Likes, &post.Dislikes, &post.Comments,
    )
    if err != nil {
        if err == sql.ErrNoRows {
            w.WriteHeader(http.StatusNotFound)
            json.NewEncoder(w).Encode(map[string]string{"error": "Post not found"})
        } else {
            log.Printf("Error querying post: %v", err)
            w.WriteHeader(http.StatusInternalServerError)
            json.NewEncoder(w).Encode(map[string]string{"error": "Failed to get post"})
        }
        return
    }

    // Format the time
    post.PostTime = postTime

    // Handle profile picture
    if profilePic.Valid {
        post.ProfilePic = profilePic.String
    } else {
        post.ProfilePic = ""
    }

    // Get categories for this post
    categories, err := ah.postHandler.getPostCategories(int64(post.ID))
    if err != nil {
        log.Printf("Error getting categories for post %d: %v", post.ID, err)
        // Continue anyway, just with empty categories
        post.Categories = []utils.Category{}
    } else {
        post.Categories = categories
    }

    // Get comments for this post
    commentsQuery := `
        SELECT c.id, c.content, c.comment_at, c.user_id, u.nickname, u.profile_pic,
               (SELECT COUNT(*) FROM comment_reaction WHERE comment_id = c.id AND likes = 1) as likes,
               (SELECT COUNT(*) FROM comment_reaction WHERE comment_id = c.id AND likes = 0) as dislikes
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.comment_at ASC
    `

    commentsRows, err := utils.GlobalDB.Query(commentsQuery, postID)
    if err != nil {
        log.Printf("Error querying comments: %v", err)
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to get comments"})
        return
    }
    defer commentsRows.Close()

    var comments []utils.Comment
    for commentsRows.Next() {
        var comment utils.Comment
        var commentTime string
        var commentProfilePic sql.NullString

        err := commentsRows.Scan(
            &comment.ID, &comment.Content, &commentTime, &comment.UserID, &comment.Username, 
            &commentProfilePic, &comment.Likes, &comment.Dislikes,
        )
        if err != nil {
            log.Printf("Error scanning comment row: %v", err)
            continue
        }

        // Format the time
        t, err := time.Parse(time.RFC3339, commentTime)
        if err != nil {
            log.Printf("Error parsing comment time: %v", err)
            comment.CommentTime = time.Now()
        } else {
            comment.CommentTime = t
        }

        // Handle profile picture
        if commentProfilePic.Valid {
            comment.ProfilePic = commentProfilePic.String
        } else {
            comment.ProfilePic = ""
        }

        comments = append(comments, comment)
    }

    // If no comments were found, return an empty array rather than nil
    if comments == nil {
        comments = []utils.Comment{}
    }

    // Return post and comments
    response := map[string]interface{}{
        "post":     post,
        "comments": comments,
    }

    json.NewEncoder(w).Encode(response)
}

// Helper function to extract category names for logging
func getCategoryNames(categories []utils.Category) []string {
	var names []string
	for _, cat := range categories {
		names = append(names, cat.Name)
	}
	return names
}


func (ah *APIHandler) handleUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get all users from the database
	query := `
		SELECT id, nickname, email, first_name, last_name, age, gender, profile_pic, created_at
		FROM users
		ORDER BY created_at DESC
	`

	rows, err := utils.GlobalDB.Query(query)
	if err != nil {
		log.Printf("Error getting users: %v", err)
		http.Error(w, "Failed to get users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []utils.User
	for rows.Next() {
		var user utils.User
		var createdAt time.Time
		var profilePic sql.NullString

		// Scan into the User struct with proper handling for NULL profile_pic
		err := rows.Scan(
			&user.ID, &user.Nickname, &user.Email, &user.FirstName, &user.LastName,
			&user.Age, &user.Gender, &profilePic, &createdAt,
		)
		if err != nil {
			log.Printf("Error scanning user row: %v", err)
			continue
		}

		// Format the time
		user.CreatedAt = createdAt

		// Handle NULL profile_pic
		if profilePic.Valid {
			user.ProfilePic = profilePic.String
		} else {
			user.ProfilePic = "" // Default empty string for NULL profile_pic
		}

		users = append(users, user)
	}

	// If no users were found, return an empty array rather than nil
	if users == nil {
		users = []utils.User{}
	}

	// Return users as JSON
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(users)
}

func (ah *APIHandler) handleFilteredPosts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	filterType := r.URL.Query().Get("type") // created, liked, or commented
	userID := r.URL.Query().Get("userId")
	category := r.URL.Query().Get("category")

	log.Printf("Filtered posts request - Type: %s, UserID: %s, Category: %s",
		filterType, userID, category)

	var posts []utils.Post
	var err error

	switch filterType {
	case "created":

		posts, err = fetchUserPostsForPosts(userID)
	case "liked":
		posts, err = fetchUserPostsForLikes(userID)
	// case "commented":
	// 	posts, err = fetchUserPostsForComments(userID)
	case "category":
		posts, err = ah.postHandler.getPostsByCategoryName(category)
	default:
		posts, err = ah.postHandler.getAllPosts()
	}

	if err != nil {
		log.Printf("Error getting filtered posts: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	// Return success response
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(posts)
}

func (ah *APIHandler) handleCreatePost(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID := r.Context().Value("userID").(string)
	if userID == "" {
		log.Printf("Create post failed: userID is empty in context")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized - User ID not found in session"})
		return
	}

	log.Printf("Creating post for user: %s", userID)

	// Parse multipart form with error handling
	err := r.ParseMultipartForm(20 << 20)
	if err != nil && err != http.ErrNotMultipart {
		log.Printf("Error parsing form: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Error parsing form: " + err.Error()})
		return
	}

	// Validate form data
	title := r.FormValue("title")
	content := r.FormValue("content")
	categories := r.Form["categories[]"]

	log.Printf("Post data received - Title: %s, Content length: %d, Categories: %v",
		title, len(content), categories)

	if title == "" || content == "" || len(categories) == 0 {
		log.Printf("Invalid post data: missing required fields")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Title, content, and at least one category are required"})
		return
	}

	// Handle optional image
	var imagePath string
	file, header, err := r.FormFile("image")
	if err != nil && err != http.ErrMissingFile {
		log.Printf("Error getting image file: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Error processing image: " + err.Error()})
		return
	}

	if err == nil && file != nil {
		log.Printf("Image file received: %s, size: %d bytes", header.Filename, header.Size)
		defer file.Close()
		if header.Size > 20<<20 {
			log.Printf("Image too large: %d bytes", header.Size)
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Image too large (max 20MB)"})
			return
		}

		imageHandler := NewImageHandler()
		imagePath, err = imageHandler.ProcessImage(file, header)
		if err != nil {
			log.Printf("Image processing failed: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Image processing failed: " + err.Error()})
			return
		}
		log.Printf("Image processed successfully: %s", imagePath)
	}

	// Start transaction
	tx, err := utils.GlobalDB.Begin()
	if err != nil {
		log.Printf("Database error starting transaction: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error: " + err.Error()})
		return
	}
	defer tx.Rollback()

	// Insert post
	currentTime := time.Now()
	log.Printf("Inserting post into database - UserID: %s, Title: %s, Time: %v",
		userID, title, currentTime)

	result, err := tx.Exec(`
        INSERT INTO posts (user_id, title, content, imagepath, post_at)
        VALUES (?, ?, ?, ?, ?)
    `, userID, title, content, imagePath, currentTime)
	if err != nil {
		log.Printf("Error creating post: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Error creating post: " + err.Error()})
		return
	}

	postID, _ := result.LastInsertId()
	processedCategories := make(map[string]bool)

	for _, categoryName := range categories {
		// Skip if category was already processed
		if processedCategories[categoryName] {
			continue
		}
		processedCategories[categoryName] = true

		log.Printf("Processing category: %s", categoryName)

		categoryID, err := getCategoryIdByName(categoryName)
		if err != nil {
			log.Printf("Error getting category ID: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{
				"error": fmt.Sprintf("Category not found: %s", categoryName),
			})
			return
		}

		// Try to insert, ignore duplicate errors
		_, err = tx.Exec(`
            INSERT OR IGNORE INTO post_categories (post_id, category_id) 
            VALUES (?, ?)
        `, postID, categoryID)
		if err != nil {
			log.Printf("Error inserting category: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{
				"error": fmt.Sprintf("Error adding category %s", categoryName),
			})
			return
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Error committing transaction: " + err.Error()})
		return
	}

	log.Printf("Post created successfully - ID: %d", postID)

	// Return success response
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"postId":  postID,
		"message": "Post created successfully",
	})
}

func getCategoryIdByName(categoryName string) (int64, error) {
	var id int64
	err := utils.GlobalDB.QueryRow("SELECT id FROM categories WHERE name = ?", categoryName).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("category not found: %s", categoryName)
	}
	return id, nil
}

func (ah *APIHandler) handleReaction(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("userID").(string)

	var req struct {
		PostID int `json:"post_id"`
		Like   int `json:"like"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	tx, err := utils.GlobalDB.Begin()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	// Check existing reaction
	var existingReaction sql.NullInt64
	err = tx.QueryRow(`
        SELECT like FROM reaction 
        WHERE user_id = ? AND post_id = ?
    `, userID, req.PostID).Scan(&existingReaction)

	if err == sql.ErrNoRows {
		// New reaction - insert
		_, err = tx.Exec(`
            INSERT INTO reaction (user_id, post_id, like) 
            VALUES (?, ?, ?)
        `, userID, req.PostID, req.Like)
	} else if err == nil {
		if existingReaction.Int64 == int64(req.Like) {
			// Remove existing reaction if same type
			_, err = tx.Exec(`
                DELETE FROM reaction 
                WHERE user_id = ? AND post_id = ?
            `, userID, req.PostID)
			req.Like = -1 // Indicate reaction removed
		} else {
			// Update existing reaction
			_, err = tx.Exec(`
                UPDATE reaction 
                SET like = ? 
                WHERE user_id = ? AND post_id = ?
            `, req.Like, userID, req.PostID)
		}
	}

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update reaction"})
		return
	}

	if err := tx.Commit(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to commit transaction"})
		return
	}

	// Get final counts
	var likes, dislikes int
	err = utils.GlobalDB.QueryRow(`
        SELECT likes, dislikes 
        FROM posts 
        WHERE id = ?
    `, req.PostID).Scan(&likes, &dislikes)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to get counts"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":      true,
		"likes":        likes,
		"dislikes":     dislikes,
		"userReaction": req.Like,
	})
}

func (ah *APIHandler) handleComment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("userID").(string)

	var req struct {
		PostID  int    `json:"post_id"`
		Content string `json:"content"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	if req.Content == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Comment cannot be empty"})
		return
	}

	// Insert comment
	_, err := utils.GlobalDB.Exec(`
        INSERT INTO comments (post_id, user_id, content) 
        VALUES (?, ?, ?)`,
		req.PostID, userID, req.Content,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to add comment"})
		return
	}

	// Update post comment count
	_, err = utils.GlobalDB.Exec(`
        UPDATE posts SET comments = comments + 1 
        WHERE id = ?`, req.PostID)
	if err != nil {
		log.Printf("Error updating comment count: %v", err)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Comment added successfully",
	})
}

func (ah *APIHandler) handleEditPost(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("userID").(string)

	var req struct {
		PostID  int64  `json:"post_id"`
		Title   string `json:"title"`
		Content string `json:"content"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	// Verify post exists and user owns it
	var postOwnerID string
	err := utils.GlobalDB.QueryRow("SELECT user_id FROM posts WHERE id = ?", req.PostID).Scan(&postOwnerID)
	if err == sql.ErrNoRows {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Post not found"})
		return
	} else if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	if postOwnerID != userID {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authorized to edit this post"})
		return
	}

	// Validate input
	if req.Title == "" || req.Content == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Title and content are required"})
		return
	}

	// Update the post
	result, err := utils.GlobalDB.Exec(
		"UPDATE posts SET title = ?, content = ? WHERE id = ?",
		req.Title, req.Content, req.PostID,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update post"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Post not found"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Post updated successfully",
	})
}

func (ah *APIHandler) handleDeletePost(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("userID").(string)

	var req struct {
		PostID int64 `json:"post_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	// Verify post exists and user owns it
	var postOwnerID string
	err := utils.GlobalDB.QueryRow("SELECT user_id FROM posts WHERE id = ?", req.PostID).Scan(&postOwnerID)
	if err == sql.ErrNoRows {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Post not found"})
		return
	} else if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	if postOwnerID != userID {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authorized to delete this post"})
		return
	}

	// Start transaction
	tx, err := utils.GlobalDB.Begin()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	// Delete related records first
	_, err = tx.Exec("DELETE FROM post_categories WHERE post_id = ?", req.PostID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete post categories"})
		return
	}

	_, err = tx.Exec("DELETE FROM reaction WHERE post_id = ?", req.PostID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete reactions"})
		return
	}

	_, err = tx.Exec("DELETE FROM comments WHERE post_id = ?", req.PostID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete comments"})
		return
	}

	// Finally delete the post
	result, err := tx.Exec("DELETE FROM posts WHERE id = ?", req.PostID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete post"})
		return
	}

	if err := tx.Commit(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to commit transaction"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Post not found"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Post deleted successfully",
	})
}

func (ah *APIHandler) handleEditComment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("userID").(string)

	var req struct {
		CommentID int    `json:"comment_id"`
		Content   string `json:"content"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	// Validate ownership
	var ownerID string
	err := utils.GlobalDB.QueryRow("SELECT user_id FROM comments WHERE id = ?", req.CommentID).Scan(&ownerID)
	if err != nil || ownerID != userID {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authorized"})
		return
	}

	// Update comment
	_, err = utils.GlobalDB.Exec("UPDATE comments SET content = ? WHERE id = ?", req.Content, req.CommentID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update comment"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Comment updated successfully",
	})
}

// handleCategoryPosts handles requests for posts filtered by category
func (ah *APIHandler) handleCategoryPosts(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		log.Printf("Invalid method for category posts endpoint: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	categoryName := r.URL.Query().Get("name")
	if categoryName == "" {
		log.Printf("Missing category name parameter")
		http.Error(w, "Category name is required", http.StatusBadRequest)
		return
	}

	log.Printf("Handling GET request for posts in category: %s", categoryName)

	// Get category ID
	var categoryID int
	err := utils.GlobalDB.QueryRow("SELECT id FROM categories WHERE name = ?", categoryName).Scan(&categoryID)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("Category not found: %s", categoryName)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode([]utils.Post{}) // Return empty array for non-existent category
			return
		}
		log.Printf("Error querying category: %v", err)
		http.Error(w, "Failed to get category", http.StatusInternalServerError)
		return
	}

	// Get posts for this category
	query := `
		SELECT p.id, p.title, p.content, p.imagepath, p.post_at, p.user_id, 
			   u.nickname, u.profile_pic,
			   (SELECT COUNT(*) FROM reaction WHERE post_id = p.id AND like = 1) as likes,
			   (SELECT COUNT(*) FROM reaction WHERE post_id = p.id AND like = 0) as dislikes,
			   (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments
		FROM posts p
		JOIN users u ON p.user_id = u.id
		JOIN post_categories pc ON p.id = pc.post_id
		WHERE pc.category_id = ?
		ORDER BY p.post_at DESC
	`

	log.Printf("Executing category posts query for category ID: %d", categoryID)
	rows, err := utils.GlobalDB.Query(query, categoryID)
	if err != nil {
		log.Printf("Error querying posts for category %s: %v", categoryName, err)
		http.Error(w, "Failed to get posts", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var posts []utils.Post
	postCount := 0
	for rows.Next() {
		postCount++
		log.Printf("Processing post #%d for category %s", postCount, categoryName)

		var post utils.Post
		var postTime string
		var profilePic sql.NullString

		err := rows.Scan(
			&post.ID, &post.Title, &post.Content, &post.ImagePath, &postTime, &post.UserID,
			&post.Username, &profilePic, &post.Likes, &post.Dislikes, &post.Comments,
		)
		if err != nil {
			log.Printf("Error scanning post row: %v", err)
			continue // Skip this post but continue with others
		}

		// Format the time
		post.PostTime = postTime

		// Handle null profile pic
		if profilePic.Valid {
			post.ProfilePic = profilePic.String
		} else {
			post.ProfilePic = "" // Default empty string for NULL profile_pic
		}

		// Get categories for this post
		categories, err := ah.postHandler.getPostCategories(int64(post.ID))
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
		log.Printf("No posts found for category %s, returning empty array", categoryName)
		posts = []utils.Post{}
	} else {
		log.Printf("Found %d posts for category %s", len(posts), categoryName)
	}

	// Return posts as JSON
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(posts)
}

func (ah *APIHandler) handleDeleteComment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := r.Context().Value("userID").(string)

	var req struct {
		CommentID int `json:"comment_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	// Start transaction
	tx, err := utils.GlobalDB.Begin()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	// Get post ID and verify ownership before deleting
	var postID int
	var ownerID string
	err = tx.QueryRow("SELECT post_id, user_id FROM comments WHERE id = ?", req.CommentID).Scan(&postID, &ownerID)
	if err == sql.ErrNoRows {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Comment not found"})
		return
	} else if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	if ownerID != userID {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authorized to delete this comment"})
		return
	}

	// Delete comment reactions
	_, err = tx.Exec("DELETE FROM comment_reaction WHERE comment_id = ?", req.CommentID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete comment reactions"})
		return
	}

	// Delete comment
	_, err = tx.Exec("DELETE FROM comments WHERE id = ?", req.CommentID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete comment"})
		return
	}

	// Update post comment count
	_, err = tx.Exec(`
        UPDATE posts 
        SET comments = (
            SELECT COUNT(*) 
            FROM comments 
            WHERE post_id = ?
        )
        WHERE id = ?`, postID, postID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update comment count"})
		return
	}

	if err := tx.Commit(); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to commit transaction"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Comment deleted successfully",
	})
}

func (ah *APIHandler) handleGetProfile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID := r.URL.Query().Get("id")
	if userID == "" {
		// If no ID provided, try to get current user from session
		cookie, err := r.Cookie("session_token")
		if err != nil {
			log.Printf("Error getting session: %v", err)
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": "Unauthorized - No session found",
			})
			return
		}

		sessionUserID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
		if err != nil || sessionUserID == "" {
			log.Printf("No valid user ID in session: %v", err)
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": "Unauthorized - Invalid session",
			})
			return
		}

		userID = sessionUserID
	}

	log.Printf("Getting profile for user ID: %s", userID)

	// Query user data
	query := `
		SELECT id, nickname, email, first_name, last_name, age, gender, profile_pic
		FROM users
		WHERE id = ?
	`

	var user struct {
		ID         string         `json:"id"`
		Nickname   string         `json:"nickname"`
		Email      string         `json:"email"`
		FirstName  string         `json:"first_name"`
		LastName   string         `json:"last_name"`
		Age        int            `json:"age"`
		Gender     string         `json:"gender"`
		ProfilePic sql.NullString `json:"profile_pic"`
	}

	err := utils.GlobalDB.QueryRow(query, userID).Scan(
		&user.ID,
		&user.Nickname,
		&user.Email,
		&user.FirstName,
		&user.LastName,
		&user.Age,
		&user.Gender,
		&user.ProfilePic,
	)
	if err != nil {
		log.Printf("Error getting user profile: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": fmt.Sprintf("Error getting user profile: %v", err),
		})
		return
	}

	// Return user data
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"profile": user,
	})
}

func (ah *APIHandler) handleUpdateProfilePic(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Get user ID from context or session cookie
	var userID string

	// Try to get from context first
	contextUserID := r.Context().Value("userID")
	if contextUserID != nil {
		if id, ok := contextUserID.(string); ok && id != "" {
			userID = id
		}
	}

	// If not in context, try to get from session cookie
	if userID == "" {
		cookie, err := r.Cookie("session_token")
		if err != nil {
			log.Printf("Error getting session cookie: %v", err)
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized - No session cookie found"})
			return
		}

		// Validate the session
		sessionUserID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
		if err != nil {
			log.Printf("Session validation failed: %v", err)
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid or expired session"})
			return
		}

		userID = sessionUserID
	}

	// Check if we have a valid user ID
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized - No valid user ID found"})
		return
	}

	log.Printf("Updating profile picture for user ID: %s", userID)

	if err := r.ParseMultipartForm(20 << 20); err != nil {
		log.Printf("Error parsing multipart form: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "File too large or invalid form"})
		return
	}

	file, header, err := r.FormFile("profile_pic")
	if err != nil {
		log.Printf("Error getting profile_pic file: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid file upload"})
		return
	}
	defer file.Close()

	log.Printf("Processing profile picture: %s, size: %d bytes", header.Filename, header.Size)

	// Process image using ImageHandler
	imageHandler := NewImageHandler()
	imagePath, err := imageHandler.ProcessImage(file, header)
	if err != nil {
		log.Printf("Error processing image: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	log.Printf("Image processed successfully: %s", imagePath)

	// Update database
	_, err = utils.GlobalDB.Exec("UPDATE users SET profile_pic = ? WHERE id = ?", imagePath, userID)
	if err != nil {
		log.Printf("Error updating profile_pic in database: %v", err)
		os.Remove(imagePath)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update profile picture in database"})
		return
	}

	log.Printf("Profile picture updated successfully for user: %s", userID)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Profile picture updated successfully",
		"path":    imagePath,
	})
}

func (ah *APIHandler) handleUserStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	cookie, err := r.Cookie("session_token")
	if err != nil {
		// No session cookie, user is not logged in
		json.NewEncoder(w).Encode(map[string]interface{}{
			"isLoggedIn":    false,
			"currentUserID": nil,
			"unreadCount":   0,
		})
		return
	}

	userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
	if err != nil {
		// Invalid session, user is not logged in
		json.NewEncoder(w).Encode(map[string]interface{}{
			"isLoggedIn":    false,
			"currentUserID": nil,
			"unreadCount":   0,
		})
		return
	}

	// User is logged in, get additional info
	var email, nickname string
	err = utils.GlobalDB.QueryRow("SELECT email, nickname FROM users WHERE id = ?", userID).Scan(&email, &nickname)
	if err != nil {
		// Error retrieving user info
		json.NewEncoder(w).Encode(map[string]interface{}{
			"isLoggedIn":    true,
			"currentUserID": userID,
			"email":         "",
			"nickname":      "",
			"unreadCount":   0,
		})
		return
	}

	// Get unread notifications count (if you have a notifications system)
	var unreadCount int
	err = utils.GlobalDB.QueryRow("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read = 0", userID).Scan(&unreadCount)
	if err != nil {
		unreadCount = 0
	}

	// Return user status
	json.NewEncoder(w).Encode(map[string]interface{}{
		"isLoggedIn":    true,
		"currentUserID": userID,
		"email":         email,
		"nickname":      nickname,
		"unreadCount":   unreadCount,
	})
}

// handleLogin processes user login requests
func (ah *APIHandler) handleLogin(w http.ResponseWriter, r *http.Request) {
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

	// Debug: Log received credentials (password masked for security)
	log.Printf("Login attempt - Email: %s", credentials.Email)

	var storedPassword string
	var userId string
	var nickname string
	err = utils.GlobalDB.QueryRow("SELECT id, password, nickname FROM users WHERE email = ?", credentials.Email).Scan(&userId, &storedPassword, &nickname)
	if err != nil {
		if err == sql.ErrNoRows {
			// Debug: Log email not found
			log.Printf("Login failed - Email not found: %s", credentials.Email)

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"message": "Invalid email or password",
				"success": false,
			})
		} else {
			// Debug: Log database error
			log.Printf("Login error - Database error: %v", err)

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"message": "Failed to query database",
				"success": false,
			})
		}
		return
	}

	// Debug: Log stored password hash (first 10 chars only for security)
	hashPreview := ""
	if len(storedPassword) > 10 {
		hashPreview = storedPassword[:10] + "..."
	} else {
		hashPreview = storedPassword
	}
	log.Printf("Login debug - User found: %s, Stored password hash preview: %s", userId, hashPreview)

	isValidPassword := utils.CheckPasswordsHash(storedPassword, credentials.Password)

	// Debug: Log password check result
	log.Printf("Login debug - Password check result: %v", isValidPassword)

	if !isValidPassword {
		log.Printf("Login failed - Invalid password for user: %s", userId)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Invalid email or password",
			"success": false,
		})
		return
	}

	// Create a new session
	sessionToken, err := utils.CreateSession(utils.GlobalDB, userId)
	if err != nil {
		// Debug: Log session creation error
		log.Printf("Login error - Failed to create session: %v", err)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Failed to create session",
			"success": false,
		})
		return
	}

	// Set the session cookie with detailed logging
	cookie := &http.Cookie{
		Name:     "session_token",
		Value:    sessionToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   r.TLS != nil,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   3600 * 24 * 7, // 1 week
	}
	http.SetCookie(w, cookie)

	// Log cookie details for debugging
	log.Printf("Setting session cookie: Name=%s, Path=%s, HttpOnly=%v, Secure=%v, SameSite=%v, MaxAge=%d",
		cookie.Name, cookie.Path, cookie.HttpOnly, cookie.Secure, cookie.SameSite, cookie.MaxAge)

	// Debug: Log successful login
	log.Printf("Login successful - User: %s, Nickname: %s, Session: %s", userId, nickname, sessionToken[:10]+"...")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":  "Login successful",
		"success":  true,
		"userId":   userId,
		"nickname": nickname,
	})
}

// handleRegister processes user registration requests
func (ah *APIHandler) handleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Invalid request method",
			"success": false,
		})
		return
	}

	var userData struct {
		Nickname  string `json:"nickname"`
		Age       int    `json:"age"`
		Gender    string `json:"gender"`
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
		Email     string `json:"email"`
		Password  string `json:"password"`
	}

	err := json.NewDecoder(r.Body).Decode(&userData)
	if err != nil {
		// Debug: Log decoding error
		log.Printf("Registration error - Failed to decode request body: %v", err)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Invalid request body",
			"success": false,
		})
		return
	}

	// Debug: Log registration attempt
	log.Printf("Registration attempt - Email: %s, Nickname: %s",
		userData.Email, userData.Nickname)

	// Validate input
	if userData.Nickname == "" || userData.Email == "" || userData.Password == "" {
		// Debug: Log validation failure
		log.Printf("Registration validation failed - Nickname: %s, Email: %s",
			userData.Nickname, userData.Email)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Nickname, email, and password are required",
			"success": false,
		})
		return
	}

	// Check if email already exists
	var count int
	err = utils.GlobalDB.QueryRow("SELECT COUNT(*) FROM users WHERE email = ?", userData.Email).Scan(&count)
	if err != nil {
		// Debug: Log database error
		log.Printf("Registration error - Failed to check email: %v", err)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Failed to check email",
			"success": false,
		})
		return
	}

	if count > 0 {
		// Debug: Log email already exists
		log.Printf("Registration failed - Email already exists: %s", userData.Email)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Email already in use",
			"success": false,
		})
		return
	}

	// Check if nickname already exists
	err = utils.GlobalDB.QueryRow("SELECT COUNT(*) FROM users WHERE nickname = ?", userData.Nickname).Scan(&count)
	if err != nil {
		// Debug: Log database error
		log.Printf("Registration error - Failed to check nickname: %v", err)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Failed to check nickname",
			"success": false,
		})
		return
	}

	if count > 0 {
		// Debug: Log nickname already exists
		log.Printf("Registration failed - Nickname already exists: %s", userData.Nickname)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Nickname already in use",
			"success": false,
		})
		return
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(userData.Password)
	if err != nil {
		// Debug: Log password hashing error
		log.Printf("Registration error - Failed to hash password: %v", err)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Failed to hash password",
			"success": false,
		})
		return
	}

	// Debug: Log hashed password (first 10 chars only for security)
	hashPreview := ""
	if len(hashedPassword) > 10 {
		hashPreview = hashedPassword[:10] + "..."
	} else {
		hashPreview = hashedPassword
	}
	log.Printf("Registration debug - Password hash preview: %s", hashPreview)

	// Generate a unique ID for the user
	userID := utils.GenerateId()
	log.Printf("Generated user ID: %s", userID)

	// Insert user with the generated ID
	_, err = utils.GlobalDB.Exec(
		"INSERT INTO users (id, nickname, age, gender, first_name, last_name, email, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		userID, userData.Nickname, userData.Age, userData.Gender, userData.FirstName, userData.LastName, userData.Email, hashedPassword,
	)
	if err != nil {
		// Debug: Log database error
		log.Printf("Registration error - Failed to create user: %v", err)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Failed to create user",
			"success": false,
		})
		return
	}

	// Debug: Log successful registration
	log.Printf("Registration successful - User ID: %s, Email: %s, Nickname: %s",
		userID, userData.Email, userData.Nickname)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Registration successful",
		"success": true,
		"userId":  userID,
	})
}

// handleSignout processes user logout requests
func (ah *APIHandler) handleSignout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Invalid request method",
			"success": false,
		})
		return
	}

	// Get session cookie
	cookie, err := r.Cookie("session_token")
	if err != nil {
		// No session to invalidate
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Already logged out",
			"success": true,
		})
		return
	}

	// Delete session from database
	_, err = utils.GlobalDB.Exec("DELETE FROM sessions WHERE token = ?", cookie.Value)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Failed to delete session",
			"success": false,
		})
		return
	}

	// Clear the cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   r.TLS != nil,
		MaxAge:   -1, // Delete the cookie
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Logged out successfully",
		"success": true,
	})
}

// handleValidateSession checks if the current session is valid
func (ah *APIHandler) handleValidateSession(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	cookie, err := r.Cookie("session_token")
	if err != nil {
		// No session cookie, session is invalid
		log.Printf("Session validation: No cookie found - Error: %v", err)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid": false,
			"error": "No session cookie found",
		})
		return
	}

	// Log cookie details for debugging
	cookiePreview := ""
	if len(cookie.Value) > 10 {
		cookiePreview = cookie.Value[:10] + "..."
	} else {
		cookiePreview = cookie.Value
	}
	log.Printf("Session validation: Found cookie: %s", cookiePreview)

	userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
	if err != nil {
		// Invalid session
		log.Printf("Session validation failed: %v", err)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid": false,
			"error": err.Error(),
		})
		return
	}

	log.Printf("Session validated successfully for user: %s", userID)

	// Get user information
	var email, nickname string
	err = utils.GlobalDB.QueryRow("SELECT email, nickname FROM users WHERE id = ?", userID).Scan(&email, &nickname)
	if err != nil {
		// Error retrieving user info, but session is still valid
		log.Printf("Error retrieving user info: %v", err)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid":    true,
			"userId":   userID,
			"email":    "",
			"nickname": "",
		})
		return
	}

	// Get unread notifications count (if you have a notifications system)
	var unreadCount int
	err = utils.GlobalDB.QueryRow("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read = 0", userID).Scan(&unreadCount)
	if err != nil {
		log.Printf("Error getting notification count: %v", err)
		unreadCount = 0
	}

	// Session is valid
	json.NewEncoder(w).Encode(map[string]interface{}{
		"valid":       true,
		"userId":      userID,
		"email":       email,
		"nickname":    nickname,
		"unreadCount": unreadCount,
	})
}

func (ah *APIHandler) handleCreatedPosts(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	cookie, err := r.Cookie("session_token")
	if err != nil {
		// No session cookie, session is invalid
		log.Printf("Session validation: No cookie found - Error: %v", err)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid": false,
			"error": "No session cookie found",
		})
		return
	}

	// Log cookie details for debugging
	cookiePreview := ""
	if len(cookie.Value) > 10 {
		cookiePreview = cookie.Value[:10] + "..."
	} else {
		cookiePreview = cookie.Value
	}
	log.Printf("Session validation: Found cookie: %s", cookiePreview)

	// Get current user ID from session
	userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
	if err != nil {
		// Invalid session
		log.Printf("Session validation failed: %v", err)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid": false,
			"error": err.Error(),
		})
		return
	}

	log.Printf("Getting posts created by user: %s", userID)

	// Query posts created by this user
	query := `
        SELECT p.id, p.title, p.content, p.imagepath, p.post_at, p.user_id, 
               u.nickname, u.profile_pic,
               (SELECT COUNT(*) FROM reaction WHERE post_id = p.id AND like = 1) as likes,
               (SELECT COUNT(*) FROM reaction WHERE post_id = p.id AND like = 0) as dislikes,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.post_at DESC
    `

	rows, err := utils.GlobalDB.Query(query, userID)
	if err != nil {
		log.Printf("Error querying created posts: %v", err)
		http.Error(w, "Failed to get posts", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var posts []utils.Post
	for rows.Next() {
		var post utils.Post
		var postTime string
		var profilePic sql.NullString

		err := rows.Scan(
			&post.ID, &post.Title, &post.Content, &post.ImagePath, &postTime, &post.UserID,
			&post.Username, &profilePic, &post.Likes, &post.Dislikes, &post.Comments,
		)
		if err != nil {
			log.Printf("Error scanning post row: %v", err)
			continue
		}

		// Format the time
		post.PostTime = postTime

		// Handle null profile pic
		if profilePic.Valid {
			post.ProfilePic = profilePic.String
		} else {
			post.ProfilePic = ""
		}

		// Get categories for this post
		categories, err := ah.postHandler.getPostCategories(int64(post.ID))
		if err != nil {
			log.Printf("Error getting categories for post %d: %v", post.ID, err)
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

	log.Printf("Found %d posts created by user %s", len(posts), userID)

	// Return posts as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// handleLikedPosts returns posts liked by the current user
func (ah *APIHandler) handleLikedPosts(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get current user ID from session
	cookie, err := r.Cookie("session_token")
	if err != nil {
		// No session cookie, session is invalid
		log.Printf("Session validation: No cookie found - Error: %v", err)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid": false,
			"error": "No session cookie found",
		})
		return
	}

	// Log cookie details for debugging
	cookiePreview := ""
	if len(cookie.Value) > 10 {
		cookiePreview = cookie.Value[:10] + "..."
	} else {
		cookiePreview = cookie.Value
	}
	log.Printf("Session validation: Found cookie: %s", cookiePreview)

	// Get current user ID from session
	userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
	if err != nil {
		// Invalid session
		log.Printf("Session validation failed: %v", err)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid": false,
			"error": err.Error(),
		})
		return
	}

	log.Printf("Getting posts liked by user: %s", userID)

	// Query posts liked by this user
	query := `
        SELECT p.id, p.title, p.content, p.imagepath, p.post_at, p.user_id, 
               u.nickname, u.profile_pic,
               (SELECT COUNT(*) FROM reaction WHERE post_id = p.id AND like = 1) as likes,
               (SELECT COUNT(*) FROM reaction WHERE post_id = p.id AND like = 0) as dislikes,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments
        FROM posts p
        JOIN users u ON p.user_id = u.id
        JOIN reaction r ON p.id = r.post_id
        WHERE r.user_id = ? AND r.like = 1
        GROUP BY p.id
        ORDER BY p.post_at DESC
    `

	rows, err := utils.GlobalDB.Query(query, userID)
	if err != nil {
		log.Printf("Error querying liked posts: %v", err)
		http.Error(w, "Failed to get posts", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var posts []utils.Post
	for rows.Next() {
		var post utils.Post
		var postTime string
		var profilePic sql.NullString

		err := rows.Scan(
			&post.ID, &post.Title, &post.Content, &post.ImagePath, &postTime, &post.UserID,
			&post.Username, &profilePic, &post.Likes, &post.Dislikes, &post.Comments,
		)
		if err != nil {
			log.Printf("Error scanning post row: %v", err)
			continue
		}

		// Format the time
		post.PostTime = postTime

		// Handle null profile pic
		if profilePic.Valid {
			post.ProfilePic = profilePic.String
		} else {
			post.ProfilePic = ""
		}

		// Get categories for this post
		categories, err := ah.postHandler.getPostCategories(int64(post.ID))
		if err != nil {
			log.Printf("Error getting categories for post %d: %v", post.ID, err)
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

	log.Printf("Found %d posts liked by user %s", len(posts), userID)

	// Return posts as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// handleUserStats returns statistics for a user (post count, comment count, likes received)
func (ah *APIHandler) handleUserStats(w http.ResponseWriter, r *http.Request) {
	// Set response headers
	w.Header().Set("Content-Type", "application/json")

	// Get user ID from query parameter
	userID := r.URL.Query().Get("id")
	if userID == "" {
		// If no ID provided, try to get current user from session
		cookie, err := r.Cookie("session_token")
		if err != nil {
			log.Printf("Error getting session: %v", err)
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": "Unauthorized - No session found",
			})
			return
		}

		sessionUserID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
		if err != nil || sessionUserID == "" {
			log.Printf("No valid user ID in session: %v", err)
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": "Unauthorized - Invalid session",
			})
			return
		}

		userID = sessionUserID
	}

	log.Printf("Getting stats for user ID: %s", userID)

	// Get post count
	var postCount int
	err := utils.GlobalDB.QueryRow("SELECT COUNT(*) FROM posts WHERE user_id = ?", userID).Scan(&postCount)
	if err != nil {
		log.Printf("Error getting post count: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": fmt.Sprintf("Error getting post count: %v", err),
		})
		return
	}

	// Get comment count
	var commentCount int
	err = utils.GlobalDB.QueryRow("SELECT COUNT(*) FROM comments WHERE user_id = ?", userID).Scan(&commentCount)
	if err != nil {
		log.Printf("Error getting comment count: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": fmt.Sprintf("Error getting comment count: %v", err),
		})
		return
	}

	// Get likes received (likes on user's posts)
	var likesReceived int
	err = utils.GlobalDB.QueryRow(`
		SELECT COUNT(*) 
		FROM reaction r
		JOIN posts p ON r.post_id = p.id
		WHERE p.user_id = ? AND r.like = 1
	`, userID).Scan(&likesReceived)
	if err != nil {
		log.Printf("Error getting likes received: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": fmt.Sprintf("Error getting likes received: %v", err),
		})
		return
	}

	// Return stats
	stats := map[string]interface{}{
		"post_count":     postCount,
		"comment_count":  commentCount,
		"likes_received": likesReceived,
		"user_id":        userID,
	}

	json.NewEncoder(w).Encode(stats)
}

// handleCommentedPosts returns posts commented on by the current user
func (ah *APIHandler) handleCommentedPosts(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get current user ID from session
	cookie, err := r.Cookie("session_token")
	if err != nil {
		// No session cookie, session is invalid
		log.Printf("Session validation: No cookie found - Error: %v", err)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid": false,
			"error": "No session cookie found",
		})
		return
	}

	// Log cookie details for debugging
	cookiePreview := ""
	if len(cookie.Value) > 10 {
		cookiePreview = cookie.Value[:10] + "..."
	} else {
		cookiePreview = cookie.Value
	}
	log.Printf("Session validation: Found cookie: %s", cookiePreview)

	// Get current user ID from session
	userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
	if err != nil {
		// Invalid session
		log.Printf("Session validation failed: %v", err)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid": false,
			"error": err.Error(),
		})
		return
	}

	log.Printf("Getting posts commented on by user: %s", userID)

	// Query posts commented on by this user
	query := `
        SELECT p.id, p.title, p.content, p.imagepath, p.post_at, p.user_id, 
               u.nickname, u.profile_pic,
               (SELECT COUNT(*) FROM reaction WHERE post_id = p.id AND like = 1) as likes,
               (SELECT COUNT(*) FROM reaction WHERE post_id = p.id AND like = 0) as dislikes,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments
        FROM posts p
        JOIN users u ON p.user_id = u.id
        JOIN comments c ON p.id = c.post_id
        WHERE c.user_id = ?
        GROUP BY p.id
        ORDER BY p.post_at DESC
    `

	rows, err := utils.GlobalDB.Query(query, userID)
	if err != nil {
		log.Printf("Error querying commented posts: %v", err)
		http.Error(w, "Failed to get posts", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var posts []utils.Post
	for rows.Next() {
		var post utils.Post
		var postTime string
		var profilePic sql.NullString

		err := rows.Scan(
			&post.ID, &post.Title, &post.Content, &post.ImagePath, &postTime, &post.UserID,
			&post.Username, &profilePic, &post.Likes, &post.Dislikes, &post.Comments,
		)
		if err != nil {
			log.Printf("Error scanning post row: %v", err)
			continue
		}

		// Format the time
		post.PostTime = postTime

		// Handle null profile pic
		if profilePic.Valid {
			post.ProfilePic = profilePic.String
		} else {
			post.ProfilePic = ""
		}

		// Get categories for this post
		categories, err := ah.postHandler.getPostCategories(int64(post.ID))
		if err != nil {
			log.Printf("Error getting categories for post %d: %v", post.ID, err)
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

	log.Printf("Found %d posts commented on by user %s", len(posts), userID)

	// Return posts as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}
