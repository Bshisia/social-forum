package utils

import (
	"errors"
	"regexp"
	"strconv"
	"strings"
)

// Common validation errors
var (
	ErrInvalidUserID     = errors.New("invalid user ID format")
	ErrInvalidPostID     = errors.New("invalid post ID format")
	ErrInvalidCommentID  = errors.New("invalid comment ID format")
	ErrInvalidEmail      = errors.New("invalid email format")
	ErrInvalidNickname   = errors.New("invalid nickname format")
	ErrEmptyContent      = errors.New("content cannot be empty")
	ErrContentTooLong    = errors.New("content exceeds maximum length")
	ErrInvalidCategoryID = errors.New("invalid category ID format")
)

// ValidateUserID checks if a user ID is in a valid format
// User IDs should be UUIDs or have a specific format
func ValidateUserID(userID string) error {
	if userID == "" {
		return ErrInvalidUserID
	}

	// Check if it's a UUID format (example: 9796e86f-b079-429a-a370-d68231a1332b)
	uuidPattern := `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`
	matched, err := regexp.MatchString(uuidPattern, userID)
	if err != nil {
		return err
	}
	if !matched {
		return ErrInvalidUserID
	}

	return nil
}

// ValidatePostID checks if a post ID is in a valid format
// Post IDs should be positive integers
func ValidatePostID(postID string) (int, error) {
	id, err := strconv.Atoi(postID)
	if err != nil {
		return 0, ErrInvalidPostID
	}
	if id <= 0 {
		return 0, ErrInvalidPostID
	}
	return id, nil
}

// ValidateCommentID checks if a comment ID is in a valid format
// Comment IDs should be positive integers
func ValidateCommentID(commentID string) (int, error) {
	id, err := strconv.Atoi(commentID)
	if err != nil {
		return 0, ErrInvalidCommentID
	}
	if id <= 0 {
		return 0, ErrInvalidCommentID
	}
	return id, nil
}

// ValidateEmail checks if an email is in a valid format
func ValidateEmail(email string) error {
	if email == "" {
		return ErrInvalidEmail
	}

	// Simple email validation pattern
	emailPattern := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	matched, err := regexp.MatchString(emailPattern, email)
	if err != nil {
		return err
	}
	if !matched {
		return ErrInvalidEmail
	}

	return nil
}

// ValidateNickname checks if a nickname is in a valid format
func ValidateNickname(nickname string) error {
	if nickname == "" {
		return ErrInvalidNickname
	}

	// Nickname should be alphanumeric with some special characters, 3-30 chars
	if len(nickname) < 3 || len(nickname) > 30 {
		return ErrInvalidNickname
	}

	// Check for valid characters
	nicknamePattern := `^[a-zA-Z0-9_.-]+$`
	matched, err := regexp.MatchString(nicknamePattern, nickname)
	if err != nil {
		return err
	}
	if !matched {
		return ErrInvalidNickname
	}

	return nil
}

// ValidateContent checks if content is valid (not empty and within length limits)
func ValidateContent(content string, maxLength int) error {
	content = strings.TrimSpace(content)
	if content == "" {
		return ErrEmptyContent
	}
	if maxLength > 0 && len(content) > maxLength {
		return ErrContentTooLong
	}
	return nil
}

// ValidateCategoryID checks if a category ID is in a valid format
func ValidateCategoryID(categoryID string) (int, error) {
	id, err := strconv.Atoi(categoryID)
	if err != nil {
		return 0, ErrInvalidCategoryID
	}
	if id <= 0 {
		return 0, ErrInvalidCategoryID
	}
	return id, nil
}

// SanitizeString removes potentially dangerous characters from a string
func SanitizeString(input string) string {
	// Remove any HTML tags
	re := regexp.MustCompile("<[^>]*>")
	sanitized := re.ReplaceAllString(input, "")
	
	// Replace potentially dangerous characters
	sanitized = strings.ReplaceAll(sanitized, "'", "''")
	
	return sanitized
}
