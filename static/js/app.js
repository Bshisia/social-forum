// Import authentication service 
import AuthService from './services/auth-service.js'; 
import AuthComponent from './components/authentication/auth.js'; 

// Navigation helper
window.navigation = { 
    navigateTo: (path, data = null) => { 
        if (path === window.location.pathname + window.location.search) { 
            // Don't push new state if URL hasn't changed 
            handleRoute(); 
            return; 
        } 
        window.history.pushState(data, '', path); 
        handleRoute(); 
    }, 
    reloadPage: () => { 
        handleRoute(); // Just re-handle current route instead of navigating 
    } 
}; 

// Check if current path is an auth page
function isAuthPage(path) {
    return path === '/signin' || path === '/signup';
}

// Router configuration 
const router = { 
    '/': () => { 
        // Check authentication before showing home page 
        AuthService.checkAuthState().then(isAuth => { 
            if (!isAuth) { 
                window.navigation.navigateTo('/signin'); 
                return; 
            } 
            
            // Load posts 
            loadPosts(); 
        }); 
    }, 
    '/create': () => { 
        // Check authentication before showing create post page 
        AuthService.checkAuthState().then(isAuth => { 
            if (!isAuth) { 
                window.navigation.navigateTo('/signin'); 
                return; 
            } 
            
            if (typeof CreatePostComponent === 'function') {
                const createPost = new CreatePostComponent(); 
                createPost.mount(); 
            } else {
                console.error('CreatePostComponent is not defined');
                document.getElementById('main-content').innerHTML = '<h1>Create Post</h1><p>Component not available</p>';
            }
        }); 
    }, 
    '/edit-post': (id) => { 
        // Check authentication before showing edit post page 
        AuthService.checkAuthState().then(isAuth => { 
            if (!isAuth) { 
                window.navigation.navigateTo('/signin'); 
                return; 
            } 
            
            if (!id) { 
                window.navigation.navigateTo('/'); 
                return; 
            }
            
            if (typeof EditPostComponent === 'function') {
                const editPost = new EditPostComponent(id); 
                editPost.mount(); 
            } else {
                console.error('EditPostComponent is not defined');
                document.getElementById('main-content').innerHTML = '<h1>Edit Post</h1><p>Component not available</p>';
            }
        }); 
    }, 
    'post': (id) => { 
        // Check authentication before showing single post 
        AuthService.checkAuthState().then(isAuth => { 
            if (!isAuth) { 
                window.navigation.navigateTo('/signin'); 
                return; 
            } 
            
            if (typeof SinglePostComponent === 'function') {
                const singlePost = new SinglePostComponent(id); 
                singlePost.mount(); 
            } else {
                console.error('SinglePostComponent is not defined');
                document.getElementById('main-content').innerHTML = '<h1>View Post</h1><p>Component not available</p>';
            }
        }); 
    }, 
    '/profile': (id) => { 
        // Check authentication before showing profile 
        AuthService.checkAuthState().then(isAuth => { 
            if (!isAuth) { 
                window.navigation.navigateTo('/signin'); 
                return; 
            } 
            
            const currentUser = AuthService.getCurrentUser(); 
            const profileId = id || (currentUser ? currentUser.id : null); 
            
            if (!profileId) { 
                window.navigation.navigateTo('/'); 
                return; 
            } 
            
            if (typeof ProfileComponent === 'function') {
                const profile = new ProfileComponent(profileId); 
                profile.mount(); 
            } else {
                console.error('ProfileComponent is not defined');
                document.getElementById('main-content').innerHTML = '<h1>Profile</h1><p>Component not available</p>';
            }
        }); 
    }, 
    '/signin': () => { 
        // If already authenticated, redirect to home 
        AuthService.checkAuthState().then(isAuth => { 
            if (isAuth) { 
                window.navigation.navigateTo('/'); 
                return; 
            } 
            
            // Load auth component 
            const authComponent = new AuthComponent('signin'); 
            authComponent.mount(); 
        }); 
    }, 
    '/signup': () => { 
        // If already authenticated, redirect to home 
        AuthService.checkAuthState().then(isAuth => { 
            if (isAuth) { 
                window.navigation.navigateTo('/'); 
                return; 
            } 
            
            // Load auth component 
            const authComponent = new AuthComponent('signup'); 
            authComponent.mount(); 
        }); 
    },
    '/notifications': () => {
        // Check authentication before showing notifications
        AuthService.checkAuthState().then(isAuth => {
            if (!isAuth) {
                window.navigation.navigateTo('/signin');
                return;
            }
            
            // Load notifications component if it exists
            if (typeof NotificationsComponent === 'function') {
                const notifications = new NotificationsComponent();
                notifications.mount();
            } else {
                // Fallback if component doesn't exist
                document.getElementById('main-content').innerHTML = '<h1>Notifications</h1><p>Your notifications will appear here.</p>';
            }
        });
    }
}; 

