class PostsComponent {
    constructor() {
        this.posts = [];
        this.isLoggedIn = false;
        this.currentUserID = null;
        this.container = null;
        this.filterCategory = null;
    }

    mount(container = document.getElementById('main-content')) {
        this.container = container;
        if (!this.container) {
            console.error('Cannot mount PostsComponent: container element not found');
            return;
        }
        
        // Get filter category from URL if present
        const urlParams = new URLSearchParams(window.location.search);
        this.filterCategory = urlParams.get('category');
        
        // Get authentication state if not provided
        if (!this.isLoggedIn) {
            const currentUser = AuthService.getCurrentUser();
            this.isLoggedIn = !!currentUser;
            this.currentUserID = currentUser ? currentUser.id : null;
        }
        
        // Debug: Log the posts data
        console.log('Posts data in mount:', this.posts);
        
        this.render();
        this.attachEventListeners();
    }

    render() {
        // Debug: Log the posts data before filtering
        console.log('Posts data before filtering:', this.posts);
        
        // Filter posts by category if needed
        const filteredPosts = this.filterCategory 
            ? this.posts.filter(post => {
                // Check if post has Categories array and if it includes the filter category
                return post.Categories && post.Categories.some(cat => 
                    cat.Name === this.filterCategory || cat.name === this.filterCategory
                );
            })
            : this.posts;
        
        // Debug: Log the filtered posts
        console.log('Filtered posts:', filteredPosts);
            
        if (filteredPosts.length === 0) {
            this.renderEmptyState();
        } else {
            this.renderPosts(filteredPosts);
        }
    }

