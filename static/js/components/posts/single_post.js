// Import AuthService
import AuthService from '../../services/auth-service.js';

class SinglePostComponent {
    constructor(postId) {
        this.postId = postId;
        this.post = null;
        this.comments = [];
        this.container = null;
        this.isLoggedIn = false;
        this.currentUserID = null;
    }

    mount(container = document.getElementById('main-content')) {
        this.container = container;
        if (!this.container) {
            console.error('Cannot mount SinglePostComponent: container element not found');
            return;
        }
        
        // Get authentication state if not provided
        if (!this.isLoggedIn) {
            try {
                const currentUser = AuthService.getCurrentUser();
                this.isLoggedIn = !!currentUser;
                this.currentUserID = currentUser ? currentUser.id : null;
            } catch (error) {
                console.error('Error getting current user:', error);
                // Continue without authentication
                this.isLoggedIn = false;
                this.currentUserID = null;
            }
        }
        
        console.log('Mounting single post component for post ID:', this.postId);
        console.log('Post data:', this.post);
        console.log('Comments:', this.comments);
        
        this.render();
        this.attachEventListeners();
    }

    render() {
        if (!this.post) {
            this.renderError("Post not found or failed to load");
            return;
        }
        
        // Extract post data with fallbacks for different field name formats
        const postId = this.post.ID || this.post.id;
        const title = this.post.Title || this.post.title || 'Untitled Post';
        const content = this.post.Content || this.post.content || 'No content';
        const author = this.post.Username || this.post.username || this.post.Author || this.post.author || 'Anonymous';
        const authorId = this.post.UserID || this.post.userId || this.post.user_id || '';
        const postDate = this.post.PostTime || this.post.postTime || this.post.created_at || '';
        const categories = this.post.Categories || this.post.categories || [];
        const likes = this.post.Likes || this.post.likes || 0;
        const dislikes = this.post.Dislikes || this.post.dislikes || 0;
        const commentCount = this.post.Comments || this.post.comments || 0;
        
        // Format category display
        let categoryDisplay = '';
        if (categories && categories.length > 0) {
            // Handle both object and string categories
            const categoryNames = categories.map(cat => 
                typeof cat === 'string' ? cat : (cat.Name || cat.name)
            ).filter(Boolean);
            
            if (categoryNames.length > 0) {
                categoryDisplay = `
                    <div class="post-categories">
                        ${categoryNames.map(cat => `
                            <span class="category-tag">${cat}</span>
                        `).join('')}
                    </div>
                `;
            }
        }
        
        const isAuthor = this.isLoggedIn && this.currentUserID === authorId;
        
        let html = `
            <div class="single-post-container">
                <div class="post-header">
                    <h1 class="post-title">${title}</h1>
                    ${categoryDisplay}
                    <div class="post-meta">
                        <span class="post-author">By: ${author}</span>
                        <span class="post-date">${this.formatDate(postDate)}</span>
                    </div>
                </div>
                
                <div class="post-content">
                    ${content}
                </div>
                
                <div class="post-footer">
                    <div class="post-reactions">
                        <button class="reaction-btn like-btn" data-post-id="${postId}">
                            <i class="fas fa-thumbs-up"></i> <span id="likes-${postId}">${likes}</span>
                        </button>
                        <button class="reaction-btn dislike-btn" data-post-id="${postId}">
                            <i class="fas fa-thumbs-down"></i> <span id="dislikes-${postId}">${dislikes}</span>
                        </button>
                    </div>
                    
                    ${isAuthor ? `
                        <div class="post-actions">
                            <button class="btn btn-edit" data-post-id="${postId}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-delete" data-post-id="${postId}">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                <div class="comments-section">
                    <h3>Comments (${commentCount})</h3>
                    
                    ${this.isLoggedIn ? `
                        <div class="comment-form">
                            <textarea id="comment-input" placeholder="Write a comment..."></textarea>
                            <button id="submit-comment" class="btn btn-primary">Post Comment</button>
                        </div>
                    ` : `
                        <div class="login-prompt">
                            <p>Please <a href="/signin">sign in</a> to comment</p>
                        </div>
                    `}
                    
                    <div class="comments-list">
                        ${this.renderComments()}
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
    }
    