function handleRoute() { 
    const path = window.location.pathname; 
    const search = window.location.search; 
    const urlParams = new URLSearchParams(search); 
    const userId = urlParams.get('id'); 
    const postId = urlParams.get('id'); 

    // Check if we're on an auth page
    const authPage = isAuthPage(path);
    
    // Show/hide navigation elements based on page type
    toggleNavigationElements(!authPage);

    // Handle profile path 
    if (path === '/profile') { 
        router['/profile'](userId); 
        return; 
    } 

    // Handle edit-post path 
    if (path === '/edit-post') { 
        if (!postId) { 
            window.navigation.navigateTo('/'); 
            return; 
        } 
        router['/edit-post'](postId); 
        return; 
    }

    // Handle notifications path
    if (path === '/notifications') {
        router['/notifications']();
        return;
    }

    // Check for single post view 
    if (path === '/' && postId) { 
        router.post(postId); 
        return; 
    } 

    // Handle signin and signup routes 
    if (path === '/signin' || path === '/signup') { 
        const route = router[path]; 
        if (route) { 
            route(); 
            return; 
        } 
    } 

    // Handle other routes with authentication check 
    const route = router[path]; 
    if (route) { 
        route(); 
        return; 
    } 

    // Default route 
    router['/'](); 
}

// Toggle navigation elements based on page type
function toggleNavigationElements(show) {
    // Get navigation elements
    const navbarElement = document.getElementById('navbar');
    const filterNavElement = document.getElementById('filter-nav');
    const usersNavElement = document.getElementById('users-nav');
    
    // Show/hide elements if they exist
    if (navbarElement) {
        navbarElement.style.display = show ? 'block' : 'none';
    }
    
    if (filterNavElement) {
        filterNavElement.style.display = show ? 'block' : 'none';
    }
    
    if (usersNavElement) {
        usersNavElement.style.display = show ? 'block' : 'none';
    }
}

// Handle browser back/forward navigation
window.addEventListener('popstate', () => { 
    handleRoute(); 
}); 

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {    
    // First check if we're on an auth page
    const currentPath = window.location.pathname;
    const isOnAuthPage = isAuthPage(currentPath);
    
    // If on auth page, handle route directly without loading navigation
    if (isOnAuthPage) {
        handleRoute();
        return;
    }
    
    // For non-auth pages, initialize navigation and components
    initializeApp();
}); 

// Initialize app with navigation and components
function initializeApp() {
    // Get user status first
    fetch('/api/user-status')
        .catch(() => ({ 
            json: () => ({ 
                isLoggedIn: false, 
                currentUserID: null, 
                unreadCount: 0 
            }) 
        }))
        .then(response => response.json())
        .then(statusData => {
            // Set global auth state 
            window.isLoggedIn = statusData.isLoggedIn; 
            window.currentUserID = statusData.currentUserID; 
            
            if (statusData.isLoggedIn) { 
                // Update AuthService state
                AuthService.setAuthState(true, {
                    id: statusData.currentUserID,
                    email: statusData.email || '',
                    nickname: statusData.nickname || ''
                });
                
                // Store in localStorage for future checks 
                localStorage.setItem('userId', statusData.currentUserID); 
                if (statusData.email) localStorage.setItem('userEmail', statusData.email); 
                if (statusData.nickname) localStorage.setItem('userName', statusData.nickname); 
            }
            
            // Initialize navbar if element exists and we're not on an auth page
            const navbarElement = document.getElementById('navbar');
            if (navbarElement && typeof NavbarComponent === 'function') {
                const navbar = new NavbarComponent( 
                    statusData.isLoggedIn, 
                    statusData.currentUserID, 
                    statusData.unreadCount 
                ); 
                navbar.mount(navbarElement); 
            }
            
            // Try to initialize other components if they exist
            initializeOptionalComponents();
            
            // Handle the route
            handleRoute();
        })
        .catch(error => {
            console.error('Error initializing application:', error);
            showErrorMessage();
        });
}

