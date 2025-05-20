package utils

import (
	"unicode"

	"github.com/gofrs/uuid"
)

// ValidateUsername checks if the provided username is valid
// Username must be 3-30 characters long and contain at least one letter
// @param username - The username to validate
// @returns bool - True if the username is valid, false otherwise
func ValidateUsername(username string) bool {
	hasLetter := false
	hasNumber := false
	for _, char := range username {
		if unicode.IsLetter(char) {
			hasLetter = true
		}
		if unicode.IsDigit(char) {
			hasNumber = true
		}
	}
	return len(username) >= 3 && len(username) <= 30 && hasLetter && hasNumber || hasLetter
}

// ValidatePassword checks if the provided password meets security requirements
// Password must be at least 8 characters long and contain:
// - At least one lowercase letter
// - At least one uppercase letter
// - At least one number
// - At least one special character
// @param password - The password to validate
// @returns bool - True if the password is valid, false otherwise
func ValidatePassword(password string) bool {
	if len(password) < 8 {
		return false
	}
	hasLower := false
	hasUpper := false
	hasNumber := false
	hasSpecial := false
	for _, char := range password {
		switch {
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsDigit(char):
			hasNumber = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}
	return hasLower && hasUpper && hasNumber && hasSpecial
}

// GenerateId creates a new unique identifier using UUID v4
// Used for generating user IDs and other unique identifiers in the application
// @returns string - A new UUID as a string
func GenerateId() string {
	Uid, _ := uuid.NewV4()
	return Uid.String()
}
