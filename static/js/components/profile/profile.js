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

        // Add a timestamp to prevent caching
        const timestamp = new Date().getTime();

        fetch(`/api/users/profile?id=${this.userId}&_=${timestamp}`, {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        })
            .then(response => {
                console.log('Profile API response status:', response.status);
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

                if (!this.userData || Object.keys(this.userData).length === 0) {
                    throw new Error('Profile data is empty or invalid');
                }

                // Load user stats
                return this.loadUserStats();
            })
            .then(() => {
                this.render();
            })
            .catch(error => {
                console.error('Error loading profile:', error);

                // Try an alternative approach - get current user from AuthService
                if (this.isCurrentUser) {
                    console.log('Trying to use AuthService data as fallback');
                    const currentUser = AuthService.getCurrentUser();
                    if (currentUser) {
                        this.userData = {
                            id: currentUser.id,
                            nickname: currentUser.nickname,
                            email: currentUser.email
                        };
                        this.loadUserStats().then(() => this.render());
                        return;
                    }
                }

                this.renderError(`Error loading profile: ${error.message}. Please try refreshing the page.`);
            });
    }

    loadUserStats() {
        console.log(`Loading stats for user ID: ${this.userId}`);

        // Add a timestamp to prevent caching
        const timestamp = new Date().getTime();

        return fetch(`/api/users/stats?id=${this.userId}&_=${timestamp}`, {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        })
            .then(response => {
                console.log('Stats API response status:', response.status);
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
            console.error('Cannot render profile: User data not available');
            this.renderError('User data not available. Please try refreshing the page.');
            return;
        }

        // Debug: Log the userData to see its structure
        console.log('User data for rendering:', this.userData);

        // Initialize userStats if it doesn't exist
        if (!this.userStats) {
            console.warn('User stats not available, using defaults');
            this.userStats = {
                postCount: 0,
                commentCount: 0,
                likesReceived: 0
            };
        }

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

        // Create navigation URLs with user ID for other users' profiles
        const createdPostsUrl = this.isCurrentUser ? '/created' : `/created?user_id=${this.userId}`;
        const commentedPostsUrl = this.isCurrentUser ? '/commented' : `/commented?user_id=${this.userId}`;
        const likedPostsUrl = this.isCurrentUser ? '/liked' : `/liked?user_id=${this.userId}`;

        // Determine if stats cards should be clickable based on count
        const postCount = this.userStats.post_count || this.userStats.postCount || 0;
        const commentCount = this.userStats.comment_count || this.userStats.commentCount || 0;
        const likesReceived = this.userStats.likes_received || this.userStats.likesReceived || 0;

        const createdClickable = postCount > 0;
        const commentedClickable = commentCount > 0;
        const likedClickable = likesReceived > 0;

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
                <div class="stat-card ${createdClickable ? 'clickable' : 'disabled'}"
                     ${createdClickable ? `data-url="${createdPostsUrl}"` : ''}
                     style="cursor: ${createdClickable ? 'pointer' : 'default'};">
                    <i class="fas fa-pencil-alt"></i>
                    <h3>Posts Created</h3>
                    <span class="stat-number">${postCount}</span>
                    <div class="stat-link">
                        <span>${createdClickable ? 'View Posts' : 'No Posts'}</span>
                        ${createdClickable ? '<i class="fas fa-arrow-right"></i>' : ''}
                    </div>
                </div>
                <div class="stat-card ${commentedClickable ? 'clickable' : 'disabled'}"
                     ${commentedClickable ? `data-url="${commentedPostsUrl}"` : ''}
                     style="cursor: ${commentedClickable ? 'pointer' : 'default'};">
                    <i class="fas fa-comment"></i>
                    <h3>Comments Made</h3>
                    <span class="stat-number">${commentCount}</span>
                    <div class="stat-link">
                        <span>${commentedClickable ? 'View Comments' : 'No Comments'}</span>
                        ${commentedClickable ? '<i class="fas fa-arrow-right"></i>' : ''}
                    </div>
                </div>
                <div class="stat-card ${likedClickable ? 'clickable' : 'disabled'}"
                     ${likedClickable ? `data-url="${likedPostsUrl}"` : ''}
                     style="cursor: ${likedClickable ? 'pointer' : 'default'};">
                    <i class="fas fa-heart"></i>
                    <h3>Likes Given</h3>
                    <span class="stat-number">${likesReceived}</span>
                    <div class="stat-link">
                        <span>${likedClickable ? 'View Liked Posts' : 'No Likes'}</span>
                        ${likedClickable ? '<i class="fas fa-arrow-right"></i>' : ''}
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

        // Make stat cards clickable only if they have content
        const statCards = document.querySelectorAll('.stat-card.clickable');
        statCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const url = card.getAttribute('data-url');
                if (url) {
                    window.navigation.navigateTo(url);
                }
            });
        });
    }

    handleProfilePicUpdate(event) {
        const file = event.target.files[0];
        if (!file) {
            console.log('No file selected');
            return;
        }

        console.log('File selected for upload:', file.name, 'Size:', file.size, 'Type:', file.type);

        // Validate file type and size on the client side
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            alert('Please select a valid image file (JPEG, PNG, or GIF)');
            return;
        }

        const maxSize = 20 * 1024 * 1024; // 20MB
        if (file.size > maxSize) {
            alert('File size exceeds the maximum limit of 20MB');
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

            // Log the form data for debugging
            console.log('FormData created with file:', file.name);

            // Add a delay to ensure the file is properly attached
            setTimeout(() => {
                console.log('Sending profile picture upload request');

                fetch('/api/users/profile-pic', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                })
                    .then(response => {
                        console.log('Profile picture upload response status:', response.status);

                        // Try to get the response text even if it's not OK
                        return response.text().then(text => {
                            if (!response.ok) {
                                // Try to parse as JSON if possible
                                try {
                                    const errorData = JSON.parse(text);
                                    throw new Error(errorData.error || `Failed to update profile picture: ${response.status}`);
                                } catch (e) {
                                    // If not JSON, use the text or status
                                    throw new Error(text || `Failed to update profile picture: ${response.status}`);
                                }
                            }

                            // If response is OK, try to parse as JSON
                            try {
                                return JSON.parse(text);
                            } catch (e) {
                                // If not JSON but response is OK, return a success object
                                return { success: true, message: "Profile picture updated successfully" };
                            }
                        });
                    })
                    .then(data => {
                        console.log('Profile picture updated:', data);

                        // Show success message
                        profilePicSection.innerHTML = `
                            <div class="success-message">
                                <i class="fas fa-check-circle"></i>
                                <p>Profile picture updated successfully!</p>
                            </div>
                        `;

                        // Reload the profile after a short delay to show the updated picture
                        setTimeout(() => {
                            this.loadProfile();
                        }, 1000);
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

    // Add unmount method for clean navigation
    unmount() {
        console.log('Unmounting ProfileComponent');

        // Remove event listeners
        const profilePicInput = document.getElementById('profile_pic');
        if (profilePicInput) {
            profilePicInput.removeEventListener('change', this.handleProfilePicUpdate);
        }

        const statCards = document.querySelectorAll('.stat-card.clickable');
        statCards.forEach(card => {
            card.removeEventListener('click', null);
        });

        // Clear the container
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

export default ProfileComponent;
