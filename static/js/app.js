// Import authentication service 
import AuthService from './services/auth-service.js'; 
import AuthComponent from './components/authentication/auth.js'; 
import navigationHelper from './services/navigation-helper.js';

import NavbarComponent from './components/navbar/navbar.js';
import PostsComponent from './components/posts/posts.js';
import SinglePostComponent from './components/posts/single_post.js';
import CreatePostComponent from './components/posts/create_post.js';
import EditPostComponent from './components/posts/edit_post.js';
import ProfileComponent from './components/profile/profile.js';
//import NotificationsComponent from './components/notifications/notifications.js';
import FilterNavComponent from './components/filters/filters_nav.js';
import UsersNavComponent from './components/users/users_nav.js';
import ChatComponent from './components/chat/chat.js';

// Export functions for external use
export {
    loadPosts,
    loadSinglePost,
    loadCategoryPosts,
    loadCreatedPosts,
    loadLikedPosts,
    loadCommentedPosts,
    getPostIdFromUrl,
    handleRoute,
    handlePostClick
};

// Function to reset layout before navigation
function resetLayout() {
    console.log('Resetting layout');
    
    // Clean up navigation helper
    navigationHelper.cleanUp();
    
    // Reset the main content area
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        `;
    }
    
    // Make sure sidebars are in their proper place
    const filterNav = document.getElementById('filter-nav');
    const usersNav = document.getElementById('users-nav');
    
    // Reset filter nav position and display
    if (filterNav) {
        filterNav.style.position = '';
        filterNav.style.left = '';
        filterNav.style.top = '';
        filterNav.style.width = '';
        filterNav.style.zIndex = '';
    }
    
    // Reset users nav position and display
    if (usersNav) {
        usersNav.style.position = '';
        usersNav.style.right = '';
        usersNav.style.top = '';
        usersNav.style.width = '';
        usersNav.style.zIndex = '';
    }
    
    // Reset any other layout issues
    document.body.style.overflow = '';
}
// Navigation helper
window.navigation = { 
    navigateTo: (path, data = null) => { 
        console.log(`Navigation: navigating to ${path}`);
        
        if (path === window.location.pathname + window.location.search) { 
            // Don't push new state if URL hasn't changed 
            resetLayout(); // Still reset layout
            handleRoute(); 
            return; 
        } 
        
        // Reset layout before navigation
        resetLayout();
        
        window.history.pushState(data, '', path); 
        handleRoute(); 
    }, 
    reloadPage: () => { 
        console.log('Navigation: reloading page');
        
        // Reset layout before reloading
        resetLayout();
        
        handleRoute(); // Re-handle current route instead of navigating 
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
    '/category': (categoryName) => {
        // Check authentication before showing category posts
        AuthService.checkAuthState().then(isAuth => {
            if (!isAuth) {
                window.navigation.navigateTo('/signin');
                return;
            }
            
            if (!categoryName) {
                window.navigation.navigateTo('/');
                return;
            }
            
            // Load posts for the selected category
            loadCategoryPosts(categoryName);
        });
    },
    '/created': () => {
    // Check authentication before showing created posts
    AuthService.checkAuthState().then(isAuth => {
        if (!isAuth) {
            window.navigation.navigateTo('/signin');
            return;
        }
        
        // Get user ID from query parameter if present
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user_id');
        
        // Load posts created by the specified user or current user
        loadCreatedPosts(userId);
    });
},

'/liked': () => {
    // Check authentication before showing liked posts
    AuthService.checkAuthState().then(isAuth => {
        if (!isAuth) {
            window.navigation.navigateTo('/signin');
            return;
        }
        
        // Get user ID from query parameter if present
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user_id');
        
        // Load posts liked by the specified user or current user
        loadLikedPosts(userId);
    });
},

'/commented': () => {
    // Check authentication before showing commented posts
    AuthService.checkAuthState().then(isAuth => {
        if (!isAuth) {
            window.navigation.navigateTo('/signin');
            return;
        }
        
        // Get user ID from query parameter if present
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user_id');
        
        // Load posts commented on by the specified user or current user
        loadCommentedPosts(userId);
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
            
            // Register with navigation helper
            navigationHelper.setCurrentComponent(createPost);
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
            
            loadSinglePost(id);
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
    },
    '/chat': () => {
        const mainContent = document.getElementById('main-content');
        const chatComponent = new ChatComponent(mainContent);
        chatComponent.mount();
    }
}; 

function handleRoute() { 
    const path = window.location.pathname; 
    const search = window.location.search; 
    const urlParams = new URLSearchParams(search); 
    const userId = urlParams.get('id'); 
    const postId = urlParams.get('id'); 
    const categoryName = urlParams.get('name');

    console.log(`Handling route: ${path}${search}`);

    // Check if we're on an auth page
    const authPage = isAuthPage(path);
    
    // Show/hide navigation elements based on page type
    toggleNavigationElements(!authPage);

    // Handle profile path with query parameter
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

    // Handle category path
    if (path === '/category') {
        if (!categoryName) {
            window.navigation.navigateTo('/');
            return;
        }
        router['/category'](categoryName);
        return;
    }
    
    // Handle created posts path
    if (path === '/created') {
        router['/created']();
        return;
    }
    
    // Handle liked posts path
    if (path === '/liked') {
        router['/liked']();
        return;
    }
    
    // Handle commented posts path
    if (path === '/commented') {
        router['/commented']();
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
window.addEventListener('popstate', (event) => { 
    console.log('Navigation: popstate event triggered');
    
    // Try to handle with navigation helper first
    const handled = navigationHelper.handleBack();
    
    if (!handled) {
        // If not handled by navigation helper, reset layout and handle route
        resetLayout();
        handleRoute(); 
    }
});

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {    
    // First check if we're on an auth page
    const currentPath = window.location.pathname;
    const isOnAuthPage = isAuthPage(currentPath);
    
    // Check if user is authenticated
    AuthService.checkAuthState().then(isAuth => {
        if (isOnAuthPage) {
            // If on auth page and already authenticated, redirect to home
            if (isAuth) {
                window.navigation.navigateTo('/');
                return;
            }
            
            // Otherwise, handle the auth route
            const route = router[currentPath];
            if (route) {
                route();
            } else {
                // If route not found, redirect to signin
                window.navigation.navigateTo('/signin');
            }
        } else {
            // For non-auth pages
            if (!isAuth) {
                // If not authenticated, redirect to signin
                window.navigation.navigateTo('/signin');
                return;
            }
            
            // Initialize UI with user data
            initializeUI();
        }
    });
}); 

// Make initializeUI function global so it can be called from auth component
window.initializeUI = function() {
    const currentUser = AuthService.getCurrentUser();
    
    if (!currentUser) {
        console.error('No current user found');
        window.navigation.navigateTo('/signin');
        return;
    }
    
    console.log('Initializing UI with user data:', currentUser);
    
    // Initialize navbar if element exists
    const navbarElement = document.getElementById('navbar');
    if (navbarElement) {
        try {
            const navbar = new NavbarComponent( 
                true, // isLoggedIn
                currentUser.id,
                0, // unreadCount - default to 0
                currentUser.nickname // Pass nickname to navbar
            ); 
            navbar.mount(navbarElement);
        } catch (error) {
            console.error('Error mounting navbar:', error);
        }
    }
    
    // Try to initialize other components
    initializeOptionalComponents();
    
    // Handle the current route
    handleRoute();
};

// Initialize optional components if they exist
function initializeOptionalComponents() {
    // Only try to load users if we're logged in
    if (!AuthService.getCurrentUser()) {
        return;
    }
    
    console.log('Initializing optional components');
    
    // Initialize filter nav if component exists
    const filterNavElement = document.getElementById('filter-nav');
    if (filterNavElement && typeof FilterNavComponent === 'function') {
        try {
            const filterNav = new FilterNavComponent(); 
            filterNav.mount(filterNavElement);
        } catch (error) {
            console.error('Error mounting filter nav:', error);
        }
    }
    
    // Initialize users nav with mock data if API fails
    const usersNavElement = document.getElementById('users-nav');
    if (usersNavElement && typeof UsersNavComponent === 'function') {
        // First try to load real users
        loadUsers()
            .then(usersData => {
                try {
                    console.log('Users data loaded:', usersData);
                    const usersNav = new UsersNavComponent(usersData); 
                    usersNav.mount(usersNavElement);
                } catch (error) {
                    console.error('Error mounting users nav:', error);
                }
            })
            .catch(error => {
                console.error('Error loading users:', error);
                // Use mock data if API fails
                const mockUsers = [
                    { ID: '1', UserName: 'User1', ProfilePic: '' },
                    { ID: '2', UserName: 'User2', ProfilePic: '' }
                ];
                try {
                    const usersNav = new UsersNavComponent(mockUsers);
                    usersNav.mount(usersNavElement);
                } catch (error) {
                    console.error('Error mounting users nav with mock data:', error);
                }
            });
    }
}

// Improved loadUsers function with better error handling
function loadUsers() {
    console.log('Loading users...');
    return new Promise((resolve, reject) => {
        fetch('/api/users', {
            credentials: 'include' // Include cookies for auth
        })
            .then(response => {
                if (!response.ok) {
                    // If we get a 500 error, reject the promise
                    console.warn(`Error loading users: ${response.status}`);
                    reject(new Error(`Failed to load users: ${response.status}`));
                    return null;
                }
                return response.json();
            })
            .then(data => {
                if (data) {
                    console.log('Users data received:', data);
                    resolve(Array.isArray(data) ? data : []);
                }
            })
            .catch(error => {
                console.error('Error fetching users:', error);
                reject(error);
            });
    });
}

function loadPosts() { 
    console.log('Loading posts...'); 
    
    // Show loading state
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading posts...</p>
            </div>
        `;
    }
    
    fetch('/api/posts', {
        credentials: 'include' // Include cookies for auth
    }) 
        .then(response => {
            if (!response.ok) {
                // Don't show placeholders, show error instead
                throw new Error(`Failed to load posts: ${response.status}`);
            }
            return response.json();
        }) 
        .then(postsData => {
            console.log('Posts received:', postsData); 
            
            // Handle empty posts array or null data
            // Always ensure we have an array, even if empty
            const posts = Array.isArray(postsData) ? postsData : 
                        (postsData && postsData.posts && Array.isArray(postsData.posts)) ? postsData.posts : [];
            
            if (typeof PostsComponent === 'function') {
                const postsComponent = new PostsComponent();
                postsComponent.posts = posts; 
                postsComponent.isLoggedIn = true; // We already checked auth
                postsComponent.currentUserID = AuthService.getCurrentUser()?.id; 
                postsComponent.mount(); 
            } else {
                // Show proper empty state or posts list
                showProperPostsState(posts);
            }
        }) 
        .catch(error => { 
            console.error('Error loading posts:', error); 
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.innerHTML = ` 
                    <div class="error-message"> 
                        <i class="fas fa-exclamation-circle"></i> 
                        <p>Error loading posts: ${error.message}</p> 
                        <button onclick="window.navigation.reloadPage()" class="btn btn-primary mt-3">
                            <i class="fas fa-sync"></i> Retry
                        </button>
                    </div>`; 
            }
        }); 
} 

