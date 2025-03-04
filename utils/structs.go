package utils

import (
	"database/sql"
	"time"
)

type User struct {
	ID         string
	UserName   string
	Email      string
	Password   string
	ProfilePic sql.NullString
}

type Post struct {
	ID           int
	UserID       string
	Title        string
	Content      string
	ImagePath    string
	PostTime     string
	Likes        int
	Dislikes     int
	Comments     int
	Username     string
	ProfilePic   sql.NullString
	UserReaction *int
	CategoryID   *int
	CategoryName *string
	Categories   []Category
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
	UserID    string
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
