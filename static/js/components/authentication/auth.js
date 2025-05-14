import AuthService from '../../services/auth-service.js';

class AuthComponent {
    constructor(type = 'signin') {
        this.type = type; // 'signin' or 'signup'
        this.container = null;
    }

    mount(container = document.getElementById('main-content')) {
        this.container = container;
        if (!this.container) {
            console.error('Cannot mount AuthComponent: container element not found');
            return;
        }

        // Add auth-page class to body for special styling
        document.body.classList.add('auth-page');

        this.render();
        this.attachEventListeners();
    }

    // Clean up when component is unmounted
    unmount() {
        // Remove auth-page class from body
        document.body.classList.remove('auth-page');
    }

    render() {
        if (this.type === 'signin') {
            this.renderSignIn();
        } else {
            this.renderSignUp();
        }
    }

    renderSignIn() {
        this.container.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <div class="auth-logo">
                            <i class="fas fa-comments"></i>
                        </div>
                        <h2 class="auth-title">Welcome Back</h2>
                        <p class="auth-subtitle">Sign in to continue to Real-Time Forum</p>
                    </div>

                    <form id="signin-form" class="auth-form">
                        <div class="form-group">
                            <label for="email">Email Address</label>
                            <input type="email" id="email" name="email" placeholder="Enter your email" required>
                        </div>

                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" placeholder="Enter your password" required>
                        </div>

                        <div class="visibility-toggle">
                            <input type="checkbox" id="show-password">
                            <label for="show-password">Show password</label>
                        </div>

                        <div id="signin-message" class="auth-message"></div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-sign-in-alt"></i>
                                Sign In
                            </button>
                        </div>

                        <div class="form-footer">
                            Don't have an account? <a href="/signup" onclick="event.preventDefault(); window.location.href = '/signup'">Create Account</a>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    renderSignUp() {
        this.container.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <div class="auth-logo">
                            <i class="fas fa-user-plus"></i>
                        </div>
                        <h2 class="auth-title">Create Account</h2>
                        <p class="auth-subtitle">Join our Real-Time Forum community</p>
                    </div>

                    <form id="signup-form" class="auth-form">
                        <div class="form-group">
                            <label for="nickname">Nickname</label>
                            <input type="text" id="nickname" name="nickname" placeholder="Choose a nickname" required>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="firstName">First Name</label>
                                <input type="text" id="firstName" name="firstName" placeholder="First name" required>
                            </div>
                            <div class="form-group">
                                <label for="lastName">Last Name</label>
                                <input type="text" id="lastName" name="lastName" placeholder="Last name" required>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="age">Age</label>
                                <input type="number" id="age" name="age" min="13" max="120" placeholder="Your age" required>
                            </div>
                            <div class="form-group">
                                <label for="gender">Gender</label>
                                <select id="gender" name="gender" required>
                                    <option value="" disabled selected>Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="email">Email Address</label>
                            <input type="email" id="email" name="email" placeholder="Your email address" required>
                        </div>

                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" placeholder="Create a password" required>
                        </div>

                        <div class="form-group">
                            <label for="confirm-password">Confirm Password</label>
                            <input type="password" id="confirm-password" name="confirm-password" placeholder="Confirm your password" required>
                            <div id="password-match-message" class="password-feedback"></div>
                        </div>

                        <div class="visibility-toggle">
                            <input type="checkbox" id="show-password-signup">
                            <label for="show-password-signup">Show passwords</label>
                        </div>

                        <div id="signup-message" class="auth-message"></div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-user-plus"></i>
                                Create Account
                            </button>
                        </div>

                        <div class="form-footer">
                            Already have an account? <a href="/signin" onclick="event.preventDefault(); window.location.href = '/signin'">Sign In</a>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        if (this.type === 'signin') {
            const form = document.getElementById('signin-form');
            const showPasswordCheckbox = document.getElementById('show-password');

            if (form) {
                form.addEventListener('submit', this.handleSignIn.bind(this));
            } else {
                console.error('Signin form not found in the DOM');
            }

            if (showPasswordCheckbox) {
                showPasswordCheckbox.addEventListener('change', function() {
                    const passwordInput = document.getElementById('password');
                    passwordInput.type = this.checked ? 'text' : 'password';
                    const passwordConfirm = document.getElementById('confirm-password');
                    passwordConfirm.type = this.checked ? 'text' : 'password';
                });
            }
        } else {
            const form = document.getElementById('signup-form');
            const showPasswordCheckbox = document.getElementById('show-password-signup');

            if (form) {
                form.addEventListener('submit', this.handleSignUp.bind(this));
            } else {
                console.error('Signup form not found in the DOM');
            }

            if (showPasswordCheckbox) {
                showPasswordCheckbox.addEventListener('change', function() {
                    const passwordInput = document.getElementById('password');
                    const confirmPasswordInput = document.getElementById('confirm-password');

                    passwordInput.type = this.checked ? 'text' : 'password';
                    confirmPasswordInput.type = this.checked ? 'text' : 'password';
                });
            }

            // Add password confirmation validation
            const passwordInput = document.getElementById('password');
            const confirmPasswordInput = document.getElementById('confirm-password');
            const passwordMatchMessage = document.getElementById('password-match-message');

            if (passwordInput && confirmPasswordInput && passwordMatchMessage) {
                const updatePasswordMatchMessage = function() {
                    if (!confirmPasswordInput.value) {
                        // If confirm password is empty, don't show any message
                        passwordMatchMessage.textContent = '';
                        passwordMatchMessage.className = 'password-feedback';
                        confirmPasswordInput.setCustomValidity('');
                        return;
                    }

                    if (passwordInput.value === confirmPasswordInput.value) {
                        passwordMatchMessage.textContent = 'Passwords match';
                        passwordMatchMessage.className = 'password-feedback match';
                        confirmPasswordInput.setCustomValidity('');
                    } else {
                        passwordMatchMessage.textContent = 'Passwords do not match';
                        passwordMatchMessage.className = 'password-feedback no-match';
                        confirmPasswordInput.setCustomValidity('Passwords do not match');
                    }
                };

                confirmPasswordInput.addEventListener('input', updatePasswordMatchMessage);
                passwordInput.addEventListener('input', updatePasswordMatchMessage);
            }
        }
    }

