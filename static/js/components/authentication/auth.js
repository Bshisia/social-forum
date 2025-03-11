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

// Update navigation based on authentication status
function updateNavigation(authenticated) {
    const nav = document.querySelector('nav ul');
    
    if (authenticated) {
        nav.innerHTML = `
            <li><a href="/" onclick="event.preventDefault(); loadPage('home')">Home</a></li>
            <li><a href="/posts" onclick="event.preventDefault(); loadPage('posts')">Posts</a></li>
            <li><a href="/createPost" onclick="event.preventDefault(); loadPage('createPost')">Create Post</a></li>
            <li><a href="/messages" onclick="event.preventDefault(); loadPage('messages')">Messages</a></li>
            <li><a href="#" onclick="event.preventDefault(); logout()">Logout</a></li>
        `;
    } else {
        nav.innerHTML = `
            <li><a href="/register" onclick="event.preventDefault(); loadPage('register')">Register</a></li>
            <li><a href="/login" onclick="event.preventDefault(); loadPage('login')">Login</a></li>
        `;
    }
}