    renderComments() {
        if (!this.comments || this.comments.length === 0) {
            return `<p class="no-comments">No comments yet. Be the first to comment!</p>`;
        }
        
        return this.comments.map(comment => {
            // Extract comment data with fallbacks
            const commentId = comment.ID || comment.id;
            const content = comment.Content || comment.content || '';
            const author = comment.Username || comment.username || comment.Author || comment.author || 'Anonymous';
            const authorId = comment.UserID || comment.userId || comment.user_id || '';
            const commentDate = comment.CreatedAt || comment.createdAt || comment.created_at || '';
            const likes = comment.Likes || comment.likes || 0;
            const dislikes = comment.Dislikes || comment.dislikes || 0;
            
            const isCommentAuthor = this.isLoggedIn && this.currentUserID === authorId;
            
            return `
                <div class="comment" data-comment-id="${commentId}">
                    <div class="comment-header">
                        <span class="comment-author">${author}</span>
                        <span class="comment-date">${this.formatDate(commentDate)}</span>
                    </div>
                    <div class="comment-content">${content}</div>
                    <div class="comment-footer">
                        <div class="comment-reactions">
                            <button class="reaction-btn comment-like-btn" data-comment-id="${commentId}">
                                <i class="fas fa-thumbs-up"></i> <span>${likes}</span>
                            </button>
                            <button class="reaction-btn comment-dislike-btn" data-comment-id="${commentId}">
                                <i class="fas fa-thumbs-down"></i> <span>${dislikes}</span>
                            </button>
                        </div>
                        
                        ${isCommentAuthor ? `
                            <div class="comment-actions">
                                <button class="btn btn-sm btn-edit-comment" data-comment-id="${commentId}">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn btn-sm btn-delete-comment" data-comment-id="${commentId}">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    renderError(message) {
        this.container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
                <button onclick="window.history.back()" class="btn btn-outline">
                    <i class="fas fa-arrow-left"></i> Go Back
                </button>
            </div>
        `;
    }
    
    formatDate(dateString) {
        if (!dateString) return 'Unknown date';
        
        try {
            const date = new Date(dateString);
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return 'Invalid date';
            }
            
            // Format: "Jan 15, 2023, 03:45 PM"
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            console.error('Error formatting date:', e);
            return 'Date error';
        }
    }
    
    attachEventListeners() {
        // Like/dislike buttons
        const likeBtn = document.querySelector('.like-btn');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => this.handleLike(this.postId));
        }
        
        const dislikeBtn = document.querySelector('.dislike-btn');
        if (dislikeBtn) {
            dislikeBtn.addEventListener('click', () => this.handleDislike(this.postId));
        }
        
        // Edit/delete post buttons
        const editBtn = document.querySelector('.btn-edit');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                window.navigation.navigateTo(`/edit-post?id=${this.postId}`);
            });
        }
        
        const deleteBtn = document.querySelector('.btn-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.handleDeletePost());
        }
        
        // Comment submission
        const submitCommentBtn = document.getElementById('submit-comment');
        if (submitCommentBtn) {
            submitCommentBtn.addEventListener('click', () => this.handleSubmitComment());
        }
        
        // Comment edit/delete buttons
        const editCommentBtns = document.querySelectorAll('.btn-edit-comment');
        editCommentBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = btn.dataset.commentId;
                this.handleEditComment(commentId);
            });
        });
        
        const deleteCommentBtns = document.querySelectorAll('.btn-delete-comment');
        deleteCommentBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = btn.dataset.commentId;
                this.handleDeleteComment(commentId);
            });
        });
    }
    
    handleLike(postId) {
        if (!this.isLoggedIn) {
            window.navigation.navigateTo('/signin');
            return;
        }
        
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
            if (!response.ok) {
                throw new Error('Failed to like post');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Update UI
                const likesElement = document.getElementById(`likes-${postId}`);
                const dislikesElement = document.getElementById(`dislikes-${postId}`);
                
                if (likesElement) likesElement.textContent = data.likes;
                if (dislikesElement) dislikesElement.textContent = data.dislikes;
                
                // Toggle active state
                const likeBtn = document.querySelector('.like-btn');
                const dislikeBtn = document.querySelector('.dislike-btn');
                
                if (likeBtn) {
                    likeBtn.classList.toggle('active', data.userReaction === 1);
                }
                if (dislikeBtn) {
                    dislikeBtn.classList.remove('active');
                }
            }
        })
        .catch(error => {
            console.error('Error liking post:', error);
        });
    }
    
    handleDislike(postId) {
        if (!this.isLoggedIn) {
            window.navigation.navigateTo('/signin');
            return;
        }
        
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
            if (!response.ok) {
                throw new Error('Failed to dislike post');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Update UI
                const likesElement = document.getElementById(`likes-${postId}`);
                const dislikesElement = document.getElementById(`dislikes-${postId}`);
                
                if (likesElement) likesElement.textContent = data.likes;
                if (dislikesElement) dislikesElement.textContent = data.dislikes;
                
                // Toggle active state
                const likeBtn = document.querySelector('.like-btn');
                const dislikeBtn = document.querySelector('.dislike-btn');
                
                if (dislikeBtn) {
                    dislikeBtn.classList.toggle('active', data.userReaction === 0);
                }
                if (likeBtn) {
                    likeBtn.classList.remove('active');
                }
            }
        })
        .catch(error => {
            console.error('Error disliking post:', error);
        });
    }
    
    handleDeletePost() {
        if (!confirm('Are you sure you want to delete this post?')) {
            return;
        }
        
        fetch('/api/posts/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                post_id: parseInt(this.postId)
            }),
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete post');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Redirect to home page
                window.navigation.navigateTo('/');
            }
        })
        .catch(error => {
            console.error('Error deleting post:', error);
            alert('Failed to delete post: ' + error.message);
        });
    }
    
    handleSubmitComment() {
        const commentInput = document.getElementById('comment-input');
        if (!commentInput || !commentInput.value.trim()) {
            alert('Please enter a comment');
            return;
        }
        
        fetch('/api/posts/comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                post_id: parseInt(this.postId),
                content: commentInput.value.trim()
            }),
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to add comment');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Reload the page to show the new comment
                window.navigation.reloadPage();
            }
        })
        .catch(error => {
            console.error('Error adding comment:', error);
            alert('Failed to add comment: ' + error.message);
        });
    }
    
    handleEditComment(commentId) {
        const commentElement = document.querySelector(`.comment[data-comment-id="${commentId}"]`);
        if (!commentElement) return;
        
        const contentElement = commentElement.querySelector('.comment-content');
        const currentContent = contentElement.textContent;
        
        // Replace content with textarea
        contentElement.innerHTML = `
            <textarea class="edit-comment-textarea">${currentContent}</textarea>
            <div class="edit-comment-actions">
                <button class="btn btn-sm btn-save-comment">Save</button>
                <button class="btn btn-sm btn-cancel-edit">Cancel</button>
            </div>
        `;
        
        // Focus textarea
        const textarea = contentElement.querySelector('textarea');
        textarea.focus();
        
        // Add event listeners
        const saveBtn = contentElement.querySelector('.btn-save-comment');
        saveBtn.addEventListener('click', () => {
            const newContent = textarea.value.trim();
            if (!newContent) {
                alert('Comment cannot be empty');
                return;
            }
            
            fetch('/api/comments/edit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    comment_id: parseInt(commentId),
                    content: newContent
                }),
                credentials: 'include'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update comment');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Update UI
                    contentElement.innerHTML = newContent;
                }
            })
            .catch(error => {
                console.error('Error updating comment:', error);
                alert('Failed to update comment: ' + error.message);
                contentElement.innerHTML = currentContent;
            });
        });
        
        const cancelBtn = contentElement.querySelector('.btn-cancel-edit');
        cancelBtn.addEventListener('click', () => {
            contentElement.innerHTML = currentContent;
        });
    }
    
    handleDeleteComment(commentId) {
        if (!confirm('Are you sure you want to delete this comment?')) {
            return;
        }
        
        fetch('/api/comments/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                comment_id: parseInt(commentId)
            }),
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete comment');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Remove comment from UI
                const commentElement = document.querySelector(`.comment[data-comment-id="${commentId}"]`);
                if (commentElement) {
                    commentElement.remove();
                }
                
                // Update comment count
                const commentsHeading = document.querySelector('.comments-section h3');
                if (commentsHeading) {
                    const currentCount = parseInt(commentsHeading.textContent.match(/\d+/)[0]);
                    commentsHeading.textContent = `Comments (${currentCount - 1})`;
                }
            }
        })
        .catch(error => {
            console.error('Error deleting comment:', error);
            alert('Failed to delete comment: ' + error.message);
        });
    }
}

// Make the component available globally
window.SinglePostComponent = SinglePostComponent;
export default SinglePostComponent;
