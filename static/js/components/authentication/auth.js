import AuthService from "../../services/auth-service.js";

// Function to initialize UI after successful login
function initializeUI() {
  // Get current user data from AuthService
  const currentUser = AuthService.getCurrentUser();

  // Update navigation or other UI elements as needed
  console.log("Initializing UI with user data:", currentUser);

  // You can add more UI initialization logic here
  // For example, showing/hiding elements based on login status
}

class AuthComponent {
  constructor(type = "signin") {
    this.type = type; // 'signin' or 'signup'
    this.container = null;
  }

  mount(container = document.getElementById("main-content")) {
    this.container = container;
    if (!this.container) {
      console.error("Cannot mount AuthComponent: container element not found");
      return;
    }
    this.render();
    this.attachEventListeners();
  }

  render() {
    if (this.type === "signin") {
      this.renderSignIn();
    } else {
      this.renderSignUp();
    }
  }

  renderSignIn() {
    this.container.innerHTML = `
            <div class="auth-container">
                <h2>Sign In</h2>
                <form id="signin-form" class="auth-form">
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required>
                        <div class="visibility-toggle">
                            <input type="checkbox" id="show-password">
                            <label for="show-password">Show password</label>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Sign In</button>
                    </div>
                    <div id="signin-message" class="auth-message"></div>
                    <div class="auth-links">
                        <p>Don't have an account? <a href="/signup" onclick="event.preventDefault(); window.navigation.navigateTo('/signup')">Sign Up</a></p>
                    </div>
                </form>
            </div>
        `;
  }

  renderSignUp() {
    this.container.innerHTML = `
            <div class="auth-container">
                <h2>Sign Up</h2>
                <form id="signup-form" class="auth-form">
                    <div class="form-group">
                        <label for="nickname">Nickname</label><br>
                        <input type="text" id="nickname" name="nickname" required>
                    </div>
                    <div class="form-group">
                        <label for="age">Age</label><br>
                        <input type="number" id="age" name="age" min="13" max="120" required>
                    </div>
                    <div class="form-group">
                        <label for="gender">Gender</label><br>
                        <select id="gender" name="gender" required>
                            <option value="" disabled selected>Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="firstName">First Name</label><br>
                        <input type="text" id="firstName" name="firstName" required>
                    </div>
                    <div class="form-group">
                        <label for="lastName">Last Name</label><br>
                        <input type="text" id="lastName" name="lastName" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Email</label><br>
                        <input type="email" id="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label><br>
                        <input type="password" id="password" name="password" required>
                        <div class="form-group">
                        <label for="confirm-password">Confirm Password</label><br>
                        <input type="password" id="confirm-password" name="confirm-password" required>
                    </div>
                        <div class="visibility-toggle">
                            <input type="checkbox" id="show-password-signup">
                            <label for="show-password-signup">Show password</label><br>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Sign Up</button>
                    </div>
                    <div id="signup-message" class="auth-message"></div>
                    <div class="auth-links">
                        <p>Already have an account? <a href="/signin" onclick="event.preventDefault(); window.navigation.navigateTo('/signin')">Sign In</a></p>
                    </div>
                </form>
            </div>
        `;
  }

  attachEventListeners() {
    if (this.type === "signin") {
      const form = document.getElementById("signin-form");
      const showPasswordCheckbox = document.getElementById("show-password");

      if (form) {
        form.addEventListener("submit", this.handleSignIn.bind(this));
      } else {
        console.error("Signin form not found in the DOM");
      }

      if (showPasswordCheckbox) {
        showPasswordCheckbox.addEventListener("change", function () {
          const passwordInput = document.getElementById("password");
          passwordInput.type = this.checked ? "text" : "password";
        });
      }
    } else {
      const form = document.getElementById("signup-form");
      const showPasswordCheckbox = document.getElementById(
        "show-password-signup"
      );

      if (form) {
        form.addEventListener("submit", this.handleSignUp.bind(this));
      } else {
        console.error("Signup form not found in the DOM");
      }

      if (showPasswordCheckbox) {
        showPasswordCheckbox.addEventListener("change", function () {
          const passwordInput = document.getElementById("password");
          passwordInput.type = this.checked ? "text" : "password";
        });
      }

      // Add password confirmation validation
      const passwordInput = document.getElementById("password");
      const confirmPasswordInput = document.getElementById("confirm-password");

      if (passwordInput && confirmPasswordInput) {
        confirmPasswordInput.addEventListener("input", function () {
          if (passwordInput.value !== this.value) {
            this.setCustomValidity("Passwords do not match");
          } else {
            this.setCustomValidity("");
          }
        });

        passwordInput.addEventListener("input", function () {
          if (
            confirmPasswordInput.value &&
            confirmPasswordInput.value !== this.value
          ) {
            confirmPasswordInput.setCustomValidity("Passwords do not match");
          } else {
            confirmPasswordInput.setCustomValidity("");
          }
        });
      }
    }
  }

