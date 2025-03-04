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
                <div class="post-card">
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
                this.handleComment(postId);
            });
        });

        // Infinite scroll
        window.addEventListener('scroll', this.handleScroll);

        // Category filters
        const categoryTags = document.querySelectorAll('.category-tag');
        categoryTags.forEach(tag => {
            tag.addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentCategory = tag.textContent;
                this.loadPosts();
            });
        });
    }
}