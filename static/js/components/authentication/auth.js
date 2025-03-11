let isAuthenticated = false;
let currentUser = null;

// Check if user is logged in on page load
function checkAuthState() {
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');
    
    if (userId && userEmail) {
        isAuthenticated = true;
        currentUser = {
            id: userId,
            email: userEmail
        };
        updateNavigation(true);
        return true;
    } else {
        isAuthenticated = false;
        currentUser = null;
        updateNavigation(false);
        return false;
    }
}