// Function to load posts created by the current user
function loadCreatedPosts() {
    console.log('Loading created posts...');
    
    // Show loading state
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading your created posts...</p>
            </div>
        `;
    }
    
    fetch('/api/posts/created', {
        credentials: 'include' // Include cookies for auth
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    // Unauthorized, redirect to login
                    window.navigation.navigateTo('/signin');
                    throw new Error('Please sign in to view your posts');
                }
                throw new Error(`Failed to load created posts: ${response.status}`);
            }
            return response.json();
        })
        .then(postsData => {
            console.log('Created posts received:', postsData);
            
            // Handle empty posts array or null data
            const posts = Array.isArray(postsData) ? postsData : 
                        (postsData && postsData.posts && Array.isArray(postsData.posts)) ? postsData.posts : [];
            
            if (typeof PostsComponent === 'function') {
                const postsComponent = new PostsComponent();
                postsComponent.posts = posts;
                postsComponent.isLoggedIn = true; // We already checked auth
                postsComponent.currentUserID = AuthService.getCurrentUser()?.id;
                
                // Add a title to the main content before mounting posts
                if (mainContent) {
                    mainContent.innerHTML = `
                        <h2 class="filter-title">Posts You Created</h2>
                        <div id="posts-container"></div>
                    `;
                    
                    // Mount posts to the posts container
                    postsComponent.mount(document.getElementById('posts-container'));
                } else {
                    // Fallback to mounting directly to main content
                    postsComponent.mount();
                }
                
                // Highlight the active filter in the sidebar
                highlightActiveFilter('created');
            } else {
                // Show proper empty state or posts list
                showProperPostsState(posts, 'Posts You Created');
            }
        })
        .catch(error => {
            console.error('Error loading created posts:', error);
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error loading your created posts: ${error.message}</p>
                        <div class="mt-3">
                            <button onclick="window.navigation.navigateTo('/')" class="btn btn-outline mr-2">
                                <i class="fas fa-home"></i> All Posts
                            </button>
                            <button onclick="window.navigation.reloadPage()" class="btn btn-primary">
                                <i class="fas fa-sync"></i> Retry
                            </button>
                        </div>
                    </div>`;
            }
        });
}