    renderEmptyState() {
        const categoryText = this.filterCategory 
            ? `in category "${this.filterCategory}"` 
            : '';
            
        this.container.innerHTML = `
            <div class="posts-container">
                <div class="posts-header">
                    <h1>Posts ${categoryText}</h1>
                    ${this.isLoggedIn ? `
                        <button class="btn btn-primary create-post-btn" onclick="window.navigation.navigateTo('/create')">
                            <i class="fas fa-plus"></i> Create Post
                        </button>
                    ` : ''}
                </div>
                <div class="no-posts-message">
                    <i class="fas fa-info-circle"></i>
                    <p>No posts available ${categoryText}. ${this.isLoggedIn ? 'Be the first to create a post!' : 'Please sign in to create a post.'}</p>
                    ${this.isLoggedIn ? `
                        <button onclick="window.navigation.navigateTo('/create')" class="btn btn-primary mt-3">
                            <i class="fas fa-plus"></i> Create Post
                        </button>
                    ` : `
                        <button onclick="window.navigation.navigateTo('/signin')" class="btn btn-primary mt-3">
                            <i class="fas fa-sign-in-alt"></i> Sign In
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    renderPosts(posts) {
        // Debug: Log the posts data being rendered
        console.log('Rendering posts:', posts);
        
        let postsHtml = `
            <div class="posts-container">
                <div class="posts-header">
                    <h1>Posts ${this.filterCategory ? `in ${this.filterCategory}` : ''}</h1>
                    ${this.isLoggedIn ? `
                        <button class="btn btn-primary create-post-btn" onclick="window.navigation.navigateTo('/create')">
                            <i class="fas fa-plus"></i> Create Post
                        </button>
                    ` : ''}
                </div>
                <div class="posts-list">
        `;
        
        // Create post cards
        posts.forEach(post => {
            // Debug: Log each post being processed
            console.log('Processing post:', post);
            
            // Handle different field name formats that might come from the API
            const postId = post.ID || post.id;
            const title = post.Title || post.title || 'Untitled Post';
            const content = post.Content || post.content || 'No content';
            const author = post.Username || post.username || post.Author || post.author || 'Anonymous';
            const authorId = post.UserID || post.userId || post.user_id || '';
            const postDate = post.PostTime || post.postTime || post.created_at || '';
            const categories = post.Categories || post.categories || [];
            
            // Debug: Log the extracted fields
            console.log('Extracted fields:', { postId, title, content, author, authorId, postDate });
            
            // Format category display
            let categoryDisplay = '';
            if (categories && categories.length > 0) {
                // Handle both object and string categories
                const categoryNames = categories.map(cat => 
                    typeof cat === 'string' ? cat : (cat.Name || cat.name)
                ).filter(Boolean);
                
                if (categoryNames.length > 0) {
                    categoryDisplay = `<div class="post-category">${categoryNames.join(', ')}</div>`;
                }
            }
            
            // Ensure content is a string before using substring
            const contentStr = String(content);
            const contentPreview = contentStr.substring(0, 150) + (contentStr.length > 150 ? '...' : '');
            
            const isAuthor = this.isLoggedIn && this.currentUserID === authorId;
            
            postsHtml += `
                <div class="post-card" data-post-id="${postId}">
                    ${categoryDisplay}
                    <h3 class="post-title">${title}</h3>
                    <p class="post-excerpt">${contentPreview}</p>
                    <div class="post-footer">
                        <div class="post-meta">
                            <span class="post-author">By: ${author}</span>
                            <span class="post-date">${this.formatDate(postDate)}</span>
                        </div>
                        <div class="post-actions">
                            <button onclick="window.navigation.navigateTo('/?id=${postId}')" class="btn btn-sm btn-outline">
                                Read More
                            </button>
                            ${isAuthor ? `
                                <button onclick="window.navigation.navigateTo('/edit-post?id=${postId}')" class="btn btn-sm">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        postsHtml += `
                </div>
            </div>
        `;
        
        this.container.innerHTML = postsHtml;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown date';
        
        try {
            const date = new Date(dateString);
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return 'Invalid date';
            }
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        } catch (e) {
            console.error('Error formatting date:', e);
            return 'Date error';
        }
    }

    attachEventListeners() {
        // Post click handler
        const posts = document.querySelectorAll('.post-card');
        posts.forEach(post => {
            post.addEventListener('click', (e) => {
                const postId = post.dataset.postId;
                // Don't trigger if clicking like/comment buttons
                if (!e.target.closest('.post-actions')) {
                    this.handlePostClick(postId);
                }
            });
        });

        // Like buttons
        const likeButtons = document.querySelectorAll('.like-btn');
        likeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent post click
                const postId = button.dataset.postId;
                this.handleLike(postId);
            });
        });

        const dislikeButtons = document.querySelectorAll('.dislike-btn');
        dislikeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent post click
                const postId = button.dataset.postId;
                this.handleDislike(postId);
            });
        });

        const editLinks = document.querySelectorAll('.btn-edit');
        editLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation(); // Only stop event bubbling
            });
        });

        // Comment buttons
        const commentButtons = document.querySelectorAll('.comment-btn');
        commentButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent post click
                const postId = button.dataset.postId;
                this.handlePostClick(postId);
            });
        });

        const deleteButtons = document.querySelectorAll('.btn-delete');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const postId = button.closest('.post-card').dataset.postId;
                if (confirm('Are you sure you want to delete this post?')) {
                    this.handleDelete(postId);
                }
            });
        });

        const editButtons = document.querySelectorAll('.btn-edit');
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent post click
                e.preventDefault(); // Prevent default link behavior
                const postId = button.dataset.postId;
                console.log('Edit button clicked for post:', postId); // Debug
                window.navigation.navigateTo(`/edit-post?id=${postId}`);
            });
        });
    }

    handlePostClick(postId) {
        // Prevent default behavior if event object is passed
        if (postId && postId.preventDefault) {
            postId.preventDefault();
            postId = postId.currentTarget.dataset.postId;
        }

        // Validate postId
        if (!postId) {
            console.error('No post ID provided');
            return;
        }

        console.log('Loading single post:', postId);

        // Update URL without full page reload
        const newUrl = `/?id=${postId}`;
        window.history.pushState(
            { postId: postId },
            '',
            newUrl
        );

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

        // Load the single post view
        fetch(`/api/posts/single?id=${postId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Debug: Log the single post data
                console.log('Single post data:', data);
                
                const singlePost = new SinglePostComponent(postId);
                singlePost.post = data.post;
                singlePost.comments = data.comments;
                singlePost.mount();
            })
            .catch(error => {
                console.error('Error loading post:', error);
                
                // Use mainContent instead of this.mainContainer
                const mainContent = document.getElementById('main-content');
                if (mainContent) {
                    mainContent.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Error loading post: ${error.message}</p>
                            <button onclick="window.history.back()" class="btn btn-outline">
                                <i class="fas fa-arrow-left"></i> Go Back
                            </button>
                        </div>`;
                }
            });
    }

    handleLike(postId) {
        fetch('/api/posts/react', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                post_id: parseInt(postId),
                like: 1
            }),
            credentials: 'include'
        })
            .then(response => {
                if (response.status === 401) {
                    window.location.href = '/signin';
                    return;
                }
                return response.json();
            })
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Failed to react to post');
                }

                // Update UI
                const likesElement = document.getElementById(`likes-${postId}`);
                const dislikesElement = document.getElementById(`dislikes-${postId}`);

                if (likesElement) {
                    likesElement.textContent = data.likes;
                }
                if (dislikesElement) {
                    dislikesElement.textContent = data.dislikes;
                }

                // Toggle active state based on server response
                const likeButton = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
                const dislikeButton = document.querySelector(`.dislike-btn[data-post-id="${postId}"]`);

                if (likeButton) {
                    likeButton.classList.toggle('active', data.userReaction === 1);
                }
                if (dislikeButton) {
                    dislikeButton.classList.remove('active');
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }

    handleDislike(postId) {
        fetch('/api/posts/react', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                post_id: parseInt(postId),
                like: 0
            }),
            credentials: 'include'
        })
            .then(response => {
                if (response.status === 401) {
                    window.location.href = '/signin';
                    return;
                }
                return response.json();
            })
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Failed to react to post');
                }

                // Update UI
                const likesElement = document.getElementById(`likes-${postId}`);
                const dislikesElement = document.getElementById(`dislikes-${postId}`);

                if (likesElement) {
                    likesElement.textContent = data.likes;
                }
                if (dislikesElement) {
                    dislikesElement.textContent = data.dislikes;
                }

                // Toggle active state based on server response
                const likeButton = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
                const dislikeButton = document.querySelector(`.dislike-btn[data-post-id="${postId}"]`);

                if (dislikeButton) {
                    dislikeButton.classList.toggle('active', data.userReaction === 0);
                }
                if (likeButton) {
                    likeButton.classList.remove('active');
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }

    handleDelete(postId) {
        if (!confirm('Are you sure you want to delete this post?')) {
            return;
        }
    
        fetch('/api/posts/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                post_id: parseInt(postId) // Ensure postId is an integer
            }),
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to delete post');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Remove post from UI and reload posts
                const postElement = document.querySelector(`[data-post-id="${postId}"]`);
                if (postElement) {
                    postElement.remove();
                }
                // Optionally reload all posts
                window.navigation.reloadPage();
            } else {
                throw new Error(data.error || 'Failed to delete post');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message);
        });
    }
}

export default PostsComponent;
