class PostsComponent{
    constructor() {
        // Store posts data
        this.posts = [];
        
        // Store component state
        this.isLoading = false;
        this.error = null;
        this.currentFilter = 'all'; // all, liked, commented
        this.currentCategory = null;
        
        // Store user state
        this.isLoggedIn = false;
        this.currentUserID = '';
        
        // Pagination/Infinite scroll
        this.page = 1;
        this.hasMore = true;
        
        // Store DOM element references
        this.mainContainer = document.getElementById('main-content');
        this.postsContainer = null;
        
        // Bind methods
        // this.handleScroll = this.handleScroll.bind(this);
        // this.handlePostClick = this.handlePostClick.bind(this);
        // this.handleLike = this.handleLike.bind(this);
        // this.handleComment = this.handleComment.bind(this);
    }
    render() {
        if (this.isLoading) {
            return `<div class="loading">Loading posts...</div>`;
        }
    
        const postsHTML = this.posts.map(post => `
            <div class="post-container">
                 <div class="post-card" data-post-id="${post.ID}">
                    <div class="post-header">
                        <div class="post-avatar">
                            ${post.ProfilePic ? 
                                `<img src="${post.ProfilePic}" alt="Profile Picture" class="post-avatar-img">` :
                                `<div class="post-avatar-placeholder">
                                    <i class="fas fa-user"></i>
                                </div>`
                            }
                        </div>
                        <div class="post-info">
                            <h3>${post.Username}</h3>
                            <span class="timestamp">${post.PostTime}</span>
                        </div>
                        <div class="post-categories-right">
                            ${post.Categories.map(cat => 
                                `<span class="category-tag">${cat.Name}</span>`
                            ).join('')}
                        </div>
                    </div>
    
                    <div class="post-content">
                        <h2>${post.Title}</h2>
                        <p>${post.Content}</p>
                        ${post.ImagePath ? 
                            `<img src="${post.ImagePath}" alt="Post image" class="post-image">` : 
                            ''}
                    </div>
    
                    <div class="post-footer">
                        <div class="action-container">
                            <button class="action-btn like-btn" data-post-id="${post.ID}" data-action="like">
                                <i class="fas fa-thumbs-up"></i>
                                <span class="count" id="likes-${post.ID}">${post.Likes}</span>
                            </button>
                        </div>
                        <div class="action-container">
                            <button class="action-btn comment-btn" data-post-id="${post.ID}">
                                <i class="fas fa-comment"></i>
                                <span class="count" id="comments-${post.ID}">${post.Comments}</span>
                            </button>
                        </div>
                        <div class="action-container">
                            <button class="action-btn dislike-btn" data-post-id="${post.ID}" data-action="dislike">
                                <i class="fas fa-thumbs-down"></i>
                                <span class="count" id="dislikes-${post.ID}">${post.Dislikes}</span>
                            </button>
                        </div>
                        ${post.UserID === this.currentUserID ? `
                            <div class="post-actions">
                                <a href="/edit-post?id=${post.ID}" class="btn btn-edit">
                                    <i class="fas fa-edit"></i> Edit
                                </a>
                                <form action="/delete-post" method="POST" style="display: inline;"
                                    onsubmit="return confirm('Are you sure you want to delete this post?');">
                                    <input type="hidden" name="post_id" value="${post.ID}">
                                    <button type="submit" class="btn btn-delete">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </form>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    
        return `
            <div class="posts-container">
                ${this.posts.length ? postsHTML : 
                    `<div class="no-posts-message">
                        <i class="fas fa-inbox"></i>
                        <p>No posts available</p>
                    </div>`
                }
            </div>`;
    }

    mount() {
        this.mainContainer.innerHTML = this.render();
        this.attachEventListeners();
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

        // Comment buttons
        const commentButtons = document.querySelectorAll('.comment-btn');
        commentButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent post click
                const postId = button.dataset.postId;
                this.handlePostClick(postId);
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

        // Update URL without full page reload
        const newUrl = `/?id=${postId}`;
        window.history.pushState(
            { postId: postId },
            '',
            newUrl
        );

        // Load the single post view
        fetch(`/api/posts/single?id=${postId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                const singlePost = new SinglePostComponent(postId);
                singlePost.post = data.post;
                singlePost.comments = data.comments;
                singlePost.mount();
            })
            .catch(error => {
                console.error('Error loading post:', error);
                this.mainContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error loading post</p>
                        <button onclick="window.history.back()" class="btn btn-outline">
                            <i class="fas fa-arrow-left"></i> Go Back
                        </button>
                    </div>`;
            });
    }
}