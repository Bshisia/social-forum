class CreatePostComponent {
    constructor() {
        this.mainContainer = document.getElementById('main-content');
        this.errorMessage = '';
    }

    render() {
        return `
            <div class="create-post-container">
                <h2>Create New Post</h2>
                ${this.errorMessage ? `
                    <div class="error-message">${this.errorMessage}</div>
                ` : ''}
                <form id="create-post-form" class="create-post-form" method="POST" action="/api/posts/create" enctype="multipart/form-data">
                    <div class="form-group">
                        <label for="post-title">Title</label>
                        <input type="text" 
                               id="post-title" 
                               name="title" 
                               required 
                               placeholder="Enter your post title">
                    </div>
                    <div class="form-group">
                        <label for="post-description">Description</label>
                        <textarea id="post-description" 
                                  name="content" 
                                  required 
                                  placeholder="Write your post content here"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="image">Image</label>
                        <div class="image-upload-container" onclick="document.getElementById('image-input').click()">
                            <input type="file" id="image-input" name="image" accept="image/*" style="display: none;">
                            <div class="image-preview" id="image-preview">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>Click to upload image</p>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="post-categories">Categories</label>
                        <div id="post-categories">
                            <label><input type="checkbox" name="categories[]" value="Tech"> Tech</label>
                            <label><input type="checkbox" name="categories[]" value="Programming"> Programming</label>
                            <label><input type="checkbox" name="categories[]" value="Business"> Business</label>
                            <label><input type="checkbox" name="categories[]" value="Lifestyle"> Lifestyle</label>
                            <label><input type="checkbox" name="categories[]" value="Football"> Football</label>
                            <label><input type="checkbox" name="categories[]" value="Politics"> Politics</label>
                            <label><input type="checkbox" name="categories[]" value="General News"> General News</label>
                        </div>
                        <p><small>You need select at least one category to proceed.</small></p>
                        <div class="error-message" id="category-error" style="display: none; color: red;">
                            You need select at least one category to proceed.
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="window.history.back()" class="btn btn-primary">
                            <i class="fas fa-x"></i> Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-check"></i> Create Post
                        </button>
                    </div>
                </form>
            </div>`;
    }

    mount() {
        // Hide sidebars
        const filterNav = document.getElementById('filter-nav');
        const usersNav = document.getElementById('users-nav');
        if (filterNav) filterNav.style.display = 'none';
        if (usersNav) usersNav.style.display = 'none';
    
        // Add class to main layout for create post page
        const mainLayout = document.querySelector('.main-layout');
        if (mainLayout) {
            mainLayout.classList.add('create-post-layout');
        }
    
        // Render form
        this.mainContainer.innerHTML = this.render();
        this.attachEventListeners();
    }
    
    // Add cleanup when component unmounts
    unmount() {
        const mainLayout = document.querySelector('.main-layout');
        if (mainLayout) {
            mainLayout.classList.remove('create-post-layout');
        }
    }

    validateForm() {
        const title = document.getElementById('post-title').value.trim();
        const content = document.getElementById('post-description').value.trim();
        const categories = document.querySelectorAll('input[name="categories[]"]:checked');
        const categoryError = document.getElementById('category-error');

        if (!title || !content) {
            this.errorMessage = 'Title and content are required';
            return false;
        }

        if (categories.length === 0) {
            categoryError.style.display = 'block';
            return false;
        }

        categoryError.style.display = 'none';
        return true;
    }

    handleSubmit(e) {
        e.preventDefault();
        if (!this.validateForm()) return;
    
        const form = e.target;
        const formData = new FormData(form);
    
        fetch('/api/posts/create', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create post');
            }
            return data;
        })
        .then(data => {
            if (data.success) {
                this.unmount(); // Clean up first
                window.navigation.navigateTo('/');
            } else {
                throw new Error(data.error || 'Failed to create post');
            }
        })
        .catch(error => {
            console.error('Create post error:', error);
            this.errorMessage = error.message;
            this.mount();
        });
    }

    unmount() {
        // Show sidebars again
        const filterNav = document.getElementById('filter-nav');
        const usersNav = document.getElementById('users-nav');
        if (filterNav) filterNav.style.display = '';
        if (usersNav) usersNav.style.display = '';

        // Remove create post layout class
        const mainLayout = document.querySelector('.main-layout');
        if (mainLayout) {
            mainLayout.classList.remove('create-post-layout');
        }
    }


    attachEventListeners() {
        const form = document.getElementById('create-post-form');
        form.addEventListener('submit', this.handleSubmit.bind(this));

        const imageInput = document.getElementById('image-input');
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const preview = document.getElementById('image-preview');
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; height: auto;">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

export default CreatePostComponent;