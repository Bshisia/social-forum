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
        const profilePic = this.post.ProfilePic || this.post.profilePic || null;
        const imagePath = this.post.ImagePath || this.post.imagePath || '';
        
        // Format category display
        let categoryDisplay = '';
        if (categories && categories.length > 0) {
            // Handle both object and string categories
            const categoryNames = categories.map(cat => 
                typeof cat === 'string' ? cat : (cat.Name || cat.name)
            ).filter(Boolean);
            
            if (categoryNames.length > 0) {
                categoryDisplay = `
                    <div class="post-categories-right">
                        ${categoryNames.map(cat => `
                            <span class="category-tag">${cat}</span>
                        `).join('')}
                    </div>
                `;
            }
        }
        
        const isAuthor = this.isLoggedIn && this.currentUserID === authorId;
        
        // Create avatar HTML based on profile picture
        let avatarHtml = '';
        
        // Debug profile picture data
        console.log('Profile picture data in single post:', profilePic);
        
        // Check all possible profile picture formats
        if (profilePic && typeof profilePic === 'object' && profilePic.Valid) {
            console.log('Using ProfilePic.Valid format in single post');
            avatarHtml = `<img src="${profilePic.String}" alt="Profile Picture" class="post-avatar-img">`;
        } else if (profilePic && typeof profilePic === 'string' && profilePic) {
            console.log('Using ProfilePic string format in single post');
            avatarHtml = `<img src="${profilePic}" alt="Profile Picture" class="post-avatar-img">`;
        } else if (this.post.profile_pic && typeof this.post.profile_pic === 'object' && this.post.profile_pic.Valid) {
            console.log('Using profile_pic.Valid format in single post');
            avatarHtml = `<img src="${this.post.profile_pic.String}" alt="Profile Picture" class="post-avatar-img">`;
        } else if (this.post.profile_pic && typeof this.post.profile_pic === 'string' && this.post.profile_pic) {
            console.log('Using profile_pic string format in single post');
            avatarHtml = `<img src="${this.post.profile_pic}" alt="Profile Picture" class="post-avatar-img">`;
        } else {
            console.log('Using placeholder avatar in single post');
            avatarHtml = `
                <div class="post-avatar-placeholder">
                    <i class="fas fa-user"></i>
                </div>
            `;
        }
        
        let html = `
            <button class="back-button" onclick="window.history.back()">
                <i class="fas fa-arrow-left"></i> Back
            </button>
            
            <div class="post-container">
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
                    
                    <div class="post-content">
                        <h2>${title}</h2>
                        <p>${content}</p>
                        ${imagePath ? `<img src="${imagePath}" alt="Post image" class="post-image">` : ''}
                    </div>
                </div>
                
                <!-- Reaction Buttons -->
                <div class="post-footer">
                    <div class="action-container">
                        <button class="action-btn like-btn" data-post-id="${postId}" data-action="like">
                            <i class="fas fa-thumbs-up"></i>
                            <span class="count" id="likes-${postId}">${likes}</span>
                        </button>
                    </div>
                    <div class="action-container">
                        <button class="action-btn comment-btn" data-post-id="${postId}">
                            <i class="fas fa-comment"></i>
                            <span class="count" id="comments-${postId}">${commentCount}</span>
                        </button>
                    </div>
                    <div class="action-container">
                        <button class="action-btn dislike-btn" data-post-id="${postId}" data-action="dislike">
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
                
                <div class="comments-section">
                    <h3>Comments (${commentCount})</h3>
                    
                    ${this.isLoggedIn ? `
                        <form class="comment-form">
                            <input type="hidden" name="post_id" value="${postId}">
                            <textarea name="content" class="comment-input" id="comment-input" placeholder="Write a comment..." required></textarea>
                            <button type="button" id="submit-comment" class="submit-button">Post Comment</button>
                        </form>
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
            const commentDate = comment.CommentTime || comment.commentTime || comment.CreatedAt || comment.createdAt || comment.created_at || '';
            const likes = comment.Likes || comment.likes || 0;
            const dislikes = comment.Dislikes || comment.dislikes || 0;
            const profilePic = comment.ProfilePic || comment.profilePic || null;
            
            const isCommentAuthor = this.isLoggedIn && this.currentUserID === authorId;
            
            // Create avatar HTML based on profile picture
            let avatarHtml = '';
            if (profilePic && typeof profilePic === 'object' && profilePic.Valid) {
                avatarHtml = `<img src="${profilePic.String}" class="comment-avatar">`;
            } else if (profilePic && typeof profilePic === 'string' && profilePic) {
                avatarHtml = `<img src="${profilePic}" class="comment-avatar">`;
            } else if (comment.profile_pic && typeof comment.profile_pic === 'object' && comment.profile_pic.Valid) {
                avatarHtml = `<img src="${comment.profile_pic.String}" class="comment-avatar">`;
            } else if (comment.profile_pic && typeof comment.profile_pic === 'string' && comment.profile_pic) {
                avatarHtml = `<img src="${comment.profile_pic}" class="comment-avatar">`;
            } else {
                avatarHtml = `
                    <div class="comment-avatar-placeholder">
                        <i class="fas fa-user"></i>
                    </div>
                `;
            }
            
            return `
                <div class="comments-section">
                    <div class="comment-header">
                        ${avatarHtml}
                        <div class="comment-author">
                            <strong>${author}</strong>
                            <span class="comment-time">${this.formatDate(commentDate)}</span>
                        </div>
                    </div>
                    <div class="comment-content" id="comment-content-${commentId}">
                        ${content}
                    </div>
                    ${isCommentAuthor ? `
                        <div class="comment-actions">
                            <button onclick="editComment('${commentId}')" class="edit-btn">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="delete-btn" data-comment-id="${commentId}">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    ` : ''}
                    <!-- Comment Reaction Buttons -->
                    <div class="comment-reaction-buttons">
                        <div class="action-container">
                            <button class="action-btn comment-like-btn" data-comment-id="${commentId}" data-action="like">
                                <i class="fas fa-thumbs-up"></i>
                                <span class="count" id="comment-likes-${commentId}">${likes}</span>
                            </button>
                        </div>
                        <div class="action-container">
                            <button class="action-btn comment-dislike-btn" data-comment-id="${commentId}" data-action="dislike">
                                <i class="fas fa-thumbs-down"></i>
                                <span class="count" id="comment-dislikes-${commentId}">${dislikes}</span>
                            </button>
                        </div>
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
                <button onclick="window.history.back()" class="btn btn-outline back-button">
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
        
        // Delete post button
        const deleteBtn = document.querySelector('.btn-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.handleDeletePost());
        }
        
        // Comment submission
        const submitCommentBtn = document.getElementById('submit-comment');
        if (submitCommentBtn) {
            submitCommentBtn.addEventListener('click', () => this.handleSubmitComment());
        }
        
        // Comment delete buttons
        const deleteCommentBtns = document.querySelectorAll('.delete-btn');
        deleteCommentBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = btn.dataset.commentId;
                this.handleDeleteComment(commentId);
            });
        });
        
        // Comment like/dislike buttons
        const commentLikeBtns = document.querySelectorAll('.comment-like-btn');
        commentLikeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const commentId = btn.dataset.commentId;
                this.handleCommentLike(commentId);
            });
        });
        
        const commentDislikeBtns = document.querySelectorAll('.comment-dislike-btn');
        commentDislikeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const commentId = btn.dataset.commentId;
                this.handleCommentDislike(commentId);
            });
        });
        
        // Define global editComment function
        window.editComment = (commentId) => {
            this.handleEditComment(commentId);
        };
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
    
    handleCommentLike(commentId) {
        if (!this.isLoggedIn) {
            window.navigation.navigateTo('/signin');
            return;
        }
        
        fetch('/api/comments/react', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                comment_id: parseInt(commentId),
                like: 1
            }),
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to like comment');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Update UI
                const likesElement = document.getElementById(`comment-likes-${commentId}`);
                const dislikesElement = document.getElementById(`comment-dislikes-${commentId}`);
                
                if (likesElement) likesElement.textContent = data.likes;
                if (dislikesElement) dislikesElement.textContent = data.dislikes;
                
                // Toggle active state
                const likeBtn = document.querySelector(`.comment-like-btn[data-comment-id="${commentId}"]`);
                const dislikeBtn = document.querySelector(`.comment-dislike-btn[data-comment-id="${commentId}"]`);
                
                if (likeBtn) {
                    likeBtn.classList.toggle('active', data.userReaction === 1);
                }
                if (dislikeBtn) {
                    dislikeBtn.classList.remove('active');
                }
            }
        })
        .catch(error => {
            console.error('Error liking comment:', error);
        });
    }
    
    handleCommentDislike(commentId) {
        if (!this.isLoggedIn) {
            window.navigation.navigateTo('/signin');
            return;
        }
        
        fetch('/api/comments/react', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                comment_id: parseInt(commentId),
                like: 0
            }),
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to dislike comment');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Update UI
                const likesElement = document.getElementById(`comment-likes-${commentId}`);
                const dislikesElement = document.getElementById(`comment-dislikes-${commentId}`);
                
                if (likesElement) likesElement.textContent = data.likes;
                if (dislikesElement) dislikesElement.textContent = data.dislikes;
                
                // Toggle active state
                const likeBtn = document.querySelector(`.comment-like-btn[data-comment-id="${commentId}"]`);
                const dislikeBtn = document.querySelector(`.comment-dislike-btn[data-comment-id="${commentId}"]`);
                
                if (dislikeBtn) {
                    dislikeBtn.classList.toggle('active', data.userReaction === 0);
                }
                if (likeBtn) {
                    likeBtn.classList.remove('active');
                }
            }
        })
        .catch(error => {
            console.error('Error disliking comment:', error);
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
        const contentElement = document.getElementById(`comment-content-${commentId}`);
        if (!contentElement) return;
        
        const currentContent = contentElement.textContent.trim();
        
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
                const commentElement = document.querySelector(`.comments-section[data-comment-id="${commentId}"]`);
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
