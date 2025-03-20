import AuthService from '../../services/auth-service.js';

class ProfileComponent {
    constructor(userId) {
        this.userId = userId;
        this.userData = null;
        this.userStats = {
            postCount: 0,
            commentCount: 0,
            likesReceived: 0
        };
        this.isCurrentUser = false;
        this.container = null;
    }

    mount(container = document.getElementById('main-content')) {
        this.container = container;
        if (!this.container) {
            console.error('Cannot mount ProfileComponent: container element not found');
            return;
        }
        
        // Show loading state
        this.container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading profile...</p>
            </div>
        `;
        
        // Check if this is the current user's profile
        const currentUser = AuthService.getCurrentUser();
        this.isCurrentUser = currentUser && currentUser.id === this.userId;
        
        // Load profile data
        this.loadProfile();
    }

    loadProfile() {
        console.log(`Loading profile for user ID: ${this.userId}`);
        
        fetch(`/api/users/profile?id=${this.userId}`, {
            credentials: 'include'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load profile: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Profile data received:', data);
                
                // Check if data is nested inside a profile property
                if (data.profile) {
                    console.log('Profile data is nested, extracting from profile property');
                    this.userData = data.profile;
                } else {
                    this.userData = data;
                }
                
                // Debug: Log all field names to see what's available
                console.log('Available fields in extracted profile data:', Object.keys(this.userData));
                
                // Load user stats
                return this.loadUserStats();
            })
            .then(() => {
                this.render();
            })
            .catch(error => {
                console.error('Error:', error);
                this.renderError(`Error: ${error.message}`);
            });
    }

    loadUserStats() {
        return fetch(`/api/users/stats?id=${this.userId}`, {
            credentials: 'include'
        })
            .then(response => {
                if (!response.ok) {
                    // If stats endpoint fails, we'll use default values
                    console.warn(`Failed to load user stats: ${response.status}`);
                    return null;
                }
                return response.json();
            })
            .then(data => {
                if (data) {
                    console.log('User stats:', data);
                    this.userStats = {
                        postCount: data.post_count || data.postCount || 0,
                        commentCount: data.comment_count || data.commentCount || 0,
                        likesReceived: data.likes_received || data.likesReceived || 0
                    };
                }
            })
            .catch(error => {
                console.error('Error loading user stats:', error);
                // Continue rendering even if stats fail to load
            });
    }

    render() {
        if (!this.userData) {
            this.renderError('User data not available');
            return;
        }
        
        // Debug: Log the userData to see its structure
        console.log('User data for rendering:', this.userData);
        
        // Extract user data with fallbacks for different field names
        // Try all possible field name variations
        const nickname = this.userData.nickname || 
                         this.userData.Nickname || 
                         this.userData.userName || 
                         this.userData.UserName || 
                         this.userData.username || 
                         this.userData.Username;
                         
        // Debug: Log the extracted nickname
        console.log('Extracted nickname:', nickname);
        
        // If nickname is still undefined, use a fallback
        const displayName = nickname || 'User ' + this.userId.substring(0, 8);
        
        const email = this.userData.email || 
                      this.userData.Email || 
                      '';
        
        // Handle profile picture
        let profilePic = null;
        let profilePicValid = false;
        
        if (this.userData.profile_pic && this.userData.profile_pic.Valid) {
            profilePic = this.userData.profile_pic.String;
            profilePicValid = true;
        } else if (this.userData.profile_pic && typeof this.userData.profile_pic === 'string' && this.userData.profile_pic) {
            profilePic = this.userData.profile_pic;
            profilePicValid = true;
        } else if (this.userData.ProfilePic && this.userData.ProfilePic.Valid) {
            profilePic = this.userData.ProfilePic.String;
            profilePicValid = true;
        } else if (this.userData.ProfilePic && typeof this.userData.ProfilePic === 'string' && this.userData.ProfilePic) {
            profilePic = this.userData.ProfilePic;
            profilePicValid = true;
        } else if (this.userData.profilePic && this.userData.profilePic.Valid) {
            profilePic = this.userData.profilePic.String;
            profilePicValid = true;
        } else if (this.userData.profilePic && typeof this.userData.profilePic === 'string' && this.userData.profilePic) {
            profilePic = this.userData.profilePic;
            profilePicValid = true;
        }
        
        let html = `
            <div class="page-header">
                <h1 class="page-title">PROFILE</h1>
            </div>
            
            <div class="profile-container">
                <div class="profile-header">
                    <div class="profile-pic-section">
                        ${profilePicValid ? 
                            `<img src="${profilePic}" alt="" class="profile-pic">` :
                            `<div class="profile-pic-placeholder">
                                <i class="fas fa-user-circle"></i>
                            </div>`
                        }
                    </div>
                    <div class="profile-info">
                        <h1 class="profile-name">${displayName}</h1>
                        <p class="profile-email">${email}</p>
                    </div>
                </div>
                
                ${this.isCurrentUser ? `
                    <div class="profile-actions">
                        <form id="profile-pic-form" enctype="multipart/form-data">
                            <label for="profile_pic" class="change-photo-link">
                                Change photo
                            </label>
                            <input type="file" id="profile_pic" name="profile_pic" accept="image/*" style="display: none">
                        </form>
                    </div>
                ` : ''}
            </div>
            
            <div class="stats-container">
                <div class="stat-card" onclick="window.navigation.navigateTo('/created')" style="cursor: pointer;">
                    <i class="fas fa-pencil-alt"></i>
                    <h3>Posts Created</h3>
                    <span class="stat-number">${this.userStats.postCount}</span>
                    <div class="stat-link">
                        <span>View Posts</span>
                        <i class="fas fa-arrow-right"></i>
                    </div>
                </div>
                <div class="stat-card" onclick="window.navigation.navigateTo('/commented')" style="cursor: pointer;">
                    <i class="fas fa-comment"></i>
                    <h3>Comments Made</h3>
                    <span class="stat-number">${this.userStats.commentCount}</span>
                    <div class="stat-link">
                        <span>View Comments</span>
                        <i class="fas fa-arrow-right"></i>
                    </div>
                </div>
                <div class="stat-card" onclick="window.navigation.navigateTo('/liked')" style="cursor: pointer;">
                    <i class="fas fa-heart"></i>
                    <h3>Likes Given</h3>
                    <span class="stat-number">${this.userStats.likesReceived}</span>
                    <div class="stat-link">
                        <span>View Liked Posts</span>
                        <i class="fas fa-arrow-right"></i>
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
        this.attachEventListeners();
    }
    