// Function to load posts liked by the current user
function loadLikedPosts() {
    console.log('Loading liked posts...');
    
    // Show loading state
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading posts you reacted to...</p>
            </div>
        `;
    }
    
    fetch('/api/posts/liked', {
        credentials: 'include' // Include cookies for auth
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    // Unauthorized, redirect to login
                    window.navigation.navigateTo('/signin');
                    throw new Error('Please sign in to view your liked posts');
                }
                throw new Error(`Failed to load liked posts: ${response.status}`);
            }
            return response.json();
        })
        .then(postsData => {
            console.log('Liked posts received:', postsData);
            
            // Handle empty posts array or null data
            const posts = Array.isArray(postsData) ? postsData : 
                        (postsData && postsData.posts && Array.isArray(postsData.posts)) ? postsData.posts : [];
            
            if (typeof PostsComponent === 'function') {
                const postsComponent = new PostsComponent();
                postsComponent.posts = posts;
                postsComponent.isLoggedIn = true; // We already checked auth
                postsComponent.currentUserID = AuthService.getCurrentUser()?.id;
                
                // Add a title to the main content before mounting posts
                if (mainContent) {
                    mainContent.innerHTML = `
                        <h2 class="filter-title">Posts You Reacted To</h2>
                        <div id="posts-container"></div>
                    `;
                    
                    // Mount posts to the posts container
                    postsComponent.mount(document.getElementById('posts-container'));
                } else {
                    // Fallback to mounting directly to main content
                    postsComponent.mount();
                }
                
                // Highlight the active filter in the sidebar
                highlightActiveFilter('liked');
            } else {
                // Show proper empty state or posts list
                showProperPostsState(posts, 'Posts You Reacted To');
            }
        })
        .catch(error => {
            console.error('Error loading liked posts:', error);
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error loading posts you reacted to: ${error.message}</p>
                        <div class="mt-3">
                            <button onclick="window.navigation.navigateTo('/')" class="btn btn-outline mr-2">
                                <i class="fas fa-home"></i> All Posts
                            </button>
                            <button onclick="window.navigation.reloadPage()" class="btn btn-primary">
                                <i class="fas fa-sync"></i> Retry
                            </button>
                        </div>
                    </div>`;
            }
        });
}