// Initialize optional components if they exist
function initializeOptionalComponents() {
    // Try to load users for the users nav
    fetch('/api/users')
        .then(response => response.json())
        .catch(() => [])
        .then(usersData => {
            // Initialize filter nav if element exists
            const filterNavElement = document.getElementById('filter-nav');
            if (filterNavElement && typeof FilterNavComponent === 'function') {
                const filterNav = new FilterNavComponent(); 
                filterNav.mount(filterNavElement); 
            }

            // Initialize users nav if element exists
            const usersNavElement = document.getElementById('users-nav');
            if (usersNavElement && typeof UsersNavComponent === 'function' && Array.isArray(usersData)) {
                const usersNav = new UsersNavComponent(usersData); 
                usersNav.mount(usersNavElement); 
            }
        })
        .catch(error => {
            console.error('Error initializing optional components:', error);
        });
}

// Show error message in main content
function showErrorMessage() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="error-container">
                <h1>Application Error</h1>
                <p>There was a problem loading the application. Please try refreshing the page.</p>
                <button onclick="window.location.reload()">Refresh Page</button>
            </div>
        `;
    }
}

function loadPosts() { 
    console.log('Loading posts...'); 
    fetch('/api/posts') 
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        }) 
        .then(postsData => {
            console.log('Posts received:', postsData); 
            if (typeof PostsComponent === 'function') {
                const postsComponent = new PostsComponent();
                postsComponent.posts = postsData; 
                postsComponent.isLoggedIn = window.isLoggedIn;
                postsComponent.currentUserID = window.currentUserID; 
                postsComponent.mount(); 
            } else {
                console.error('PostsComponent is not defined');
                document.getElementById('main-content').innerHTML = '<h1>Posts</h1><p>Component not available</p>';
            }
        }) 
        .catch(error => { 
            console.error('Error loading posts:', error); 
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.innerHTML = ` 
                    <div class="no-posts-message"> 
                        <i class="fas fa-exclamation-circle"></i> 
                        <p>Error loading posts. Please try again later.</p> 
                    </div>`; 
            }
        }); 
} 

function loadSinglePost(postId) { 
    console.log('Loading single post:', postId);
    fetch(`/api/posts/single?id=${postId}`) 
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        }) 
        .then(data => { 
            console.log('Post data received:', data);
            if (typeof SinglePostComponent === 'function') {
                const singlePost = new SinglePostComponent(postId); 
                singlePost.post = data.post; 
                singlePost.comments = data.comments; 
                singlePost.mount(); 
            } else {
                console.error('SinglePostComponent is not defined');
                document.getElementById('main-content').innerHTML = '<h1>Post</h1><p>Component not available</p>';
            }
        }) 
        .catch(error => { 
            console.error('Error loading post:', error); 
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.innerHTML = ` 
                    <div class="error-message"> 
                        <i class="fas fa-exclamation-circle"></i> 
                        <p>Error loading post. The post may not exist or you may not have permission to view it.</p> 
                    </div>`; 
            }
        }); 
} 

function getPostIdFromUrl() { 
    const urlParams = new URLSearchParams(window.location.search); 
    return urlParams.get('id'); 
}

// Add helper method to AuthService to set auth state from outside
AuthService.setAuthState = function(isAuth, user) {
    window.isAuthenticated = isAuth;
    window.currentUser = user;
};

// Export any functions that need to be accessed from other modules
export {
    loadPosts,
    loadSinglePost,
    getPostIdFromUrl,
    handleRoute
};