    renderError(message) {
        this.container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">PROFILE</h1>
            </div>
            
            <div class="profile-container">
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>${message}</p>
                    <button onclick="window.history.back()" class="btn btn-outline back-button">
                        <i class="fas fa-arrow-left"></i> Go Back
                    </button>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        // Profile picture upload
        const profilePicInput = document.getElementById('profile_pic');
        if (profilePicInput) {
            profilePicInput.addEventListener('change', this.handleProfilePicUpdate.bind(this));
        }
        
        // Make stat cards clickable
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const route = e.currentTarget.getAttribute('onclick');
                if (route) {
                    // Extract the route from the onclick attribute
                    const routeMatch = route.match(/navigateTo\('([^']+)'\)/);
                    if (routeMatch && routeMatch[1]) {
                        window.navigation.navigateTo(routeMatch[1]);
                    }
                }
            });
        });
    }
    
    handleProfilePicUpdate(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
        
        // Show loading state
        const profilePicSection = document.querySelector('.profile-pic-section');
        if (profilePicSection) {
            const originalContent = profilePicSection.innerHTML;
            profilePicSection.innerHTML = `
                <div class="loading-spinner"></div>
                <p>Uploading...</p>
            `;
            
            const formData = new FormData();
            formData.append('profile_pic', file);
            
            // Add a delay to ensure the file is properly attached
            setTimeout(() => {
                fetch('/api/users/profile-pic', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to update profile picture: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log('Profile picture updated:', data);
                        
                        // Reload the profile to show the updated picture
                        this.loadProfile();
                    })
                    .catch(error => {
                        console.error('Error updating profile picture:', error);
                        
                        // Show error in profile pic section
                        if (profilePicSection) {
                            profilePicSection.innerHTML = `
                                <div class="error-message">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <p>Error: ${error.message}</p>
                                </div>
                            `;
                            
                            // Restore original state after a delay
                            setTimeout(() => {
                                profilePicSection.innerHTML = originalContent;
                            }, 3000);
                        }
                    });
            }, 100);
        }
    }
}

export default ProfileComponent;
