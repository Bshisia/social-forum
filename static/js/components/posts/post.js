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
            const response = await fetch(`/api/posts/single?id=${this.postId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Post data:', data); // Debug logging
            
            if (!data || !data.post) {
                throw new Error('Invalid post data');
            }

            this.post = data.post;
            this.comments = data.comments || [];
            
            // Debug logging
            console.log('Post categories:', this.post.Categories);
            
            this.render();
            this.attachEventListeners();
        } catch (error) {
            console.error('Error loading post:', error);
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
            <div class="action-container">
                <button class="action-btn like-btn" data-post-id="${this.post.ID}" data-action="like">
                    <i class="fas fa-thumbs-up"></i>
                    <span class="count" id="likes-${this.post.ID}">${this.post.Likes}</span>
                </button>
            </div>
            <div class="action-container">
                <button class="action-btn comment-btn" data-post-id="${this.post.ID}">
                    <i class="fas fa-comment"></i>
                    <span class="count" id="comments-${this.post.ID}">${this.post.Comments}</span>
                </button>
            </div>
            <div class="action-container">
                <button class="action-btn dislike-btn" data-post-id="${this.post.ID}" data-action="dislike">
                    <i class="fas fa-thumbs-down"></i>
                    <span class="count" id="dislikes-${this.post.ID}">${this.post.Dislikes}</span>
                </button>
            </div>`;
    }

    renderComments() {
        return `
            <div class="comments-section">
                <h3>Comments (${this.comments.length})</h3>
                ${this.isLoggedIn ? this.renderCommentForm() : ''}
                ${this.comments.map(comment => this.renderComment(comment)).join('')}
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

    attachEventListeners() {
        // Add event listeners for likes, comments, etc.
    }

    mount() {
        this.loadPost();
    } 


}