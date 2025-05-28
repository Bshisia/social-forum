package utils

import (
	"html/template"
	"net/http"
)

// Error message constants used throughout the application
// These provide consistent error messages for common error scenarios
const (
	ErrMethodNotAllowed = "The requested method is not supported for this endpoint."
	ErrInternalServer   = "An unexpected error occurred. Please try again later."
	ErrUnauthorized     = "You must be logged in to perform this action."
	ErrForbidden        = "You don't have permission to perform this action."
	ErrInvalidForm      = "Please check your input and try again."
	ErrCategoryLoad     = "Unable to load categories. Please try again."
	ErrTemplateLoad     = "Unable to load page template."
	ErrPostCreate       = "Unable to create post. Please try again."
	ErrPostNotFound     = "The requested post could not be found."
	ErrCommentCreate    = "Unable to create comment. Please try again."
	ErrFileUpload       = "Error uploading file. Please try again."
	ErrPageNotFound     = "Page not found"
	ErrTemplateExec     = "We're experiencing technical difficulties. Please try again later."
	ErrFileTooLarge     = "File size exceeds the 20MB limit. Please upload a smaller image."
	ErrInvalidFileType  = "Invalid file type. Only JPEG, PNG, and GIF images are allowed."
	ErrNotFound         = "Not Found."
)

// ErrorPageData contains the data needed to render an error page
type ErrorPageData struct {
	Code    int    // HTTP status code
	Message string // Error message to display
}

// RenderErrorPage renders an error page with the given status code and message
// @param w - The HTTP response writer
// @param code - The HTTP status code to return
// @param message - The error message to display
func RenderErrorPage(w http.ResponseWriter, code int, message string) {
	// Set content type before writing status
	w.Header().Set("Content-Type", "text/html; charset=utf-8")

	// Set status code after headers but before body
	w.WriteHeader(code)

	tmpl, err := template.ParseFiles("templates/error.html")
	if err != nil {
		// Since we already wrote the header, we can't use http.Error here
		w.Write([]byte("Error loading error page template"))
		return
	}

	data := ErrorPageData{
		Code:    code,
		Message: message,
	}

	if err := tmpl.Execute(w, data); err != nil {
		// Since we already wrote the header, we can't use http.Error here
		w.Write([]byte("Error rendering error page"))
		return
	}
}
