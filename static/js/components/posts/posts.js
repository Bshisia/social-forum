// Import required services
import AuthService from '../../services/auth-service.js';

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
                <div class="no-posts-message">
                    <i class="fas fa-inbox"></i>
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
        
        let postsHtml = `<div class="posts-container">`;
        
        // Create post cards
        posts.forEach(post => {
            // Debug: Log each post being processed
            console.log('Processing post:', post);
            
            // Handle different field name formats that might come from the API
            const postId = post.ID || post.id;
            const title = post.Title || post.title || 'Untitled Post';
            const content = post.Content || post.content || 'No content';
            const author = post.Username || post.username || post.Author || post.author || 'Anonymous';
            const authorId = post.UserID || post.userId || post.user_id || post.userID || '';
            const postDate = post.PostTime || post.postTime || post.created_at || '';
            const categories = post.Categories || post.categories || [];
            const likes = post.Likes || post.likes || 0;
            const dislikes = post.Dislikes || post.dislikes || 0;
            const comments = post.Comments || post.comments || 0;
            const imagePath = post.ImagePath || post.imagePath || '';
            
            // Debug: Log the extracted fields
            console.log('Extracted fields:', { postId, title, content, author, authorId, postDate });
            
            // Handle profile picture with better debugging
            console.log('Profile picture data:', post.profilePic || post.ProfilePic);
            
            // Create avatar HTML based on profile picture
            let avatarHtml = '';
            
            // Check all possible profile picture formats - IMPORTANT: Check lowercase first
            if (post.profilePic && typeof post.profilePic === 'string' && post.profilePic) {
                console.log('Using profilePic string format (lowercase)');
                avatarHtml = `<img src="${post.profilePic}" alt="Profile Picture" class="post-avatar-img">`;
            } else if (post.ProfilePic && typeof post.ProfilePic === 'object' && post.ProfilePic.Valid) {
                console.log('Using ProfilePic.Valid format');
                avatarHtml = `<img src="${post.ProfilePic.String}" alt="Profile Picture" class="post-avatar-img">`;
            } else if (post.ProfilePic && typeof post.ProfilePic === 'string' && post.ProfilePic) {
                console.log('Using ProfilePic string format');
                avatarHtml = `<img src="${post.ProfilePic}" alt="Profile Picture" class="post-avatar-img">`;
            } else if (post.profile_pic && typeof post.profile_pic === 'object' && post.profile_pic.Valid) {
                console.log('Using profile_pic.Valid format');
                avatarHtml = `<img src="${post.profile_pic.String}" alt="Profile Picture" class="post-avatar-img">`;
            } else if (post.profile_pic && typeof post.profile_pic === 'string' && post.profile_pic) {
                console.log('Using profile_pic string format');
                avatarHtml = `<img src="${post.profile_pic}" alt="Profile Picture" class="post-avatar-img">`;
            } else {
                console.log('Using placeholder avatar');
                avatarHtml = `
                    <div class="post-avatar-placeholder">
                        <i class="fas fa-user"></i>
                    </div>
                `;
            }
            
            // Format category display
            let categoryDisplay = '';
            if (categories && categories.length > 0) {
                // Handle both object and string categories
                categoryDisplay = `
                    <div class="post-categories-right">
                        ${categories.map(cat => {
                            const catName = typeof cat === 'string' ? cat : (cat.Name || cat.name);
                            return catName ? `<span class="category-tag">${catName}</span>` : '';
                        }).join('')}
                    </div>
                `;
            }
            
            // Ensure content is a string before using substring
            const contentStr = String(content);
            const contentPreview = contentStr.substring(0, 150) + (contentStr.length > 150 ? '...' : '');
            
            const isAuthor = this.isLoggedIn && this.currentUserID === authorId;
            
            postsHtml += `
                <div class="post-card">
                    <div class="post-header">
                        <div class="post-avatar">
                            ${avatarHtml}
                        </div>
                        <div class="post-info">
                            <h3>${author}</h3>
                            <span class="timestamp">${this.formatDate(postDate)}</span>
                        </div>
                        ${categoryDisplay}
                    </div>
                    
                    <a href="/?id=${postId}" class="post-content-link">
                        <div class="post-content">
                            <h2>${title}</h2>
                            <p>${contentPreview}</p>
                            ${imagePath ? `<img src="${imagePath}" alt="Post image" class="post-image">` : ''}
                        </div>
                    </a>
                    
                    <div class="post-footer">
                        <div class="action-container">
                            <button class="action-btn like-btn" onclick="event.stopPropagation();" data-post-id="${postId}" data-action="like">
                                <i class="fas fa-thumbs-up"></i>
                                <span class="count" id="likes-${postId}">${likes}</span>
                            </button>
                        </div>
                        <div class="action-container">
                            <button class="action-btn comment-btn" data-post-id="${postId}" onclick="window.location.href='/?id=${postId}'">
                                <i class="fas fa-comment"></i>
                                <span class="count" id="comments-${postId}">${comments}</span>
                            </button>
                        </div>
                        <div class="action-container">
                            <button class="action-btn dislike-btn" onclick="event.stopPropagation();" data-post-id="${postId}" data-action="dislike">
                                <i class="fas fa-thumbs-down"></i>
                                <span class="count" id="dislikes-${postId}">${dislikes}</span>
                            </button>
                        </div>
                        ${isAuthor ? `
                            <div class="post-actions">
                                <a href="/edit-post?id=${postId}" class="btn btn-edit">
                                    <i class="fas fa-edit"></i> Edit
                                </a>
                                <button class="btn btn-delete" data-post-id="${postId}">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        postsHtml += `</div>`;
        
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

        // Delete buttons
        const deleteButtons = document.querySelectorAll('.btn-delete');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const postId = button.dataset.postId;
                if (confirm('Are you sure you want to delete this post?')) {
                    this.handleDelete(postId);
                }
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
