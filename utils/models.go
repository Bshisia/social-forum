package utils

import (
	"time"
)

// User represents a user in the system
type User struct {
	ID         string    `json:"id"`         // Unique identifier
	Nickname   string    `json:"nickname"`   // Display name
	Age        int       `json:"age"`        // User's age
	Gender     string    `json:"gender"`     // User's gender
	FirstName  string    `json:"firstName"`  // User's first name
	LastName   string    `json:"lastName"`   // User's last name
	Email      string    `json:"email"`      // Email address (must be unique)
	Password   string    `json:"-"`          // Password (not included in JSON)
	CreatedAt  time.Time `json:"createdAt"`  // Account creation timestamp
	UpdatedAt  time.Time `json:"updatedAt"`  // Last update timestamp
	ProfilePic string    `json:"profilePic"` // Profile picture path
	IsOnline   bool      `json:"isOnline"`   // Online status
	LastSeen   time.Time `json:"lastSeen"`   // Last activity timestamp
}

// Post represents a post in the forum
type Post struct {
	ID         int64      `json:"id"`         // Unique identifier
	Title      string     `json:"title"`      // Post title
	Content    string     `json:"content"`    // Post content
	ImagePath  string     `json:"imagePath"`  // Path to attached image
	PostTime   string     `json:"postTime"`   // Formatted timestamp
	UserID     string     `json:"userID"`     // ID of post author
	Username   string     `json:"username"`   // Username of post author
	ProfilePic string     `json:"profilePic"` // Author's profile picture
	Likes      int        `json:"likes"`      // Number of likes
	Dislikes   int        `json:"dislikes"`   // Number of dislikes
	Comments   int        `json:"comments"`   // Number of comments
	Categories []Category `json:"categories"` // Post categories
}

// Comment represents a comment on a post
type Comment struct {
	ID          int       `json:"id"`          // Unique identifier
	PostID      int       `json:"postID"`      // ID of the parent post
	UserID      string    `json:"userID"`      // ID of comment author
	Username    string    `json:"username"`    // Username of comment author
	Content     string    `json:"content"`     // Comment content
	CommentTime time.Time `json:"commentTime"` // Timestamp
	Likes       int       `json:"likes"`       // Number of likes
	Dislikes    int       `json:"dislikes"`    // Number of dislikes
	ProfilePic  string    `json:"profilePic"`  // Author's profile picture
}

// Category represents a post category
type Category struct {
	ID   int    `json:"id"`   // Unique identifier
	Name string `json:"name"` // Category name
}

// Session represents a user session
type Session struct {
	ID        string    `json:"id"`        // Session token
	UserID    string    `json:"userID"`    // Associated user ID
	CreatedAt time.Time `json:"createdAt"` // Creation timestamp
	ExpiresAt time.Time `json:"expiresAt"` // Expiration timestamp
}

// PageData contains data for rendering page templates
type PageData struct {
	IsLoggedIn    bool   `json:"isLoggedIn"`    // Whether user is logged in
	Posts         []Post `json:"posts"`         // Posts to display
	CurrentUserID string `json:"currentUserID"` // Current user's ID
	Users         []User `json:"users"`         // List of users
	UnreadCount   int    `json:"unreadCount"`   // Unread notification count
}

// Notification represents a user notification
type Notification struct {
	ID                 int       `json:"id"`                 // Unique identifier
	Type               string    `json:"type"`               // Notification type (like, comment, etc.)
	PostID             int       `json:"postID"`             // Related post ID
	ActorName          string    `json:"actorName"`          // Username of the actor
	ActorProfilePic    string    `json:"actorProfilePic"`    // Actor's profile picture
	CreatedAt          time.Time `json:"createdAt"`          // Creation timestamp
	CreatedAtFormatted string    `json:"createdAtFormatted"` // Formatted timestamp for display
	IsRead             bool      `json:"isRead"`             // Whether notification has been read
}
