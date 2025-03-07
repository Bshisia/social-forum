class SinglePostComponent {
    constructor(postId) {
        this.postId = postId;
        this.post = null;
        this.comments = [];
        this.isLoggedIn = window.isLoggedIn;
        this.currentUserID = window.currentUserID;
        this.mainContainer = document.getElementById('main-content');
    }

    async loadPost() {
        try {
            // First get user status
            const statusResponse = await fetch('/api/user-status');
            const statusData = await statusResponse.json();
            this.isLoggedIn = statusData.isLoggedIn;
            this.currentUserID = statusData.currentUserID;

            // Then load post
            const response = await fetch(`/api/posts/single?id=${this.postId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (!data || !data.post) {
                throw new Error('Invalid post data');
            }

            this.post = data.post;
            this.comments = data.comments || [];
            
            this.render();
            this.attachEventListeners();
        } catch (error) {
            console.error('Error:', error);
            this.renderError(error.message);
        }
    }
    renderError(message = 'Error loading post') {
        this.mainContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
                <button onclick="window.history.back()" class="btn btn-outline">
                    <i class="fas fa-arrow-left"></i> Go Back
                </button>
            </div>`;
    }
    render() {
        if (!this.post) return;
        
        const template = `
            <div class="post-container">
                <button class="back-button" onclick="window.history.back()">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
                <div class="post-card">
                    <div class="post-header">
                        <div class="post-avatar">
                            ${this.post.ProfilePic ? 
                                `<img src="${this.post.ProfilePic}" alt="Profile Picture" class="post-avatar-img">` :
                                `<div class="post-avatar-placeholder">
                                    <i class="fas fa-user"></i>
                                </div>`
                            }
                        </div>
                        <div class="post-info">
                            <h3>${this.post.Username}</h3>
                            <span class="timestamp">${this.post.PostTime}</span>
                        </div>
                        <div class="post-categories-right">
                            ${this.post.Categories ? 
                                this.post.Categories.map(cat => 
                                    `<span class="category-tag">${cat.Name}</span>`
                                ).join('') : ''
                            }
                        </div>
                    </div>

                    <div class="post-content">
                        <h2>${this.post.Title}</h2>
                        <p>${this.post.Content}</p>
                        ${this.post.ImagePath ? 
                            `<img src="${this.post.ImagePath}" alt="Post image" class="post-image">` : 
                            ''}
                    </div>

                    <div class="post-footer">
                        ${this.renderActions()}
                    </div>
                </div>
                ${this.renderComments()}
            </div>`;

        this.mainContainer.innerHTML = template;
    }

    renderActions() {
        return `
            <div class="post-actions">
                <button class="action-btn like-btn" data-post-id="${this.post.ID}">
                    <i class="fas fa-thumbs-up"></i>
                    <span class="count" id="likes-${this.post.ID}">${this.post.Likes}</span>
                </button>
                <button class="action-btn comment-btn" data-post-id="${this.post.ID}">
                    <i class="fas fa-comment"></i>
                    <span class="count" id="comments-${this.post.ID}">${this.post.Comments}</span>
                </button>
                <button class="action-btn dislike-btn" data-post-id="${this.post.ID}">
                    <i class="fas fa-thumbs-down"></i>
                    <span class="count" id="dislikes-${this.post.ID}">${this.post.Dislikes}</span>
                </button>
                
                ${this.post.UserID === this.currentUserID ? `
                    <button class="btn btn-edit" data-post-id="${this.post.ID}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-delete" data-post-id="${this.post.ID}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                ` : ''}
            </div>`;
    }

    renderComments() {
        return `
            <div class="comments-section">
                <h3>Comments (${this.comments.length})</h3>
                ${this.isLoggedIn ? `
                    <form class="comment-form">
                        <input type="hidden" name="post_id" value="${this.post.ID}">
                        <textarea name="content" class="comment-input" placeholder="Write a comment..." required></textarea>
                        <button type="submit" class="submit-button">Post Comment</button>
                    </form>
                ` : ''}
                <div class="comments-list">
                    ${this.comments.map(comment => `
                        <div class="comment" id="comment-${comment.ID}">
                            <div class="comment-header">
                                ${comment.ProfilePic ? 
                                    `<img src="${comment.ProfilePic}" class="comment-avatar">` :
                                    `<div class="comment-avatar-placeholder">
                                        <i class="fas fa-user"></i>
                                    </div>`
                                }
                                <div class="comment-author">
                                    <strong>${comment.Username}</strong>
                                    <span class="comment-time">${new Date(comment.CommentTime).toLocaleString()}</span>
                                </div>
                            </div>
                            <div class="comment-content" id="comment-content-${comment.ID}">
                                ${comment.Content}
                            </div>
                            ${comment.UserID === this.currentUserID ? `
                                <div class="comment-actions">
                                    <button class="edit-btn" data-comment-id="${comment.ID}">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="delete-btn" data-comment-id="${comment.ID}">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    renderCommentForm() {
        return `
            <form class="comment-form">
                <textarea class="comment-input" placeholder="Write a comment..." required></textarea>
                <button type="submit" class="submit-button">Post Comment</button>
            </form>`;
    }

    renderComment(comment) {
        return `
            <div class="comment">
                <div class="comment-header">
                    ${comment.ProfilePic ? 
                        `<img src="${comment.ProfilePic}" class="comment-avatar">` :
                        `<div class="comment-avatar-placeholder">
                            <i class="fas fa-user"></i>
                        </div>`
                    }
                    <div class="comment-author">
                        <strong>${comment.Username}</strong>
                        <span class="comment-time">${new Date(comment.CommentTime).toLocaleString()}</span>
                    </div>
                </div>
                <div class="comment-content">
                    ${comment.Content}
                </div>
            </div>`;
    }

    
    editComment(commentId) {
        const contentDiv = document.getElementById(`comment-content-${commentId}`);
        if (!contentDiv) return;
    
        // Get exact comment text
        const comment = this.comments.find(c => c.ID === parseInt(commentId));
        if (!comment) return;
        
        // Create edit form with existing comment content
        const formHTML = `
            <form class="edit-comment-form">
                <textarea class="comment-input" required>${comment.Content}</textarea>
                <div class="edit-buttons">
                    <button type="submit" class="save-btn">
                        <i class="fas fa-check"></i> Save
                    </button>
                    <button type="button" class="cancel-btn">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </form>`;
        
        contentDiv.innerHTML = formHTML;
        
        const form = contentDiv.querySelector('form');
        const cancelBtn = form.querySelector('.cancel-btn');
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const newContent = e.target.querySelector('textarea').value.trim();
            this.handleCommentEdit(e, commentId, newContent);
        });
    
        cancelBtn.addEventListener('click', () => {
            contentDiv.innerHTML = comment.Content;
        });
    }

    attachEventListeners() {
        const likeButton = document.querySelector('.like-btn');
        if (likeButton) {
            likeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const postId = likeButton.dataset.postId;
                const postsComponent = new PostsComponent();
                postsComponent.handleLike(postId);
            });
        }

        // Dislike button
        const dislikeButton = document.querySelector('.dislike-btn');
        if (dislikeButton) {
            dislikeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const postId = dislikeButton.dataset.postId;
                const postsComponent = new PostsComponent();
                postsComponent.handleDislike(postId);
            });
        }

        const commentForm = document.querySelector('.comment-form');
        if (commentForm) {
            commentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCommentSubmit(e);
            });
        }
        const editButton = document.querySelector('.btn-edit');
        if (editButton) {
            editButton.addEventListener('click', () => {
                window.navigation.navigateTo(`/edit-post?id=${this.postId}`);
            });
        }

        // Add delete button handler
        const deleteButton = document.querySelector('.btn-delete');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this post?')) {
                    this.handleDelete();
                }
            });
        }
        document.querySelectorAll('.comment').forEach(comment => {
            const editBtn = comment.querySelector('.edit-btn');
            const deleteBtn = comment.querySelector('.delete-btn');
            
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    const commentId = editBtn.dataset.commentId;
                    this.editComment(commentId);
                });
            }
            
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    const commentId = deleteBtn.dataset.commentId;
                    this.deleteComment(commentId);
                });
            }
        });
    }

    handleCommentSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const postId = formData.get('post_id');
        const content = formData.get('content');
    
        fetch('/api/posts/comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                post_id: parseInt(postId),
                content: content
            }),
            credentials: 'include'
        })
        .then(response => {
            if (response.status === 401) {
                window.navigation.navigateTo('/signin');
                return;
            }
            return response.json();
        })
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Failed to add comment');
            }
            this.loadPost(); // Reload post data instead of navigating
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message);
        });
    }

    handleDelete() {
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
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.navigation.navigateTo('/');
            } else {
                throw new Error(data.error || 'Failed to delete post');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message);
        });
    }

    async handleCommentEdit(e, commentId, content) {
        e.preventDefault();
        
        try {
            const response = await fetch('/api/comments/edit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    comment_id: parseInt(commentId),
                    content: content
                }),
                credentials: 'include'
            });
    
            const data = await response.json();
            
            if (data.success) {
                await this.loadPost();
            } else {
                throw new Error(data.error || 'Failed to update comment');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
            // Restore original content on error
            document.getElementById(`comment-content-${commentId}`).innerHTML = content;
        }
    }

    cancelEdit(commentId, content) {
        const contentDiv = document.getElementById(`comment-content-${commentId}`);
        if (contentDiv) {
            contentDiv.innerHTML = content;
        }
    }

    async deleteComment(commentId) {
        // Single confirmation prompt
        if (!confirm('Are you sure you want to delete this comment?')) {
            return;
        }
    
        // Immediately disable the delete button to prevent multiple clicks
        const deleteBtn = document.querySelector(`button[data-comment-id="${commentId}"]`);
        if (deleteBtn) {
            deleteBtn.disabled = true;
        }
    
        try {
            const response = await fetch('/api/comments/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    comment_id: parseInt(commentId)
                }),
                credentials: 'include'
            });
    
            const data = await response.json();
            
            if (data.success) {
                await this.loadPost();
            } else {
                throw new Error(data.error || 'Failed to delete comment');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
            // Re-enable the button if there was an error
            if (deleteBtn) {
                deleteBtn.disabled = false;
            }
        }
    }

    mount() {
        this.loadPost();
    }    


}
