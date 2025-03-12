class PostsComponent {
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

        const postsHTML = this.posts.map(post => {
            const postPicPath = post.ProfilePic && post.ProfilePic.Valid ? 
                post.ProfilePic.String : null;
                
            return `
                <div class="post-card" data-post-id="${post.ID}">
                    <div class="post-header">
                        <div class="post-avatar">
                            ${postPicPath ?
                                `<img src="${postPicPath}" alt="Profile Picture" class="post-avatar-img">` :
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
                            ${post.Categories ?
                                post.Categories.map(cat =>
                                    `<span class="category-tag">${cat.Name}</span>`
                                ).join('') : ''
                            }
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
                        <div class="post-actions">
                            <button class="action-btn like-btn" data-post-id="${post.ID}">
                                <i class="fas fa-thumbs-up"></i>
                                <span class="count" id="likes-${post.ID}">${post.Likes}</span>
                            </button>
                            <button class="action-btn comment-btn" data-post-id="${post.ID}">
                                <i class="fas fa-comment"></i>
                                <span class="count" id="comments-${post.ID}">${post.Comments}</span>
                            </button>
                            <button class="action-btn dislike-btn" data-post-id="${post.ID}">
                                <i class="fas fa-thumbs-down"></i>
                                <span class="count" id="dislikes-${post.ID}">${post.Dislikes}</span>
                            </button>
                            
               ${post.UserID === this.currentUserID ? `
            <button class="btn btn-edit" data-post-id="${post.ID}">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-delete" data-post-id="${post.ID}">
                <i class="fas fa-trash"></i> Delete
            </button>
        ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

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
        // First get user status
        fetch('/api/user-status')
            .then(response => response.json())
            .then(data => {
                this.isLoggedIn = data.isLoggedIn;
                this.currentUserID = data.currentUserID;

                // Then render and attach listeners
                this.mainContainer.innerHTML = this.render();
                this.attachEventListeners();
            })
            .catch(error => console.error('Error:', error));
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