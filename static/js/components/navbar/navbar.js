import AuthService from '../../services/auth-service.js';

class NavbarComponent {
    constructor(isLoggedIn, currentUserID, unreadCount, nickname = '') {
        this.isLoggedIn = isLoggedIn;
        this.currentUserID = currentUserID;
        this.unreadCount = unreadCount;
        this.nickname = nickname;
        
        // If nickname is not provided, try to get it from AuthService
        if (!this.nickname && this.isLoggedIn) {
            const currentUser = AuthService.getCurrentUser();
            if (currentUser && currentUser.nickname) {
                this.nickname = currentUser.nickname;
            }
        }
    }

    render() {
        // Get user data if logged in but no nickname
        if (this.isLoggedIn && !this.nickname) {
            const currentUser = AuthService.getCurrentUser();
            if (currentUser && currentUser.nickname) {
                this.nickname = currentUser.nickname;
            } else {
                // Fallback to a default name if no nickname is available
                this.nickname = 'User';
            }
        }
        
        const template = `
            <nav class="navbar">
                <div class="nav-container">
                    <a href="/" class="logo-link">
                        <h1 class="logo">Forum</h1>
                    </a>
                    <button class="hamburger-btn">
                        <i class="fas fa-bars"></i>
                    </button>
                    <div class="nav-right">
                        ${this.isLoggedIn ? `
                            <button id="create-post-btn" class="btn btn-primary" onclick="window.navigation.navigateTo('/create')">
                                <i class="fas fa-plus"></i> Create Post
                            </button>
                        ` : ''}
                        ${!this.isLoggedIn ? this.renderLoggedOutButtons() : this.renderLoggedInButtons()}
                        ${this.renderMobileMenu()}
                    </div>
                </div>
            </nav>`;
    
        return template;
    }

    renderLoggedOutButtons() {
        return `
            <button class="btn btn-outline" onclick="window.navigation.navigateTo('/signin')">
                <i class="fas fa-sign-in-alt"></i> Login
            </button>
            <button class="btn btn-primary" onclick="window.navigation.navigateTo('/signup')">
                <i class="fas fa-user-plus"></i> Sign Up
            </button>`;
    }

    renderLoggedInButtons() {
        return `
            <button class="btn btn-outline notification-btn" onclick="window.navigation.navigateTo('/notifications')">
                <i class="fas fa-bell"></i>
                ${this.unreadCount > 0 ? `<span class="notification-dot">${this.unreadCount}</span>` : ''}
            </button>
            <button class="btn btn-outline" onclick="window.navigation.navigateTo('/profile?id=${this.currentUserID}')">
                <i class="fas fa-user"></i> ${this.nickname || 'Profile'}
            </button>
            <button class="btn btn-primary" id="signout-btn">
                <i class="fas fa-sign-out-alt"></i> Sign Out
            </button>`;
    }

    renderMobileMenu() {
        return `
            <div class="mobile-menu-section">
                <button class="menu-toggle-btn">
                    Categories <i class="fas fa-chevron-down"></i>
                </button>
                <div class="mobile-menu-content">
                    <ul>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/?category=Tech')">Tech</a></li>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/?category=Programming')">Programming</a></li>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/?category=Business')">Business</a></li>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/?category=Lifestyle')">Lifestyle</a></li>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/?category=Football')">Football</a></li>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/?category=Politics')">Politics</a></li>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/?category=General%20News')">General News</a></li>
                    </ul>
                </div>
            </div>
            
            ${this.isLoggedIn ? `
            <div class="mobile-menu-section">
                <button class="menu-toggle-btn">
                    Filters <i class="fas fa-chevron-down"></i>
                </button>
                <div class="mobile-menu-content">
                    <ul>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/created')">Created Posts</a></li>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/liked')">Reacted Posts</a></li>
                        <li><a href="#" onclick="event.preventDefault(); window.navigation.navigateTo('/commented')">Commented Posts</a></li>
                    </ul>
                </div>
            </div>
            ` : ''}`;
    }

    mount(element) {
        // Add null check to prevent errors
        if (!element) {
            console.warn('Cannot mount NavbarComponent: element is null');
            return;
        }
        
        element.innerHTML = this.render();
        this.attachEventListeners();
    }

    attachEventListeners() {
        const hamburgerBtn = document.querySelector('.hamburger-btn');
        const navRight = document.querySelector('.nav-right');
        const menuToggles = document.querySelectorAll('.menu-toggle-btn');
        const signoutBtn = document.getElementById('signout-btn');

        if (hamburgerBtn && navRight) {
            hamburgerBtn.addEventListener('click', () => {
                navRight.classList.toggle('active');
            });
        }

        menuToggles.forEach(toggle => {
            if (toggle && toggle.nextElementSibling) {
                toggle.addEventListener('click', () => {
                    toggle.nextElementSibling.classList.toggle('active');
                });
            }
        });

        // Add sign out functionality
        if (signoutBtn) {
            signoutBtn.addEventListener('click', () => {
                AuthService.signOut().then(() => {
                    // Force a full page reload instead of using navigation
                    window.location.href = '/signin';
                }).catch(error => {
                    console.error('Error signing out:', error);
                });
            });
        }
        
        // Toggle icon for menu buttons
        menuToggles.forEach(toggle => {
            if (toggle && toggle.nextElementSibling) {
                toggle.addEventListener('click', (e) => {
                    const icon = e.currentTarget.querySelector('i.fas');
                    if (icon) {
                        if (toggle.nextElementSibling.classList.contains('active')) {
                            icon.classList.remove('fa-chevron-up');
                            icon.classList.add('fa-chevron-down');
                        } else {
                            icon.classList.remove('fa-chevron-down');
                            icon.classList.add('fa-chevron-up');
                        }
                    }
                });
            }
        });
    }
}

// Export the component
export default NavbarComponent;
