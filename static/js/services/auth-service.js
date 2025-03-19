// Authentication Service
// Handles authentication state and operations

// Global authentication state
let isAuthenticated = false;
let currentUser = null;

/**
 * Check if the user is authenticated
 * First checks localStorage, then falls back to server check
 * @returns {Promise<boolean>} Promise resolving to authentication status
 */
function checkAuthState() {
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');
    
    if (userId && userEmail) {
        isAuthenticated = true;
        currentUser = {
            id: userId,
            email: userEmail,
            nickname: localStorage.getItem('userName')
        };
        
        // Update global window variables for backward compatibility
        window.isLoggedIn = true;
        window.currentUserID = userId;
        
        return Promise.resolve(true);
    } else {
        // If not in localStorage, check with server
        return fetch('/api/user-status')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(statusData => {
                if (statusData.isLoggedIn) {
                    isAuthenticated = true;
                    currentUser = {
                        id: statusData.currentUserID,
                        email: statusData.email || '',
                        nickname: statusData.nickname || ''
                    };
                    
                    // Store in localStorage for future checks
                    localStorage.setItem('userId', statusData.currentUserID);
                    if (statusData.email) localStorage.setItem('userEmail', statusData.email);
                    if (statusData.nickname) localStorage.setItem('userName', statusData.nickname);
                    
                    // Update global window variables for backward compatibility
                    window.isLoggedIn = true;
                    window.currentUserID = statusData.currentUserID;
                    
                    return true;
                } else {
                    isAuthenticated = false;
                    currentUser = null;
                    
                    // Update global window variables for backward compatibility
                    window.isLoggedIn = false;
                    window.currentUserID = null;
                    
                    return false;
                }
            })
            .catch(error => {
                console.error('Error checking auth state:', error);
                isAuthenticated = false;
                currentUser = null;
                
                // Update global window variables for backward compatibility
                window.isLoggedIn = false;
                window.currentUserID = null;
                
                return false;
            });
    }
}

/**
 * Set the authentication state manually
 * @param {boolean} isAuth - Whether the user is authenticated
 * @param {Object} user - User information object
 */
function setAuthState(isAuth, user) {
    isAuthenticated = isAuth;
    currentUser = user;
    
    // Update global window variables for backward compatibility
    window.isAuthenticated = isAuth;
    window.currentUser = user;
    window.isLoggedIn = isAuth;
    window.currentUserID = user ? user.id : null;
}

/**
 * Log the user out
 * @returns {Promise} Promise resolving when logout is complete
 */
function logout() {
    return fetch('/signout', { method: 'POST' })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            // Clear local storage
            localStorage.removeItem('userId');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');
            
            // Update auth state
            isAuthenticated = false;
            currentUser = null;
            
            // Update global window variables for backward compatibility
            window.isLoggedIn = false;
            window.currentUserID = null;
            window.isAuthenticated = false;
            window.currentUser = null;
            
            return true;
        })
        .catch(error => {
            console.error('Error during logout:', error);
            return false;
        });
}

/**
 * Get the current authentication status
 * @returns {boolean} Whether the user is authenticated
 */
function getAuthStatus() {
    return isAuthenticated;
}

/**
 * Get the current user information
 * @returns {Object|null} Current user object or null if not authenticated
 */
function getCurrentUser() {
    return currentUser;
}

// Export the authentication service
export default {
    checkAuthState,
    setAuthState,
    logout,
    getAuthStatus,
    getCurrentUser
};