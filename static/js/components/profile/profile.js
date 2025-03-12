class ProfileComponent {
    constructor(userId) {
        this.userId = userId;
        this.profile = null;
        this.mainContainer = document.getElementById('main-content');
        this.isLoggedIn = window.isLoggedIn;
        this.currentUserID = window.currentUserID;
    }

    async loadProfile() {
        try {
            const statusResponse = await fetch('/api/user-status');
            const statusData = await statusResponse.json();
            this.isLoggedIn = statusData.isLoggedIn;
            this.currentUserID = statusData.currentUserID;
    
            // Ensure we have a valid userId
            if (!this.userId) {
                this.userId = this.currentUserID;
            }
    
            const response = await fetch(`/api/users/profile?id=${this.userId}`);
            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to load profile');
            }
    
            this.profile = data.profile;
            this.profile.IsOwnProfile = this.currentUserID === this.userId;
    
            this.render();
            this.attachEventListeners();
        } catch (error) {
            console.error('Error:', error);
            if (error.message.includes('user not found')) {
                window.navigation.navigateTo('/');
            } else {
                this.renderError(error.message);
            }
        }
    }

    render() {
        const template = `
            <div class="page-header">
                <h1 class="page-title">PROFILE</h1>
            </div>

            <div class="profile-container">
                ${this.profile.ErrorMessage ? `
                    <div class="error-message">
                        ${this.profile.ErrorMessage}
                    </div>
                ` : ''}
                
                <div class="profile-header">
                    <div class="profile-pic-section">
                        ${this.profile.ProfilePic ? 
                            `<img src="${this.profile.ProfilePic}" alt="" class="profile-pic">` :
                            `<div class="profile-pic-placeholder">
                                <i class="fas fa-user"></i>
                            </div>`
                        }
                    </div>
                    <div class="profile-info">
                        <h1 class="profile-name">${this.profile.Username}</h1>
                        <p class="profile-email">${this.profile.Email}</p>
                    </div>
                </div>

                ${this.profile.IsOwnProfile ? `
                    <div class="profile-actions">
                        <form id="profile-pic-form" action="/api/users/profile-pic" method="POST" enctype="multipart/form-data">
                            <label for="profile_pic" class="change-photo-link">
                                Change photo
                            </label>
                            <input type="file" id="profile_pic" name="profile_pic" accept="image/*" style="display: none">
                        </form>
                    </div>
                ` : ''}

                <div class="stats-container">
                    <div class="stat-card" onclick="window.location.href='/created'">
                        <i class="fas fa-pencil-alt"></i>
                        <h3>Posts Created</h3>
                        <span class="stat-number">${this.profile.PostCount}</span>
                        <div class="stat-link">
                            <span>View Posts</span>
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                    <div class="stat-card" onclick="window.location.href='/commented'">
                        <i class="fas fa-comment"></i>
                        <h3>Comments Made</h3>
                        <span class="stat-number">${this.profile.CommentCount}</span>
                        <div class="stat-link">
                            <span>View Comments</span>
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                    <div class="stat-card" onclick="window.location.href='/liked'">
                        <i class="fas fa-heart"></i>
                        <h3>Likes Given</h3>
                        <span class="stat-number">${this.profile.LikesReceived}</span>
                        <div class="stat-link">
                            <span>View Liked Posts</span>
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                </div>
            </div>`;

        this.mainContainer.innerHTML = template;
    }

    attachEventListeners() {
        const profilePicInput = document.getElementById('profile_pic');
        if (profilePicInput) {
            profilePicInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleProfilePicUpdate(file);
                }
            });
        }
    }

    async handleProfilePicUpdate(file) {
        const formData = new FormData();
        formData.append('profile_pic', file);

        try {
            const response = await fetch('/api/users/profile-pic', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                this.loadProfile(); // Reload profile after update
            } else {
                throw new Error(data.error || 'Failed to update profile picture');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    }

    renderError(message) {
        this.mainContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>`;
    }

    mount() {
        this.loadProfile();
    }
}