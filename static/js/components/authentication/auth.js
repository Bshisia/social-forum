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

// Add a logout function
function logout() {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    isAuthenticated = false;
    currentUser = null;
    updateNavigation(false);
    loadPage('login');
}

function loadPage(page) {
    const contentDiv = document.getElementById('content');
    
    // Check authentication for restricted pages
    const restrictedPages = ['home', 'posts', 'createPost', 'messages'];
    if (restrictedPages.includes(page) && !checkAuthState()) {
        history.pushState({}, '', '/login');
        return;
    }

    // Clear existing content
    contentDiv.innerHTML = '';

    // Load the appropriate content based on the page
    switch (page) {
        case 'register':
            loadRegisterPage(contentDiv);
            history.pushState({}, '', '/register');
            break;
        case 'login':
            loadLoginPage(contentDiv);
            history.pushState({}, '', '/login');
            break;
        case 'home':
            loadHomePage(contentDiv);
            history.pushState({}, '', '/');
            break;
        case 'forgotPassword':
            loadForgotPasswordPage(contentDiv);
            history.pushState({}, '', '/forgotPassword');
            break;
        default:
            contentDiv.innerHTML = '<h2>Page Not Found</h2>';
            history.pushState({}, '', '/404');
    }
}