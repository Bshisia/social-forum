class AuthService {
    constructor() {
        // Initialize state
        this.isAuthenticated = false;
        this.currentUser = null;
        
        // Try to restore auth state from localStorage
        this.restoreAuthState();
        
        // Set window variables for global access
        window.isAuthenticated = this.isAuthenticated;
        window.isLoggedIn = this.isAuthenticated;
        window.currentUserID = this.currentUser?.id || null;
        window.currentUser = this.currentUser;
    }
    
    // Check if user is authenticated
    checkAuthState() {
        return new Promise((resolve) => {
            // First check if we already have the state in memory
            if (this.isAuthenticated && this.currentUser) {
                resolve(true);
                return;
            }
            
            // Try to get user data from localStorage
            const userId = localStorage.getItem('userId');
            const userEmail = localStorage.getItem('userEmail');
            const userName = localStorage.getItem('userName');
            
            if (userId && userEmail) {
                this.isAuthenticated = true;
                this.currentUser = {
                    id: userId,
                    email: userEmail,
                    nickname: userName || userEmail.split('@')[0] // Use nickname or fallback to email username
                };
                
                // Update window variables
                this.updateWindowVariables();
                
                resolve(true);
                return;
            }
            
            // If not in localStorage, check with the server
            fetch('/api/validate-session', {
                credentials: 'include' // Include cookies
            })
                .then(response => response.json())
                .then(data => {
                    if (data.valid) {
                        this.isAuthenticated = true;
                        this.currentUser = {
                            id: data.userId || userId,
                            email: data.email || localStorage.getItem('userEmail') || '',
                            nickname: data.nickname || userName || (data.email ? data.email.split('@')[0] : '')
                        };
                        
                        // Store in localStorage for persistence
                        localStorage.setItem('userId', this.currentUser.id);
                        localStorage.setItem('userEmail', this.currentUser.email);
                        if (this.currentUser.nickname) {
                            localStorage.setItem('userName', this.currentUser.nickname);
                        }
                        
                        // Update window variables
                        this.updateWindowVariables();
                        
                        resolve(true);
                    } else {
                        this.clearAuthState();
                        resolve(false);
                    }
                })
                .catch(() => {
                    // If server validation fails, clear auth state
                    this.clearAuthState();
                    resolve(false);
                });
        });
    }
    
    // Get current user data
    getCurrentUser() {
        // If we have user data in memory, return it
        if (this.currentUser) {
            return this.currentUser;
        }
        
        // Try to get from localStorage
        const userId = localStorage.getItem('userId');
        const userEmail = localStorage.getItem('userEmail');
        const userName = localStorage.getItem('userName');
        
        if (userId && userEmail) {
            this.currentUser = {
                id: userId,
                email: userEmail,
                nickname: userName || userEmail.split('@')[0]
            };
            return this.currentUser;
        }
        
        return null;
    }
    
    // Sign out user
    signOut() {
        return fetch('/logout', {
            method: 'POST',
            credentials: 'include'
        })
            .then(() => {
                this.clearAuthState();
                return true;
            })
            .catch(error => {
                console.error('Logout error:', error);
                // Still clear local state even if server logout fails
                this.clearAuthState();
                return false;
            });
    }
    
    // Clear authentication state
    clearAuthState() {
        this.isAuthenticated = false;
        this.currentUser = null;
        
        // Clear localStorage
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        
        // Clear window variables
        window.isAuthenticated = false;
        window.isLoggedIn = false;
        window.currentUserID = null;
        window.currentUser = null;
    }
    
    // Restore authentication state from localStorage
    restoreAuthState() {
        const userId = localStorage.getItem('userId');
        const userEmail = localStorage.getItem('userEmail');
        const userName = localStorage.getItem('userName');
        
        if (userId && userEmail) {
            this.isAuthenticated = true;
            this.currentUser = {
                id: userId,
                email: userEmail,
                nickname: userName || userEmail.split('@')[0]
            };
            
            // Update window variables
            this.updateWindowVariables();
        }
    }
    
    // Set authentication state (used by app.js)
    setAuthState(isAuth, user) {
        this.isAuthenticated = isAuth;
        this.currentUser = user;
        
        if (isAuth && user) {
            // Store in localStorage
            localStorage.setItem('userId', user.id);
            localStorage.setItem('userEmail', user.email);
            if (user.nickname) {
                localStorage.setItem('userName', user.nickname);
            }
            
            // Update window variables
            this.updateWindowVariables();
        } else {
            this.clearAuthState();
        }
    }
    
    // Update window variables for global access
    updateWindowVariables() {
        window.isAuthenticated = this.isAuthenticated;
        window.isLoggedIn = this.isAuthenticated;
        window.currentUserID = this.currentUser?.id || null;
        window.currentUser = this.currentUser;
    }
}

// Create and export a singleton instance
export default new AuthService();
