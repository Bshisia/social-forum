class NavbarComponent {
    constructor(isLoggedIn, currentUserID, unreadCount) {
        this.isLoggedIn = isLoggedIn;
        this.currentUserID = currentUserID;
        this.unreadCount = unreadCount;
    }

    render() {
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
                        <button id="create-post-btn" class="btn btn-primary" onclick="window.location.href='/create'">
                            <i class="fas fa-plus"></i> Create Post
                        </button>
                        ${!this.isLoggedIn ? this.renderLoggedOutButtons() : this.renderLoggedInButtons()}
                        ${this.renderMobileMenu()}
                    </div>
                </div>
            </nav>`;
    
        return template;
    }

    renderLoggedOutButtons() {
        return `
            <button class="btn btn-outline" onclick="window.location.href='/signin'">
                <i class="fas fa-sign-in-alt"></i> Login
            </button>
            <button class="btn btn-primary" onclick="window.location.href='/signup'">
                <i class="fas fa-user-plus"></i> Sign Up
            </button>`;
    }

    renderLoggedInButtons() {
        return `
            <button class="btn btn-outline notification-btn" onclick="window.location.href='/notifications'">
                <i class="fas fa-bell"></i>
                ${this.unreadCount > 0 ? `<span class="notification-dot">${this.unreadCount}</span>` : ''}
            </button>
            <button class="btn btn-outline" onclick="window.navigation.navigateTo('/profile?id=${this.currentUserID}')">
                <i class="fas fa-user"></i> Profile
            </button>
            <button class="btn btn-primary" onclick="window.location.href='/signout'">
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
                        <li><a href="/category?name=Tech">Tech</a></li>
                        <li><a href="/category?name=Programming">Programming</a></li>
                        <li><a href="/category?name=Business">Business</a></li>
                        <li><a href="/category?name=Lifestyle">Lifestyle</a></li>
                        <li><a href="/category?name=Football">Football</a></li>
                        <li><a href="/category?name=Politics">Politics</a></li>
                        <li><a href="/category?name=General%20News">General News</a></li>
                    </ul>
                </div>
            </div>`;
    }

    mount(element) {
        element.innerHTML = this.render();
        this.attachEventListeners();
    }

    attachEventListeners() {
        const hamburgerBtn = document.querySelector('.hamburger-btn');
        const navRight = document.querySelector('.nav-right');
        const menuToggles = document.querySelectorAll('.menu-toggle-btn');

        hamburgerBtn?.addEventListener('click', () => {
            navRight.classList.toggle('active');
        });

        menuToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                toggle.nextElementSibling.classList.toggle('active');
            });
        });
    }
}