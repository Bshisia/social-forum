package handlers

import (
	"sync"
)

var onlineUsers = struct {
	sync.RWMutex
	users map[string]string // Map of userID to username
}{
	users: make(map[string]string),
}

// Add a user to the online users list
func AddOnlineUser(userID, username string) {
	onlineUsers.Lock()
	defer onlineUsers.Unlock()
	onlineUsers.users[userID] = username
}

// Remove a user from the online users list
func RemoveOnlineUser(userID string) {
	onlineUsers.Lock()
	defer onlineUsers.Unlock()
	delete(onlineUsers.users, userID)
}

// Get the list of online users
func GetOnlineUsers() []map[string]string {
	onlineUsers.RLock()
	defer onlineUsers.RUnlock()

	var users []map[string]string
	for userID, username := range onlineUsers.users {
		users = append(users, map[string]string{
			"id":       userID,
			"username": username,
		})
	}
	return users
}
