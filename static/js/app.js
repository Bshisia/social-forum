// Import authentication service 
import AuthService from './services/auth-service.js'; 
import AuthComponent from './components/authentication/auth.js'; 

// Import other components as needed
import NavbarComponent from './components/navbar/navbar.js';
// Uncomment these as you implement them
import PostsComponent from './components/posts/posts.js';
import SinglePostComponent from './components/posts/post.js';
import CreatePostComponent from './components/posts/create_post.js';
import EditPostComponent from './components/posts/edit_post.js';
import ProfileComponent from './components/profile/profile.js';
//import NotificationsComponent from './components/notifications/notifications.js';
import FilterNavComponent from './components/filters/filters_nav.js';
import UsersNavComponent from './components/users/users_nav.js';

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
            
            loadSinglePost(id);
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

// Initialize UI with user data
function initializeUI() {
    const currentUser = AuthService.getCurrentUser();
    
    if (!currentUser) {
        console.error('No current user found');
        window.navigation.navigateTo('/signin');
        return;
    }
    
    // Initialize navbar if element exists
    const navbarElement = document.getElementById('navbar');
    if (navbarElement) {
        try {
            const navbar = new NavbarComponent( 
                true, // isLoggedIn
                currentUser.id, 
                0 // unreadCount - default to 0
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
}

// Initialize optional components if they exist
function initializeOptionalComponents() {
    // Only try to load users if we're logged in
    if (!AuthService.getCurrentUser()) {
        return;
    }
    
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
                    const usersNav = new UsersNavComponent(usersData); 
                    usersNav.mount();
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
                    usersNav.mount();
                } catch (error) {
                    console.error('Error mounting users nav with mock data:', error);
                }
            });
    }
}

// Load users with better error handling
function loadUsers() {
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

// Show proper empty state or posts list (replacing showPostsPlaceholder)
function showProperPostsState(posts) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    if (!posts || posts.length === 0) {
        mainContent.innerHTML = `
            <div class="posts-container">
                <h1>Posts</h1>
                <div class="no-posts-message">
                    <i class="fas fa-info-circle"></i>
                    <p>No posts available yet. Be the first to create a post!</p>
                    <button onclick="window.navigation.navigateTo('/create')" class="btn btn-primary mt-3">
                        <i class="fas fa-plus"></i> Create Post
                    </button>
                </div>
            </div>
        `;
    } else {
        let postsHtml = `
            <div class="posts-container">
                <h1>Posts</h1>
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
                <div class="post-card" data-post-id="${postId}">
                    <h3 class="post-title">${title}</h3>
                    <p class="post-excerpt">${contentPreview}</p>
                    <div class="post-footer">
                        <span class="post-author">By: ${author}</span>
                        <button onclick="window.navigation.navigateTo('/?id=${postId}')" class="btn btn-sm">
                            Read More
                        </button>
                    </div>
                </div>
            `;
        });
        
        postsHtml += `
                </div>
                <div class="create-post-button-container">
                    <button onclick="window.navigation.navigateTo('/create')" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Create New Post
                    </button>
                </div>
            </div>
        `;
        
        mainContent.innerHTML = postsHtml;
    }
}

function loadSinglePost(postId) { 
    console.log('Loading single post:', postId);
    
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
                // If API not implemented yet or returns error, show placeholder with mock data
                console.warn(`Error loading post: ${response.status}`);
                return { 
                    post: { 
                        id: postId, 
                        title: 'Sample Post', 
                        content: 'This is a placeholder for post content since the API returned an error.',
                        author: 'System',
                        created_at: new Date().toISOString()
                    },
                    comments: [
                        {
                            id: 1,
                            content: "This is a sample comment.",
                            author: "User1",
                            created_at: new Date().toISOString()
                        }
                    ]
                };
            }
            return response.json();
        }) 
        .then(data => { 
            console.log('Post data received:', data);
            
            // Handle missing data
            const post = data.post || { id: postId, title: 'Post not found', content: 'The requested post could not be loaded.' };
            const comments = Array.isArray(data.comments) ? data.comments : [];
            
            if (typeof SinglePostComponent === 'function') {
                const singlePost = new SinglePostComponent(postId); 
                singlePost.post = post; 
                singlePost.comments = comments; 
                singlePost.mount(); 
            } else {
                // Show placeholder if component not available
                showSinglePostPlaceholder(post, comments);
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
                        <div class="mt-3">
                            <button onclick="window.navigation.navigateTo('/')" class="btn btn-outline mr-2">
                                <i class="fas fa-arrow-left"></i> Back to Posts
                            </button>
                            <button onclick="window.navigation.reloadPage()" class="btn btn-primary">
                                <i class="fas fa-sync"></i> Retry
                            </button>
                        </div>
                    </div>`; 
            }
        }); 
} 

// Show placeholder for single post when component not available
function showSinglePostPlaceholder(post, comments) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    let html = `
        <div class="single-post-container">
            <div class="post-header">
                <h1>${post.title || 'Untitled Post'}</h1>
                <div class="post-meta">
                    <span>By: ${post.author || 'Anonymous'}</span>
                    <span>Posted: ${post.created_at || 'Unknown date'}</span>
                </div>
            </div>
            <div class="post-content">
                ${post.content || 'No content available'}
            </div>
            <div class="post-actions">
                <button onclick="window.navigation.navigateTo('/')" class="btn btn-outline">
                    <i class="fas fa-arrow-left"></i> Back to Posts
                </button>
            </div>
            <div class="comments-section">
                <h3>Comments (${comments.length})</h3>
    `;
    
    if (comments.length === 0) {
        html += `
                <div class="no-comments-message">
                    <p>No comments yet. Be the first to comment!</p>
                </div>
        `;
    } else {
        html += `<div class="comments-list">`;
        comments.forEach(comment => {
            html += `
                <div class="comment-card">
                    <div class="comment-header">
                        <span class="comment-author">${comment.author || 'Anonymous'}</span>
                        <span class="comment-date">${comment.created_at || 'Unknown date'}</span>
                    </div>
                    <div class="comment-content">
                        ${comment.content || 'No content'}
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    html += `
                <div class="comment-form">
                    <h4>Add a Comment</h4>
                    <textarea placeholder="Write your comment here..." rows="3"></textarea>
                    <button class="btn btn-primary mt-2">Submit Comment</button>
                </div>
            </div>
        </div>
    `;
    
    mainContent.innerHTML = html;
}

function getPostIdFromUrl() { 
    const urlParams = new URLSearchParams(window.location.search); 
    return urlParams.get('id'); 
}

// Add helper method to AuthService to set auth state from outside
AuthService.setAuthState = function(isAuth, user) {
    this.isAuthenticated = isAuth;
    this.currentUser = user;
    
    // Also set window variables for backward compatibility
    window.isAuthenticated = isAuth;
    window.isLoggedIn = isAuth;
    window.currentUserID = user ? user.id : null;
    window.currentUser = user;
};

// Export any functions that need to be accessed from other modules
export {
    loadPosts,
    loadSinglePost,
    getPostIdFromUrl,
    handleRoute
};
