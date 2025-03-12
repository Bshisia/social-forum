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
	switch r.URL.Path {
	case "/api/posts":
		ah.handlePosts(w, r)
	case "/api/posts/single":
		ah.handleSinglePost(w, r)
	case "/api/users":
		ah.handleUsers(w, r)
	case "/api/posts/filter":
		ah.handleFilteredPosts(w, r)
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

	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

func (ah *APIHandler) checkAuth(w http.ResponseWriter, r *http.Request) bool {
	cookie, err := r.Cookie("session_token")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return false
	}

	userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid session"})
		return false
	}

	// Add userID to request context
	ctx := context.WithValue(r.Context(), "userID", userID)
	*r = *r.WithContext(ctx)
	return true
}

func (ah *APIHandler) handlePosts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	posts, err := ah.postHandler.getAllPosts()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(posts)
}

func (ah *APIHandler) handleSinglePost(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	postid := r.URL.Query().Get("id")
	if postid == "" {
		http.Error(w, "Post ID required", http.StatusBadRequest)
		return
	}

	postID, err := strconv.ParseInt(postid, 10, 64)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid post ID"})
		return
	}

	post, comments, err := ah.postHandler.getPostByID(postID)
	if err != nil {
		log.Printf("Error getting post: %v", err) // Add debug logging
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"post":     post,
		"comments": comments,
	})
}

func (ah *APIHandler) handleUsers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	users, err := ah.postHandler.getAllUsers()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	json.NewEncoder(w).Encode(users)
}

func (ah *APIHandler) handleFilteredPosts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	filterType := r.URL.Query().Get("type") // created, liked, or commented
	userID := r.URL.Query().Get("userId")
	category := r.URL.Query().Get("category")

	var posts []utils.Post
	var err error

	switch filterType {
	case "created":
		posts, err = fetchUserPostsForPosts(userID)
	case "liked":
		posts, err = fetchUserPostsForLikes(userID)
	case "commented":
		posts, err = fetchUserPostsForComments(userID)
	case "category":
		posts, err = ah.postHandler.getPostsByCategoryName(category)
	default:
		posts, err = ah.postHandler.getAllPosts()
	}

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(posts)
}

func (ah *APIHandler) handleCreatePost(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID := r.Context().Value("userID").(string)
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	// Parse multipart form with error handling
	err := r.ParseMultipartForm(20 << 20)
	if err != nil && err != http.ErrNotMultipart {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Error parsing form"})
		return
	}

	// Validate form data
	title := r.FormValue("title")
	content := r.FormValue("content")
	categories := r.Form["categories[]"]

	if title == "" || content == "" || len(categories) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Title, content, and at least one category are required"})
		return
	}

	// Handle optional image
	var imagePath string
	file, header, err := r.FormFile("image")
	if err != nil && err != http.ErrMissingFile {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Error processing image"})
		return
	}

	if err == nil && file != nil {
		defer file.Close()
		if header.Size > 20<<20 {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Image too large"})
			return
		}

		imageHandler := NewImageHandler()
		imagePath, err = imageHandler.ProcessImage(file, header)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Image processing failed"})
			return
		}
	}

	// Start transaction
	tx, err := utils.GlobalDB.Begin()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	// Insert post
	currentTime := time.Now()
	result, err := tx.Exec(`
        INSERT INTO posts (user_id, title, content, imagepath, post_at)
        VALUES (?, ?, ?, ?, ?)
    `, userID, title, content, imagePath, currentTime)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Error creating post"})
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
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Error committing transaction"})
		return
	}

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
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "User ID required"})
		return
	}

	profile, err := ah.postHandler.getUserProfile(userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"profile": profile,
	})
}

func (ah *APIHandler) handleUpdateProfilePic(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")

    // Check if user is authenticated
    cookie, err := r.Cookie("session_token")
    if err != nil {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "No session found"})
        return
    }

    // Get userID from session
    userID, err := utils.ValidateSession(utils.GlobalDB, cookie.Value)
    if err != nil {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid session"})
        return
    }

    // Check if userID is valid
    if userID == "" {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid user"})
        return
    }

    // Parse multipart form
    if err := r.ParseMultipartForm(20 << 20); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "File too large"})
        return
    }

    // Get file from form
    file, header, err := r.FormFile("profile_pic")
    if err != nil {
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]string{"error": "Invalid file upload"})
        return
    }
    defer file.Close()

    // Process image
    imageHandler := NewImageHandler()
    imagePath, err := imageHandler.ProcessImage(file, header)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
        return
    }

    // Update database
    result, err := utils.GlobalDB.Exec("UPDATE users SET profile_pic = ? WHERE id = ?", imagePath, userID)
    if err != nil {
        os.Remove(imagePath) // Clean up on error
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update profile picture"})
        return
    }

    rowsAffected, err := result.RowsAffected()
    if err != nil || rowsAffected == 0 {
        os.Remove(imagePath) // Clean up if no update occurred
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update user profile"})
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]interface{}{
        "success": true,
        "message": "Profile picture updated successfully",
        "path": imagePath,
    })
}
