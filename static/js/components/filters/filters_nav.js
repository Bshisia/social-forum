import PostsComponent from '../posts/posts.js';
import AuthService from '../../services/auth-service.js';

class FilterNavComponent {
    constructor() {
        this.container = document.getElementById('filter-nav');
        this.isLoggedIn = false;
        
        // Check authentication state
        const currentUser = AuthService.getCurrentUser();
        this.isLoggedIn = !!currentUser;
    }

    render() {
        return `
            <div class="categories-filter-container">
                <a href="/" class="filter-link" data-filter="all">All posts</a>
                <h3>Filter Posts by:</h3>
                <ul>
                    <li><a href="/created" class="filter-link" data-filter="created">Created Posts</a></li>
                    <li><a href="/liked" class="filter-link" data-filter="liked">Reacted Posts</a></li>
                    <li><a href="/commented" class="filter-link" data-filter="commented">Commented Posts</a></li>
                </ul>
                <h3>Categories</h3>
                <ul class="category-list">
                    <li><a href="/category?name=Tech" class="filter-link" data-category="Tech">Tech</a></li>
                    <li><a href="/category?name=Programming" class="filter-link" data-category="Programming">Programming</a></li>
                    <li><a href="/category?name=Business" class="filter-link" data-category="Business">Business</a></li>
                    <li><a href="/category?name=Lifestyle" class="filter-link" data-category="Lifestyle">Lifestyle</a></li>
                    <li><a href="/category?name=Football" class="filter-link" data-category="Football">Football</a></li>
                    <li><a href="/category?name=Politics" class="filter-link" data-category="Politics">Politics</a></li>
                    <li><a href="/category?name=General%20News" class="filter-link" data-category="General News">General News</a></li>
                </ul>
            </div>`;
    }

    mount() {
        if (!this.container) {
            console.error('Cannot mount FilterNavComponent: container element not found');
            return;
        }
        
        this.container.innerHTML = this.render();
        this.attachEventListeners();
        
        // Check if we need to highlight an active filter based on current URL
        this.highlightActiveFilterFromURL();
    }
    
    highlightActiveFilterFromURL() {
        const path = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        const categoryName = searchParams.get('name');
        const postId = searchParams.get('id');
        
        if (categoryName) {
            this.highlightActiveFilter(categoryName);
        } else if (path === '/created') {
            this.highlightActiveFilterByType('created');
        } else if (path === '/liked') {
            this.highlightActiveFilterByType('liked');
        } else if (path === '/commented') {
            this.highlightActiveFilterByType('commented');
        } else if (path === '/' && !postId) {
            // Highlight "All posts" link when on home page without post ID
            this.highlightActiveFilterByType('all');
        }
    }
    
