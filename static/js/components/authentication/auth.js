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

function loadLoginPage(container) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <h2>Login to Premium Forum</h2>
        <form id="loginForm" class="auth-form">
            <label for="email">Email</label>
            <input type="email" id="email" placeholder="Email" required> <br>
            <label for="password">Password</label>
            <input type="password" id="password" placeholder="Password" required> <br>
            <a href="#" onclick="event.preventDefault(); loadPage('forgotPassword')">Forgot Password?</a> <br>
            <button type="submit">Login</button>
        </form>
        <div class="google-signin">
            <a href="/auth/google" class="google-signin-btn">
                <i class="fab fa-google"></i>
                Sign in with Google
            </a>
            <a href="/auth/github" class="github-signin-btn">
                <i class="fab fa-github"></i>
                Sign in with GitHub
            </a>
        </div>
        <p id="loginMessage"></p>
        <p class="form-footer">Don't have an account? <a href="#" onclick="event.preventDefault(); loadPage('register')">Register here</a></p>
    `;

    // Add event listener for the login form
    document.getElementById('loginForm').addEventListener('submit', function (event) {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        })
            .then(response => response.json())
            .then(data => {
                const loginMessage = document.getElementById('loginMessage');
                loginMessage.textContent = data.message;
                loginMessage.style.color = data.success ? 'green' : 'red';

                // Store user data and update authentication state on successful login
                if (data.success) {
                    localStorage.setItem('userId', data.userId);
                    localStorage.setItem('userEmail', email);
                    if (data.nickname) {
                        localStorage.setItem('userName', data.nickname);
                    }
                    
                    isAuthenticated = true;
                    currentUser = {
                        id: data.userId,
                        email: email,
                        nickname: data.nickname
                    };
                    
                    updateNavigation(true);
                    loadPage('home');
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    });
}

function loadRegisterPage(container) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <h2>Register for Premium Forum</h2>
        <p class="premium-description">Join our exclusive community to unlock all premium features.</p>
        <form id="registerForm" class="auth-form">
            <label for="nickname">Nickname</label>
            <input type="text" id="nickname" placeholder="Nickname" required><br>
            <label for="age">Age</label>
            <input type="number" id="age" placeholder="Age" required><br>
            <label for="gender">Gender</label>
            <select id="gender" required>
                <option value="" disabled selected>Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
            </select><br>
            <label for="firstName">First Name</label>
            <input type="text" id="firstName" placeholder="First Name" required><br>
            <label for="lastName">Last Name</label>
            <input type="text" id="lastName" placeholder="Last Name" required><br>
            <label for="email">Email</label>
            <input type="email" id="email" placeholder="Email" required><br>
            <label for="password">Password</label>
            <input type="password" id="password" placeholder="Password" required><br>
            <button type="submit">Create Premium Account</button>
        </form>
        <p id="registerMessage"></p>
        <p class="form-footer">Already have an account? <a href="#" onclick="event.preventDefault(); loadPage('login')">Login here</a></p>
    `;

    // Add event listener for the registration form
    document.getElementById('registerForm').addEventListener('submit', function (event) {
        event.preventDefault();

        // Send a POST request to the backend
        fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nickname: document.getElementById('nickname').value,
                age: document.getElementById('age').value,
                gender: document.getElementById('gender').value,
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
            }),
        })
            .then(response => response.json())
            .then(data => {
                const registerMessage = document.getElementById('registerMessage');
                registerMessage.textContent = data.message;
                registerMessage.style.color = data.success ? 'green' : 'red';
                
                // If registration successful, redirect to login
                if (data.success) {
                    setTimeout(() => {
                        loadPage('login');
                    }, 1500);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    });
}

function loadHomePage(container) {
    const userName = localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'Premium User';
    
    container.innerHTML = `
        <h1> This is the homepage </h1>
    `;
}

// Update window.onload to check auth state
window.onload = () => {
    checkAuthState();
    
    // Redirect to appropriate page based on auth state
    if (isAuthenticated) {
        loadPage('home');
    } else {
        loadPage('login');
    }
}