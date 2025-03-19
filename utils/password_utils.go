package utils

import (
	"log"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword creates a bcrypt hash of the password
func HashPassword(password string) (string, error) {
	// Debug: Log password before hashing

	// Generate bcrypt hash from password with cost factor 10
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		// Debug: Log hashing error
		log.Printf("HashPassword - Error: %v", err)
		return "", err
	}

	hashedPassword := string(bytes)

	// Debug: Log generated hash

	return hashedPassword, nil
}

// CheckPasswordsHash compares a bcrypt hashed password with a possible plaintext equivalent
func CheckPasswordsHash(hashedPassword, password string) bool {
	// Debug: Log inputs

	// Compare the stored hash with the provided password
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))

	// Debug: Log comparison result
	if err != nil {
		log.Printf("CheckPasswordsHash - Comparison failed: %v", err)
	} else {
		log.Printf("CheckPasswordsHash - Comparison successful")
	}

	return err == nil
}
