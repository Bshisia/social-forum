package controllers

import (
	"encoding/json"
	"net/http"
	"strconv"

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
	default:
		w.WriteHeader(http.StatusNotFound)
	}
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