    attachEventListeners() {
        // Get all filter links
        const filterLinks = this.container.querySelectorAll('.filter-link');
        
        // Add click event listener to each link
        filterLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Get the route, category, or filter type
                const filter = link.dataset.filter;
                const category = link.dataset.category;
                
                if (category) {
                    // Handle category filter
                    this.handleCategoryFilter(category);
                } else if (filter === 'all') {
                    // Handle All Posts filter
                    this.handleAllPostsFilter();
                } else if (filter) {
                    // Handle user-specific filters (created, liked, commented)
                    this.handleUserFilter(filter);
                }
            });
        });
    }
    
    handleAllPostsFilter() {
        console.log('Loading all posts');
        
        // Update URL without full page reload
        window.history.pushState({}, '', '/');
        
        // Show loading state
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Loading all posts...</p>
                </div>
            `;
        }
        
        // Fetch all posts
        fetch('/api/posts', {
            credentials: 'include' // Include cookies for auth
        })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401) {
                        // Unauthorized, redirect to login
                        window.navigation.navigateTo('/signin');
                        throw new Error('Please sign in to view posts');
                    }
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('All posts data:', data);
                
                // Create and mount posts component with all posts
                const postsComponent = new PostsComponent();
                postsComponent.posts = data;
                postsComponent.mount();
                
                // Highlight the active filter
                this.highlightActiveFilterByType('all');
            })
            .catch(error => {
                console.error('Error loading all posts:', error);
                
                if (mainContent) {
                    mainContent.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Error loading posts: ${error.message}</p>
                            <button onclick="window.location.reload()" class="btn btn-outline">
                                <i class="fas fa-sync"></i> Reload
                            </button>
                        </div>
                    `;
                }
            });
    }
    
    handleUserFilter(filterType) {
        console.log(`Filtering by user filter: ${filterType}`);
        
        // Check if user is logged in
        if (!this.isLoggedIn) {
            console.log('User not logged in, redirecting to signin');
            window.navigation.navigateTo('/signin');
            return;
        }
        
        // Update URL without full page reload
        const newUrl = `/${filterType}`;
        window.history.pushState(
            { filterType: filterType },
            '',
            newUrl
        );
        
        // Show loading state
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            let filterTitle = '';
            switch (filterType) {
                case 'created':
                    filterTitle = 'Created';
                    break;
                case 'liked':
                    filterTitle = 'Reacted';
                    break;
                case 'commented':
                    filterTitle = 'Commented';
                    break;
            }
            
            mainContent.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Loading your ${filterTitle.toLowerCase()} posts...</p>
                </div>
            `;
        }
        
        // Fetch posts based on filter type
        const endpoint = `/api/posts/${filterType}`;
        
        fetch(endpoint, {
            credentials: 'include' // Include cookies for auth
        })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401) {
                        // Unauthorized, redirect to login
                        window.navigation.navigateTo('/signin');
                        throw new Error('Please sign in to view your posts');
                    }
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log(`${filterType} posts data:`, data);
                
                // Create and mount posts component with filtered data
                const postsComponent = new PostsComponent();
                postsComponent.posts = data;
                
                // Set a title based on filter type
                let filterTitle = '';
                switch (filterType) {
                    case 'created':
                        filterTitle = 'Posts You Created';
                        break;
                    case 'liked':
                        filterTitle = 'Posts You Reacted To';
                        break;
                    case 'commented':
                        filterTitle = 'Posts You Commented On';
                        break;
                }
                
                // Add a title to the main content before mounting posts
                if (mainContent) {
                    mainContent.innerHTML = `
                        <h2 class="filter-title">${filterTitle}</h2>
                        <div id="posts-container"></div>
                    `;
                    
                    // Mount posts to the posts container
                    postsComponent.mount(document.getElementById('posts-container'));
                } else {
                    // Fallback to mounting directly to main content
                    postsComponent.mount();
                }
                
                // Highlight the active filter
                this.highlightActiveFilterByType(filterType);
            })
            .catch(error => {
                console.error(`Error loading ${filterType} posts:`, error);
                
                if (mainContent) {
                    mainContent.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Error loading your posts: ${error.message}</p>
                            <button onclick="window.navigation.navigateTo('/')" class="btn btn-outline">
                                <i class="fas fa-home"></i> Go to Home
                            </button>
                        </div>
                    `;
                }
            });
    }
    
    handleCategoryFilter(category) {
        console.log(`Filtering by category: ${category}`);
        
        // Update URL without full page reload
        const newUrl = `/category?name=${encodeURIComponent(category)}`;
        window.history.pushState(
            { category: category },
            '',
            newUrl
        );
        
        // Show loading state
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Loading ${category} posts...</p>
                </div>
            `;
        }
        
        // Fetch posts for the selected category
        fetch(`/api/posts/category?name=${encodeURIComponent(category)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Category posts data:', data);
                
                // Create and mount posts component with filtered data
                const postsComponent = new PostsComponent();
                postsComponent.posts = data;
                postsComponent.filterCategory = category;
                
                // Add a title to the main content before mounting posts
                if (mainContent) {
                    mainContent.innerHTML = `
                        <h2 class="filter-title">Category: ${category}</h2>
                        <div id="posts-container"></div>
                    `;
                    
                    // Mount posts to the posts container
                    postsComponent.mount(document.getElementById('posts-container'));
                } else {
                    // Fallback to mounting directly to main content
                    postsComponent.mount();
                }
                
                // Highlight the active category
                this.highlightActiveFilter(category);
            })
            .catch(error => {
                console.error('Error loading category posts:', error);
                
                if (mainContent) {
                    mainContent.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Error loading ${category} posts: ${error.message}</p>
                            <button onclick="window.navigation.navigateTo('/')" class="btn btn-outline">
                                <i class="fas fa-home"></i> Go to Home
                            </button>
                        </div>
                    `;
                }
            });
    }
    
    highlightActiveFilter(category) {
        // Remove active class from all links
        const allLinks = this.container.querySelectorAll('.filter-link');
        allLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to the selected category link
        if (category) {
            const activeLink = this.container.querySelector(`.filter-link[data-category="${category}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
    }
    
    highlightActiveFilterByType(filterType) {
        // Remove active class from all links
        const allLinks = this.container.querySelectorAll('.filter-link');
        allLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to the selected filter link
        if (filterType) {
            const activeLink = this.container.querySelector(`.filter-link[data-filter="${filterType}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
    }
}
export default FilterNavComponent;
