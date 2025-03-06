class EditPostComponent {
    constructor(postId) {
        this.postId = postId;
        this.post = null;
        this.mainContainer = document.getElementById('main-content');
        this.previousPath = document.referrer || '/';
    }

    async loadPost() {
        try {
            const response = await fetch(`/api/posts/single?id=${this.postId}`);
            if (!response.ok) {
                throw new Error('Failed to load post');
            }
            const data = await response.json();
            this.post = data.post;
            this.render();
        } catch (error) {
            console.error('Error:', error);
            this.renderError('Failed to load post');
        }
    }

    render() {
        if (!this.post) {
            this.renderError('Post not found');
            return;
        }
    
        this.mainContainer.innerHTML = `
            <div class="post-container">
                <div class="post-card">
                    <div class="post-header">
                        <h2>Edit Post</h2>
                    </div>
                    
                    <form id="edit-post-form">
                        <input type="hidden" name="post_id" value="${this.post.ID}">
                        
                        <div class="form-group">
                            <label for="title">Title:</label>
                            <input type="text" id="title" name="title" value="${this.post.Title}" required>
                        </div>
    
                        <div class="form-group">
                            <label for="content">Content:</label>
                            <textarea id="content" name="content" required>${this.post.Content}</textarea>
                        </div>
    
                        ${this.post.ImagePath ? `
                            <div class="form-group">
                                <label>Current Image:</label>
                                <div class="post-image-preview">
                                    <img src="${this.post.ImagePath}" alt="Post image" class="post-image">
                                    <input type="hidden" name="existing_image" value="${this.post.ImagePath}">
                                </div>
                            </div>
                        ` : ''}
    
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                            <button type="button" onclick="window.navigation.navigateTo('/')" class="btn btn-outline">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                            <button type="button" id="delete-post-btn" class="btn btn-delete">
                                <i class="fas fa-trash"></i> Delete Post
                            </button>
                        </div>
                    </form>
                </div>
            </div>`;
    
        this.attachEventListeners();
    }
    attachEventListeners() {
        const form = document.getElementById('edit-post-form');
        const deleteBtn = document.getElementById('delete-post-btn');

        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.handleDelete());
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const title = form.querySelector('#title').value;
        const content = form.querySelector('#content').value;
    
        if (!title || !content) {
            alert('Title and content are required');
            return;
        }
    
        fetch('/api/posts/edit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                post_id: parseInt(this.postId),
                title: title,
                content: content
            }),
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to update post');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Check if we came from single post view
                if (this.previousPath.includes(`?id=${this.postId}`)) {
                    window.navigation.navigateTo(`/?id=${this.postId}`);
                } else {
                    window.navigation.navigateTo('/');
                }
            } else {
                throw new Error(data.error || 'Failed to update post');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message);
        });
    }

    handleDelete() {
        if (confirm('Are you sure you want to delete this post?')) {
            fetch('/api/posts/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    post_id: this.postId
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
    }

    renderError(message) {
        this.mainContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
                <button onclick="window.history.back()" class="btn btn-outline">
                    <i class="fas fa-arrow-left"></i> Go Back
                </button>
            </div>`;
    }

    mount() {
        this.loadPost();
    }
}