    handleSignIn(event) {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const messageElement = document.getElementById('signin-message');

        // Debug: Log login attempt
        console.log('Login attempt:', { email, password: password.replace(/./g, '*') });

        if (!messageElement) {
            console.error('Signin message element not found');
            return;
        }

        // Show loading state
        messageElement.textContent = 'Signing in...';
        messageElement.className = 'auth-message info';

        // Add loading class to button
        const submitButton = document.querySelector('#signin-form button[type="submit"]');
        if (submitButton) {
            submitButton.classList.add('loading');
            submitButton.innerHTML = '<span>Signing in</span>';
        }

        // Send the request with email and password to match backend expectations
        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        })
        .then(response => {
            // Debug: Log response status
            console.log('Login response status:', response.status);

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Invalid email or password');
                }
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Debug: Log response data
            console.log('Login response data:', data);

            messageElement.textContent = data.message || 'Login successful';
            messageElement.className = data.success ? 'auth-message success' : 'auth-message error';

            // Remove loading state from button
            const submitButton = document.querySelector('#signin-form button[type="submit"]');
            if (submitButton) {
                submitButton.classList.remove('loading');
                submitButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            }

            if (data.success) {
                // Store user data in localStorage
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('userEmail', email);
                if (data.nickname) {
                    localStorage.setItem('userName', data.nickname);
                }

                // Update auth state with user data
                AuthService.setAuthState(true, {
                    id: data.userId,
                    email: email,
                    nickname: data.nickname
                });

                // Force a full page reload instead of using navigation
                setTimeout(() => {
                    window.location.href = '/';
                }, 500);
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            messageElement.textContent = error.message || 'An error occurred during sign in. Please try again.';
            messageElement.className = 'auth-message error';

            // Remove loading state from button
            const submitButton = document.querySelector('#signin-form button[type="submit"]');
            if (submitButton) {
                submitButton.classList.remove('loading');
                submitButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            }
        });
    }

    handleSignUp(event) {
        event.preventDefault();
        const messageElement = document.getElementById('signup-message');

        if (!messageElement) {
            console.error('Signup message element not found');
            return;
        }

        // Validate passwords match
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            messageElement.textContent = 'Passwords do not match';
            messageElement.className = 'auth-message error';
            return;
        }

        // Show loading state
        messageElement.textContent = 'Creating account...';
        messageElement.className = 'auth-message info';

        // Add loading class to button
        const submitButton = document.querySelector('#signup-form button[type="submit"]');
        if (submitButton) {
            submitButton.classList.add('loading');
            submitButton.innerHTML = '<span>Creating account</span>';
        }

        const userData = {
            nickname: document.getElementById('nickname').value,
            age: parseInt(document.getElementById('age').value),
            gender: document.getElementById('gender').value,
            first_name: document.getElementById('firstName').value,
            last_name: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            password: password,
        };

        // Debug: Log registration data
        console.log('Registration data:', {
            ...userData,
            password: userData.password.replace(/./g, '*')
        });

        fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        })
        .then(response => {
            // Debug: Log response status
            console.log('Registration response status:', response.status);

            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || `HTTP error! Status: ${response.status}`);
                }).catch(err => {
                    // If response is not JSON, handle plain text error
                    if (err.name === 'SyntaxError') {
                        return response.text().then(text => {
                            throw new Error(text || `HTTP error! Status: ${response.status}`);
                        });
                    }
                    throw err;
                });
            }
            return response.json();
        })
        .then(data => {
            // Debug: Log response data
            console.log('Registration response data:', data);

            messageElement.textContent = data.message || 'Registration successful';
            messageElement.className = data.success ? 'auth-message success' : 'auth-message error';

            // Remove loading state from button
            const submitButton = document.querySelector('#signup-form button[type="submit"]');
            if (submitButton) {
                submitButton.classList.remove('loading');
                submitButton.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
            }

            if (data.success) {
                // Redirect to signin page after successful registration
                setTimeout(() => {
                    // Use window.location for navigation instead of window.navigation
                    window.location.href = '/signin';
                }, 1500);
            }
        })
        .catch(error => {
            console.error('Registration error:', error);
            messageElement.textContent = error.message || 'An error occurred during registration. Please try again.';
            messageElement.className = 'auth-message error';

            // Remove loading state from button
            const submitButton = document.querySelector('#signup-form button[type="submit"]');
            if (submitButton) {
                submitButton.classList.remove('loading');
                submitButton.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
            }
        });
    }
}

// Export the component
export default AuthComponent;
