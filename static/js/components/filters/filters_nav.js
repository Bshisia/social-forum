import PostsComponent from '../posts/posts.js';

class FilterNavComponent {
    constructor() {
        this.container = document.getElementById('filter-nav');
    }

    render() {
        return `
            <div class="categories-filter-container">
                <a href="/" class="filter-link" data-route="/">All posts</a>
                <h3>Filter Posts by:</h3>
                <ul>
                    <li><a href="/created" class="filter-link" data-route="/created">Created Posts</a></li>
                    <li><a href="/liked" class="filter-link" data-route="/liked">Reacted Posts</a></li>
                    <li><a href="/commented" class="filter-link" data-route="/commented">Commented Posts</a></li>
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
    }
    
    attachEventListeners() {
        // Get all filter links
        const filterLinks = this.container.querySelectorAll('.filter-link');
        
        // Add click event listener to each link
        filterLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Get the route or category
                const route = link.dataset.route;
                const category = link.dataset.category;
                
                if (category) {
                    // Handle category filter
                    this.handleCategoryFilter(category);
                } else if (route) {
                    // Handle route navigation
                    window.navigation.navigateTo(route);
                }
            });
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
                postsComponent.mount();
                
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
}
export default FilterNavComponent;