  handleSignIn(event) {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const messageElement = document.getElementById("signin-message");

    // Debug: Log login attempt
    console.log("Login attempt:", {
      email,
      password: password.replace(/./g, "*"),
    });

    if (!messageElement) {
      console.error("Signin message element not found");
      return;
    }

    // Show loading state
    messageElement.textContent = "Signing in...";
    messageElement.style.color = "blue";

    // Send the request with email and password to match backend expectations
    fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })
      .then((response) => {
        // Debug: Log response status
        console.log("Login response status:", response.status);

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Invalid email or password");
          }
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        // Debug: Log response data
        console.log("Login response data:", data);

        messageElement.textContent = data.message || "Login successful";
        messageElement.style.color = data.success ? "green" : "red";

        if (data.success) {
          // Store user data in localStorage
          localStorage.setItem("userId", data.userId);
          localStorage.setItem("userEmail", email);
          if (data.nickname) {
            localStorage.setItem("userName", data.nickname);
          }

          // Update auth state with user data
          AuthService.setAuthState(true, {
            id: data.userId,
            email: email,
            nickname: data.nickname,
          });

          // Initialize UI before navigating
          initializeUI();

          // Navigate to home page
          setTimeout(() => {
            window.navigation.navigateTo("/");
          }, 500);
        }
      })
      .catch((error) => {
        console.error("Login error:", error);
        messageElement.textContent =
          error.message ||
          "An error occurred during sign in. Please try again.";
        messageElement.style.color = "red";
      });
  }

  handleSignUp(event) {
    event.preventDefault();
    const messageElement = document.getElementById("signup-message");

    if (!messageElement) {
      console.error("Signup message element not found");
      return;
    }

    // Validate passwords match
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (password !== confirmPassword) {
      messageElement.textContent = "Passwords do not match";
      messageElement.style.color = "red";
      return;
    }

    // Show loading state
    messageElement.textContent = "Creating account...";
    messageElement.style.color = "blue";

    const userData = {
      nickname: document.getElementById("nickname").value,
      age: parseInt(document.getElementById("age").value),
      gender: document.getElementById("gender").value,
      first_name: document.getElementById("firstName").value,
      last_name: document.getElementById("lastName").value,
      email: document.getElementById("email").value,
      password: password,
    };

    // Debug: Log registration data
    console.log("Registration data:", {
      ...userData,
      password: userData.password.replace(/./g, "*"),
    });

    fetch("/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    })
      .then((response) => {
        // Debug: Log response status
        console.log("Registration response status:", response.status);

        if (!response.ok) {
          return response
            .json()
            .then((data) => {
              throw new Error(
                data.message || `HTTP error! Status: ${response.status}`
              );
            })
            .catch((err) => {
              // If response is not JSON, handle plain text error
              if (err.name === "SyntaxError") {
                return response.text().then((text) => {
                  throw new Error(
                    text || `HTTP error! Status: ${response.status}`
                  );
                });
              }
              throw err;
            });
        }
        return response.json();
      })
      .then((data) => {
        // Debug: Log response data
        console.log("Registration response data:", data);

        messageElement.textContent = data.message || "Registration successful";
        messageElement.style.color = data.success ? "green" : "red";

        if (data.success) {
          // Redirect to signin page after successful registration
          setTimeout(() => {
            window.navigation.navigateTo("/signin");
          }, 1500);
        }
      })
      .catch((error) => {
        console.error("Registration error:", error);
        messageElement.textContent =
          error.message ||
          "An error occurred during registration. Please try again.";
        messageElement.style.color = "red";
      });
  }
}

// Export the component
export default AuthComponent;
