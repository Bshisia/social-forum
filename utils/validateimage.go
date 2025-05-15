package utils

import (
	"errors"
	"mime/multipart"
	"path/filepath"
)

// MaxFileSize defines the maximum allowed file size for uploaded images (20MB)
const MaxFileSize = 20 << 20 // 20MB

// ValidImageTypes defines the allowed MIME types for uploaded images
var ValidImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/gif":  true,
}

// ValidateImage checks if an uploaded file is a valid image
// Validates both file size and file type
// @param file - The uploaded file
// @param header - The file header containing metadata
// @returns error - An error if validation fails, nil otherwise
func ValidateImage(file multipart.File, header *multipart.FileHeader) error {
	// Check file size
	if header.Size > MaxFileSize {
		return errors.New("file too large")
	}

	// Check file type
	ext := filepath.Ext(header.Filename)
	switch ext {
	case ".jpg", ".jpeg", ".png", ".gif":
		contentType := header.Header.Get("Content-Type")
		if !ValidImageTypes[contentType] {
			return errors.New("invalid file type")
		}
	default:
		return errors.New("invalid file type")
	}

	return nil
}
