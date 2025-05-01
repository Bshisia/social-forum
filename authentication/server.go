package handlers

import (
	"sync"
)

var onlineUsersMap = struct {
	sync.RWMutex
	users map[string]string // Map of userID to username
}{
	users: make(map[string]string),
}

// Add a user to the online users list
func AddOnlineUser(userID, username string) {
	onlineUsersMap.Lock()
	defer onlineUsersMap.Unlock()
	onlineUsersMap.users[userID] = username
}

// Remove a user from the online users list
func RemoveOnlineUser(userID string) {
	onlineUsersMap.Lock()
	defer onlineUsersMap.Unlock()
	delete(onlineUsersMap.users, userID)
}

