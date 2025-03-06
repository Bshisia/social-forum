window.navigation = {
    navigateTo: (path, data = null) => {
        if (path === window.location.pathname + window.location.search) {
            // Don't push new state if URL hasn't changed
            handleRoute();
            return;
        }
        window.history.pushState(data, '', path);
        handleRoute();
    },
    reloadPage: () => {
        handleRoute(); // Just re-handle current route instead of navigating
    }
};
// Update router object with more specific routes
const router = {
    '/': () => {
        // Show sidebars
        const filterNav = document.getElementById('filter-nav');
        const usersNav = document.getElementById('users-nav');
        if (filterNav) filterNav.style.display = '';
        if (usersNav) usersNav.style.display = '';
        
        loadPosts();
    },
    '/create': () => {
        const createPost = new CreatePostComponent();
        createPost.mount();
    },
    '/edit-post': (id) => {
        if (!id) {
            window.navigation.navigateTo('/');
            return;
        }
        const editPost = new EditPostComponent(id);
        editPost.mount();
    },
    'post': (id) => {
        const singlePost = new SinglePostComponent(id);
        singlePost.mount();
    }
};

function handleRoute() {
    const path = window.location.pathname;
    const search = window.location.search;
    const postId = new URLSearchParams(search).get('id');

    console.log('Current path:', path);
    console.log('PostId:', postId);

    // Handle edit-post path with postId check
    if (path === '/edit-post') {
        if (!postId) {
            window.location.href = '/'; // Use direct location change for invalid state
            return;
        }
        if (router['/edit-post']) {
            router['/edit-post'](postId);
        }
        return;
    }

    // Handle other routes
    if (path === '/' && postId) {
        router.post(postId);
        return;
    }

    const route = router[path];
    if (route) {
        route();
        return;
    }

    router['/']();
}

window.addEventListener('popstate', () => {
    handleRoute();
});

document.addEventListener('DOMContentLoaded', () => {    

    // First get user status and users list
    Promise.all([
        fetch('/api/user-status'),
        fetch('/api/users')  // Add endpoint for users list
    ])
    .then(([statusResponse, usersResponse]) => 
        Promise.all([statusResponse.json(), usersResponse.json()])
    )
    .then(([statusData, usersData]) => {
        // Initialize components
        const navbar = new NavbarComponent(
            statusData.isLoggedIn,
            statusData.currentUserID,
            statusData.unreadCount
        );
        navbar.mount(document.getElementById('navbar'));

        // Initialize filter nav
        const filterNav = new FilterNavComponent();
        filterNav.mount();

        // Initialize users nav
        const usersNav = new UsersNavComponent(usersData);
        usersNav.mount();

        // Initialize posts component
        const posts = new PostsComponent();
        posts.isLoggedIn = statusData.isLoggedIn;
        posts.currentUserID = statusData.currentUserID;

        // Handle navigation
        function handleRoute() {
            const path = window.location.pathname;
            const route = router[path] || router['/'];
            route();
        }

        // Listen for navigation events
        window.addEventListener('popstate', handleRoute);
        handleRoute();
    })
    .catch(error => console.error('Error:', error));
});

function loadPosts() {
    console.log('Loading posts...');
    fetch('/api/posts')
        .then(response => response.json())
        .then(postsData => {  // Changed variable name to avoid conflict
            console.log('Posts received:', postsData);
            const postsComponent = new PostsComponent(); // Changed variable name
            postsComponent.posts = postsData;
            postsComponent.isLoggedIn = window.isLoggedIn; // Pass from user status
            postsComponent.currentUserID = window.currentUserID;
            postsComponent.mount();
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('main-content').innerHTML = `
                <div class="no-posts-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading posts</p>
                </div>`;
        });
}

function loadSinglePost(postId) {
    console.log('Loading single post:', postId); // Add logging
    fetch(`/api/posts/single?id=${postId}`)
        .then(response => response.json())
        .then(data => {
            console.log('Post data received:', data); // Add logging
            const singlePost = new SinglePostComponent(postId);
            singlePost.post = data.post;
            singlePost.comments = data.comments;
            singlePost.mount();
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('main-content').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading post</p>
                </div>`;
        });
}

function getPostIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}