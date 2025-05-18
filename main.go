package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	handlers "forum/authentication"
	"forum/controllers"
	"forum/utils"
)

// main is the entry point of the application
func main() {
	// Initialize database
	db, err := utils.InitialiseDB()
	if err != nil {
		log.Fatalf("Database initialization failed: %v", err)
	}
	defer db.Close()

	// Initialize handlers
	handlers.InitDB(db)
	utils.InitSessionManager(utils.GlobalDB)

	// Auth routes - OAuth providers
	http.HandleFunc("/auth/github", handlers.HandleGitHubLogin)
	http.HandleFunc("/auth/github/callback", handlers.HandleGitHubCallback)
	http.HandleFunc("/auth/google", handlers.HandleGoogleLogin)
	http.HandleFunc("/auth/google/callback", handlers.HandleGoogleCallback)

	// Static file serving
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	// API Routes
	apiHandler := controllers.NewAPIHandler()
	http.Handle("/api/", apiHandler)
	http.HandleFunc("/api/user-status", controllers.GetUserStatus)

	// Auth routes
	http.Handle("/login", apiHandler)
	http.Handle("/register", apiHandler)

	// Signout route
	http.HandleFunc("/signout", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Signout request received")
		apiHandler.HandleSignout(w, r)
	})

	// WebSocket routes
	http.HandleFunc("/ws", handlers.HandleWebSocket)
	http.HandleFunc("/ws/chat", handlers.HandleChatWebSocket)
	http.HandleFunc("/api/users/refresh", handlers.TriggerUsersListBroadcast)

	// User routes
	http.HandleFunc("/api/users/", handlers.GetUserHandler)

	// Chat routes
	http.HandleFunc("/api/chat/history", handlers.GetChatHistoryHandler)
	http.HandleFunc("/api/chat/send", handlers.SendMessageHandler)
	http.HandleFunc("/api/chat/users", handlers.GetChatUsersHandler)

	// Notification routes
	notificationHandler := controllers.NewNotificationHandler()
	http.Handle("/notifications", notificationHandler)
	http.Handle("/api/notifications", notificationHandler)
	http.Handle("/notifications/mark-read", notificationHandler)

	// SPA catch-all route - serve index.html for all other routes
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") ||
			strings.HasPrefix(r.URL.Path, "/static/") ||
			strings.HasPrefix(r.URL.Path, "/auth/") ||
			r.URL.Path == "/login" ||
			r.URL.Path == "/register" ||
			r.URL.Path == "/signout" {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, "templates/index.html")
	})

	fmt.Println("Server opened at port 8000...http://localhost:8000/")
	log.Fatal(http.ListenAndServe(":8000", nil))
}
