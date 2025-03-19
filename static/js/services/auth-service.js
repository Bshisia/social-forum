class AuthService {
    constructor() {
        // Initialize state
        this.isAuthenticated = false;
        this.currentUser = null;
        
        // Try to restore auth state from localStorage
        this.restoreAuthState();
    }
    
    // Check if user is authenticated
    checkAuthState() {
        return new Promise((resolve) => {
            // First check if we already have the state in memory
            if (this.isAuthenticated && this.currentUser) {
                resolve(true);
                return;
            }
            
            // Try to restore from localStorage
            const userId = localStorage.getItem('userId');
            const userName = localStorage.getItem('userName');
            
            if (userId && userName) {
                // Validate with server if possible
                fetch('/api/validate-session')
                    .then(response => response.json())
                    .then(data => {
                        if (data.valid) {
                            this.isAuthenticated = true;
                            this.currentUser = {
                                id: userId,
                                nickname: userName,
                                email: localStorage.getItem('userEmail') || ''
                            };
                            resolve(true);
                        } else {
                            this.clearAuthState();
                            resolve(false);
                        }
                    })
                    .catch(() => {
                        // If server validation fails, use localStorage as fallback
                        this.isAuthenticated = true;
                        this.currentUser = {
                            id: userId,
                            nickname: userName,
                            email: localStorage.getItem('userEmail') || ''
                        };
                        resolve(true);
                    });
            } else {
                this.clearAuthState();
                resolve(false);
            }
        });
    }
    
    // Get current user data
    getCurrentUser() {
        return this.currentUser;
    }
    
    // Sign out user
    signOut() {
        return new Promise((resolve) => {
            // Call logout API if available
            fetch('/logout', { method: 'POST' })
                .catch(() => {})
                .finally(() => {
                    this.clearAuthState();
                    resolve();
                });
        });
    }
    
    // Clear authentication state
    clearAuthState() {
        this.isAuthenticated = false;
        this.currentUser = null;
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
    }
    
    // Restore authentication state from localStorage
    restoreAuthState() {
        const userId = localStorage.getItem('userId');
        const userName = localStorage.getItem('userName');
        
        if (userId && userName) {
            this.isAuthenticated = true;
            this.currentUser = {
                id: userId,
                nickname: userName,
                email: localStorage.getItem('userEmail') || ''
            };
        }
    }
    
    // Set authentication state (used by app.js)
    setAuthState(isAuth, user) {
        this.isAuthenticated = isAuth;
        this.currentUser = user;
    }
}

// Create and export a singleton instance
export default new AuthService();