// Function to load posts commented on by the current user
function loadCommentedPosts() {
    console.log('Loading commented posts...');
    
    // Show loading state
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading posts you commented on...</p>
            </div>
        `;
    }
    
    fetch('/api/posts/commented', {
        credentials: 'include' // Include cookies for auth
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    // Unauthorized, redirect to login
                    window.navigation.navigateTo('/signin');
                    throw new Error('Please sign in to view your commented posts');
                }
                throw new Error(`Failed to load commented posts: ${response.status}`);
            }
            return response.json();
        })
        .then(postsData => {
            console.log('Commented posts received:', postsData);
            
            // Handle empty posts array or null data
            const posts = Array.isArray(postsData) ? postsData : 
                        (postsData && postsData.posts && Array.isArray(postsData.posts)) ? postsData.posts : [];
            
            if (typeof PostsComponent === 'function') {
                const postsComponent = new PostsComponent();
                postsComponent.posts = posts;
                postsComponent.isLoggedIn = true; // We already checked auth
                postsComponent.currentUserID = AuthService.getCurrentUser()?.id;
                
                // Add a title to the main content before mounting posts
                if (mainContent) {
                    mainContent.innerHTML = `
                        <h2 class="filter-title">Posts You Commented On</h2>
                        <div id="posts-container"></div>
                    `;
                    
                    // Mount posts to the posts container
                    postsComponent.mount(document.getElementById('posts-container'));
                } else {
                    // Fallback to mounting directly to main content
                    postsComponent.mount();
                }
                
                // Highlight the active filter in the sidebar
                highlightActiveFilter('commented');
            } else {
                // Show proper empty state or posts list
                showProperPostsState(posts, 'Posts You Commented On');
            }
        })
        .catch(error => {
            console.error('Error loading commented posts:', error);
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error loading posts you commented on: ${error.message}</p>
                        <div class="mt-3">
                            <button onclick="window.navigation.navigateTo('/')" class="btn btn-outline mr-2">
                                <i class="fas fa-home"></i> All Posts
                            </button>
                            <button onclick="window.navigation.reloadPage()" class="btn btn-primary">
                                <i class="fas fa-sync"></i> Retry
                            </button>
                        </div>
                    </div>`;
            }
        });
}

