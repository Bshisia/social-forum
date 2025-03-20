package utils

import (
	"database/sql"
	"time"
)

type User struct {
	ID         string         `json:"id"`
	Nickname   string         `json:"nickname"`
	Age        int            `json:"age"`
	Gender     string         `json:"gender"`
	FirstName  string         `json:"firstName"`
	LastName   string         `json:"lastName"`
	Email      string         `json:"email"`
	Password   string         `json:"-"` // Don't include in JSON responses
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
	ImageURL   sql.NullString `json:"-"`        // Internal field to handle NULL values
	ProfilePic string         `json:"imageUrl"` // This will be populated from ImageURL if valid
}

type Post struct {
	ID         int64      `json:"ID"`         // Use uppercase ID to match frontend expectations
	Title      string     `json:"Title"`      // Use uppercase Title to match frontend expectations
	Content    string     `json:"Content"`    // Use uppercase Content to match frontend expectations
	ImagePath  string     `json:"ImagePath"`  // Use uppercase ImagePath to match frontend expectations
	PostTime   string     `json:"PostTime"`   // Store formatted time string
	UserID     string     `json:"UserID"`     // Use uppercase UserID to match frontend expectations
	Username   string     `json:"Username"`   // Use uppercase Username to match frontend expectations
	ProfilePic string     `json:"ProfilePic"` // Add ProfilePic field
	Likes      int        `json:"Likes"`      // Use uppercase Likes to match frontend expectations
	Dislikes   int        `json:"Dislikes"`   // Use uppercase Dislikes to match frontend expectations
	Comments   int        `json:"Comments"`   // Use uppercase Comments to match frontend expectations
	Categories []Category `json:"Categories"` // Use uppercase Categories to match frontend expectations
}

type Comment struct {
	ID          int
	PostID      int
	UserID      string
	Username    string
	Content     string
	CommentTime time.Time
	Likes       int
	Dislikes    int
	ProfilePic  sql.NullString
}

type Category struct {
	ID   int
	Name string
}

type Session struct {
	ID        string
	UserID    string // Changed to string to match User.ID
	CreatedAt time.Time
	ExpiresAt time.Time
}
type ErrorPageData struct {
	Code    int
	Message string
}

type PageData struct {
	IsLoggedIn    bool
	Posts         []Post
	CurrentUserID string
	Users         []User
	UnreadCount   int
}

type Notification struct {
	ID                 int
	Type               string
	PostID             int
	ActorName          string
	ActorProfilePic    sql.NullString
	CreatedAt          time.Time
	CreatedAtFormatted string
	IsRead             bool
}
