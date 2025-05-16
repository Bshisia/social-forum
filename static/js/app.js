
import AuthService from './services/auth-service.js';
import AuthComponent from './components/authentication/auth.js';
import navigationHelper from './services/navigation-helper.js';
import ChatComponent from './components/chat/chat.js';

import NavbarComponent from './components/navbar/navbar.js';
import PostsComponent from './components/posts/posts.js';
import SinglePostComponent from './components/posts/single_post.js';
import CreatePostComponent from './components/posts/create_post.js';
import EditPostComponent from './components/posts/edit_post.js';
import ProfileComponent from './components/profile/profile.js';
import FilterNavComponent from './components/filters/filters_nav.js';
import UsersNavComponent from './components/users/users_nav.js';

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

function resetLayout() {
    console.log('Resetting layout');


    navigationHelper.cleanUp();


    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        `;
    }


    const filterNav = document.getElementById('filter-nav');
    const usersNav = document.getElementById('users-nav');


    if (filterNav) {
        filterNav.style.position = '';
        filterNav.style.left = '';
        filterNav.style.top = '';
        filterNav.style.width = '';
        filterNav.style.zIndex = '';
    }


    if (usersNav) {
        usersNav.style.position = '';
        usersNav.style.right = '';
        usersNav.style.top = '';
        usersNav.style.width = '';
        usersNav.style.zIndex = '';
    }


    document.body.style.overflow = '';
}
window.navigation = {
    navigateTo: (path, data = null) => {
        console.log(`Navigation: navigating to ${path}`);

        if (path === window.location.pathname + window.location.search) {
        
            resetLayout();
            handleRoute();
            return;
        }
        
        resetLayout();

        window.history.pushState(data, '', path);
        handleRoute();
    },
    reloadPage: () => {
        console.log('Navigation: reloading page');
        resetLayout();
        handleRoute();
    }
};

function isAuthPage(path) {
    return path === '/signin' || path === '/signup';
}

const router = {
    '/': () => {
    
        AuthService.checkAuthState().then(isAuth => {
            if (!isAuth) {
                window.navigation.navigateTo('/signin');
                return;
            }

        
            loadPosts();
        });
    },
    '/profile': (id) => {
    
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
    
        AuthService.checkAuthState().then(isAuth => {
            if (!isAuth) {
                window.navigation.navigateTo('/signin');
                return;
            }

            if (!categoryName) {
                window.navigation.navigateTo('/');
                return;
            }

        
            loadCategoryPosts(categoryName);
        });
    },
    '/created': () => {
    
        AuthService.checkAuthState().then(isAuth => {
            if (!isAuth) {
                window.navigation.navigateTo('/signin');
                return;
            }

        
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('user_id');

        
            loadCreatedPosts(userId);
        });
    },

    '/chat': () => {
    
        AuthService.checkAuthState().then(isAuth => {
            if (!isAuth) {
                window.navigation.navigateTo('/signin');
                return;
            }

        
            const urlParams = new URLSearchParams(window.location.search);
            const user1Id = urlParams.get('user1');
            const user2Id = urlParams.get('user2');
            const currentUser = AuthService.getCurrentUser();

        
            if (!user1Id || !user2Id) {
                window.navigation.navigateTo('/');
                return;
            }

        
            if (currentUser.id !== user1Id && currentUser.id !== user2Id) {
                window.navigation.navigateTo('/');
                return;
            }

        
            const chat = new ChatComponent(currentUser.id, currentUser.id === user1Id ? user2Id : user1Id);
            chat.mount();
        });
    },

    '/liked': () => {
    
        AuthService.checkAuthState().then(isAuth => {
            if (!isAuth) {
                window.navigation.navigateTo('/signin');
                return;
            }

        
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('user_id');

        
            loadLikedPosts(userId);
        });
    },

    '/commented': () => {
    
        AuthService.checkAuthState().then(isAuth => {
            if (!isAuth) {
                window.navigation.navigateTo('/signin');
                return;
            }

        
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('user_id');

        
            loadCommentedPosts(userId);
        });
    },

    '/create': () => {
    
        AuthService.checkAuthState().then(isAuth => {
            if (!isAuth) {
                window.navigation.navigateTo('/signin');
                return;
            }

            if (typeof CreatePostComponent === 'function') {
                const createPost = new CreatePostComponent();
                createPost.mount();

            
                navigationHelper.setCurrentComponent(createPost);
            } else {
                console.error('CreatePostComponent is not defined');
                document.getElementById('main-content').innerHTML = '<h1>Create Post</h1><p>Component not available</p>';
            }
        });
    },
    '/edit-post': (id) => {
    
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
    
        AuthService.checkAuthState().then(isAuth => {
            if (!isAuth) {
                window.navigation.navigateTo('/signin');
                return;
            }

            loadSinglePost(id);
        });
    },
    '/signin': () => {
    
        AuthService.checkAuthState().then(isAuth => {
            if (isAuth) {
                window.navigation.navigateTo('/');
                return;
            }

        
            const authComponent = new AuthComponent('signin');
            authComponent.mount();
        });
    },
    '/signup': () => {
    
        AuthService.checkAuthState().then(isAuth => {
            if (isAuth) {
                window.navigation.navigateTo('/');
                return;
            }

        
            const authComponent = new AuthComponent('signup');
            authComponent.mount();
        });
    },
    '/notifications': () => {
    
        AuthService.checkAuthState().then(isAuth => {
            if (!isAuth) {
                window.navigation.navigateTo('/signin');
                return;
            }

        
            if (typeof NotificationsComponent === 'function') {
                const notifications = new NotificationsComponent();
                notifications.mount();
            } else {
            
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
    const categoryName = urlParams.get('name');

    console.log(`Handling route: ${path}${search}`);


    const authPage = isAuthPage(path);


    toggleNavigationElements(!authPage);


    if (path === '/profile') {
        router['/profile'](userId);
        return;
    }


    if (path === '/edit-post') {
        if (!postId) {
            window.navigation.navigateTo('/');
            return;
        }
        router['/edit-post'](postId);
        return;
    }


    if (path === '/notifications') {
        router['/notifications']();
        return;
    }


    if (path === '/category') {
        if (!categoryName) {
            window.navigation.navigateTo('/');
            return;
        }
        router['/category'](categoryName);
        return;
    }


    if (path === '/created') {
        router['/created']();
        return;
    }


    if (path === '/liked') {
        router['/liked']();
        return;
    }


    if (path === '/commented') {
        router['/commented']();
        return;
    }


    if (path === '/' && postId) {
        router.post(postId);
        return;
    }


    if (path === '/signin' || path === '/signup') {
        const route = router[path];
        if (route) {
            route();
            return;
        }
    }


    const route = router[path];
    if (route) {
        route();
        return;
    }


    router['/']();
}

function toggleNavigationElements(show) {

    const navbarElement = document.getElementById('navbar');
    const filterNavElement = document.getElementById('filter-nav');
    const usersNavElement = document.getElementById('users-nav');
    

    if (!show) {
        document.body.classList.add('auth-page');
    } else {
        document.body.classList.remove('auth-page');
    }


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

window.addEventListener('popstate', (event) => {
    console.log('Navigation: popstate event triggered');


    const handled = navigationHelper.handleBack();

    if (!handled) {
    
        resetLayout();
        handleRoute();
    }
});

document.addEventListener('DOMContentLoaded', () => {

    const currentPath = window.location.pathname;
    const isOnAuthPage = isAuthPage(currentPath);


    AuthService.checkAuthState().then(isAuth => {
        if (isOnAuthPage) {
        
            if (isAuth) {
                window.navigation.navigateTo('/');
                return;
            }

        
            const route = router[currentPath];
            if (route) {
                route();
            } else {
            
                window.navigation.navigateTo('/signin');
            }
        } else {
        
            if (!isAuth) {
            
                window.navigation.navigateTo('/signin');
                return;
            }

        
            initializeUI();
        }
    });


    const currentUserId = localStorage.getItem('userId');

    if (currentUserId) {
        const usersNav = new UsersNavComponent([], currentUserId);
    } else {
        console.warn('No user ID found. User might not be logged in.');
    }
});

function initializeUI() {
    const currentUser = AuthService.getCurrentUser();

    if (!currentUser) {
        console.error('No current user found');
        window.navigation.navigateTo('/signin');
        return;
    }

    console.log('Initializing UI with user data:', currentUser);


    const navbarElement = document.getElementById('navbar');
    if (navbarElement) {
        try {
            const navbar = new NavbarComponent(
                true,
                currentUser.id,
                0,
                currentUser.nickname
            );
            navbar.mount(navbarElement);
        } catch (error) {
            console.error('Error mounting navbar:', error);
        }
    }


    initializeOptionalComponents();


    handleRoute();
};

function initializeOptionalComponents() {

    if (!AuthService.getCurrentUser()) {
        return;
    }

    console.log('Initializing optional components');


    const filterNavElement = document.getElementById('filter-nav');
    if (filterNavElement && typeof FilterNavComponent === 'function') {
        try {
            const filterNav = new FilterNavComponent();
            filterNav.mount(filterNavElement);
        } catch (error) {
            console.error('Error mounting filter nav:', error);
        }
    }


    const usersNavElement = document.getElementById('users-nav');
    if (usersNavElement && typeof UsersNavComponent === 'function') {
    
        const currentUserId = AuthService.getCurrentUser()?.id;

    
        loadUsers()
            .then(usersData => {
                try {
                    console.log('Users data loaded:', usersData);
                
                    const filteredUsers = usersData.filter(user => {
                        const userId = user.ID || user.id;
                        return userId !== currentUserId;
                    });

                    const usersNav = new UsersNavComponent(filteredUsers, currentUserId);
                    usersNav.mount(usersNavElement);
                } catch (error) {
                    console.error('Error mounting users nav:', error);
                }
            })
            .catch(error => {
                console.error('Error loading users:', error);
            
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

function loadUsers() {
    console.log('Loading users...');
    return new Promise((resolve, reject) => {
        fetch('/api/users', {
            credentials: 'include'
        })
            .then(response => {
                if (!response.ok) {
                
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
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
            
                throw new Error(`Failed to load posts: ${response.status}`);
            }
            return response.json();
        })
        .then(postsData => {
            console.log('Posts received:', postsData);

        
        
            const posts = Array.isArray(postsData) ? postsData :
                (postsData && postsData.posts && Array.isArray(postsData.posts)) ? postsData.posts : [];

            if (typeof PostsComponent === 'function') {
                const postsComponent = new PostsComponent();
                postsComponent.posts = posts;
                postsComponent.isLoggedIn = true;
                postsComponent.currentUserID = AuthService.getCurrentUser()?.id;
                postsComponent.mount();
            } else {
            
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

function loadCreatedPosts() {
    console.log('Loading created posts...');


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
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                
                    window.navigation.navigateTo('/signin');
                    throw new Error('Please sign in to view your posts');
                }
                throw new Error(`Failed to load created posts: ${response.status}`);
            }
            return response.json();
        })
        .then(postsData => {
            console.log('Created posts received:', postsData);

        
            const posts = Array.isArray(postsData) ? postsData :
                (postsData && postsData.posts && Array.isArray(postsData.posts)) ? postsData.posts : [];

            if (typeof PostsComponent === 'function') {
                const postsComponent = new PostsComponent();
                postsComponent.posts = posts;
                postsComponent.isLoggedIn = true;
                postsComponent.currentUserID = AuthService.getCurrentUser()?.id;

            
                if (mainContent) {
                    mainContent.innerHTML = `
                        <h2 class="filter-title">Posts You Created</h2>
                        <div id="posts-container"></div>
                    `;

                
                    postsComponent.mount(document.getElementById('posts-container'));
                } else {
                
                    postsComponent.mount();
                }

            
                highlightActiveFilter('created');
            } else {
            
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

function loadLikedPosts() {
    console.log('Loading liked posts...');


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
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                
                    window.navigation.navigateTo('/signin');
                    throw new Error('Please sign in to view your liked posts');
                }
                throw new Error(`Failed to load liked posts: ${response.status}`);
            }
            return response.json();
        })
        .then(postsData => {
            console.log('Liked posts received:', postsData);

        
            const posts = Array.isArray(postsData) ? postsData :
                (postsData && postsData.posts && Array.isArray(postsData.posts)) ? postsData.posts : [];

            if (typeof PostsComponent === 'function') {
                const postsComponent = new PostsComponent();
                postsComponent.posts = posts;
                postsComponent.isLoggedIn = true;
                postsComponent.currentUserID = AuthService.getCurrentUser()?.id;

            
                if (mainContent) {
                    mainContent.innerHTML = `
                        <h2 class="filter-title">Posts You Reacted To</h2>
                        <div id="posts-container"></div>
                    `;

                
                    postsComponent.mount(document.getElementById('posts-container'));
                } else {
                
                    postsComponent.mount();
                }

            
                highlightActiveFilter('liked');
            } else {
            
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

function loadCommentedPosts() {
    console.log('Loading commented posts...');


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
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                
                    window.navigation.navigateTo('/signin');
                    throw new Error('Please sign in to view your commented posts');
                }
                throw new Error(`Failed to load commented posts: ${response.status}`);
            }
            return response.json();
        })
        .then(postsData => {
            console.log('Commented posts received:', postsData);

        
            const posts = Array.isArray(postsData) ? postsData :
                (postsData && postsData.posts && Array.isArray(postsData.posts)) ? postsData.posts : [];

            if (typeof PostsComponent === 'function') {
                const postsComponent = new PostsComponent();
                postsComponent.posts = posts;
                postsComponent.isLoggedIn = true;
                postsComponent.currentUserID = AuthService.getCurrentUser()?.id;

            
                if (mainContent) {
                    mainContent.innerHTML = `
                        <h2 class="filter-title">Posts You Commented On</h2>
                        <div id="posts-container"></div>
                    `;

                
                    postsComponent.mount(document.getElementById('posts-container'));
                } else {
                
                    postsComponent.mount();
                }

            
                highlightActiveFilter('commented');
            } else {
            
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

function highlightActiveFilter(filterType) {
    const filterNav = document.getElementById('filter-nav');
    if (!filterNav || !filterNav.querySelector) return;


    const allLinks = filterNav.querySelectorAll('.filter-link');
    allLinks.forEach(link => {
        link.classList.remove('active');
    });


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

    
        posts.forEach(post => {
        
            const postId = post.ID || post.id;
            const title = post.Title || post.title || 'Untitled Post';
            const content = post.Content || post.content || 'No content';
            const author = post.Username || post.username || post.Author || post.author || 'Anonymous';

        
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

function loadSinglePost(postId) {
    console.log(`Loading single post with ID: ${postId}`);


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
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                
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

        
            if (typeof SinglePostComponent === 'function') {
                const singlePostComponent = new SinglePostComponent(postId);
                singlePostComponent.post = data.post;
                singlePostComponent.comments = data.comments || [];
                singlePostComponent.isLoggedIn = true;
                singlePostComponent.currentUserID = AuthService.getCurrentUser()?.id;
                singlePostComponent.mount();
            } else {
            
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

function loadCategoryPosts(categoryName) {
    console.log(`Loading posts for category: ${categoryName}`);


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
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                
                    window.navigation.navigateTo('/signin');
                    throw new Error('Please sign in to view category posts');
                }
                throw new Error(`Failed to load category posts: ${response.status}`);
            }
            return response.json();
        })
        .then(postsData => {
            console.log('Category posts received:', postsData);

        
            const posts = Array.isArray(postsData) ? postsData :
                (postsData && postsData.posts && Array.isArray(postsData.posts)) ? postsData.posts : [];

            if (typeof PostsComponent === 'function') {
                const postsComponent = new PostsComponent();
                postsComponent.posts = posts;
                postsComponent.isLoggedIn = true;
                postsComponent.currentUserID = AuthService.getCurrentUser()?.id;

            
                if (mainContent) {
                    mainContent.innerHTML = `
                        <h2 class="filter-title">Category: ${categoryName}</h2>
                        <div id="posts-container"></div>
                    `;

                
                    postsComponent.mount(document.getElementById('posts-container'));
                } else {
                
                    postsComponent.mount();
                }

            
                highlightActiveFilter(categoryName);
            } else {
            
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

function showSinglePostFallback(post, comments) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;


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

function handlePostClick(event) {
    let postId;

    if (typeof event === 'string') {
    
        postId = event;
    } else {
    
        event.preventDefault();

    
        const postCard = event.target.closest('.post-card');
        if (!postCard) return;

        postId = postCard.dataset.postId;
    }

    if (!postId) {
        console.error('No post ID found');
        return;
    }


    window.navigation.navigateTo(`/?id=${postId}`);
}

function getPostIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