// Helper function to highlight active filter in the sidebar
function highlightActiveFilter(filterType) {
    const filterNav = document.getElementById('filter-nav');
    if (!filterNav || !filterNav.querySelector) return;
    
    // Remove active class from all links
    const allLinks = filterNav.querySelectorAll('.filter-link');
    allLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to the selected filter link
    if (filterType) {
        const selector = filterType === 'created' || filterType === 'liked' || filterType === 'commented' 
            ? `.filter-link[data-filter="${filterType}"]` 
            : `.filter-link[data-category="${filterType}"]`;
            
        const activeLink = filterNav.querySelector(selector);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
}

// Show proper empty state or posts list (replacing showPostsPlaceholder)
// Show proper empty state or posts list (replacing showPostsPlaceholder)
function showProperPostsState(posts, title = 'Posts') {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    if (!posts || posts.length === 0) {
        mainContent.innerHTML = `
            <div class="posts-container">
                <div class="posts-header">
                    <h1>${title}</h1>
                    <button onclick="window.navigation.navigateTo('/')" class="btn btn-outline">
                        <i class="fas fa-arrow-left"></i> All Posts
                    </button>
                </div>
                <div class="no-posts-message">
                    <i class="fas fa-info-circle"></i>
                    <p>No posts available for this filter.</p>
                    <button onclick="window.navigation.navigateTo('/create')" class="btn btn-primary mt-3">
                        <i class="fas fa-plus"></i> Create Post
                    </button>
                </div>
            </div>
        `;
    } else {
        let postsHtml = `
            <div class="posts-container">
                <div class="posts-header">
                    <h1>${title}</h1>
                    <button onclick="window.navigation.navigateTo('/')" class="btn btn-outline">
                        <i class="fas fa-arrow-left"></i> All Posts
                    </button>
                </div>
                <div class="posts-list">
        `;
        
        // Create post cards
        posts.forEach(post => {
            // Handle different field name formats that might come from the API
            const postId = post.ID || post.id;
            const title = post.Title || post.title || 'Untitled Post';
            const content = post.Content || post.content || 'No content';
            const author = post.Username || post.username || post.Author || post.author || 'Anonymous';
            
            // Ensure content is a string before using substring
            const contentStr = String(content);
            const contentPreview = contentStr.substring(0, 100) + (contentStr.length > 100 ? '...' : '');
            
            postsHtml += `
                <div class="post-card" data-post-id="${postId}" onclick="handlePostClick(event)">
                    <h3 class="post-title">${title}</h3>
                    <p class="post-excerpt">${contentPreview}</p>
                    <div class="post-footer">
                        <span class="post-author">By: ${author}</span>
                        <button class="btn btn-sm" onclick="event.stopPropagation(); handlePostClick('${postId}')">
                            Read More
                        </button>
                    </div>
                </div>
            `;
        });
        
        postsHtml += `
                </div>
                <div class="create-post-button">
                    <button onclick="window.navigation.navigateTo('/create')" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Create Post
                    </button>
                </div>
            </div>
        `;
        
        mainContent.innerHTML = postsHtml;
    }
}

// Function to load a single post
function loadSinglePost(postId) {
    console.log(`Loading single post with ID: ${postId}`);
    
    // Show loading state
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading post...</p>
            </div>
        `;
    }
    
    fetch(`/api/posts/single?id=${postId}`, {
        credentials: 'include' // Include cookies for auth
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    // Unauthorized, redirect to login
                    window.navigation.navigateTo('/signin');
                    throw new Error('Please sign in to view this post');
                }
                throw new Error(`Failed to load post: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Single post data:', data);
            
            if (!data || !data.post) {
                throw new Error('Post not found');
            }
            
            // Create and mount single post component
            if (typeof SinglePostComponent === 'function') {
                const singlePostComponent = new SinglePostComponent(postId);
                singlePostComponent.post = data.post;
                singlePostComponent.comments = data.comments || [];
                singlePostComponent.isLoggedIn = true; // We already checked auth
                singlePostComponent.currentUserID = AuthService.getCurrentUser()?.id;
                singlePostComponent.mount();
            } else {
                // Fallback if component doesn't exist
                showSinglePostFallback(data.post, data.comments || []);
            }
        })
        .catch(error => {
            console.error('Error loading single post:', error);
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error loading post: ${error.message}</p>
                        <div class="mt-3">
                            <button onclick="window.navigation.navigateTo('/')" class="btn btn-outline mr-2">
                                <i class="fas fa-home"></i> All Posts
                            </button>
                            <button onclick="window.navigation.reloadPage()" class="btn btn-primary">
                                <i class="fas fa-sync"></i> Retry
                            </button>
                        </div>
                    </div>
                `;
            }
        });
}

// Function to load posts for a specific category
function loadCategoryPosts(categoryName) {
    console.log(`Loading posts for category: ${categoryName}`);
    
    // Show loading state
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading ${categoryName} posts...</p>
            </div>
        `;
    }
    
    fetch(`/api/posts/category?name=${encodeURIComponent(categoryName)}`, {
        credentials: 'include' // Include cookies for auth
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    // Unauthorized, redirect to login
                    window.navigation.navigateTo('/signin');
                    throw new Error('Please sign in to view category posts');
                }
                throw new Error(`Failed to load category posts: ${response.status}`);
            }
            return response.json();
        })
        .then(postsData => {
            console.log('Category posts received:', postsData);
            
            // Handle empty posts array or null data
            const posts = Array.isArray(postsData) ? postsData : 
                        (postsData && postsData.posts && Array.isArray(postsData.posts)) ? postsData.posts : [];
            
            if (typeof PostsComponent === 'function') {
                const postsComponent = new PostsComponent();
                postsComponent.posts = posts;
                postsComponent.isLoggedIn = true; // We already checked auth
                postsComponent.currentUserID = AuthService.getCurrentUser()?.id;
                
                // Add a title to the main content before mounting posts
                if (mainContent) {
                    mainContent.innerHTML = `
                        <h2 class="filter-title">Category: ${categoryName}</h2>
                        <div id="posts-container"></div>
                    `;
                    
                    // Mount posts to the posts container
                    postsComponent.mount(document.getElementById('posts-container'));
                } else {
                    // Fallback to mounting directly to main content
                    postsComponent.mount();
                }
                
                // Highlight the active filter in the sidebar
                highlightActiveFilter(categoryName);
            } else {
                // Show proper empty state or posts list
                showProperPostsState(posts, `Category: ${categoryName}`);
            }
        })
        .catch(error => {
            console.error('Error loading category posts:', error);
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error loading ${categoryName} posts: ${error.message}</p>
                        <div class="mt-3">
                            <button onclick="window.navigation.navigateTo('/')" class="btn btn-outline mr-2">
                                <i class="fas fa-home"></i> All Posts
                            </button>
                            <button onclick="window.navigation.reloadPage()" class="btn btn-primary">
                                <i class="fas fa-sync"></i> Retry
                            </button>
                        </div>
                    </div>
                `;
            }
        });
}

// Fallback function to show a single post if component doesn't exist
function showSinglePostFallback(post, comments) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    // Extract post data with fallbacks
    const postId = post.ID || post.id;
    const title = post.Title || post.title || 'Untitled Post';
    const content = post.Content || post.content || 'No content';
    const author = post.Username || post.username || post.Author || post.author || 'Anonymous';
    const postDate = post.PostTime || post.postTime || post.created_at || '';
    
    let html = `
        <div class="post-container">
            <button class="back-button" onclick="window.history.back()">
                <i class="fas fa-arrow-left"></i> Back
            </button>
            
            <div class="post-card">
                <h2>${title}</h2>
                <div class="post-meta">
                    <span class="post-author">By: ${author}</span>
                    <span class="post-date">${postDate}</span>
                </div>
                <div class="post-content">
                    <p>${content}</p>
                </div>
            </div>
            
            <div class="comments-section">
                <h3>Comments (${comments.length})</h3>
                
                <form class="comment-form">
                    <textarea placeholder="Write a comment..." class="comment-input"></textarea>
                    <button type="button" class="btn btn-primary">Post Comment</button>
                </form>
                
                <div class="comments-list">
    `;
    
    if (comments.length === 0) {
        html += `<p class="no-comments">No comments yet. Be the first to comment!</p>`;
    } else {
        comments.forEach(comment => {
            const commentAuthor = comment.Username || comment.username || comment.Author || comment.author || 'Anonymous';
            const commentContent = comment.Content || comment.content || '';
            const commentDate = comment.CommentTime || comment.commentTime || comment.created_at || '';
            
            html += `
                <div class="comment">
                    <div class="comment-header">
                        <span class="comment-author">${commentAuthor}</span>
                        <span class="comment-date">${commentDate}</span>
                    </div>
                    <div class="comment-content">
                        <p>${commentContent}</p>
                    </div>
                </div>
            `;
        });
    }
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    mainContent.innerHTML = html;
}

// Function to handle post click
function handlePostClick(event) {
    let postId;
    
    if (typeof event === 'string') {
        // If called with just the ID
        postId = event;
    } else {
        // If called from a click event
        event.preventDefault();
        
        // Find the post card element
        const postCard = event.target.closest('.post-card');
        if (!postCard) return;
        
        postId = postCard.dataset.postId;
    }
    
    if (!postId) {
        console.error('No post ID found');
        return;
    }
    
    // Navigate to the post
    window.navigation.navigateTo(`/?id=${postId}`);
}

// Function to get post ID from URL
function getPostIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Add CSS for filter title
const style = document.createElement('style');
style.textContent = `
    .filter-title {
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
        color: #333;
        font-size: 1.5rem;
    }
    
    .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 50px 0;
    }
    
    .loading-spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .error-message {
        text-align: center;
        padding: 30px;
        background-color: #fff3f3;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .error-message i {
        font-size: 48px;
        color: #e74c3c;
        margin-bottom: 15px;
    }
    
    .error-message p {
        margin-bottom: 20px;
        color: #333;
    }
    
    .mt-3 {
        margin-top: 15px;
    }
    
    .mr-2 {
        margin-right: 10px;
    }
`;
document.head.appendChild(style);

class App {
    constructor() {
        this.currentComponent = null;
        this.router = {
            routes: {},
            addRoute: (path, handler) => {
                this.router.routes[path] = handler;
            }
        };
    }

    initialize() {
        // Add chat route handling
        this.router.addRoute('/chat', () => {
            this.loadChat();
        });

        // Add to your existing route handler
        this.handleRoute();
    }

    loadChat() {
        // Get main content container
        const mainContent = document.getElementById('main-content');
        if (!mainContent) {
            console.error('Main content container not found');
            return;
        }

        // Check authentication
        AuthService.checkAuthState().then(isAuth => {
            if (!isAuth) {
                window.navigation.navigateTo('/signin');
                return;
            }

            // Clear previous content
            mainContent.innerHTML = '';

            // Initialize and mount chat component
            const chat = new ChatComponent();
            this.currentComponent = chat;
            chat.mount(mainContent);
        });
    }

    handleRoute() {
        const path = window.location.pathname;
        const handler = this.router.routes[path];

        if (handler) {
            handler();
        } else {
            // Handle default route
            if (path === '/chat') {
                this.loadChat();
            }
            // ... other route handling
        }
    }
}

// Add event listener for navigation
window.addEventListener('popstate', () => {
    app.handleRoute();
});

// Initialize the app
const app = new App();
app.initialize();
