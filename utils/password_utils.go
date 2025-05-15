package utils

import (
	"log"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword creates a bcrypt hash of the password
// Uses a cost factor of 10 for a balance of security and performance
// @param password - The plaintext password to hash
// @returns string - The hashed password
// @returns error - Any error that occurred during hashing
func HashPassword(password string) (string, error) {
	// Generate bcrypt hash from password with cost factor 10
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		log.Printf("HashPassword - Error: %v", err)
		return "", err
	}

	hashedPassword := string(bytes)
	return hashedPassword, nil
}

// CheckPasswordsHash compares a bcrypt hashed password with a possible plaintext equivalent
// @param hashedPassword - The bcrypt hash from the database
// @param password - The plaintext password to check
// @returns bool - True if the password matches the hash, false otherwise
func CheckPasswordsHash(hashedPassword, password string) bool {
	// Compare the stored hash with the provided password
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))

	// Log comparison result
	if err != nil {
		log.Printf("CheckPasswordsHash - Comparison failed: %v", err)
	} else {
		log.Printf("CheckPasswordsHash - Comparison successful")
	}

	return err == nil
}
