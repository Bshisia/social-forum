package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"time"

	"forum/utils"
)

func SignOutHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_token")
		if err != nil {
			http.Redirect(w, r, "/", http.StatusSeeOther)
			return
		}

		// Get userID from session before deleting it
		var userID string
		err = db.QueryRow("SELECT user_id FROM sessions WHERE id = ?", cookie.Value).Scan(&userID)
		if err != nil {
			log.Printf("Error getting user ID from session: %v", err)
		}

		// Update user's online status and last seen timestamp
		if userID != "" {
			_, err = db.Exec(`
                UPDATE users 
                SET is_online = 0, 
                    last_seen = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, userID)
			if err != nil {
				log.Printf("Error updating user status: %v", err)
			}
		}

		// Delete the session
		_, err = db.Exec("DELETE FROM sessions WHERE id = ?", cookie.Value)
		if err != nil {
			log.Printf("Error deleting session from database: %v", err)
		}

		// Clear the cookie
		http.SetCookie(w, &http.Cookie{
			Name:    "session_token",
			Value:   "",
			Expires: time.Now().Add(-1 * time.Hour),
		})

		if err != nil {
			utils.RenderErrorPage(w, http.StatusInternalServerError, http.StatusText(http.StatusInternalServerError))
			return
		}

		http.Redirect(w, r, "/", http.StatusSeeOther)
	}
}
