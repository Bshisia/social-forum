package utils

import (
	"time"
)

type User struct {
	ID         string    `json:"id"`
	Nickname   string    `json:"nickname"`
	Age        int       `json:"age"`
	Gender     string    `json:"gender"`
	FirstName  string    `json:"firstName"`
	LastName   string    `json:"lastName"`
	Email      string    `json:"email"`
	Password   string    `json:"-"` // Don't include in JSON responses
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
	ProfilePic string    `json:"profilePic"` // Changed from sql.NullString to string
}

type Post struct {
	ID         int64      `json:"id"`
	Title      string     `json:"title"`
	Content    string     `json:"content"`
	ImagePath  string     `json:"imagePath"`
	PostTime   string     `json:"postTime"` // Store formatted time string
	UserID     string     `json:"userID"`
	Username   string     `json:"username"`
	ProfilePic string     `json:"profilePic"` // Add ProfilePic field
	Likes      int        `json:"likes"`
	Dislikes   int        `json:"dislikes"`
	Comments   int        `json:"comments"`
	Categories []Category `json:"categories"`
}

type Comment struct {
	ID          int       `json:"id"`
	PostID      int       `json:"postID"`
	UserID      string    `json:"userID"`
	Username    string    `json:"username"`
	Content     string    `json:"content"`
	CommentTime time.Time `json:"commentTime"`
	Likes       int       `json:"likes"`
	Dislikes    int       `json:"dislikes"`
	ProfilePic  string    `json:"profilePic"` // Changed from sql.NullString to string
}

type Category struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Session struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userID"` // Changed to string to match User.ID
	CreatedAt time.Time `json:"createdAt"`
	ExpiresAt time.Time `json:"expiresAt"`
}
type ErrorPageData struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type PageData struct {
	IsLoggedIn    bool   `json:"isLoggedIn"`
	Posts         []Post `json:"posts"`
	CurrentUserID string `json:"currentUserID"`
	Users         []User `json:"users"`
	UnreadCount   int    `json:"unreadCount"`
}

type Notification struct {
	ID                 int       `json:"id"`
	Type               string    `json:"type"`
	PostID             int       `json:"postID"`
	ActorName          string    `json:"actorName"`
	ActorProfilePic    string    `json:"actorProfilePic"` // Changed from sql.NullString to string
	CreatedAt          time.Time `json:"createdAt"`
	CreatedAtFormatted string    `json:"createdAtFormatted"`
	IsRead             bool      `json:"isRead"`
}
