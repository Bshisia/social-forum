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

	// 1. Auth routes - OAuth providers
	http.HandleFunc("/auth/github", handlers.HandleGitHubLogin)
	http.HandleFunc("/auth/github/callback", handlers.HandleGitHubCallback)
	http.HandleFunc("/auth/google", handlers.HandleGoogleLogin)
	http.HandleFunc("/auth/google/callback", handlers.HandleGoogleCallback)

	// 2. Static file serving
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	// 3. API Routes - Use the APIHandler for all API routes
	apiHandler := controllers.NewAPIHandler()
	http.Handle("/api/", apiHandler)
	http.HandleFunc("/api/user-status", controllers.GetUserStatus)

	// 4. Auth routes - Use the APIHandler for login/register
	http.Handle("/login", apiHandler)
	http.Handle("/register", apiHandler)

	// Handle signout separately to ensure proper session management
	http.HandleFunc("/signout", func(w http.ResponseWriter, r *http.Request) {
		log.Println("Signout request received")
		apiHandler.HandleSignout(w, r)
	})

	// 5. SPA catch-all route - serve index.html for all other routes
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Skip for API and static routes
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
